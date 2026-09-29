<?php
// ==========================================================
// MGI ERP - Migration: Permit Options & Attendance Recap
// ==========================================================

require_once __DIR__ . '/backend/config/database.php';
$pdo = getDbConnection();

echo "Starting Migration: Permit Options & Attendance Recap...\n";

// 1. Update Permit Sub Types
// Kategori 1: Izin -> Terlambat, Pulang Cepat, Dinas
// Kategori 2: Sakit -> Sakit dengan Surat Dokter, Sakit tanpa Surat
// Kategori 3: Cuti -> Cuti Tahunan, Cuti Khusus

// Set all inactive first
$pdo->exec("UPDATE permit_sub_types SET is_active = 0");

// Helper to upsert permit_sub_type
function upsertSubType($pdo, $categoryId, $name, $description, $reqAtt, $attLabel, $quota, $quotaPeriod, $isPaid) {
    $stmt = $pdo->prepare("SELECT id FROM permit_sub_types WHERE category_id = ? AND name = ?");
    $stmt->execute([$categoryId, $name]);
    $existingId = $stmt->fetchColumn();

    if ($existingId) {
        $up = $pdo->prepare("
            UPDATE permit_sub_types SET 
                description = ?, requires_attachment = ?, attachment_label = ?, 
                quota_days = ?, quota_period = ?, is_paid = ?, is_active = 1
            WHERE id = ?
        ");
        $up->execute([$description, $reqAtt, $attLabel, $quota, $quotaPeriod, $isPaid, $existingId]);
        echo "✓ Updated sub-type: [Cat {$categoryId}] {$name} (ID: {$existingId})\n";
    } else {
        $ins = $pdo->prepare("
            INSERT INTO permit_sub_types (
                category_id, name, description, requires_attachment, attachment_label,
                quota_days, quota_period, is_paid, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        ");
        $ins->execute([$categoryId, $name, $description, $reqAtt, $attLabel, $quota, $quotaPeriod, $isPaid]);
        $newId = $pdo->lastInsertId();
        echo "✓ Created sub-type: [Cat {$categoryId}] {$name} (ID: {$newId})\n";
    }
}

// Category 1: Izin
upsertSubType($pdo, 1, 'Terlambat', 'Izin datang terlambat ke kantor', 0, null, null, 'per_year', 1);
upsertSubType($pdo, 1, 'Pulang Cepat', 'Izin pulang lebih cepat dari jam kerja resmi', 0, null, null, 'per_year', 1);
upsertSubType($pdo, 1, 'Dinas', 'Tugas / perjalanan dinas kantor di luar area kerja', 0, null, null, 'per_year', 1);

// Category 2: Sakit
upsertSubType($pdo, 2, 'Sakit dengan Surat Dokter', 'Pengajuan sakit dengan melampirkan surat dokter resmi', 1, 'Surat Keterangan Dokter', null, 'per_year', 1);
upsertSubType($pdo, 2, 'Sakit tanpa Surat', 'Pengajuan sakit ringan tanpa surat keterangan dokter', 0, null, null, 'per_year', 1);

// Category 3: Cuti
upsertSubType($pdo, 3, 'Cuti Tahunan', 'Hak cuti tahunan reguler karyawan (memotong kuota cuti tahunan)', 0, null, 12.0, 'per_year', 1);
upsertSubType($pdo, 3, 'Cuti Khusus', 'Cuti khusus berbayar sesuai ketentuan (melahirkan, pernikahan, kedukaan, dll)', 0, null, null, 'per_event', 1);

echo "\nPermit sub-types successfully synchronized!\n";
