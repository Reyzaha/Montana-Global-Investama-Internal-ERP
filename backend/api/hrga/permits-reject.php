<?php
// ==========================================================
// MGI ERP / HRIS - Reject Permit API
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';

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

if (empty($note)) {
    sendError('Rejection note is required.', 400);
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT * FROM permits WHERE id = ? FOR UPDATE");
    $stmt->execute([$permitId]);
    $permit = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$permit) {
        sendError('Permit not found.', 404);
    }

    if ($permit['status'] === 'approved' || $permit['status'] === 'rejected') {
        sendError('Permit is already finalized.', 400);
    }

    $step = 0;
    $notificationTitle = '';

    if ($user['role_id'] === 2) {
        // HRGA
        if ($permit['status'] !== 'pending_hrga') {
            sendError('Invalid permit status for HRGA rejection.', 400);
        }
        $step = 1;
        $notificationTitle = 'Pengajuan Ditolak oleh HRGA';
    } elseif ($user['role_id'] === 6) {
        // PM
        if ($permit['status'] !== 'pending_pm') {
            sendError('Invalid permit status for PM rejection.', 400);
        }
        $step = 2;
        $notificationTitle = 'Pengajuan Ditolak oleh PM';
    }

    // Update status
    $stmt = $pdo->prepare("UPDATE permits SET status = 'rejected' WHERE id = ?");
    $stmt->execute([$permitId]);

    // Insert history
    $stmt = $pdo->prepare("INSERT INTO permit_approvals (permit_id, approver_user_id, approver_role, step, status, note) VALUES (?, ?, ?, ?, 'rejected', ?)");
    $stmt->execute([$permitId, $user['id'], $user['role_name'], $step, $note]);

    // Notify User
    $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id) VALUES (?, ?, ?, 'danger', 'permit', ?)");
    $stmt->execute([$permit['user_id'], $notificationTitle, $note, $permitId]);

    // Audit log
    recordAuditLog($user['id'], 'PERMIT_REJECT', 'PERMIT', $permitId, "Rejected permit #$permitId");

    $pdo->commit();
    sendSuccess(null, 'Permit rejected successfully.');

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendError('Failed to reject permit: ' . $e->getMessage(), 500);
}
