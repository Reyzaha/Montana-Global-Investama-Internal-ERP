<?php
// ==========================================================
// MGI ERP / HRIS - PM Petty Cash Monitoring Stats API
// Method: GET /backend/api/pm/petty-cash-stats.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

// Allowed: PM (6) and Admin (7)
$user = requireRole([6, 7]);
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed. Use GET.', 405);
}

try {
    // 1. Current balance
    $balStmt = $pdo->query("SELECT current_balance FROM petty_cash_transactions ORDER BY id DESC LIMIT 1");
    $currentBalance = (float)($balStmt->fetchColumn() ?: 0.00);

    // 2. Monthly inflow & outflow (Current Month)
    $monthStmt = $pdo->query("
        SELECT 
            COALESCE(SUM(CASE WHEN transaction_type = 'inflow' THEN amount ELSE 0 END), 0) AS month_inflow,
            COALESCE(SUM(CASE WHEN transaction_type = 'outflow' THEN amount ELSE 0 END), 0) AS month_outflow,
            COUNT(*) AS month_tx_count
        FROM petty_cash_transactions
        WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())
    ");
    $monthStats = $monthStmt->fetch(PDO::FETCH_ASSOC);

    // 3. All-time stats
    $allStmt = $pdo->query("
        SELECT 
            COALESCE(SUM(CASE WHEN transaction_type = 'inflow' THEN amount ELSE 0 END), 0) AS all_inflow,
            COALESCE(SUM(CASE WHEN transaction_type = 'outflow' THEN amount ELSE 0 END), 0) AS all_outflow,
            COUNT(*) AS total_tx
        FROM petty_cash_transactions
    ");
    $allStats = $allStmt->fetch(PDO::FETCH_ASSOC);

    // 4. Pending Expense Requests count & amount waiting for PM
    $expPendingStmt = $pdo->query("
        SELECT 
            COUNT(*) AS count_pending,
            COALESCE(SUM(amount), 0) AS total_pending_amount
        FROM expense_requests
        WHERE status = 'pending_pm'
    ");
    $expPending = $expPendingStmt->fetch(PDO::FETCH_ASSOC);

    // 5. Recent 10 transactions
    $recentStmt = $pdo->query("
        SELECT 
            pct.id,
            pct.transaction_type,
            pct.amount,
            pct.current_balance,
            pct.description,
            pct.proof_doc_path,
            pct.created_at,
            er.ticket_number,
            u.email AS creator_email,
            COALESCE(up.name, u.email) AS creator_name
        FROM petty_cash_transactions pct
        LEFT JOIN expense_requests er ON pct.expense_request_id = er.id
        JOIN users u ON pct.created_by = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        ORDER BY pct.id DESC
        LIMIT 10
    ");
    $recentTransactions = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    // 6. Category breakdown from disbursed expense requests
    $catStmt = $pdo->query("
        SELECT 
            category,
            COUNT(*) AS count,
            COALESCE(SUM(amount), 0) AS total_amount
        FROM expense_requests
        WHERE status IN ('approved', 'disbursed')
        GROUP BY category
    ");
    $categoryBreakdown = $catStmt->fetchAll(PDO::FETCH_ASSOC);

    sendSuccess([
        'current_balance' => $currentBalance,
        'month' => [
            'inflow' => (float)$monthStats['month_inflow'],
            'outflow' => (float)$monthStats['month_outflow'],
            'tx_count' => (int)$monthStats['month_tx_count']
        ],
        'all_time' => [
            'inflow' => (float)$allStats['all_inflow'],
            'outflow' => (float)$allStats['all_outflow'],
            'total_tx' => (int)$allStats['total_tx']
        ],
        'pending_expense' => [
            'count' => (int)$expPending['count_pending'],
            'total_amount' => (float)$expPending['total_pending_amount']
        ],
        'category_breakdown' => $categoryBreakdown,
        'recent_transactions' => $recentTransactions
    ], 'Petty cash monitoring data retrieved.');

} catch (Exception $e) {
    sendError('Gagal mengambil statistik petty cash: ' . $e->getMessage(), 500);
}
