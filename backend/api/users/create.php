<?php
// ==========================================================
// MGI ERP / HRIS - Create User API
// Method: POST /backend/api/users/create.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Metode request tidak diizinkan. Gunakan POST.', 405);
}

$input = getJsonInput();

$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
$roleId = isset($input['role_id']) ? (int)$input['role_id'] : 0;

// Validations
$errors = [];
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Format email tidak valid.';
}
if (empty($password) || strlen($password) < 8) {
    $errors['password'] = 'Kata sandi minimal harus 8 karakter.';
}
if ($roleId < 1 || $roleId > 7) {
    $errors['role_id'] = 'Pilihan role tidak valid.';
}

if (!empty($errors)) {
    sendValidationError($errors, 'Mohon lengkapi dan periksa kembali data formulir.');
}

try {
    $pdo = getDbConnection();
    
    // Check duplicate email
    $stmtCheck = $pdo->prepare("SELECT id FROM `users` WHERE `email` = :email LIMIT 1");
    $stmtCheck->execute([':email' => $email]);
    if ($stmtCheck->fetch()) {
        sendError('Email sudah terdaftar dalam sistem.', 409, ['email' => 'Email telah digunakan']);
    }
    
    // Hash password with standard bcrypt cost 12
    require_once __DIR__ . '/../../helpers/auth.php';
    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => defined('BCRYPT_COST') ? BCRYPT_COST : 12]);
    
    $stmtInsert = $pdo->prepare("
        INSERT INTO `users` (`email`, `password_hash`, `role_id`, `mfa_enabled`, `status`, `force_password_change`)
        VALUES (:email, :password_hash, :role_id, 0, 'active', 1)
    ");
    
    $stmtInsert->execute([
        ':email' => $email,
        ':password_hash' => $passwordHash,
        ':role_id' => $roleId
    ]);
    
    $newUserId = (int)$pdo->lastInsertId();
    
    // Auto-generate Onboarding Lifecycle Tasks (IT, HRGA, Legal)
    require_once __DIR__ . '/../../helpers/overtime.php';
    initializeUserLifecycleChecklist($pdo, $newUserId, 'onboarding');

    // Record audit log
    recordAuditLog(
        null, 
        'CREATE_USER', 
        'USER', 
        (string)$newUserId, 
        "Created new user {$email} with role ID {$roleId} and initialized onboarding checklist"
    );
    
    // Get role name
    $stmtRole = $pdo->prepare("SELECT name FROM `roles` WHERE id = :id");
    $stmtRole->execute([':id' => $roleId]);
    $roleName = $stmtRole->fetchColumn() ?: 'Unknown';
    
    sendSuccess([
        'id' => $newUserId,
        'email' => $email,
        'role_id' => $roleId,
        'role_name' => $roleName,
        'status' => 'active',
        'force_password_change' => 1
    ], 'User baru berhasil dibuat', null, 201);
} catch (Exception $e) {
    sendError('Gagal menyimpan user baru: ' . $e->getMessage(), 500);
}
