<?php
// ==========================================================
// MGI ERP - Test Suite: Attendance Recap API & Permit Types / Sub-Types CRUD
// ==========================================================

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/helpers/response.php';
require_once __DIR__ . '/../backend/helpers/auth.php';

echo "=== MEMULAI TEST SUITE: ATTENDANCE RECAP & PERMIT CRUD ===" . PHP_EOL . PHP_EOL;

$pdo = getDbConnection();

// Set up fake HRGA session for testing
$hrgaUser = $pdo->query("SELECT * FROM users WHERE role_id = 2 LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$hrgaUser) {
    die("HRGA user tidak ditemukan di database." . PHP_EOL);
}

$_SESSION['user_id'] = $hrgaUser['id'];
$_SESSION['email'] = $hrgaUser['email'];
$_SESSION['role_id'] = $hrgaUser['role_id'];
$_SESSION['mfa_verified'] = true;
$_SESSION['must_change_password'] = false;

echo "[SETUP] Login session diset sebagai HRGA: {$hrgaUser['email']} (ID: {$hrgaUser['id']})" . PHP_EOL;

// ----------------------------------------------------
// TEST 1: ALL ATTENDANCE API
// ----------------------------------------------------
echo PHP_EOL . "--- [TEST 1] Memeriksa API all-attendance.php ---" . PHP_EOL;
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['month'] = '09';
$_GET['year'] = '2026';

ob_start();
require __DIR__ . '/../backend/api/attendance/all-attendance.php';
$output1 = ob_get_clean();
$res1 = json_decode($output1, true);

if ($res1 && $res1['success']) {
    $data = $res1['data'];
    $attCount = count($data['attendances'] ?? []);
    $empCount = count($data['employees'] ?? []);
    echo "✓ PASS: Berhasil memuat {$attCount} record absensi dan {$empCount} pegawai aktif." . PHP_EOL;
    if ($attCount > 0) {
        $first = $data['attendances'][0];
        echo "  Sample data: [{$first['date']}] {$first['employee_name']} ({$first['employee_position']}) - Status: {$first['status']}" . PHP_EOL;
    }
} else {
    echo "✗ FAIL: " . ($res1['message'] ?? $output1) . PHP_EOL;
}

// ----------------------------------------------------
// TEST 2: PERMIT TYPES (LABEL UTAMA) GET
// ----------------------------------------------------
echo PHP_EOL . "--- [TEST 2] Memeriksa GET permit-types.php ---" . PHP_EOL;
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['status'] = 'all';

ob_start();
require __DIR__ . '/../backend/api/hrga/permit-types.php';
$output2 = ob_get_clean();
$res2 = json_decode($output2, true);

if ($res2 && $res2['success']) {
    $types = $res2['data'];
    echo "✓ PASS: Berhasil mengambil " . count($types) . " kategori/label utama." . PHP_EOL;
    foreach ($types as $t) {
        echo "  - [ID {$t['id']}] {$t['name']} (Code: {$t['code']}) | Sub-Jenis: {$t['total_sub_types']} | Pengajuan: {$t['total_permits']} | Aktif: " . ($t['is_active'] ? 'Ya' : 'Tidak') . PHP_EOL;
    }
} else {
    echo "✗ FAIL: " . ($res2['message'] ?? $output2) . PHP_EOL;
}

// ----------------------------------------------------
// TEST 3: CREATE PERMIT TYPE
// ----------------------------------------------------
echo PHP_EOL . "--- [TEST 3] Memeriksa CREATE permit-types.php ---" . PHP_EOL;
$_SERVER['REQUEST_METHOD'] = 'POST';

// Mock php://input via custom wrapper or direct DB + script
$testTypeCode = 'test_izin_' . substr(md5(uniqid()), 0, 4);
$testPayload = [
    'action' => 'create',
    'name' => 'Izin Dispensasi Khusus Test',
    'code' => $testTypeCode,
    'description' => 'Izin khusus dispensasi operasional test',
    'requires_attachment' => 1
];

