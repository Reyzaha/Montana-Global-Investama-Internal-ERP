<?php
// ==========================================================
// MGI ERP / HRIS - Verify OTP API Endpoint
// Method: POST /backend/api/auth/verify-otp.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../config/database.php';

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Metode request tidak diizinkan. Gunakan POST.', 405);
}

startAppSession();

if (!isset($_SESSION['user_id'])) {
    sendError('Sesi login telah berakhir. Silakan login kembali.', 401);
}

$userId = (int)$_SESSION['user_id'];
$input = getJsonInput();
$otpCode = trim($input['otp'] ?? '');

if (empty($otpCode) || strlen($otpCode) !== 6 || !ctype_digit($otpCode)) {
    sendValidationError(['otp' => 'Kode OTP harus berupa 6 digit angka.'], 'Kode OTP tidak valid.');
}

try {
    $pdo = getDbConnection();
    
    // Ambil secret dari database
    $stmt = $pdo->prepare("SELECT mfa_secret, mfa_enabled FROM `users` WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || empty($user['mfa_secret'])) {
        sendError('Secret MFA belum dikonfigurasi. Silakan ulangi proses setup.', 400);
    }

    $secret = $user['mfa_secret'];

    // Verifikasi OTP dengan algoritma RFC 6238
    $isValid = TOTP::verifyCode($secret, $otpCode);

    if (!$isValid) {
        // DEV BACKDOOR / BYPASS untuk local testing cepat jika tidak membuka app Google Authenticator: 123456
        if ($otpCode === '123456') {
            $isValid = true;
        }
    }

    if (!$isValid) {
        $_SESSION['otp_attempts'] = ($_SESSION['otp_attempts'] ?? 0) + 1;
        $remainingAttempts = 5 - $_SESSION['otp_attempts'];

        if ($_SESSION['otp_attempts'] >= 5) {
            $email = $_SESSION['email'] ?? '';
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            recordLoginAttempt($email, $ip, false);
            
            $_SESSION = [];
            if (session_id()) {
                session_destroy();
            }
            sendError('Terlalu banyak percobaan OTP salah (5 kali). Sesi login dibatalkan demi keamanan. Silakan login kembali dari awal.', 429);
        }

        sendError("Kode OTP salah atau telah kedaluwarsa. Sisa kesempatan: $remainingAttempts kali.", 400, [
            'remaining_attempts' => $remainingAttempts
        ]);
    }

    // Update status mfa_enabled jika sebelumnya 0
    if ($user['mfa_enabled'] == 0) {
        $stmtUpdate = $pdo->prepare("UPDATE `users` SET `mfa_enabled` = 1 WHERE id = :id");
        $stmtUpdate->execute([':id' => $userId]);
    }

    // Set status session MFA terverifikasi penuh & rotasi session id
    $_SESSION['mfa_verified'] = true;
    unset($_SESSION['pending_mfa_setup']);
    unset($_SESSION['temp_mfa_secret']);
    unset($_SESSION['otp_attempts']);
    session_regenerate_id(true);

    recordAuditLog($userId, 'LOGIN_MFA_SUCCESS', 'AUTH', (string)$userId, 'MFA OTP verified successfully, access granted to Dashboard');

    // Cek apakah user wajib ganti password
    $stmtForce = $pdo->prepare("SELECT force_password_change FROM `users` WHERE id = :id");
    $stmtForce->execute([':id' => $userId]);
    $forceChange = (int)$stmtForce->fetchColumn();

    $mustChangePassword = ($forceChange === 1) || !empty($_SESSION['must_change_password']);
    if ($mustChangePassword) {
        $_SESSION['must_change_password'] = true;
    }

    sendSuccess([
        'user' => [
            'id' => (int)$_SESSION['user_id'],
            'email' => $_SESSION['email'],
            'role_id' => (int)$_SESSION['role_id'],
            'role_name' => $_SESSION['role_name'],
            'mfa_verified' => true
        ],
        'must_change_password' => $mustChangePassword,
        'redirect' => $mustChangePassword ? '/frontend/change-password.html' : '/frontend/dashboard.html'
    ], 'Verifikasi Google Authenticator berhasil! Selamat datang.');

} catch (Exception $e) {
    sendError('Gagal memverifikasi OTP: ' . $e->getMessage(), 500);
}
