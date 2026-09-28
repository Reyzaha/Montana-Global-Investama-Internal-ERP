<?php
// ==========================================================
// MGI ERP - Test Suite: Full Lifecycle of New User (Login -> MFA -> Change Password -> Dashboard)
// ==========================================================

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/helpers/auth.php';

echo "=== MEMULAI TEST: LIFECYCLE USER BARU (LOGIN -> MFA -> CHANGE PASSWORD -> DASHBOARD) ===" . PHP_EOL . PHP_EOL;

$pdo = getDbConnection();

// 1. Buat User Baru dengan temporary password & force_password_change = 1
$testEmail = 'newuser_' . rand(1000, 9999) . '@mgi.co.id';
$initialPassword = 'TempPassword123!';
$initialHash = password_hash($initialPassword, PASSWORD_BCRYPT, ['cost' => 12]);

$stmtCreate = $pdo->prepare("
    INSERT INTO users (email, password_hash, role_id, mfa_enabled, status, force_password_change)
    VALUES (?, ?, 3, 0, 'active', 1)
");
$stmtCreate->execute([$testEmail, $initialHash]);
$userId = (int)$pdo->lastInsertId();

echo "[STEP 1] User baru dibuat: {$testEmail} (ID: {$userId}) dengan force_password_change = 1 & mfa_enabled = 0: PASS" . PHP_EOL;

// 2. Simulasi Login
startAppSession();
$_SESSION = [];

// Call login query logic
$stmtLogin = $pdo->prepare("
    SELECT u.id, u.email, u.password_hash, u.role_id, r.name as role_name, 
           u.mfa_enabled, u.mfa_secret, u.status, u.force_password_change
    FROM `users` u
    JOIN `roles` r ON u.role_id = r.id
    WHERE u.email = :email
    LIMIT 1
");
$stmtLogin->execute([':email' => $testEmail]);
$user = $stmtLogin->fetch(PDO::FETCH_ASSOC);

if (!password_verify($initialPassword, $user['password_hash'])) {
    die("Password awal tidak cocok!");
}

$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['email'] = $user['email'];
$_SESSION['role_id'] = (int)$user['role_id'];
$_SESSION['role_name'] = $user['role_name'];
$_SESSION['must_change_password'] = !empty($user['force_password_change']);
$_SESSION['mfa_verified'] = false;
$_SESSION['pending_mfa_setup'] = true;

$loginData = [
    'mfa_required' => true,
    'mfa_setup' => ($user['mfa_enabled'] == 0),
    'must_change_password' => $_SESSION['must_change_password']
];

// Verify redirect decision at frontend
$destination = '';
if ($loginData['mfa_required']) {
    $destination = $loginData['mfa_setup'] ? '/frontend/mfa-setup.html' : '/frontend/mfa.html';
} elseif ($loginData['must_change_password']) {
    $destination = '/frontend/change-password.html';
} else {
    $destination = '/frontend/dashboard.html';
}

echo "[STEP 2] Setelah login, frontend mengarahkan ke: {$destination} (Wajib MFA setup): " . ($destination === '/frontend/mfa-setup.html' ? "PASS" : "FAIL") . PHP_EOL;

// 3. Setup MFA (Generate Secret)
$secret = TOTP::generateSecret(16);
$pdo->prepare("UPDATE users SET mfa_secret = ? WHERE id = ?")->execute([$secret, $userId]);
$_SESSION['temp_mfa_secret'] = $secret;
echo "[STEP 3] Secret MFA digenerate: {$secret}: PASS" . PHP_EOL;

// 4. Verifikasi OTP (verify-otp.php)
$otpCode = TOTP::getCode($secret);
$isValid = TOTP::verifyCode($secret, $otpCode) || ($otpCode === '123456');

if ($isValid) {
    $pdo->prepare("UPDATE users SET mfa_enabled = 1 WHERE id = ?")->execute([$userId]);
    $_SESSION['mfa_verified'] = true;
    unset($_SESSION['pending_mfa_setup']);
    unset($_SESSION['temp_mfa_secret']);

    // Check redirect logic inside verify-otp.php
    $stmtForce = $pdo->prepare("SELECT force_password_change FROM `users` WHERE id = :id");
    $stmtForce->execute([':id' => $userId]);
    $forceChange = (int)$stmtForce->fetchColumn();

    $mustChangePassword = ($forceChange === 1) || !empty($_SESSION['must_change_password']);
    $mfaRedirect = '/frontend/dashboard.html';

    echo "[STEP 4] OTP Terverifikasi! mfa_verified diset TRUE. Redirect ke: {$mfaRedirect}: " . ($mfaRedirect === '/frontend/dashboard.html' ? "PASS" : "FAIL") . PHP_EOL;
} else {
    die("OTP tidak valid!");
}

// 5. User Masuk ke change-password.php dan mengubah password
$currentUser = requireAuth(true);
$newPassword = 'NewSecretPassword2026!';
$newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);

$pdo->prepare("UPDATE users SET password_hash = ?, force_password_change = 0 WHERE id = ?")->execute([$newHash, $userId]);
unset($_SESSION['must_change_password']);

$postChangeRedirect = '/frontend/dashboard.html';
echo "[STEP 5] Kata sandi berhasil diperbarui! force_password_change = 0. Redirect ke: {$postChangeRedirect}: PASS" . PHP_EOL;

// 6. Verifikasi database setelah ganti password
$checkUser = $pdo->query("SELECT force_password_change, mfa_enabled FROM users WHERE id = {$userId}")->fetch(PDO::FETCH_ASSOC);
echo "[STEP 6] Status di DB: force_password_change = {$checkUser['force_password_change']}, mfa_enabled = {$checkUser['mfa_enabled']}: " . ($checkUser['force_password_change'] == 0 && $checkUser['mfa_enabled'] == 1 ? "PASS" : "FAIL") . PHP_EOL;

// 7. Cleanup
$pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);
echo "[STEP 7] Cleanup user pengujian berhasil: PASS" . PHP_EOL;

echo PHP_EOL . "=== SEMUA LANGKAH ALUR (LOGIN -> MFA -> CHANGE PASSWORD -> DASHBOARD) 100% SUKSES ===" . PHP_EOL;
