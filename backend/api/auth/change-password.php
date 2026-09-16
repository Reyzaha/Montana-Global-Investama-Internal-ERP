<?php
// ==========================================================
// MGI ERP / HRIS - Change Password API Endpoint
// Method: POST /backend/api/auth/change-password.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Metode request tidak diizinkan. Gunakan POST.', 405);
}

// Izinkan user dengan status must_change_password = true untuk mengakses endpoint ini
$currentUser = requireAuth(true);
$userId = (int)$currentUser['id'];

$input = getJsonInput();
$currentPassword = $input['current_password'] ?? '';
$newPassword = $input['new_password'] ?? '';
$confirmPassword = $input['confirm_password'] ?? '';

$errors = [];
if (empty($currentPassword)) {
    $errors['current_password'] = 'Kata sandi saat ini wajib diisi.';
}
if (empty($newPassword) || strlen($newPassword) < 8) {
    $errors['new_password'] = 'Kata sandi baru minimal harus 8 karakter.';
}
if ($newPassword !== $confirmPassword) {
    $errors['confirm_password'] = 'Konfirmasi kata sandi baru tidak cocok.';
}

if (!empty($errors)) {
    sendValidationError($errors, 'Mohon periksa kembali input formulir Anda.');
}

if ($currentPassword === $newPassword) {
    sendError('Kata sandi baru tidak boleh sama dengan kata sandi lama.', 400, [
        'new_password' => 'Pilihlah kata sandi yang berbeda dari kata sandi lama.'
    ]);
}

try {
    $pdo = getDbConnection();

    // Ambil password hash saat ini dari database
    $stmt = $pdo->prepare("SELECT password_hash, force_password_change FROM `users` WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $userId]);
    $userRow = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$userRow) {
        sendError('Pengguna tidak ditemukan.', 404);
    }

    // Verifikasi kata sandi saat ini
    if (!password_verify($currentPassword, $userRow['password_hash'])) {
        sendError('Kata sandi saat ini tidak sesuai.', 400, [
            'current_password' => 'Kata sandi saat ini salah.'
        ]);
    }

    // Hash kata sandi baru dengan Bcrypt Cost 12
    $newPasswordHash = password_hash($newPassword, PASSWORD_BCRYPT, [
        'cost' => defined('BCRYPT_COST') ? BCRYPT_COST : 12
    ]);

    // Update password dan matikan flag force_password_change
    $stmtUpdate = $pdo->prepare("
        UPDATE `users` 
        SET `password_hash` = :hash, 
            `force_password_change` = 0 
        WHERE id = :id
    ");
    $stmtUpdate->execute([
        ':hash' => $newPasswordHash,
        ':id' => $userId
    ]);

    // Bersihkan penanda sesi
    unset($_SESSION['must_change_password']);

    // Catat riwayat audit
    recordAuditLog(
        $userId,
        'CHANGE_PASSWORD',
        'AUTH',
        (string)$userId,
        'User successfully changed password (first login / self update)'
    );

    sendSuccess([
        'user_id' => $userId,
        'force_password_change' => 0,
        'redirect' => '/frontend/dashboard.html'
    ], 'Kata sandi berhasil diperbarui! Silakan melanjutkan ke sistem.');

} catch (Exception $e) {
    sendError('Gagal memperbarui kata sandi: ' . $e->getMessage(), 500);
}
