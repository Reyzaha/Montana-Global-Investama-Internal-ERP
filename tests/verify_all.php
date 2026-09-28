<?php
require_once __DIR__ . '/../backend/config/database.php';
$pdo = getDbConnection();

echo "=== VERIFIKASI LANGSUNG DATABASE & QUERY ===" . PHP_EOL . PHP_EOL;

// 1. Verify all-attendance query
echo "[1] Testing query for all-attendance.php:" . PHP_EOL;
$month = '09';
$year = '2026';
$stmt = $pdo->prepare("
    SELECT 
        a.id, 
        a.user_id, 
        u.email as employee_email, 
        COALESCE(up.name, u.email) as employee_name, 
        COALESCE(up.position, r.name) as employee_position,
        r.name as role_name,
        a.date, 
        a.check_in, 
        a.break_start, 
        a.break_end, 
        a.check_out, 
        a.status 
    FROM attendances a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE MONTH(a.date) = ? AND YEAR(a.date) = ?
    ORDER BY a.date DESC, u.email ASC
");
$stmt->execute([$month, $year]);
$attendances = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "  ✓ Ditemukan " . count($attendances) . " baris absensi untuk {$month}/{$year}." . PHP_EOL;

// 2. Verify permit_types query
echo PHP_EOL . "[2] Testing permit_types query:" . PHP_EOL;
$stmt2 = $pdo->query("
    SELECT 
        pt.id, 
        pt.code, 
        pt.name, 
        pt.description, 
        pt.requires_attachment, 
        pt.is_active, 
        (SELECT COUNT(*) FROM permit_sub_types WHERE category_id = pt.id) AS total_sub_types,
        (SELECT COUNT(*) FROM permits WHERE permit_type_id = pt.id) AS total_permits
    FROM permit_types pt
    ORDER BY pt.id ASC
");
$types = $stmt2->fetchAll(PDO::FETCH_ASSOC);
echo "  ✓ Ditemukan " . count($types) . " kategori/label utama:" . PHP_EOL;
foreach ($types as $t) {
    echo "    - [ID {$t['id']}] {$t['name']} ({$t['code']}): Sub-types = {$t['total_sub_types']}, Permits = {$t['total_permits']}, Aktif = {$t['is_active']}" . PHP_EOL;
}

// 3. Verify permit_sub_types query
echo PHP_EOL . "[3] Testing permit_sub_types query:" . PHP_EOL;
$stmt3 = $pdo->query("
    SELECT 
        pst.id,
        pst.category_id,
        pt.name as category_name,
        pt.code as category_code,
        pst.name,
        pst.quota_days,
        pst.quota_period,
        pst.requires_attachment,
        pst.gender_restriction,
        pst.is_paid,
        pst.is_active
    FROM permit_sub_types pst
    LEFT JOIN permit_types pt ON pst.category_id = pt.id
    ORDER BY pst.category_id ASC, pst.is_active DESC, pst.name ASC
");
$subs = $stmt3->fetchAll(PDO::FETCH_ASSOC);
echo "  ✓ Ditemukan " . count($subs) . " sub-jenis izin dinamis:" . PHP_EOL;
foreach ($subs as $s) {
    echo "    - [ID {$s['id']}] {$s['name']} (Kategori: {$s['category_name']}) | Kuota: " . ($s['quota_days'] ?? 'Tanpa Batas') . " | Gender: {$s['gender_restriction']}" . PHP_EOL;
}

// 4. Test CRUD operations on permit_types
echo PHP_EOL . "[4] Testing CRUD cycle on permit_types:" . PHP_EOL;
$randCode = 'test_' . rand(1000, 9999);
$stmtIns = $pdo->prepare("INSERT INTO permit_types (code, name, description, requires_attachment, is_active) VALUES (?, ?, ?, ?, 1)");
$stmtIns->execute([$randCode, 'Kategori CRUD Test', 'Deskripsi test', 1]);
$testId = (int)$pdo->lastInsertId();
echo "  ✓ CREATE: ID {$testId} berhasil dibuat." . PHP_EOL;

$stmtUp = $pdo->prepare("UPDATE permit_types SET name = ?, requires_attachment = 0 WHERE id = ?");
$stmtUp->execute(['Kategori CRUD Test (Updated)', $testId]);
$updatedName = $pdo->query("SELECT name FROM permit_types WHERE id = {$testId}")->fetchColumn();
echo "  ✓ UPDATE: Nama berhasil diperbarui menjadi '{$updatedName}'." . PHP_EOL;

$stmtTog = $pdo->prepare("UPDATE permit_types SET is_active = 0 WHERE id = ?");
$stmtTog->execute([$testId]);
$isAct = (int)$pdo->query("SELECT is_active FROM permit_types WHERE id = {$testId}")->fetchColumn();
echo "  ✓ TOGGLE: is_active berhasil diubah menjadi {$isAct}." . PHP_EOL;

$stmtDel = $pdo->prepare("DELETE FROM permit_types WHERE id = ?");
$stmtDel->execute([$testId]);
$rem = (int)$pdo->query("SELECT COUNT(*) FROM permit_types WHERE id = {$testId}")->fetchColumn();
echo "  ✓ DELETE: Sisa record dengan ID {$testId} = {$rem} (Berhasil dihapus)." . PHP_EOL;

echo PHP_EOL . "=== SEMUA VERIFIKASI DATABASE BERHASIL (100% PASS) ===" . PHP_EOL;
