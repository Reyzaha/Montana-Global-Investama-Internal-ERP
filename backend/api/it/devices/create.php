<?php
// ==========================================================
// MGI ERP / HRIS - Create IT Device API
// Method: POST /backend/api/it/devices/create.php
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
$status         = trim($input['status'] ?? ($assignedUserId ? 'assigned' : 'in_stock'));
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
if (empty($brand)) {
    $errors['brand'] = 'Brand/Merk perangkat wajib diisi.';
}
if (empty($model)) {
    $errors['model'] = 'Model perangkat wajib diisi.';
}
if (!in_array($deviceType, $validTypes, true)) {
    $errors['device_type'] = 'Tipe perangkat tidak valid.';
}
if (!in_array($status, $validStatuses, true)) {
    $errors['status'] = 'Status kondisi tidak valid.';
}

if (!empty($errors)) {
    sendValidationError($errors, 'Mohon periksa kembali formulir input data perangkat.');
}

try {
    $pdo = getDbConnection();

    // Check duplicate asset code
    $stmtCheck = $pdo->prepare("SELECT id FROM `it_devices` WHERE `asset_code` = :asset_code LIMIT 1");
    $stmtCheck->execute([':asset_code' => $assetCode]);
    if ($stmtCheck->fetch()) {
        sendError('Kode aset sudah digunakan. Gunakan kode aset lain.', 409, ['asset_code' => 'Kode aset sudah terdaftar']);
    }

    // If user assigned, auto determine assigned_date if not specified
    if ($assignedUserId && empty($assignedDate)) {
        $assignedDate = date('Y-m-d');
    }

    $stmtInsert = $pdo->prepare("
        INSERT INTO `it_devices` (
            `asset_code`, `device_name`, `device_type`, `brand`, `model`,
            `serial_number`, `imei_number`, `phone_number`, `department_role`,
            `specs`, `assigned_user_id`, `assigned_date`, `status`, `notes`
        ) VALUES (
            :asset_code, :device_name, :device_type, :brand, :model,
            :serial_number, :imei_number, :phone_number, :department_role,
            :specs, :assigned_user_id, :assigned_date, :status, :notes
        )
    ");

    $stmtInsert->execute([
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

    $newDeviceId = (int)$pdo->lastInsertId();

    recordAuditLog(
        $currentUser['id'],
        'CREATE_DEVICE',
        'IT',
        (string)$newDeviceId,
        "Created IT Device: {$assetCode} ({$brand} {$model}), SN: {$serialNumber}, IMEI: {$imeiNumber}, Telp: {$phoneNumber}"
    );

    sendSuccess([
        'id' => $newDeviceId,
        'asset_code' => $assetCode,
        'device_name' => $deviceName
    ], 'Perangkat berhasil ditambahkan ke inventaris IT', null, 201);
} catch (Exception $e) {
    sendError('Gagal menyimpan perangkat: ' . $e->getMessage(), 500);
}
