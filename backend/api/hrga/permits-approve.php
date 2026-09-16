<?php
// ==========================================================
// MGI ERP / HRIS - Approve Permit API
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../helpers/leave.php';

$user = requireRole([2, 6]); // HRGA or PM
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}

$permitId = $_GET['id'] ?? null;
if (!$permitId) {
    sendError('Permit ID is required.', 400);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$note = trim($input['note'] ?? '');

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT * FROM permits WHERE id = ? FOR UPDATE");
    $stmt->execute([$permitId]);
    $permit = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$permit) {
        sendError('Permit not found.', 404);
    }

    $newStatus = '';
    $step = 0;
    $notificationUserId = null;
    $notificationTitle = '';
    $notificationMessage = '';

    if ($user['role_id'] === 2) {
        // HRGA
        if ($permit['status'] !== 'pending_hrga') {
            sendError('Invalid permit status for HRGA approval.', 400);
        }
        $newStatus = 'pending_pm';
        $step = 1;
        
        // Find all active PMs to notify
        $pmStmt = $pdo->query("SELECT id FROM users WHERE role_id = 6 AND status = 'active'");
        $pmUserIds = $pmStmt->fetchAll(PDO::FETCH_COLUMN);
        $notificationTitle = 'New Permit Request';
        $notificationMessage = 'Ada pengajuan permit yang telah disetujui HRGA dan menunggu persetujuan PM.';
    } elseif ($user['role_id'] === 6) {
        // PM
        if ($permit['status'] !== 'pending_pm') {
            sendError('Invalid permit status for PM approval.', 400);
        }
        $newStatus = 'approved';
        $step = 2;
        
        // Notify User
        $notificationUserId = $permit['user_id'];
        $notificationTitle = 'Permit Approved (Sah)';
        $notificationMessage = 'Pengajuan Permit Anda telah disetujui secara sah oleh Project Manager.';
    }

    // Update status
    $stmt = $pdo->prepare("UPDATE permits SET status = ? WHERE id = ?");
    $stmt->execute([$newStatus, $permitId]);

    // Jika disetujui PM (Final Approved) dan jenis permit adalah Cuti, otomatis potong kuota cuti
    if ($newStatus === 'approved' && isQuotaDeductiblePermitType($pdo, (int)$permit['permit_type_id'])) {
        $days = calculatePermitDays($permit['start_date'], $permit['end_date']);
        $year = (int)date('Y', strtotime($permit['start_date']));

        // Pastikan record leave_balances ada dan update used_days
        $balance = getOrCreateLeaveBalance($pdo, (int)$permit['user_id'], (int)$permit['permit_type_id'], $year);
        $newUsed = $balance['used_days'] + $days;

        $stmtDeduct = $pdo->prepare("
            UPDATE `leave_balances` 
            SET `used_days` = ? 
            WHERE `id` = ?
        ");
        $stmtDeduct->execute([$newUsed, $balance['id']]);
    }

    // Insert history
    $stmt = $pdo->prepare("INSERT INTO permit_approvals (permit_id, approver_user_id, approver_role, step, status, note) VALUES (?, ?, ?, ?, 'approved', ?)");
    $stmt->execute([$permitId, $user['id'], $user['role_name'], $step, $note]);

    // Create Notification
    if (!empty($pmUserIds)) {
        $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id) VALUES (?, ?, ?, 'info', 'permit', ?)");
        foreach ($pmUserIds as $pid) {
            $notifStmt->execute([$pid, $notificationTitle, $notificationMessage, $permitId]);
        }
    } elseif (!empty($notificationUserId)) {
        $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id) VALUES (?, ?, ?, 'info', 'permit', ?)");
        $stmt->execute([$notificationUserId, $notificationTitle, $notificationMessage, $permitId]);
    }

    // Audit log
    recordAuditLog($user['id'], 'PERMIT_APPROVE', 'PERMIT', $permitId, "Approved permit #$permitId");

    $pdo->commit();
    sendSuccess(null, 'Permit approved successfully.');

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendError('Failed to approve permit: ' . $e->getMessage(), 500);
}
