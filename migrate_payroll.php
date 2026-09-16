<?php
// ==========================================================
// MGI ERP / HRIS - Migration: Payroll System
// ==========================================================

require_once __DIR__ . '/backend/config/database.php';

echo "=== MEMULAI MIGRASI: MODUL PAYROLL ===" . PHP_EOL;

try {
    $pdo = getDbConnection();

    // 1. Table payroll_components (Master gaji pokok & tunjangan tetap per karyawan)
    echo "1. Memeriksa tabel `payroll_components`..." . PHP_EOL;
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `payroll_components` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `base_salary` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            `fixed_allowance` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            `effective_date` DATE NOT NULL,
            `created_by` INT NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY `uniq_user_component` (`user_id`),
            INDEX `idx_comp_user` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "   ✓ Tabel `payroll_components` siap." . PHP_EOL;

    // 2. Table payroll_runs (Kalkulasi penggajian bulanan terintegrasi)
    echo "2. Memeriksa tabel `payroll_runs`..." . PHP_EOL;
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `payroll_runs` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `period_month` TINYINT NOT NULL,
            `period_year` SMALLINT NOT NULL,
            `base_salary` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            `allowance_total` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            `overtime_hours` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            `overtime_pay` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            `late_count` INT NOT NULL DEFAULT 0,
            `deduction_late` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            `absent_count` INT NOT NULL DEFAULT 0,
            `deduction_absent` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            `net_salary` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            `status` ENUM('draft', 'finalized', 'paid') NOT NULL DEFAULT 'draft',
            `processed_by` INT NULL,
            `processed_at` DATETIME NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY `uniq_user_period` (`user_id`, `period_month`, `period_year`),
            INDEX `idx_payroll_period` (`period_year`, `period_month`),
            INDEX `idx_payroll_status` (`status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "   ✓ Tabel `payroll_runs` siap." . PHP_EOL;

    // 3. Seed default payroll_components untuk karyawan yang belum memiliki komponen gaji
    echo "3. Melakukan inisialisasi default komponen gaji karyawan..." . PHP_EOL;
    $users = $pdo->query("SELECT id FROM users WHERE status = 'active'")->fetchAll(PDO::FETCH_COLUMN);
    $stmtSeed = $pdo->prepare("
        INSERT IGNORE INTO `payroll_components` (`user_id`, `base_salary`, `fixed_allowance`, `effective_date`)
        VALUES (?, 6000000.00, 1000000.00, '2026-01-01')
    ");
    $seeded = 0;
    foreach ($users as $uid) {
        $stmtSeed->execute([$uid]);
        if ($stmtSeed->rowCount() > 0) $seeded++;
    }
    echo "   ✓ Berhasil inisialisasi komponen gaji untuk {$seeded} karyawan." . PHP_EOL;

    echo "=== MIGRASI MODUL PAYROLL SELESAI DENGAN SUKSES! ===" . PHP_EOL;
} catch (Exception $e) {
    echo "❌ Terjadi error saat migrasi payroll: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
