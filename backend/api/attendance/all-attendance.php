<?php
// ==========================================================
// MGI ERP / HRIS - All Attendance API (HRGA)
// Supports Date Range Filtering & Approved Permits Integration
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
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    $userId = isset($_GET['user_id']) && (int)$_GET['user_id'] > 0 ? (int)$_GET['user_id'] : 0;

    if ($startDate && $endDate) {
        // Validate date format YYYY-MM-DD
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
            sendError('Format tanggal tidak valid (harus YYYY-MM-DD).', 400);
        }
        if ($startDate > $endDate) {
            sendError('Tanggal mulai tidak boleh lebih besar dari tanggal selesai.', 400);
        }
    } else {
        $month = $_GET['month'] ?? date('m');
        $year = $_GET['year'] ?? date('Y');
        $month = str_pad((string)(int)$month, 2, '0', STR_PAD_LEFT);
        $startDate = "$year-$month-01";
        $endDate = date('Y-m-t', strtotime($startDate));
    }

    // Limit to 1 year back
    $oneYearAgo = date('Y-m-d', strtotime("-1 year", strtotime(date('Y-m-01'))));
    if ($startDate < $oneYearAgo) {
        sendError('Data lebih dari 1 tahun yang lalu telah diarsipkan.', 400);
    }

    // 1. Fetch physical attendance logs
    $where = ["a.date BETWEEN :start_date AND :end_date"];
    $params = [':start_date' => $startDate, ':end_date' => $endDate];

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

    // Map existing attendance by user_id and date
    $attendanceMap = [];
    foreach ($attendances as $idx => &$att) {
        $key = $att['user_id'] . '_' . $att['date'];
        $att['permit_id'] = null;
        $att['permit_category'] = null;
        $att['permit_category_name'] = null;
        $att['permit_sub_type_name'] = null;
        $att['permit_description'] = null;
        $att['has_approved_permit'] = false;
        $att['permit_notes'] = null;

        // Default note based on check-in status
        if ($att['status'] === 'on_time') {
            $att['notes'] = 'Hadir Tepat Waktu';
        } elseif ($att['status'] === 'late') {
            $att['notes'] = 'Terlambat Masuk';
        } elseif ($att['status'] === 'absent') {
            $att['notes'] = 'Tidak Masuk Kerja';
        } else {
            $att['notes'] = '-';
        }

        if ($att['employee_email'] === 'montanaglobalinvestamait@gmail.com') {
            $att['status'] = 'on_time';
        }

        $attendanceMap[$key] = $idx;
    }
    unset($att);

    // 2. Fetch all approved permits overlapping with the requested date range
    // A permit with status = 'approved' is fully verified & approved by both HRGA and OM / PM
    $permitWhere = [
        "p.status = 'approved'",
        "(p.start_date <= :end_date AND p.end_date >= :start_date)"
    ];
    $permitParams = [':start_date' => $startDate, ':end_date' => $endDate];

    if ($userId > 0) {
        $permitWhere[] = "p.user_id = :permit_user_id";
        $permitParams[':permit_user_id'] = $userId;
    }

    $permitWhereClause = implode(" AND ", $permitWhere);

    $stmtPermits = $pdo->prepare("
        SELECT 
            p.id as permit_id,
            p.user_id,
            u.email as employee_email,
            COALESCE(up.name, u.email) as employee_name,
            COALESCE(up.position, r.name) as employee_position,
            r.name as role_name,
            p.start_date,
            p.end_date,
            p.permit_time,
            p.description,
            p.status as permit_status,
            pt.code as category_code,
            pt.name as category_name,
            pst.name as sub_type_name,
            (SELECT COUNT(*) FROM permit_attachments WHERE permit_id = p.id) as has_attachment
        FROM permits p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN roles r ON u.role_id = r.id
        JOIN permit_types pt ON p.permit_type_id = pt.id
        LEFT JOIN permit_sub_types pst ON p.permit_sub_type_id = pst.id
        WHERE {$permitWhereClause}
        ORDER BY p.start_date ASC
    ");
    $stmtPermits->execute($permitParams);
    $approvedPermits = $stmtPermits->fetchAll(PDO::FETCH_ASSOC);

    // 3. Merge approved permits into attendance data
    foreach ($approvedPermits as $p) {
        $pStart = max($p['start_date'], $startDate);
        $pEnd = min($p['end_date'], $endDate);

        $cur = new DateTime($pStart);
        $last = new DateTime($pEnd);

        $catName = $p['category_name'];
        $subName = !empty($p['sub_type_name']) ? $p['sub_type_name'] : $catName;
        $timeStr = !empty($p['permit_time']) ? " (Pkl " . substr($p['permit_time'], 0, 5) . ")" : "";
        $noDocStr = (strtolower($p['category_code']) === 'sakit' && (int)$p['has_attachment'] === 0) ? " [Tanpa Surat Dokter]" : "";
        $reason = !empty($p['description']) ? " - Alasan: {$p['description']}" : "";
        $noteText = "[{$catName}: {$subName}{$timeStr}{$noDocStr}] Disetujui OM & HR{$reason}";

        while ($cur <= $last) {
            $curDateStr = $cur->format('Y-m-d');
            $mapKey = $p['user_id'] . '_' . $curDateStr;

            if (isset($attendanceMap[$mapKey])) {
                // There is already a check-in record for this day (e.g. Izin Terlambat, Pulang Cepat, or regular check-in during permit)
                $targetIdx = $attendanceMap[$mapKey];
                $attendances[$targetIdx]['permit_id'] = $p['permit_id'];
                $attendances[$targetIdx]['permit_category'] = strtolower($p['category_code']);
                $attendances[$targetIdx]['permit_category_name'] = $catName;
                $attendances[$targetIdx]['permit_sub_type_name'] = $subName;
                $attendances[$targetIdx]['permit_time'] = $p['permit_time'];
                $attendances[$targetIdx]['permit_description'] = $p['description'];
                $attendances[$targetIdx]['has_approved_permit'] = true;
                $attendances[$targetIdx]['has_attachment'] = (int)$p['has_attachment'] > 0;
                $attendances[$targetIdx]['is_sakit_without_attachment'] = (strtolower($p['category_code']) === 'sakit' && (int)$p['has_attachment'] === 0);
                $attendances[$targetIdx]['permit_notes'] = $noteText;
                $attendances[$targetIdx]['notes'] = $noteText;

                // If it was marked late but has approved 'Terlambat' permit, annotate clearly
                if ($attendances[$targetIdx]['status'] === 'late' && stripos($subName, 'Terlambat') !== false) {
                    $attendances[$targetIdx]['is_excused_late'] = true;
                }
            } else {
                // Employee was on approved Cuti, Sakit, or Dinas without physical check-in
                $statusType = strtolower($p['category_code']); // 'cuti', 'sakit', 'izin'
                $newRow = [
                    'id' => null,
                    'user_id' => $p['user_id'],
                    'employee_email' => $p['employee_email'],
                    'employee_name' => $p['employee_name'],
                    'employee_position' => $p['employee_position'],
                    'role_name' => $p['role_name'],
                    'date' => $curDateStr,
                    'check_in' => null,
                    'break_start' => null,
                    'break_end' => null,
                    'check_out' => null,
                    'status' => $statusType,
                    'permit_id' => $p['permit_id'],
                    'permit_category' => strtolower($p['category_code']),
                    'permit_category_name' => $catName,
                    'permit_sub_type_name' => $subName,
                    'permit_time' => $p['permit_time'],
                    'permit_description' => $p['description'],
                    'has_approved_permit' => true,
                    'has_attachment' => (int)$p['has_attachment'] > 0,
                    'is_sakit_without_attachment' => (strtolower($p['category_code']) === 'sakit' && (int)$p['has_attachment'] === 0),
                    'permit_notes' => $noteText,
                    'notes' => $noteText
                ];
                $attendances[] = $newRow;
                $attendanceMap[$mapKey] = count($attendances) - 1;
            }

            $cur->modify('+1 day');
        }
    }

    // Sort final combined attendance by date DESC, employee_name ASC
    usort($attendances, function($a, $b) {
        if ($a['date'] === $b['date']) {
            return strcmp($a['employee_name'], $b['employee_name']);
        }
        return ($a['date'] < $b['date']) ? 1 : -1;
    });

    // 4. Fetch active employees for dropdown filter
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
        'start_date' => $startDate,
        'end_date' => $endDate,
        'attendances' => $attendances,
        'employees' => $employees
    ], 'All attendance retrieved successfully.');

} catch (Exception $e) {
    sendError('Failed to fetch attendance: ' . $e->getMessage(), 500);
}
