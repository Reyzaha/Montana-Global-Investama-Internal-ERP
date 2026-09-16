<?php
// ==========================================================
// MGI ERP / HRIS - Reports: Expense Trend API
// Method: GET /backend/api/reports/expense-trend.php
// Allowed: FINANCE (4), PM (6), ADMIN (7), HRGA (2)
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

$user = requireRole([2, 4, 6, 7]);
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

try {
    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
    $category = trim($_GET['category'] ?? 'all');

    // 1. Monthly trend query for specified year
    $whereYear = "YEAR(pct.created_at) = :year";
    $params = [':year' => $year];

    if ($category !== 'all' && !empty($category)) {
        $whereYear .= " AND er.category = :category";
        $params[':category'] = $category;
    }

    $sqlMonthly = "
        SELECT 
            MONTH(pct.created_at) AS month_num,
            DATE_FORMAT(pct.created_at, '%b') AS month_name,
            COALESCE(SUM(CASE WHEN pct.transaction_type = 'outflow' THEN pct.amount ELSE 0 END), 0) AS total_outflow,
            COALESCE(SUM(CASE WHEN pct.transaction_type = 'inflow' THEN pct.amount ELSE 0 END), 0) AS total_inflow,
            COUNT(pct.id) AS total_transactions
        FROM petty_cash_transactions pct
        LEFT JOIN expense_requests er ON pct.expense_request_id = er.id
        WHERE $whereYear
        GROUP BY MONTH(pct.created_at), DATE_FORMAT(pct.created_at, '%b')
        ORDER BY month_num ASC
    ";

    $stmtMonthly = $pdo->prepare($sqlMonthly);
    $stmtMonthly->execute($params);
    $rawMonthly = $stmtMonthly->fetchAll(PDO::FETCH_ASSOC);

    // Fill all 12 months for chart readiness
    $monthNames = [
        1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
        5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Aug',
        9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dec'
    ];

    $indexedMonthly = [];
    foreach ($rawMonthly as $m) {
        $indexedMonthly[(int)$m['month_num']] = $m;
    }

    $fullMonthlyTrend = [];
    for ($m = 1; $m <= 12; $m++) {
        if (isset($indexedMonthly[$m])) {
            $fullMonthlyTrend[] = [
                'month' => $m,
                'month_name' => $monthNames[$m],
                'total_outflow' => (float)$indexedMonthly[$m]['total_outflow'],
                'total_inflow' => (float)$indexedMonthly[$m]['total_inflow'],
                'net_spend' => (float)($indexedMonthly[$m]['total_outflow'] - $indexedMonthly[$m]['total_inflow']),
                'total_transactions' => (int)$indexedMonthly[$m]['total_transactions']
            ];
        } else {
            $fullMonthlyTrend[] = [
                'month' => $m,
                'month_name' => $monthNames[$m],
                'total_outflow' => 0.0,
                'total_inflow' => 0.0,
                'net_spend' => 0.0,
                'total_transactions' => 0
            ];
        }
    }

    // 2. Breakdown per Expense Category (from completed expense requests)
    $sqlCategory = "
        SELECT 
            er.category,
            COUNT(er.id) AS total_tickets,
            COALESCE(SUM(COALESCE(er.realized_amount, er.amount)), 0) AS total_amount
        FROM expense_requests er
        WHERE YEAR(er.created_at) = :year
          AND er.status IN ('completed', 'disbursed')
        GROUP BY er.category
        ORDER BY total_amount DESC
    ";
    $stmtCat = $pdo->prepare($sqlCategory);
    $stmtCat->execute([':year' => $year]);
    $categoryBreakdown = $stmtCat->fetchAll(PDO::FETCH_ASSOC);

    // 3. Overall annual financial summaries
    $stmtSummary = $pdo->prepare("
        SELECT 
            COALESCE(SUM(CASE WHEN transaction_type = 'inflow' THEN amount ELSE 0 END), 0) AS annual_inflow,
            COALESCE(SUM(CASE WHEN transaction_type = 'outflow' THEN amount ELSE 0 END), 0) AS annual_outflow,
            COUNT(*) AS annual_transactions
        FROM petty_cash_transactions
        WHERE YEAR(created_at) = ?
    ");
    $stmtSummary->execute([$year]);
    $annualSummary = $stmtSummary->fetch(PDO::FETCH_ASSOC);

    // Current real-time petty cash balance
    $latestBal = (float)($pdo->query("SELECT current_balance FROM petty_cash_transactions ORDER BY id DESC LIMIT 1")->fetchColumn() ?: 0.0);

    sendSuccess([
        'year' => $year,
        'current_balance' => $latestBal,
        'annual_summary' => [
            'total_inflow' => (float)$annualSummary['annual_inflow'],
            'total_outflow' => (float)$annualSummary['annual_outflow'],
            'net_flow' => (float)($annualSummary['annual_inflow'] - $annualSummary['annual_outflow']),
            'total_transactions' => (int)$annualSummary['annual_transactions']
        ],
        'monthly_trend' => $fullMonthlyTrend,
        'category_breakdown' => $categoryBreakdown
    ], 'Laporan analitik tren pengeluaran kas kecil berhasil dimuat.');

} catch (Exception $e) {
    sendError('Gagal memuat laporan pengeluaran: ' . $e->getMessage(), 500);
}
