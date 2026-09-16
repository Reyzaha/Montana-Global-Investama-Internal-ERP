<?php
// ==========================================================
// MGI ERP / HRIS - ESS Payslip API
// Method: GET /backend/api/user/payslip.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

$user = requireAuth();
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

try {
    $month = (int)($_GET['month'] ?? date('n'));
    $year = (int)($_GET['year'] ?? date('Y'));

    $stmt = $pdo->prepare("
        SELECT 
            pr.id,
            pr.user_id,
            u.email AS employee_email,
            COALESCE(up.name, u.email) AS employee_name,
            r.name AS employee_role,
            pr.period_month,
            pr.period_year,
            pr.base_salary,
            pr.allowance_total,
            pr.overtime_hours,
            pr.overtime_pay,
            pr.late_count,
            pr.deduction_late,
            pr.absent_count,
            pr.deduction_absent,
            pr.net_salary,
            pr.status,
            pr.processed_at
        FROM payroll_runs pr
        JOIN users u ON pr.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE pr.user_id = ? AND pr.period_month = ? AND pr.period_year = ?
        LIMIT 1
    ");
    $stmt->execute([$user['id'], $month, $year]);
    $payslip = $stmt->fetch(PDO::FETCH_ASSOC);

    // Also get last 6 periods of payslips
    $stmtHistory = $pdo->prepare("
        SELECT id, period_month, period_year, net_salary, status 
        FROM payroll_runs 
        WHERE user_id = ? 
        ORDER BY period_year DESC, period_month DESC 
        LIMIT 6
    ");
    $stmtHistory->execute([$user['id']]);
    $history = $stmtHistory->fetchAll(PDO::FETCH_ASSOC);

    sendSuccess([
        'current_payslip' => $payslip ?: null,
        'history' => $history
    ], 'Data slip gaji berhasil dimuat.');
} catch (Exception $e) {
    sendError('Gagal memuat slip gaji: ' . $e->getMessage(), 500);
}
