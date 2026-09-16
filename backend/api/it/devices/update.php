<?php
// ==========================================================
// MGI ERP / HRIS - Update IT Device API
// Method: POST / PUT /backend/api/it/devices/update.php
// ==========================================================

require_once __DIR__ . '/../../../helpers/response.php';
require_once __DIR__ . '/../../../helpers/auth.php';
require_once __DIR__ . '/../../../helpers/audit.php';
require_once __DIR__ . '/../../../config/database.php';

$currentUser = requireRole([1, 7]);

$input = getJsonInput();
$id = isset($input['id']) ? (int)$input['id'] : 0;

if ($id <= 0) {
    sendError('ID perangkat tidak valid.', 400);
}

$assetCode      = trim($input['asset_code'] ?? '');
$deviceName     = trim($input['device_name'] ?? '');
$deviceType     = trim($input['device_type'] ?? 'Laptop');
$brand          = trim($input['brand'] ?? '');
$model          = trim($input['model'] ?? '');
$serialNumber   = trim($input['serial_number'] ?? '');
$imeiNumber     = trim($input['imei_number'] ?? '');
$phoneNumber    = trim($input['phone_number'] ?? '');
$departmentRole = trim($input['department_role'] ?? '');
$specs          = trim($input['specs'] ?? '');
$assignedUserId = !empty($input['assigned_user_id']) ? (int)$input['assigned_user_id'] : null;
$assignedDate   = !empty($input['assigned_date']) ? $input['assigned_date'] : null;
$status         = trim($input['status'] ?? 'in_stock');
$notes          = trim($input['notes'] ?? '');

$validTypes = ['Laptop', 'PC Desktop', 'Smartphone', 'Tablet', 'Monitor', 'Printer', 'Lainnya'];
$validStatuses = ['assigned', 'in_stock', 'under_maintenance', 'damaged', 'disposed'];

$errors = [];
if (empty($assetCode)) {
    $errors['asset_code'] = 'Kode aset wajib diisi.';
}
if (empty($deviceName)) {
    $errors['device_name'] = 'Nama perangkat wajib diisi.';
}
if (!in_array($deviceType, $validTypes, true)) {
    $errors['device_type'] = 'Tipe perangkat tidak valid.';
}
if (!in_array($status, $validStatuses, true)) {
    $errors['status'] = 'Status kondisi tidak valid.';
}

if (!empty($errors)) {
    sendValidationError($errors, 'Mohon periksa kembali formulir update data perangkat.');
}

try {
    $pdo = getDbConnection();

    // Check device existence
    $stmtFind = $pdo->prepare("SELECT * FROM `it_devices` WHERE `id` = :id LIMIT 1");
    $stmtFind->execute([':id' => $id]);
    $existing = $stmtFind->fetch(PDO::FETCH_ASSOC);
    if (!$existing) {
        sendError('Perangkat tidak ditemukan.', 404);
    }

    // Check duplicate asset code
    $stmtCheck = $pdo->prepare("SELECT id FROM `it_devices` WHERE `asset_code` = :asset_code AND `id` != :id LIMIT 1");
    $stmtCheck->execute([':asset_code' => $assetCode, ':id' => $id]);
    if ($stmtCheck->fetch()) {
        sendError('Kode aset sudah digunakan pada perangkat lain.', 409, ['asset_code' => 'Kode aset sudah terdaftar']);
    }

    // If assigned to user and assigned_date was empty, default to today
    if ($assignedUserId && empty($assignedDate)) {
        $assignedDate = !empty($existing['assigned_date']) ? $existing['assigned_date'] : date('Y-m-d');
    } elseif (!$assignedUserId) {
        $assignedDate = null;
    }

    $stmtUpdate = $pdo->prepare("
        UPDATE `it_devices` SET
            `asset_code` = :asset_code,
            `device_name` = :device_name,
            `device_type` = :device_type,
            `brand` = :brand,
            `model` = :model,
            `serial_number` = :serial_number,
            `imei_number` = :imei_number,
            `phone_number` = :phone_number,
            `department_role` = :department_role,
            `specs` = :specs,
            `assigned_user_id` = :assigned_user_id,
            `assigned_date` = :assigned_date,
            `status` = :status,
            `notes` = :notes
        WHERE `id` = :id
    ");

    $stmtUpdate->execute([
        ':id'              => $id,
        ':asset_code'      => $assetCode,
        ':device_name'     => $deviceName,
        ':device_type'     => $deviceType,
        ':brand'           => $brand,
        ':model'           => $model,
        ':serial_number'   => $serialNumber ?: null,
        ':imei_number'     => $imeiNumber ?: null,
        ':phone_number'    => $phoneNumber ?: null,
        ':department_role' => $departmentRole ?: null,
        ':specs'           => $specs ?: null,
        ':assigned_user_id'=> $assignedUserId,
        ':assigned_date'   => $assignedDate,
        ':status'          => $status,
        ':notes'           => $notes ?: null
    ]);

    recordAuditLog(
        $currentUser['id'],
        'UPDATE_DEVICE',
        'IT',
        (string)$id,
        "Updated IT Device ID {$id}: {$assetCode}, SN: {$serialNumber}, IMEI: {$imeiNumber}, Status: {$status}"
    );

    sendSuccess([
        'id' => $id,
        'asset_code' => $assetCode
    ], 'Data perangkat berhasil diperbarui');
} catch (Exception $e) {
    sendError('Gagal memperbarui perangkat: ' . $e->getMessage(), 500);
}
