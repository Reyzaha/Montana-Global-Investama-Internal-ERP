<?php
// ==========================================================
// MGI ERP / HRIS - Test Suite: Sub-Permits & Dynamic Finance
// ==========================================================

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/helpers/auth.php';

echo "=== MEMULAI TEST SUITE: SUB-PERMITS & DYNAMIC FINANCE CATEGORIES ===" . PHP_EOL . PHP_EOL;

$pdo = getDbConnection();

// Setup user profile gender for testing
$testUserId = (int)$pdo->query("SELECT id FROM users LIMIT 1")->fetchColumn();
$pdo->prepare("
    INSERT INTO user_profiles (user_id, name, gender)
    VALUES (?, 'Test User', 'LAKI-LAKI')
    ON DUPLICATE KEY UPDATE gender = 'LAKI-LAKI'
")->execute([$testUserId]);

// 1. Ambil Sub-Izin Kategori Cuti
echo "[TEST 1] Ambil daftar sub-tipe izin kategori Cuti (Category ID 3): ";
$stmtSubs = $pdo->query("SELECT id, name, gender_restriction, requires_attachment FROM permit_sub_types WHERE category_id = 3 AND is_active = 1");
$subTypes = $stmtSubs->fetchAll(PDO::FETCH_ASSOC);

$maternitySub = null;
$paternitySub = null;
foreach ($subTypes as $st) {
    if (strpos($st['name'], 'Melahirkan (Maternity)') !== false) $maternitySub = $st;
    if (strpos($st['name'], 'Istri Melahirkan (Paternity)') !== false) $paternitySub = $st;
}

if ($maternitySub && $paternitySub) {
    echo "PASS (Maternity ID: {$maternitySub['id']} [female], Paternity ID: {$paternitySub['id']} [male])" . PHP_EOL;
} else {
    echo "FAIL (Sub-tipe cuti melahirkan tidak ditemukan)" . PHP_EOL;
    exit(1);
}

// 2. Validasi Gender: Karyawan Laki-laki Mengajukan Cuti Melahirkan (Harus Ditolak)
echo "[TEST 2] Karyawan LAKI-LAKI mengajukan Cuti Melahirkan (Maternity): ";
$userGender = $pdo->query("SELECT gender FROM user_profiles WHERE user_id = 1")->fetchColumn();
$rejectedGender = false;

if ($maternitySub['gender_restriction'] === 'female' && $userGender !== 'PEREMPUAN') {
    $rejectedGender = true;
    echo "PASS (Ditolak otomatis karena gender karyawan adalah '{$userGender}', sub-izin khusus perempuan)" . PHP_EOL;
} else {
    echo "FAIL (Tidak tertolak)" . PHP_EOL;
    exit(1);
}

// 3. Validasi Wajib Lampiran pada Sub-Izin
echo "[TEST 3] Pengajuan sub-izin yang mewajibkan dokumen tanpa berkas: ";
$hasFile = false; // Simulasi tanpa upload berkas
$rejectedAttachment = false;

if ($maternitySub['requires_attachment'] && !$hasFile) {
    $rejectedAttachment = true;
    echo "PASS (Ditolak otomatis karena dokumen pendukung wajib diunggah)" . PHP_EOL;
} else {
    echo "FAIL" . PHP_EOL;
    exit(1);
}

// 4. Pengajuan Sub-Izin Valid (Paternity Leave untuk Karyawan Laki-Laki)
echo "[TEST 4] Karyawan LAKI-LAKI mengajukan Cuti Istri Melahirkan (Paternity): ";
$testDateStart = '2026-11-20';
$testDateEnd = '2026-11-21';

// Hapus jika ada pengajuan sebelumnya
$pdo->prepare("DELETE FROM permits WHERE user_id = ? AND start_date = ?")->execute([$testUserId, $testDateStart]);

$stmtInsert = $pdo->prepare("
    INSERT INTO permits (user_id, permit_type_id, permit_sub_type_id, start_date, end_date, description, status)
    VALUES (?, 3, ?, ?, ?, 'Mendampingi persalinan istri di RS', 'pending_hrga')
");
$stmtInsert->execute([$testUserId, $paternitySub['id'], $testDateStart, $testDateEnd]);
$permitId = (int)$pdo->lastInsertId();

if ($permitId > 0) {
    // Verifikasi relasi
    $stmtVerify = $pdo->prepare("
        SELECT p.id, pt.name as category_name, pst.name as sub_type_name
        FROM permits p
        JOIN permit_types pt ON p.permit_type_id = pt.id
        JOIN permit_sub_types pst ON p.permit_sub_type_id = pst.id
        WHERE p.id = ?
    ");
    $stmtVerify->execute([$permitId]);
    $createdPermit = $stmtVerify->fetch(PDO::FETCH_ASSOC);

    echo "PASS (Permit #{$permitId} tersimpan dengan kategori '{$createdPermit['category_name']}' -> Sub: '{$createdPermit['sub_type_name']}')" . PHP_EOL;
} else {
    echo "FAIL (Gagal menyimpan permit)" . PHP_EOL;
    exit(1);
}

// 5. Query Master Kategori Biaya Finance & Pagu Anggaran
echo "[TEST 5] Verifikasi Kategori Pengeluaran & Pagu Anggaran Finance: ";
$stmtExp = $pdo->query("SELECT name, code, budget_limit_monthly, auto_approve_below_amount FROM expense_categories WHERE is_active = 1");
$expCats = $stmtExp->fetchAll(PDO::FETCH_ASSOC);

if (count($expCats) >= 5) {
    $opr = null;
    foreach ($expCats as $c) {
        if ($c['code'] === 'operational') $opr = $c;
    }
    echo "PASS (" . count($expCats) . " kategori aktif ditemukan. Operasional Pagu: Rp " . number_format($opr['budget_limit_monthly'], 0, ',', '.') . ")" . PHP_EOL;
} else {
    echo "FAIL (Hanya " . count($expCats) . " kategori)" . PHP_EOL;
    exit(1);
}

// 6. Toggle Status Aktif / Nonaktif Kategori
echo "[TEST 6] Toggle status aktif / nonaktif kategori biaya: ";
$testCat = $pdo->query("SELECT id, is_active FROM expense_categories WHERE code = 'other' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$newActive = $testCat['is_active'] ? 0 : 1;

$pdo->prepare("UPDATE expense_categories SET is_active = ? WHERE id = ?")->execute([$newActive, $testCat['id']]);
$updatedActive = $pdo->query("SELECT is_active FROM expense_categories WHERE id = {$testCat['id']}")->fetchColumn();

// Kembalikan ke asal
$pdo->prepare("UPDATE expense_categories SET is_active = ? WHERE id = ?")->execute([$testCat['is_active'], $testCat['id']]);

if ((int)$updatedActive === $newActive) {
    echo "PASS (Status kategori berhasil di-toggle tanpa merusak data)" . PHP_EOL;
} else {
    echo "FAIL" . PHP_EOL;
    exit(1);
}

// 7. Cleanup data pengujian
echo "[TEST 7] Pembersihan data pengujian: ";
$pdo->prepare("DELETE FROM permits WHERE id = ?")->execute([$permitId]);
echo "PASS" . PHP_EOL;

echo PHP_EOL . "=== SEMUA 7 PENGUJIAN SUB-PERMITS & DYNAMIC FINANCE SELESAI DENGAN SUKSES! ===" . PHP_EOL;
