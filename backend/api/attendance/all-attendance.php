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
    $userId = isset($_GET['user_id']) && (int)$_GET['user_id'] > 0 ? (int)$_GET['user_id'] : 0;

    // Limit to 1 year back
    $requestDate = strtotime("$year-$month-01");
    $oneYearAgo = strtotime("-1 year", strtotime(date('Y-m-01')));
    
    if ($requestDate < $oneYearAgo) {
        sendError('Data older than 1 year is archived.', 400);
    }

    $where = ["MONTH(a.date) = :month", "YEAR(a.date) = :year"];
    $params = [':month' => $month, ':year' => $year];

    if ($userId > 0) {
        $where[] = "a.user_id = :user_id";
        $params[':user_id'] = $userId;
    }

    $whereClause = implode(" AND ", $where);

    $stmt = $pdo->prepare("
        SELECT 
            a.id, 
            a.user_id, 
            u.email as employee_email, 
            COALESCE(up.name, u.email) as employee_name, 
            COALESCE(up.position, r.name) as employee_position,
            r.name as role_name,
            a.date, 
            a.check_in, 
            a.break_start, 
            a.break_end, 
            a.check_out, 
            a.status 
        FROM attendances a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE {$whereClause}
        ORDER BY a.date DESC, u.email ASC
    ");
    $stmt->execute($params);
    $attendances = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Apply custom rule for montanaglobalinvestamait@gmail.com
    foreach ($attendances as &$att) {
        if ($att['employee_email'] === 'montanaglobalinvestamait@gmail.com') {
            $att['status'] = 'on_time';
        }
    }
    unset($att);

    // Fetch active employees for dropdown filter
    $stmtUsers = $pdo->query("
        SELECT u.id, u.email, COALESCE(up.name, u.email) as name, COALESCE(up.position, r.name) as position, r.name as role_name 
        FROM users u 
        LEFT JOIN user_profiles up ON u.id = up.user_id 
        JOIN roles r ON u.role_id = r.id
        WHERE u.status = 'active'
        ORDER BY name ASC
    ");
    $employees = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);

    sendSuccess([
        'attendances' => $attendances,
        'employees' => $employees
    ], 'All attendance retrieved successfully.');
} catch (Exception $e) {
    sendError('Failed to fetch attendance: ' . $e->getMessage(), 500);
}
