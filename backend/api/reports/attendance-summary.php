<?php
// ==========================================================
// MGI ERP / HRIS - Reports: Attendance Summary API
// Method: GET /backend/api/reports/attendance-summary.php
// Allowed: HRGA (2), ADMIN (7)
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

$user = requireRole([2, 7]);
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

try {
    $startDate = $_GET['start_date'] ?? date('Y-m-01'); // Default start of current month
    $endDate = $_GET['end_date'] ?? date('Y-m-d');      // Default today
    $roleId = isset($_GET['role_id']) ? (int)$_GET['role_id'] : 0;

    $where = ["a.date BETWEEN :start_date AND :end_date"];
    $params = [
        ':start_date' => $startDate,
        ':end_date' => $endDate
    ];

    if ($roleId > 0) {
        $where[] = "u.role_id = :role_id";
        $params[':role_id'] = $roleId;
    }

    $whereClause = "WHERE " . implode(" AND ", $where);

    // 1. Overall Attendance Status Distribution
    $sqlDistribution = "
        SELECT 
            a.status,
            COUNT(a.id) AS total_count
        FROM attendances a
        JOIN users u ON a.user_id = u.id
        $whereClause
        GROUP BY a.status
    ";
    $stmtDist = $pdo->prepare($sqlDistribution);
    $stmtDist->execute($params);
    $distRows = $stmtDist->fetchAll(PDO::FETCH_ASSOC);

    $summaryStats = [
        'on_time' => 0,
        'late' => 0,
        'absent' => 0,
        'pending' => 0,
        'total' => 0
    ];

    foreach ($distRows as $dr) {
        $st = $dr['status'];
        $cnt = (int)$dr['total_count'];
        if (isset($summaryStats[$st])) {
            $summaryStats[$st] = $cnt;
        }
        $summaryStats['total'] += $cnt;
    }

    $onTimeRate = $summaryStats['total'] > 0 
        ? round(($summaryStats['on_time'] / $summaryStats['total']) * 100, 1) 
        : 0.0;

    $lateRate = $summaryStats['total'] > 0 
        ? round(($summaryStats['late'] / $summaryStats['total']) * 100, 1) 
        : 0.0;

    // 2. Breakdown per Employee
    $sqlEmployee = "
        SELECT 
            u.id AS user_id,
            u.email,
            COALESCE(up.name, u.email) AS employee_name,
            r.name AS department_name,
            COUNT(a.id) AS total_attended,
            SUM(CASE WHEN a.status = 'on_time' THEN 1 ELSE 0 END) AS on_time_count,
            SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late_count,
            SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
            SUM(CASE WHEN a.break_start IS NOT NULL AND a.break_end IS NOT NULL THEN 1 ELSE 0 END) AS completed_breaks
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN attendances a ON u.id = a.user_id AND (a.date BETWEEN :start_date AND :end_date)
        WHERE u.status = 'active'
        " . ($roleId > 0 ? "AND u.role_id = :role_id" : "") . "
        GROUP BY u.id, u.email, employee_name, department_name
        ORDER BY late_count DESC, on_time_count DESC
    ";

    $stmtEmp = $pdo->prepare($sqlEmployee);
    $stmtEmp->execute($params);
    $employeeBreakdown = $stmtEmp->fetchAll(PDO::FETCH_ASSOC);

    // 3. Breakdown per Department / Role
    $sqlDept = "
        SELECT 
            r.name AS department_name,
            COUNT(a.id) AS total_attendance_records,
            SUM(CASE WHEN a.status = 'on_time' THEN 1 ELSE 0 END) AS on_time_count,
            SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late_count,
            ROUND((SUM(CASE WHEN a.status = 'on_time' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)) * 100, 1) AS on_time_percentage
        FROM roles r
        JOIN users u ON r.id = u.role_id
        JOIN attendances a ON u.id = a.user_id
        $whereClause
        GROUP BY r.name
        ORDER BY on_time_percentage DESC
    ";
    $stmtDept = $pdo->prepare($sqlDept);
    $stmtDept->execute($params);
    $departmentBreakdown = $stmtDept->fetchAll(PDO::FETCH_ASSOC);

    sendSuccess([
        'period' => [
            'start_date' => $startDate,
            'end_date' => $endDate
        ],
        'metrics' => [
            'total_attendance_logs' => $summaryStats['total'],
            'on_time_count' => $summaryStats['on_time'],
            'late_count' => $summaryStats['late'],
            'absent_count' => $summaryStats['absent'],
            'on_time_rate_percent' => $onTimeRate,
            'late_rate_percent' => $lateRate
        ],
        'employee_breakdown' => $employeeBreakdown,
        'department_breakdown' => $departmentBreakdown
    ], 'Laporan rekapitulasi kehadiran pegawai berhasil dimuat.');

} catch (Exception $e) {
    sendError('Gagal memuat rekapitulasi kehadiran: ' . $e->getMessage(), 500);
}
