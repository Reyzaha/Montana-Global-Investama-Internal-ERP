<?php
// ==========================================================
// MGI ERP / HRIS - Migration: Leave Balances Table
// ==========================================================

require_once __DIR__ . '/backend/config/database.php';

try {
    $pdo = getDbConnection();
    echo "=== MEMULAI MIGRATION LEAVE BALANCES ===\n";

    $sql = "
    CREATE TABLE IF NOT EXISTS `leave_balances` (
        `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT UNSIGNED NOT NULL,
        `permit_type_id` INT UNSIGNED NOT NULL,
        `year` SMALLINT UNSIGNED NOT NULL,
        `quota_days` DECIMAL(5,1) NOT NULL DEFAULT 12.0,
        `used_days` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
        `carried_over_days` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY `uniq_user_type_year` (`user_id`, `permit_type_id`, `year`),
        CONSTRAINT `fk_lb_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
        CONSTRAINT `fk_lb_permit_type_id` FOREIGN KEY (`permit_type_id`) REFERENCES `permit_types` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($sql);
    echo "✓ Tabel 'leave_balances' berhasil dibuat / dipastikan ada.\n";

    // Inisialisasi kuota cuti tahun berjalan untuk seluruh user aktif
    $currentYear = (int)date('Y');
    
    // Cari permit_type_id untuk 'cuti'
    $stmtCuti = $pdo->query("SELECT id FROM `permit_types` WHERE `code` = 'cuti' LIMIT 1");
    $cutiTypeId = (int)$stmtCuti->fetchColumn();

    if ($cutiTypeId > 0) {
        $users = $pdo->query("SELECT id FROM `users` WHERE `status` = 'active'")->fetchAll(PDO::FETCH_COLUMN);
        $stmtInsert = $pdo->prepare("
            INSERT INTO `leave_balances` (`user_id`, `permit_type_id`, `year`, `quota_days`, `used_days`, `carried_over_days`)
            VALUES (?, ?, ?, 12.0, 0.0, 0.0)
            ON DUPLICATE KEY UPDATE `quota_days` = `quota_days`
        ");

        $initCount = 0;
        foreach ($users as $uid) {
            $stmtInsert->execute([$uid, $cutiTypeId, $currentYear]);
            $initCount++;
        }
        echo "✓ Inisialisasi kuota 12 hari cuti tahun {$currentYear} untuk {$initCount} karyawan aktif.\n";
    }

    echo "=== MIGRATION SELESAI DENGAN SUKSES ===\n";
} catch (Exception $e) {
    echo "ERROR MIGRATION: " . $e->getMessage() . "\n";
    exit(1);
}
