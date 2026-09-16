<?php
// ==========================================================
// MGI ERP / HRIS - Migration: Overtime & Employee Lifecycle
// ==========================================================

require_once __DIR__ . '/backend/config/database.php';

echo "=== MEMULAI MIGRASI: OVERTIME & LIFECYCLE CHECKLIST ===" . PHP_EOL;

try {
    $pdo = getDbConnection();

    // 1. Table overtime_requests
    echo "1. Memeriksa tabel `overtime_requests`..." . PHP_EOL;
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `overtime_requests` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `date` DATE NOT NULL,
            `start_time` TIME NOT NULL,
            `end_time` TIME NOT NULL,
            `duration_hours` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
            `reason` TEXT NOT NULL,
            `status` ENUM('pending_hrga', 'pending_pm', 'approved', 'rejected') NOT NULL DEFAULT 'pending_hrga',
            `hrga_approved_by` INT NULL,
            `hrga_approved_at` DATETIME NULL,
            `pm_approved_by` INT NULL,
            `pm_approved_at` DATETIME NULL,
            `rejection_note` TEXT NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `idx_overtime_user_date` (`user_id`, `date`),
            INDEX `idx_overtime_status` (`status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "   ✓ Tabel `overtime_requests` siap." . PHP_EOL;

    // 2. Table lifecycle_checklists
    echo "2. Memeriksa tabel `lifecycle_checklists`..." . PHP_EOL;
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `lifecycle_checklists` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `type` ENUM('onboarding', 'offboarding') NOT NULL DEFAULT 'onboarding',
            `category` ENUM('it', 'hrga', 'legal') NOT NULL,
            `task_name` VARCHAR(255) NOT NULL,
            `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
            `completed_by` INT NULL,
            `completed_at` DATETIME NULL,
            `notes` TEXT NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `idx_lifecycle_user_type` (`user_id`, `type`),
            INDEX `idx_lifecycle_category` (`category`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "   ✓ Tabel `lifecycle_checklists` siap." . PHP_EOL;

    echo "=== MIGRASI FASE 3 SELESAI DENGAN SUKSES! ===" . PHP_EOL;
} catch (Exception $e) {
    echo "❌ Terjadi error saat migrasi: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
