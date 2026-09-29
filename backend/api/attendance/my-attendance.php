<?php
// ==========================================================
// MGI ERP / HRIS - My Attendance API
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
    // 1. Get user profile metadata
    $stmtProfile = $pdo->prepare("
        SELECT u.id, u.email, COALESCE(up.name, u.email) as name, COALESCE(up.position, r.name) as position, r.name as role_name
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
    ");
    $stmtProfile->execute([$user['id']]);
    $employeeInfo = $stmtProfile->fetch(PDO::FETCH_ASSOC) ?: [
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['email'],
        'position' => 'Staff Pegawai',
        'role_name' => 'Staff'
    ];

    // 2. Get last 31 days physical attendance logs
    $stmt = $pdo->prepare("
        SELECT id, date, check_in, break_start, break_end, check_out, status 
        FROM attendances 
        WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 31 DAY)
        ORDER BY date DESC
    ");
    $stmt->execute([$user['id']]);
    $attendances = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Map attendances and initialize permit keys
    $attendanceMap = [];
    foreach ($attendances as $idx => &$att) {
        $att['permit_id'] = null;
        $att['permit_category'] = null;
        $att['permit_category_name'] = null;
        $att['permit_sub_type_name'] = null;
        $att['permit_time'] = null;
        $att['permit_end_time'] = null;
        $att['has_approved_permit'] = false;
        $att['notes'] = '-';
        if ($att['status'] === 'on_time') $att['notes'] = 'Hadir Tepat Waktu';
        if ($att['status'] === 'late') $att['notes'] = 'Terlambat Masuk';
        $attendanceMap[$att['date']] = $idx;
    }
    unset($att);

    // 4. Fetch approved permits for this user in last 31 days
    $stmtPermits = $pdo->prepare("
        SELECT 
            p.id as permit_id,
            p.user_id,
            p.start_date,
            p.end_date,
            p.permit_time,
            p.permit_end_time,
            p.description,
            p.status as permit_status,
            pt.code as category_code,
            pt.name as category_name,
            pst.name as sub_type_name,
            pst.requires_time,
            (SELECT COUNT(*) FROM permit_attachments WHERE permit_id = p.id) as has_attachment
        FROM permits p
        JOIN permit_types pt ON p.permit_type_id = pt.id
        LEFT JOIN permit_sub_types pst ON p.permit_sub_type_id = pst.id
        WHERE p.user_id = ? AND p.status = 'approved'
          AND p.start_date <= CURDATE() AND p.end_date >= DATE_SUB(CURDATE(), INTERVAL 31 DAY)
        ORDER BY p.start_date ASC
    ");
    $stmtPermits->execute([$user['id']]);
    $approvedPermits = $stmtPermits->fetchAll(PDO::FETCH_ASSOC);

    $startDateLimit = date('Y-m-d', strtotime('-31 days'));
    $endDateLimit = date('Y-m-d');

    foreach ($approvedPermits as $p) {
        $pStart = max($p['start_date'], $startDateLimit);
        $pEnd = min($p['end_date'], $endDateLimit);

        $cur = new DateTime($pStart);
        $last = new DateTime($pEnd);

        $catName = $p['category_name'];
        $subName = !empty($p['sub_type_name']) ? $p['sub_type_name'] : $catName;
        $timeStr = "";
        if (!empty($p['permit_time']) && !empty($p['permit_end_time'])) {
            $timeStr = " (Pkl " . substr($p['permit_time'], 0, 5) . " - " . substr($p['permit_end_time'], 0, 5) . " WIB)";
        } elseif (!empty($p['permit_time'])) {
            $timeStr = " (Pkl " . substr($p['permit_time'], 0, 5) . " WIB)";
        }
        $noteText = "[{$catName}: {$subName}{$timeStr}]";

        while ($cur <= $last) {
            $curDateStr = $cur->format('Y-m-d');
            if (isset($attendanceMap[$curDateStr])) {
                $idx = $attendanceMap[$curDateStr];
                $attendances[$idx]['permit_id'] = $p['permit_id'];
                $attendances[$idx]['permit_category'] = strtolower($p['category_code']);
                $attendances[$idx]['permit_category_name'] = $catName;
                $attendances[$idx]['permit_sub_type_name'] = $subName;
                $attendances[$idx]['permit_time'] = $p['permit_time'];
                $attendances[$idx]['permit_end_time'] = $p['permit_end_time'];
                $attendances[$idx]['has_approved_permit'] = true;
                $attendances[$idx]['notes'] = $noteText;
            } else {
                $newRow = [
                    'id' => null,
                    'date' => $curDateStr,
                    'check_in' => null,
                    'break_start' => null,
                    'break_end' => null,
                    'check_out' => null,
                    'status' => strtolower($p['category_code']),
                    'permit_id' => $p['permit_id'],
                    'permit_category' => strtolower($p['category_code']),
                    'permit_category_name' => $catName,
                    'permit_sub_type_name' => $subName,
                    'permit_time' => $p['permit_time'],
                    'permit_end_time' => $p['permit_end_time'],
                    'has_approved_permit' => true,
                    'notes' => $noteText
                ];
                $attendances[] = $newRow;
                $attendanceMap[$curDateStr] = count($attendances) - 1;
            }
            $cur->modify('+1 day');
        }
    }

    // Sort history by date DESC
    usort($attendances, function($a, $b) {
        return strcmp($b['date'], $a['date']);
    });

    // 5. Get today's record explicitly based on server date
    $today = date('Y-m-d');
    $stmtToday = $pdo->prepare("
        SELECT id, date, check_in, break_start, break_end, check_out, status 
        FROM attendances 
        WHERE user_id = ? AND date = ? LIMIT 1
    ");
    $stmtToday->execute([$user['id'], $today]);
    $todayRecord = $stmtToday->fetch(PDO::FETCH_ASSOC) ?: null;

    // Apply custom rule for montanaglobalinvestamait@gmail.com
    if ($user['email'] === 'montanaglobalinvestamait@gmail.com') {
        if ($todayRecord) {
            $todayRecord['status'] = 'on_time';
        }
        foreach ($attendances as &$att) {
            $att['status'] = 'on_time';
        }
        unset($att);
    }

    sendSuccess([
        'employee' => $employeeInfo,
        'today' => $todayRecord,
        'server_date' => $today,
        'history' => $attendances
    ], 'My attendance retrieved successfully.');
} catch (Exception $e) {
    sendError('Failed to fetch attendance: ' . $e->getMessage(), 500);
}
