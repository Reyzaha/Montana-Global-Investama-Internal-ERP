<?php
// ==========================================================
// MGI ERP / HRIS - Test Suite: Access Control Matrix & Overrides
// ==========================================================

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/helpers/auth.php';

echo "=== MEMULAI TEST SUITE: ACCESS CONTROL & PERMISSION OVERRIDES ===" . PHP_EOL . PHP_EOL;

$pdo = getDbConnection();

// Users:
$itUser = $pdo->query("SELECT id, email, role_id FROM users WHERE role_id = 1 LIMIT 1")->fetch(PDO::FETCH_ASSOC) ?: ['id' => 101, 'email' => 'test_it@mgi.co.id', 'role_id' => 1];
$hrgaUser = $pdo->query("SELECT id, email, role_id FROM users WHERE role_id = 2 LIMIT 1")->fetch(PDO::FETCH_ASSOC) ?: ['id' => 102, 'email' => 'test_hrga@mgi.co.id', 'role_id' => 2];
$legalUser = $pdo->query("SELECT id, email, role_id FROM users WHERE role_id = 3 LIMIT 1")->fetch(PDO::FETCH_ASSOC) ?: ['id' => 103, 'email' => 'test_legal@mgi.co.id', 'role_id' => 3];
$adminUser = $pdo->query("SELECT id, email, role_id FROM users WHERE role_id = 7 LIMIT 1")->fetch(PDO::FETCH_ASSOC) ?: ['id' => 7, 'email' => 'admin@mgi.co.id', 'role_id' => 7];

echo "[SETUP] IT: {$itUser['email']}, HRGA: {$hrgaUser['email']}, Legal: {$legalUser['email']}, Admin: {$adminUser['email']}" . PHP_EOL;

// 1. Test Default Role Permissions
echo "[TEST 1] Pengecekan izin default per role: ";
$itCanDevices = hasPermission($itUser, 'devices', 'view');
$hrgaCanDevices = hasPermission($hrgaUser, 'devices', 'view');
$legalCanDevices = hasPermission($legalUser, 'devices', 'view');
$legalCanLegal = hasPermission($legalUser, 'legal_docs', 'view');

if ($itCanDevices && $hrgaCanDevices && !$legalCanDevices && $legalCanLegal) {
    echo "PASS (IT & HRGA boleh view devices, Legal tidak boleh view devices tapi boleh view legal_docs)" . PHP_EOL;
} else {
    echo "FAIL (IT: {$itCanDevices}, HRGA: {$hrgaCanDevices}, Legal Dev: {$legalCanDevices}, Legal Doc: {$legalCanLegal})" . PHP_EOL;
    exit(1);
}

// 2. Test Admin Always Full Access
echo "[TEST 2] Role Admin selalu memiliki hak akses penuh: ";
$adminAccessControl = hasPermission($adminUser, 'access_control', 'approve');
$adminLegal = hasPermission($adminUser, 'legal_docs', 'delete');
if ($adminAccessControl && $adminLegal) {
    echo "PASS (Admin full access di semua modul)" . PHP_EOL;
} else {
    echo "FAIL" . PHP_EOL;
    exit(1);
}

// 3. Test Add User Override (Grant)
echo "[TEST 3] Memberikan Override Akses Khusus (+ GRANT): ";
// Hapus override test sebelumnya jika ada
$pdo->prepare("DELETE FROM user_permission_overrides WHERE user_id = ? AND module_code = 'devices'")->execute([$legalUser['id']]);

$stmtOverride = $pdo->prepare("
    INSERT INTO user_permission_overrides (user_id, module_code, action, override_type, reason, granted_by, expires_at)
    VALUES (?, 'devices', 'view', 'grant', 'Bantuan audit inventaris laptop sementara', ?, DATE_ADD(NOW(), INTERVAL 1 DAY))
");
$stmtOverride->execute([$legalUser['id'], $itUser['id']]);
$grantOverrideId = (int)$pdo->lastInsertId();

$legalCanDevicesNow = hasPermission($legalUser, 'devices', 'view');
if ($legalCanDevicesNow) {
    echo "PASS (User Legal yang tadinya dilarang kini berhasil mengakses modul devices karena ada active grant override)" . PHP_EOL;
} else {
    echo "FAIL (Grant override tidak berlaku)" . PHP_EOL;
    exit(1);
}

// 4. Test Add User Override (Deny)
echo "[TEST 4] Memberikan Override Pencabutan Akses (- DENY): ";
$pdo->prepare("DELETE FROM user_permission_overrides WHERE user_id = ? AND module_code = 'permits'")->execute([$hrgaUser['id']]);

// HRGA normally can approve permits
$hrgaCanApproveBefore = hasPermission($hrgaUser, 'permits', 'approve');

$stmtDeny = $pdo->prepare("
    INSERT INTO user_permission_overrides (user_id, module_code, action, override_type, reason, granted_by, expires_at)
    VALUES (?, 'permits', 'approve', 'deny', 'Skorsing wewenang approval selama investigasi', ?, DATE_ADD(NOW(), INTERVAL 1 DAY))
");
$stmtDeny->execute([$hrgaUser['id'], $adminUser['id']]);
$denyOverrideId = (int)$pdo->lastInsertId();

$hrgaCanApproveAfter = hasPermission($hrgaUser, 'permits', 'approve');

if ($hrgaCanApproveBefore && !$hrgaCanApproveAfter) {
    echo "PASS (Wewenang approve permit HRGA berhasil dicabut secara spesifik oleh deny override)" . PHP_EOL;
} else {
    echo "FAIL (Before: {$hrgaCanApproveBefore}, After: {$hrgaCanApproveAfter})" . PHP_EOL;
    exit(1);
}

// 5. Test Expired Override (Harus fallback ke default role)
echo "[TEST 5] Kedaluwarsa Override (Expired Override Fallback): ";
$pdo->prepare("UPDATE user_permission_overrides SET expires_at = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE id = ?")->execute([$denyOverrideId]);

$hrgaCanApproveExpired = hasPermission($hrgaUser, 'permits', 'approve');
if ($hrgaCanApproveExpired) {
    echo "PASS (Override yang telah kedaluwarsa diabaikan otomatis, kembali ke hak default role HRGA)" . PHP_EOL;
} else {
    echo "FAIL (Expired override masih memblokir user)" . PHP_EOL;
    exit(1);
}

// 6. Test Revoke Override
echo "[TEST 6] Pencabutan Override (Revoke): ";
$pdo->prepare("DELETE FROM user_permission_overrides WHERE id = ?")->execute([$grantOverrideId]);
$legalCanDevicesAfterRevoke = hasPermission($legalUser, 'devices', 'view');

if (!$legalCanDevicesAfterRevoke) {
    echo "PASS (Setelah override dicabut, user Legal kembali tidak memiliki akses ke modul devices)" . PHP_EOL;
} else {
    echo "FAIL (Akses masih tersisa)" . PHP_EOL;
    exit(1);
}

// 7. Cleanup test data
echo "[TEST 7] Pembersihan data pengujian: ";
$pdo->prepare("DELETE FROM user_permission_overrides WHERE id IN (?, ?)")->execute([$grantOverrideId, $denyOverrideId]);
echo "PASS" . PHP_EOL;

echo PHP_EOL . "=== SEMUA 7 PENGUJIAN ACCESS CONTROL SELESAI DENGAN SUKSES! ===" . PHP_EOL;
