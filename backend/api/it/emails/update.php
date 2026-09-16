<?php
// ==========================================================
// MGI ERP / HRIS - Update IT Email API
// Method: POST / PUT /backend/api/it/emails/update.php
// ==========================================================

require_once __DIR__ . '/../../../helpers/response.php';
require_once __DIR__ . '/../../../helpers/auth.php';
require_once __DIR__ . '/../../../helpers/audit.php';
require_once __DIR__ . '/../../../config/database.php';

$currentUser = requireRole([1, 7]);

$input = getJsonInput();
$id = isset($input['id']) ? (int)$input['id'] : 0;

if ($id <= 0) {
    sendError('ID email tidak valid.', 400);
}

$emailAddress       = strtolower(trim($input['email_address'] ?? ''));
$accountType        = trim($input['account_type'] ?? 'Personal Employee');
$purposeDescription = trim($input['purpose_description'] ?? '');
$primaryUserId      = !empty($input['primary_user_id']) ? (int)$input['primary_user_id'] : null;
$linkedDeviceId     = !empty($input['linked_device_id']) ? (int)$input['linked_device_id'] : null;
$status             = trim($input['status'] ?? 'active');
$notes              = trim($input['notes'] ?? '');

$validTypes = ['Personal Employee', 'Department / Shared', 'System / Service', 'Customer Service / External'];
$validStatuses = ['active', 'suspended', 'forwarded', 'archived'];

$errors = [];
if (empty($emailAddress) || !filter_var($emailAddress, FILTER_VALIDATE_EMAIL)) {
    $errors['email_address'] = 'Format alamat email tidak valid.';
}
if (empty($purposeDescription)) {
    $errors['purpose_description'] = 'Penjelasan fungsi dan tujuan email wajib diisi.';
}
if (!in_array($accountType, $validTypes, true)) {
    $errors['account_type'] = 'Tipe akun email tidak valid.';
}
if (!in_array($status, $validStatuses, true)) {
    $errors['status'] = 'Status akun email tidak valid.';
}

if (!empty($errors)) {
    sendValidationError($errors, 'Mohon periksa kembali formulir data email.');
}

try {
    $pdo = getDbConnection();

    // Verify existence
    $stmtFind = $pdo->prepare("SELECT id FROM `it_emails` WHERE `id` = :id LIMIT 1");
    $stmtFind->execute([':id' => $id]);
    if (!$stmtFind->fetch()) {
        sendError('Data email tidak ditemukan.', 404);
    }

    // Check duplicate email
    $stmtCheck = $pdo->prepare("SELECT id FROM `it_emails` WHERE `email_address` = :email AND `id` != :id LIMIT 1");
    $stmtCheck->execute([':email' => $emailAddress, ':id' => $id]);
    if ($stmtCheck->fetch()) {
        sendError('Alamat email sudah digunakan pada entri lain.', 409, ['email_address' => 'Email sudah terdaftar']);
    }

    // Verify device
    if ($linkedDeviceId) {
        $stmtDev = $pdo->prepare("SELECT id FROM `it_devices` WHERE `id` = :id LIMIT 1");
        $stmtDev->execute([':id' => $linkedDeviceId]);
        if (!$stmtDev->fetch()) {
            sendError('Perangkat yang dipilih tidak valid.', 400, ['linked_device_id' => 'Device ID tidak ditemukan']);
        }
    }

    $stmtUpdate = $pdo->prepare("
        UPDATE `it_emails` SET
            `email_address` = :email_address,
            `account_type` = :account_type,
            `purpose_description` = :purpose_description,
            `primary_user_id` = :primary_user_id,
            `linked_device_id` = :linked_device_id,
            `status` = :status,
            `notes` = :notes
        WHERE `id` = :id
    ");

    $stmtUpdate->execute([
        ':id'                  => $id,
        ':email_address'       => $emailAddress,
        ':account_type'        => $accountType,
        ':purpose_description' => $purposeDescription,
        ':primary_user_id'     => $primaryUserId,
        ':linked_device_id'    => $linkedDeviceId,
        ':status'              => $status,
        ':notes'               => $notes ?: null
    ]);

    recordAuditLog(
        $currentUser['id'],
        'UPDATE_EMAIL',
        'IT',
        (string)$id,
        "Updated IT Email ID {$id}: {$emailAddress}, Linked User: {$primaryUserId}, Linked Device: {$linkedDeviceId}, Status: {$status}"
    );

    sendSuccess([
        'id' => $id,
        'email_address' => $emailAddress
    ], 'Data email berhasil diperbarui');
} catch (Exception $e) {
    sendError('Gagal memperbarui data email: ' . $e->getMessage(), 500);
}
