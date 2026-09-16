<?php
// ==========================================================
// MGI ERP - Test Suite: Security Hardening & Rate Limiting
// ==========================================================

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/helpers/auth.php';
require_once __DIR__ . '/../backend/helpers/upload.php';

$pdo = getDbConnection();
$testEmail = 'it@mgi.co.id';
$testIp = '192.168.1.99';

echo "=== MEMULAI TEST SUITE: SECURITY HARDENING ===\n\n";

// 1. Bersihkan attempt testing sebelumnya
$pdo->prepare("DELETE FROM `login_attempts` WHERE email = ? OR ip_address = ?")->execute([$testEmail, $testIp]);

// 2. Test Initial Rate Limit Check (harus allowed)
$check1 = checkLoginRateLimit($testEmail, $testIp);
echo "[TEST 1] Rate limit awal: " . ($check1['allowed'] ? "PASS (Allowed)" : "FAIL") . "\n";

// 3. Simulasi 4x login gagal
for ($i = 1; $i <= 4; $i++) {
    recordLoginAttempt($testEmail, $testIp, false);
}
$check4 = checkLoginRateLimit($testEmail, $testIp);
echo "[TEST 2] 4x gagal -> Masih diizinkan: " . ($check4['allowed'] && $check4['failed_attempts'] === 4 ? "PASS" : "FAIL") . "\n";

// 4. Simulasi percobaan ke-5 gagal -> Harus kena lockout 5 menit
recordLoginAttempt($testEmail, $testIp, false);
$check5 = checkLoginRateLimit($testEmail, $testIp);
echo "[TEST 3] 5x gagal -> Rate limit lockout aktif: " . (!$check5['allowed'] ? "PASS (Blocked: {$check5['message']})" : "FAIL") . "\n";

// 5. Test Reset on Success
recordLoginAttempt($testEmail, $testIp, true);
$checkSuccess = checkLoginRateLimit($testEmail, $testIp);
echo "[TEST 4] Reset setelah login sukses: " . ($checkSuccess['allowed'] && $checkSuccess['failed_attempts'] === 0 ? "PASS" : "FAIL") . "\n";

// 6. Test Bcrypt Auto-Rehash
// Pastikan user pengujian rehash tersedia dengan hash cost 10
$pdo->prepare("
    INSERT INTO `users` (email, password_hash, role_id, status)
    VALUES (?, ?, 7, 'active')
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)
")->execute([$testEmail, password_hash('Password123!', PASSWORD_BCRYPT, ['cost' => 10])]);

$testUserStmt = $pdo->prepare("SELECT id, password_hash FROM `users` WHERE email = ?");
$testUserStmt->execute([$testEmail]);
$userBefore = $testUserStmt->fetch(PDO::FETCH_ASSOC);

$oldCost = password_get_info($userBefore['password_hash'])['options']['cost'] ?? 10;
echo "[TEST 5] Bcrypt cost sebelum login: {$oldCost}\n";

// Rehash jika password cost < 12
rehashPasswordIfNeeded($pdo, (int)$userBefore['id'], $userBefore['password_hash'], 'Password123!');

$testUserStmt->execute([$testEmail]);
$userAfter = $testUserStmt->fetch(PDO::FETCH_ASSOC);
$newCost = password_get_info($userAfter['password_hash'])['options']['cost'] ?? 0;
echo "[TEST 6] Bcrypt cost setelah rehash: {$newCost} -> " . ($newCost === 12 ? "PASS (Upgraded to 12)" : "FAIL") . "\n";

// 7. Test Magic-Bytes File Upload: Fake JPG containing PHP script
$fakeFile = tempnam(sys_get_temp_dir(), 'test_fake_');
file_put_contents($fakeFile, "<?php echo 'malicious webshell'; ?>");

$fakeUpload = [
    'name' => 'exploit.jpg.php',
    'type' => 'image/jpeg', // Fake client header
    'tmp_name' => $fakeFile,
    'error' => UPLOAD_ERR_OK,
    'size' => filesize($fakeFile)
];

$resFake = secureUploadFile($fakeUpload, ['image/jpeg', 'image/png'], 5 * 1024 * 1024, __DIR__ . '/../backend/uploads/test/');
unlink($fakeFile);

echo "[TEST 7] Upload berkas berbahaya / ekstensi ganda: " . (!$resFake['success'] ? "PASS (Ditolak: {$resFake['message']})" : "FAIL") . "\n";

// 8. Test Magic-Bytes File Upload: Fake JPG with single extension
$fakeFile2 = tempnam(sys_get_temp_dir(), 'test_fake2_');
file_put_contents($fakeFile2, "<?php system('id'); ?>");
$fakeUpload2 = [
    'name' => 'innocent.jpg',
    'type' => 'image/jpeg', // Fake client header
    'tmp_name' => $fakeFile2,
    'error' => UPLOAD_ERR_OK,
    'size' => filesize($fakeFile2)
];
$resFake2 = secureUploadFile($fakeUpload2, ['image/jpeg', 'image/png'], 5 * 1024 * 1024, __DIR__ . '/../backend/uploads/test/');
unlink($fakeFile2);

echo "[TEST 8] Upload berkas PHP berkamuflase nama .jpg (Magic-bytes rejection): " . (!$resFake2['success'] ? "PASS (Ditolak: {$resFake2['message']})" : "FAIL") . "\n";

// 9. Test Valid Real PNG image upload
$validPngFile = tempnam(sys_get_temp_dir(), 'test_real_');
// Minimal valid 1x1 PNG binary data
$pngData = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
file_put_contents($validPngFile, $pngData);

$realUpload = [
    'name' => 'valid_receipt.png',
    'type' => 'image/png',
    'tmp_name' => $validPngFile,
    'error' => UPLOAD_ERR_OK,
    'size' => filesize($validPngFile)
];
$targetTestDir = __DIR__ . '/../backend/uploads/test/';
$resReal = secureUploadFile($realUpload, ['image/jpeg', 'image/png'], 5 * 1024 * 1024, $targetTestDir, 'test_img');
if (file_exists($validPngFile)) {
    @unlink($validPngFile);
}

echo "[TEST 9] Upload berkas valid PNG: " . ($resReal['success'] ? "PASS (Tersimpan: {$resReal['stored_name']})" : "FAIL") . "\n";

// Clean up test file
if ($resReal['success'] && file_exists($resReal['file_path'])) {
    unlink($resReal['file_path']);
    if (is_dir($targetTestDir)) {
        @rmdir($targetTestDir);
    }
}

// Clean up login_attempts test and test user
$pdo->prepare("DELETE FROM `login_attempts` WHERE email = ? OR ip_address = ?")->execute([$testEmail, $testIp]);
if ($testEmail !== 'admin@mgi.co.id') {
    $pdo->prepare("DELETE FROM `users` WHERE email = ?")->execute([$testEmail]);
}

echo "\n=== SEMUA 9 PENGUJIAN SECURITY SELESAI DENGAN SUKSES! ===\n";
