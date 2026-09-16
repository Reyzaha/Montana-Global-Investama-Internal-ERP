<?php
// ==========================================================
// MGI ERP / HRIS - Create IT Email API
// Method: POST /backend/api/it/emails/create.php
// ==========================================================

require_once __DIR__ . '/../../../helpers/response.php';
require_once __DIR__ . '/../../../helpers/auth.php';
require_once __DIR__ . '/../../../helpers/audit.php';
require_once __DIR__ . '/../../../config/database.php';

$currentUser = requireRole([1, 7]);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Metode request tidak diizinkan. Gunakan POST.', 405);
}

$input = getJsonInput();

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

    // Check duplicate email
    $stmtCheck = $pdo->prepare("SELECT id FROM `it_emails` WHERE `email_address` = :email LIMIT 1");
    $stmtCheck->execute([':email' => $emailAddress]);
    if ($stmtCheck->fetch()) {
        sendError('Alamat email sudah terdata di sistem IT.', 409, ['email_address' => 'Email sudah terdaftar']);
    }

    // Verify linked device if given
    if ($linkedDeviceId) {
        $stmtDev = $pdo->prepare("SELECT id FROM `it_devices` WHERE `id` = :id LIMIT 1");
        $stmtDev->execute([':id' => $linkedDeviceId]);
        if (!$stmtDev->fetch()) {
            sendError('Perangkat yang dipilih tidak valid.', 400, ['linked_device_id' => 'Device ID tidak ditemukan']);
        }
    }

    $stmtInsert = $pdo->prepare("
        INSERT INTO `it_emails` (
            `email_address`, `account_type`, `purpose_description`, 
            `primary_user_id`, `linked_device_id`, `status`, `notes`
        ) VALUES (
            :email_address, :account_type, :purpose_description, 
            :primary_user_id, :linked_device_id, :status, :notes
        )
    ");

    $stmtInsert->execute([
        ':email_address'       => $emailAddress,
        ':account_type'        => $accountType,
        ':purpose_description' => $purposeDescription,
        ':primary_user_id'     => $primaryUserId,
        ':linked_device_id'    => $linkedDeviceId,
        ':status'              => $status,
        ':notes'               => $notes ?: null
    ]);

    $newEmailId = (int)$pdo->lastInsertId();

    recordAuditLog(
        $currentUser['id'],
        'CREATE_EMAIL',
        'IT',
        (string)$newEmailId,
        "Created IT Email: {$emailAddress} ({$accountType}), Linked User: {$primaryUserId}, Linked Device: {$linkedDeviceId}"
    );

    sendSuccess([
        'id' => $newEmailId,
        'email_address' => $emailAddress
    ], 'Data email berhasil disimpan', null, 201);
} catch (Exception $e) {
    sendError('Gagal menyimpan data email: ' . $e->getMessage(), 500);
}
