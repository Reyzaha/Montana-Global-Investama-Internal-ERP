<?php
// ==========================================================
// MGI ERP / HRIS - All Attendance API (HRGA)
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

$user = requireRole([2, 7]); // HRGA or Admin
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

try {
    $month = $_GET['month'] ?? date('m');
    $year = $_GET['year'] ?? date('Y');

    // Limit to 1 year back
    $requestDate = strtotime("$year-$month-01");
    $oneYearAgo = strtotime("-1 year", strtotime(date('Y-m-01')));
    
    if ($requestDate < $oneYearAgo) {
        sendError('Data older than 1 year is archived.', 400);
    }

    $stmt = $pdo->prepare("
        SELECT a.id, a.user_id, u.email as employee_email, up.name as employee_name, a.date, a.check_in, a.break_start, a.break_end, a.check_out, a.status 
        FROM attendances a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE MONTH(a.date) = ? AND YEAR(a.date) = ?
        ORDER BY a.date DESC, u.email ASC
    ");
    $stmt->execute([$month, $year]);
    $attendances = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendSuccess($attendances, 'All attendance retrieved successfully.');
} catch (Exception $e) {
    sendError('Failed to fetch attendance: ' . $e->getMessage(), 500);
}
