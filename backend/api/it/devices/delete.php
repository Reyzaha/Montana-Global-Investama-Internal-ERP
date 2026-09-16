<?php
// ==========================================================
// MGI ERP / HRIS - Delete IT Device API
// Method: POST / DELETE /backend/api/it/devices/delete.php
// ==========================================================

require_once __DIR__ . '/../../../helpers/response.php';
require_once __DIR__ . '/../../../helpers/auth.php';
require_once __DIR__ . '/../../../helpers/audit.php';
require_once __DIR__ . '/../../../config/database.php';

$currentUser = requireRole([1, 7]);

$input = getJsonInput();
$id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);

if ($id <= 0) {
    sendError('ID perangkat tidak valid.', 400);
}

try {
    $pdo = getDbConnection();

    $stmtFind = $pdo->prepare("SELECT asset_code, brand, model FROM `it_devices` WHERE `id` = :id LIMIT 1");
    $stmtFind->execute([':id' => $id]);
    $device = $stmtFind->fetch(PDO::FETCH_ASSOC);

    if (!$device) {
        sendError('Perangkat tidak ditemukan.', 404);
    }

    // Check if there are linked emails
    $stmtEmailCount = $pdo->prepare("SELECT COUNT(*) FROM `it_emails` WHERE `linked_device_id` = :id");
    $stmtEmailCount->execute([':id' => $id]);
    $linkedEmails = (int)$stmtEmailCount->fetchColumn();

    if ($linkedEmails > 0) {
        // Unlink device from emails first or set null
        $stmtUnlink = $pdo->prepare("UPDATE `it_emails` SET `linked_device_id` = NULL WHERE `linked_device_id` = :id");
        $stmtUnlink->execute([':id' => $id]);
    }

    $stmtDelete = $pdo->prepare("DELETE FROM `it_devices` WHERE `id` = :id");
    $stmtDelete->execute([':id' => $id]);

    recordAuditLog(
        $currentUser['id'],
        'DELETE_DEVICE',
        'IT',
        (string)$id,
        "Deleted IT Device: {$device['asset_code']} ({$device['brand']} {$device['model']})"
    );

    sendSuccess(null, 'Perangkat berhasil dihapus dari sistem');
} catch (Exception $e) {
    sendError('Gagal menghapus perangkat: ' . $e->getMessage(), 500);
}
