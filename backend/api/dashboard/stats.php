<?php
// backend/api/dashboard/stats.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

$currentUser = getCurrentUser();

if (!$currentUser) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized'
    ]);
    exit;
}

$userId = (int)$currentUser['id'];
$roleId = (int)$currentUser['role_id'];
$today = date('Y-m-d');

$pdo = getDbConnection();

try {
    // 1. Attendance Status today for logged in user
    $stmtAtt = $pdo->prepare("SELECT check_in, break_start, break_end, check_out, status FROM attendances WHERE user_id = ? AND date = ?");
    $stmtAtt->execute([$userId, $today]);
    $userAtt = $stmtAtt->fetch(PDO::FETCH_ASSOC);

    $attendanceStatus = 'Not Checked In';
    if ($userAtt) {
        if ($userAtt['check_out']) {
            $attendanceStatus = 'Checked Out';
        } else if ($userAtt['break_start'] && !$userAtt['break_end']) {
            $attendanceStatus = 'On Break';
        } else if ($userAtt['check_in']) {
            $attendanceStatus = 'Working';
        }
    }

    // 2. Pending Permits count
    $pendingPermits = 0;
    if (in_array($roleId, [2, 7])) { // HRGA or Admin sees all pending
        $stmtPermit = $pdo->query("SELECT COUNT(*) FROM permits WHERE status IN ('pending_hrga', 'pending_pm')");
        $pendingPermits = (int)$stmtPermit->fetchColumn();
    } elseif ($roleId === 6) { // PM sees permits waiting for PM approval
        $stmtPermit = $pdo->query("SELECT COUNT(*) FROM permits WHERE status = 'pending_pm'");
        $pendingPermits = (int)$stmtPermit->fetchColumn();
    } else { // User sees their own active permits
        $stmtPermit = $pdo->prepare("SELECT COUNT(*) FROM permits WHERE user_id = ? AND status IN ('pending_hrga', 'pending_pm')");
        $stmtPermit->execute([$userId]);
        $pendingPermits = (int)$stmtPermit->fetchColumn();
    }

    // 3. Unread Notifications count
    $stmtNotif = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0");
    $stmtNotif->execute([$userId]);
    $unreadNotifications = (int)$stmtNotif->fetchColumn();

    // 4. Recent System Activities (5 latest audit logs)
    $stmtLogs = $pdo->query("
        SELECT al.action, al.description, al.created_at, u.email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.id DESC
        LIMIT 5
    ");
    $recentActivities = $stmtLogs->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => [
            'attendance_status' => $attendanceStatus,
            'pending_permits' => $pendingPermits,
            'unread_notifications' => $unreadNotifications,
            'recent_activities' => $recentActivities
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
