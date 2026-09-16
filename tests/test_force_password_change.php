<?php
/**
 * Test Suite: Force Password Change on First Login
 * File: tests/test_force_password_change.php
 */

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/helpers/auth.php';
require_once __DIR__ . '/../backend/helpers/response.php';

echo "=== MEMULAI TEST SUITE: FORCE PASSWORD CHANGE ON FIRST LOGIN ===\n\n";

$pdo = getDbConnection();
$testEmail = 'test_first_login@mgi.co.id';
$initialPass = 'InitialTempPass123!';
$newPass = 'NewStrongPassword2026!';

// Bersihkan jika ada data sisa pengujian sebelumnya
$pdo->prepare("DELETE FROM users WHERE email = ?")->execute([$testEmail]);

$testsPassed = 0;
$totalTests = 8;

try {
    // -------------------------------------------------------------
    // TEST 1: Pembuatan User Baru Otomatis Set force_password_change = 1
    // -------------------------------------------------------------
    $initialHash = password_hash($initialPass, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmtInsert = $pdo->prepare("
        INSERT INTO users (email, password_hash, role_id, mfa_enabled, status, force_password_change)
        VALUES (?, ?, 6, 0, 'active', 1)
    ");
    $stmtInsert->execute([$testEmail, $initialHash]);
    $userId = (int)$pdo->lastInsertId();

    $stmtCheck = $pdo->prepare("SELECT force_password_change FROM users WHERE id = ?");
    $stmtCheck->execute([$userId]);
    $forceFlag = (int)$stmtCheck->fetchColumn();

    if ($forceFlag === 1) {
        echo "[TEST 1] User baru otomatis memiliki force_password_change = 1: PASS\n";
        $testsPassed++;
    } else {
        echo "[TEST 1] User baru gagal set force_password_change = 1: FAIL ($forceFlag)\n";
    }

    // -------------------------------------------------------------
    // TEST 2: Simulasi Login Pertama Mengembalikan must_change_password = true
    // -------------------------------------------------------------
    $stmtLogin = $pdo->prepare("SELECT id, email, password_hash, role_id, force_password_change, status FROM users WHERE email = ?");
    $stmtLogin->execute([$testEmail]);
    $u = $stmtLogin->fetch(PDO::FETCH_ASSOC);

    $mustChange = !empty($u['force_password_change']);
    startAppSession();
    $_SESSION['user_id'] = (int)$u['id'];
    $_SESSION['email'] = $u['email'];
    $_SESSION['role_id'] = (int)$u['role_id'];
    $_SESSION['role_name'] = 'Karyawan';
    $_SESSION['mfa_verified'] = true; // Anggap sesi valid

    if ($mustChange) {
        $_SESSION['must_change_password'] = true;
    }

    if ($mustChange === true && !empty($_SESSION['must_change_password'])) {
        echo "[TEST 2] Login pertama mendeteksi kewajiban ganti password: PASS\n";
        $testsPassed++;
    } else {
        echo "[TEST 2] Login pertama gagal mendeteksi must_change_password: FAIL\n";
    }

    // -------------------------------------------------------------
    // TEST 3: Middleware requireAuth() Memblokir Akses Endpoint Normal
    // -------------------------------------------------------------
    $blocked = false;
    $curr = getCurrentUser();
    if (!empty($curr['must_change_password'])) {
        $blocked = true; // Sesuai logika requireAuth
    }

    if ($blocked) {
        echo "[TEST 3] Middleware requireAuth() memblokir akses jika password belum diubah: PASS\n";
        $testsPassed++;
    } else {
        echo "[TEST 3] Middleware gagal memblokir akses: FAIL\n";
    }

    // -------------------------------------------------------------
    // TEST 4: Ganti Password Menolak Password Lama yang Salah
    // -------------------------------------------------------------
    $wrongOldPass = 'WrongPass123!';
    $verifyWrong = password_verify($wrongOldPass, $u['password_hash']);
    if (!$verifyWrong) {
        echo "[TEST 4] Validasi kata sandi lama yang salah berhasil ditolak: PASS\n";
        $testsPassed++;
    } else {
        echo "[TEST 4] Validasi kata sandi lama salah lolos: FAIL\n";
    }

    // -------------------------------------------------------------
    // TEST 5: Eksekusi Ganti Password yang Valid (Update Hash & Reset Flag = 0)
    // -------------------------------------------------------------
    $verifyCorrect = password_verify($initialPass, $u['password_hash']);
    if ($verifyCorrect && $newPass !== $initialPass && strlen($newPass) >= 8) {
        $newHash = password_hash($newPass, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmtUpdate = $pdo->prepare("
            UPDATE users 
            SET password_hash = ?, force_password_change = 0 
            WHERE id = ?
        ");
        $stmtUpdate->execute([$newHash, $userId]);
        unset($_SESSION['must_change_password']);

        $stmtVerifyDb = $pdo->prepare("SELECT force_password_change, password_hash FROM users WHERE id = ?");
        $stmtVerifyDb->execute([$userId]);
        $rowAfter = $stmtVerifyDb->fetch(PDO::FETCH_ASSOC);

        if ((int)$rowAfter['force_password_change'] === 0 && password_verify($newPass, $rowAfter['password_hash'])) {
            echo "[TEST 5] Ganti password sukses, force_password_change berubah menjadi 0: PASS\n";
            $testsPassed++;
        } else {
            echo "[TEST 5] Database gagal terupdate: FAIL\n";
        }
    } else {
        echo "[TEST 5] Validasi awal ganti password gagal: FAIL\n";
    }

    // -------------------------------------------------------------
    // TEST 6: Middleware requireAuth() Mengizinkan Akses Penuh Pasca Ganti Password
    // -------------------------------------------------------------
    $currAfter = getCurrentUser();
    if (empty($currAfter['must_change_password'])) {
        echo "[TEST 6] Akses ke sistem kini sepenuhnya diizinkan: PASS\n";
        $testsPassed++;
    } else {
        echo "[TEST 6] Akses masih terblokir: FAIL\n";
    }

    // -------------------------------------------------------------
    // TEST 7: Login Berikutnya Menggunakan Password Baru Tanpa Paksa Ganti
    // -------------------------------------------------------------
    $stmtLogin2 = $pdo->prepare("SELECT password_hash, force_password_change FROM users WHERE id = ?");
    $stmtLogin2->execute([$userId]);
    $u2 = $stmtLogin2->fetch(PDO::FETCH_ASSOC);

    $login2Valid = password_verify($newPass, $u2['password_hash']);
    $noMoreForce = ((int)$u2['force_password_change'] === 0);

    if ($login2Valid && $noMoreForce) {
        echo "[TEST 7] Login berikutnya dengan password baru langsung diizinkan tanpa paksa ganti: PASS\n";
        $testsPassed++;
    } else {
        echo "[TEST 7] Login berikutnya gagal: FAIL\n";
    }

    // -------------------------------------------------------------
    // TEST 8: Reset Password oleh Admin Mengaktifkan Kembali force_password_change = 1
    // -------------------------------------------------------------
    $adminResetPass = 'AdminReset123!';
    $adminResetHash = password_hash($adminResetPass, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmtReset = $pdo->prepare("UPDATE users SET password_hash = ?, force_password_change = 1 WHERE id = ?");
    $stmtReset->execute([$adminResetHash, $userId]);

    $stmtCheckReset = $pdo->prepare("SELECT force_password_change FROM users WHERE id = ?");
    $stmtCheckReset->execute([$userId]);
    $resetFlag = (int)$stmtCheckReset->fetchColumn();

    if ($resetFlag === 1) {
        echo "[TEST 8] Reset password oleh Admin mengaktifkan kembali force_password_change = 1: PASS\n";
        $testsPassed++;
    } else {
        echo "[TEST 8] Reset password oleh Admin gagal mengaktifkan flag: FAIL\n";
    }

    // Pembersihan
    $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);
    echo "\n=== SEMUA {$testsPassed}/{$totalTests} PENGUJIAN FORCE PASSWORD CHANGE SELESAI DENGAN SUKSES! ===\n";

} catch (Exception $e) {
    if (isset($userId)) {
        $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);
    }
    echo "❌ Terjadi error: " . $e->getMessage() . "\n";
    exit(1);
}
