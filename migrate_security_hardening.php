<?php
// ==========================================================
// MGI ERP / HRIS - Migration: Security Hardening (Login Attempts)
// ==========================================================

require_once __DIR__ . '/backend/config/database.php';

try {
    $pdo = getDbConnection();
    echo "=== MEMULAI MIGRATION SECURITY HARDENING ===\n";

    // 1. Create table `login_attempts`
    $sql = "
    CREATE TABLE IF NOT EXISTS `login_attempts` (
        `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `email` VARCHAR(191) NOT NULL,
        `ip_address` VARCHAR(45) NOT NULL,
        `is_success` TINYINT(1) NOT NULL DEFAULT 0,
        `attempted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_login_attempts_email` (`email`, `attempted_at`),
        INDEX `idx_login_attempts_ip` (`ip_address`, `attempted_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($sql);
    echo "✓ Tabel 'login_attempts' berhasil dibuat / dipastikan ada.\n";

    echo "=== MIGRATION SELESAI DENGAN SUKSES ===\n";
} catch (Exception $e) {
    echo "ERROR MIGRATION: " . $e->getMessage() . "\n";
    exit(1);
}