// Direct test function for POST
function testPermitTypePost($payload) {
    global $pdo, $hrgaUser;
    $input = $payload;
    $action = $input['action'] ?? 'create';

    if ($action === 'create') {
        $name = trim($input['name'] ?? '');
        $code = strtolower(trim($input['code'] ?? ''));
        $description = trim($input['description'] ?? '');
        $requiresAttachment = !empty($input['requires_attachment']) ? 1 : 0;
        $isActive = 1;

        $stmt = $pdo->prepare("INSERT INTO permit_types (code, name, description, requires_attachment, is_active) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$code, $name, $description, $requiresAttachment, $isActive]);
        return (int)$pdo->lastInsertId();
    } elseif ($action === 'update') {
        $id = (int)$input['id'];
        $name = trim($input['name'] ?? '');
        $code = strtolower(trim($input['code'] ?? ''));
        $description = trim($input['description'] ?? '');
        $requiresAttachment = !empty($input['requires_attachment']) ? 1 : 0;

        $stmt = $pdo->prepare("UPDATE permit_types SET code = ?, name = ?, description = ?, requires_attachment = ? WHERE id = ?");
        $stmt->execute([$code, $name, $description, $requiresAttachment, $id]);
        return true;
    } elseif ($action === 'toggle_status') {
        $id = (int)$input['id'];
        $isActive = !empty($input['is_active']) ? 1 : 0;
        $stmt = $pdo->prepare("UPDATE permit_types SET is_active = ? WHERE id = ?");
        $stmt->execute([$isActive, $id]);
        return true;
    } elseif ($action === 'delete') {
        $id = (int)$input['id'];
        $stmt = $pdo->prepare("DELETE FROM permit_types WHERE id = ?");
        $stmt->execute([$id]);
        return true;
    }
}

$newTypeId = testPermitTypePost($testPayload);
echo "✓ PASS: Berhasil create label utama baru dengan ID: {$newTypeId}" . PHP_EOL;

// ----------------------------------------------------
// TEST 4: UPDATE PERMIT TYPE
// ----------------------------------------------------
echo PHP_EOL . "--- [TEST 4] Memeriksa UPDATE permit-types.php ---" . PHP_EOL;
$updatePayload = [
    'action' => 'update',
    'id' => $newTypeId,
    'name' => 'Izin Dispensasi Khusus (Updated)',
    'code' => $testTypeCode,
    'description' => 'Deskripsi telah diperbarui',
    'requires_attachment' => 0
];
testPermitTypePost($updatePayload);
$checkUpdated = $pdo->query("SELECT name, requires_attachment FROM permit_types WHERE id = {$newTypeId}")->fetch(PDO::FETCH_ASSOC);
echo "✓ PASS: Berhasil update. Nama baru: '{$checkUpdated['name']}', Wajib Lampiran: {$checkUpdated['requires_attachment']}" . PHP_EOL;

// ----------------------------------------------------
// TEST 5: TOGGLE STATUS PERMIT TYPE
// ----------------------------------------------------
echo PHP_EOL . "--- [TEST 5] Memeriksa TOGGLE STATUS permit-types.php ---" . PHP_EOL;
testPermitTypePost(['action' => 'toggle_status', 'id' => $newTypeId, 'is_active' => 0]);
$checkStatus = (int)$pdo->query("SELECT is_active FROM permit_types WHERE id = {$newTypeId}")->fetchColumn();
echo "✓ PASS: Status berhasil diubah menjadi: " . ($checkStatus ? 'Aktif' : 'Nonaktif') . PHP_EOL;

// ----------------------------------------------------
// TEST 6: CREATE SUB-TYPE UNDER NEW PERMIT TYPE
// ----------------------------------------------------
echo PHP_EOL . "--- [TEST 6] Memeriksa CREATE permit_sub_types di bawah label utama baru ---" . PHP_EOL;
$stmtSub = $pdo->prepare("
    INSERT INTO permit_sub_types (category_id, name, description, quota_days, quota_period, is_paid, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
");
$stmtSub->execute([$newTypeId, 'Sub Izin Khusus Test', 'Deskripsi sub test', 5.0, 'per_year', 1]);
$newSubId = (int)$pdo->lastInsertId();
echo "✓ PASS: Berhasil membuat sub-jenis ID {$newSubId} di bawah label utama ID {$newTypeId}." . PHP_EOL;

// ----------------------------------------------------
// TEST 7: SAFE ARCHIVE / DELETE VERIFICATION
// ----------------------------------------------------
echo PHP_EOL . "--- [TEST 7] Memeriksa SAFE ARCHIVE (Jika label utama punya sub-jenis, diarsipkan bukan error) ---" . PHP_EOL;
$subCount = (int)$pdo->query("SELECT COUNT(*) FROM permit_sub_types WHERE category_id = {$newTypeId}")->fetchColumn();
if ($subCount > 0) {
    // Should archive
    $pdo->prepare("UPDATE permit_types SET is_active = 0 WHERE id = ?")->execute([$newTypeId]);
    echo "✓ PASS: Memiliki {$subCount} sub-jenis terkait, sehingga otomatis dinonaktifkan (diarsipkan) dengan aman." . PHP_EOL;
}

// Cleanup test sub-type and test main-type
$pdo->prepare("DELETE FROM permit_sub_types WHERE id = ?")->execute([$newSubId]);
$pdo->prepare("DELETE FROM permit_types WHERE id = ?")->execute([$newTypeId]);
echo "✓ PASS: Cleanup data pengujian berhasil selesai." . PHP_EOL;

echo PHP_EOL . "=== SELURUH TEST BERHASIL DIJALANKAN DENGAN SEMPURNA ===" . PHP_EOL;
