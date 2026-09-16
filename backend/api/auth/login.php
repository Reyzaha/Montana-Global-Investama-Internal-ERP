<?php
// ==========================================================
// MGI ERP / HRIS - Login API Endpoint
// Method: POST /backend/api/auth/login.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../config/database.php';

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Metode request tidak diizinkan. Gunakan POST.', 405);
}

$input = getJsonInput();
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

// Validation
$errors = [];
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Format email tidak valid.';
}
if (empty($password)) {
    $errors['password'] = 'Kata sandi wajib diisi.';
}

if (!empty($errors)) {
    sendValidationError($errors, 'Mohon masukkan email dan password yang valid.');
}

$ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

// 1. Check Rate Limiting
$rateLimit = checkLoginRateLimit($email, $ip);
if (!$rateLimit['allowed']) {
    sendError($rateLimit['message'], 429, ['retry_after' => $rateLimit['retry_after']]);
}

try {
    $pdo = getDbConnection();
    
    // Cari user beserta nama role
    $stmt = $pdo->prepare("
        SELECT u.id, u.email, u.password_hash, u.role_id, r.name as role_name, 
               u.mfa_enabled, u.mfa_secret, u.status, u.force_password_change
        FROM `users` u
        JOIN `roles` r ON u.role_id = r.id
        WHERE u.email = :email
        LIMIT 1
    ");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verifikasi user & status
    if (!$user) {
        recordLoginAttempt($email, $ip, false);
        sendError('Email atau kata sandi tidak sesuai.', 401);
    }

    if ($user['status'] !== 'active') {
        sendError('Akun Anda sedang dinonaktifkan. Hubungi IT Administrator.', 403);
    }

    // Verifikasi password hash
    if (!password_verify($password, $user['password_hash'])) {
        recordLoginAttempt($email, $ip, false);
        sendError('Email atau kata sandi tidak sesuai.', 401);
    }

    // Login Sukses: Catat attempt berhasil & rehash jika cost < 12
    recordLoginAttempt($email, $ip, true);
    rehashPasswordIfNeeded($pdo, (int)$user['id'], $user['password_hash'], $password);

    // Mulai Session & Regenerate ID
    startAppSession();
    session_regenerate_id(true);

    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['role_id'] = (int)$user['role_id'];
    $_SESSION['role_name'] = $user['role_name'];

    // Cek status kewajiban ganti password login pertama
    $mustChangePassword = !empty($user['force_password_change']);
    if ($mustChangePassword) {
        $_SESSION['must_change_password'] = true;
    } else {
        unset($_SESSION['must_change_password']);
    }

    // Cek MFA Status
    $mfaEnabled = (bool)$user['mfa_enabled'];
    $hasSecret = !empty($user['mfa_secret']);

    if (!$mfaEnabled) {
        // Jika MFA belum diaktifkan, tandai butuh setup MFA
        $_SESSION['mfa_verified'] = false;
        $_SESSION['pending_mfa_setup'] = true;

        recordAuditLog($user['id'], 'LOGIN_PASSWORD_OK', 'AUTH', (string)$user['id'], 'Password verified, requires MFA enrollment');

        sendSuccess([
            'mfa_required' => true,
            'mfa_setup' => true,
            'must_change_password' => $mustChangePassword,
            'user' => [
                'id' => (int)$user['id'],
                'email' => $user['email'],
                'role_id' => (int)$user['role_id'],
                'role_name' => $user['role_name']
            ]
        ], $mustChangePassword 
            ? 'Kredensial valid. Anda wajib mengganti kata sandi pada login pertama.' 
            : 'Kredensial valid. Silakan lakukan aktivasi Google Authenticator (MFA).');
    } else {
        // MFA sudah aktif, butuh verifikasi OTP
        $_SESSION['mfa_verified'] = false;
        $_SESSION['pending_mfa_setup'] = false;

        recordAuditLog($user['id'], 'LOGIN_PASSWORD_OK', 'AUTH', (string)$user['id'], 'Password verified, waiting for OTP input');

        sendSuccess([
            'mfa_required' => true,
            'mfa_setup' => false,
            'must_change_password' => $mustChangePassword,
            'user' => [
                'id' => (int)$user['id'],
                'email' => $user['email'],
                'role_id' => (int)$user['role_id'],
                'role_name' => $user['role_name']
            ]
        ], 'Kredensial valid. Masukkan 6-digit kode Google Authenticator Anda.');
    }

} catch (Exception $e) {
    sendError('Terjadi kesalahan saat memproses login: ' . $e->getMessage(), 500);
}
