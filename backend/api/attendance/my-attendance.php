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
    // Get last 31 days
    $stmt = $pdo->prepare("
        SELECT id, date, check_in, break_start, break_end, check_out, status 
        FROM attendances 
        WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 31 DAY)
        ORDER BY date DESC
    ");
    $stmt->execute([$user['id']]);
    $attendances = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get today's record explicitly based on server date
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
        'today' => $todayRecord,
        'server_date' => $today,
        'history' => $attendances
    ], 'My attendance retrieved successfully.');
} catch (Exception $e) {
    sendError('Failed to fetch attendance: ' . $e->getMessage(), 500);
}
