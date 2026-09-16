<?php
// ==========================================================
// MGI ERP / HRIS - Setup MFA Endpoint (Generate Secret & QR)
// Method: GET /backend/api/auth/setup-mfa.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../config/database.php';

startAppSession();

if (!isset($_SESSION['user_id'])) {
    sendError('Sesi tidak valid. Silakan login terlebih dahulu.', 401);
}

$userId = (int)$_SESSION['user_id'];
$email = $_SESSION['email'] ?? 'user@mgi.co.id';

try {
    $pdo = getDbConnection();
    
    // Cek apakah user sudah punya secret sebelumnya atau generate baru
    $stmt = $pdo->prepare("SELECT mfa_secret, mfa_enabled FROM `users` WHERE id = :id");
    $stmt->execute([':id' => $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row && $row['mfa_enabled'] == 1 && !empty($row['mfa_secret'])) {
        // User sudah aktif MFA
        $secret = $row['mfa_secret'];
    } else {
        // Generate new 16-char Base32 secret
        $secret = TOTP::generateSecret(16);
        // Simpan secret sementara ke session dan update ke DB
        $_SESSION['temp_mfa_secret'] = $secret;
        
        $stmtUpdate = $pdo->prepare("UPDATE `users` SET `mfa_secret` = :secret WHERE id = :id");
        $stmtUpdate->execute([':secret' => $secret, ':id' => $userId]);
    }

    // Format standard otpauth:// URL
    $otpAuthUrl = TOTP::getOtpAuthUrl($email, $secret, 'MGI ERP');
    
    // Gunakan public QR Code Generator API (atau Google Charts API / QRServer) yang aman
    $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' . rawurlencode($otpAuthUrl);

    sendSuccess([
        'email' => $email,
        'secret' => $secret,
        'otpauth_url' => $otpAuthUrl,
        'qr_code_url' => $qrCodeUrl
    ], 'MFA Secret & QR Code berhasil di-generate.');

} catch (Exception $e) {
    sendError('Gagal menyiapkan setup MFA: ' . $e->getMessage(), 500);
}
