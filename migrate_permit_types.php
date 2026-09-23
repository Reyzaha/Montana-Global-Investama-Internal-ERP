<?php
require_once __DIR__ . '/backend/config/database.php';

$pdo = getDbConnection();

try {
    $pdo->beginTransaction();

    // 1. Izin (category 1)
    $pdo->exec("DELETE FROM permit_sub_types WHERE category_id = 1");
    $stmt1 = $pdo->prepare("INSERT INTO permit_sub_types (category_id, name, requires_attachment, is_paid) VALUES (1, ?, 0, 1)");
    $izin_types = ['Terlambat', 'Pulang Cepat', 'Dinas', 'Izin Tidak Masuk Kerja'];
    foreach ($izin_types as $type) {
        $stmt1->execute([$type]);
    }

    // 2. Sakit (category 2)
    $pdo->exec("DELETE FROM permit_sub_types WHERE category_id = 2");
    $stmt2 = $pdo->prepare("INSERT INTO permit_sub_types (category_id, name, description, requires_attachment, attachment_label, is_paid) VALUES (2, ?, ?, 1, ?, 1)");
    $stmt2->execute(['Sakit', 'Pengajuan sakit (dengan surat dokter)', 'Surat Keterangan Dokter']);

    // 3. Cuti (category 3)
    $pdo->exec("DELETE FROM permit_sub_types WHERE category_id = 3");
    $stmt3 = $pdo->prepare("INSERT INTO permit_sub_types (category_id, name, quota_days, quota_period, gender_restriction, is_paid, requires_attachment, attachment_label) VALUES (3, ?, ?, ?, ?, 1, ?, ?)");
    
    // Cuti Tahunan
    $stmt3->execute(['Cuti Tahunan', 12.0, 'per_year', 'any', 0, null]);
    // Istri Melahirkan
    $stmt3->execute(['Istri Melahirkan', 2.0, 'per_event', 'male', 0, null]);
    // Cuti Melahirkan
    $stmt3->execute(['Cuti Melahirkan', 90.0, 'per_event', 'female', 1, 'Surat HPL / Keterangan Dokter Kandungan']);
    // Kematian
    $stmt3->execute(['Kematian', 2.0, 'per_event', 'any', 0, null]);
    // Sunatan
    $stmt3->execute(['Sunatan', 2.0, 'per_event', 'any', 0, null]);
    // Pernikahan Karyawan
    $stmt3->execute(['Pernikahan Karyawan', 3.0, 'lifetime', 'any', 0, null]);
    // Pernikahan Anak
    $stmt3->execute(['Pernikahan Anak', 2.0, 'per_event', 'any', 0, null]);

    $pdo->commit();
    echo "Permit types migrated successfully.\n";
} catch (Exception $e) {
    $pdo->rollBack();
    echo "Failed: " . $e->getMessage() . "\n";
}
