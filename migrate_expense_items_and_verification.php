<?php
// ==========================================================
// MGI ERP / HRIS - Migration: Expense Items & Verification Lifecycle
// ==========================================================

require_once __DIR__ . '/backend/config/database.php';

try {
    $pdo = getDbConnection();
    echo "Starting migration: Expense Items & Verification Lifecycle...\n";

    // 1. Create table `expense_request_items`
    $sqlItems = "
    CREATE TABLE IF NOT EXISTS `expense_request_items` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `expense_request_id` INT UNSIGNED NOT NULL,
        `item_name` VARCHAR(255) NOT NULL,
        `qty` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
        `unit` VARCHAR(50) NOT NULL DEFAULT 'pcs',
        `unit_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        `total_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        `notes` VARCHAR(255) NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT `fk_eri_request_id` FOREIGN KEY (`expense_request_id`) REFERENCES `expense_requests` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($sqlItems);
    echo "✔ Table 'expense_request_items' created or already exists.\n";

    // 2. Modify `expense_requests` table to support photo of goods and verification fields
    // Add columns if they do not exist
    $columns = $pdo->query("SHOW COLUMNS FROM `expense_requests`")->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('item_photo_path', $columns)) {
        $pdo->exec("ALTER TABLE `expense_requests` ADD COLUMN `item_photo_path` VARCHAR(500) NULL AFTER `receipt_doc_path`");
        echo "✔ Added column 'item_photo_path' to expense_requests.\n";
    }

    if (!in_array('realized_amount', $columns)) {
        $pdo->exec("ALTER TABLE `expense_requests` ADD COLUMN `realized_amount` DECIMAL(15,2) NULL AFTER `amount`");
        echo "✔ Added column 'realized_amount' to expense_requests.\n";
    }

    if (!in_array('realization_notes', $columns)) {
        $pdo->exec("ALTER TABLE `expense_requests` ADD COLUMN `realization_notes` TEXT NULL AFTER `note`");
        echo "✔ Added column 'realization_notes' to expense_requests.\n";
    }

    if (!in_array('realized_at', $columns)) {
        $pdo->exec("ALTER TABLE `expense_requests` ADD COLUMN `realized_at` DATETIME NULL AFTER `approved_at`");
        echo "✔ Added column 'realized_at' to expense_requests.\n";
    }

    if (!in_array('verified_by', $columns)) {
        $pdo->exec("ALTER TABLE `expense_requests` ADD COLUMN `verified_by` INT UNSIGNED NULL AFTER `approved_by`");
        $pdo->exec("ALTER TABLE `expense_requests` ADD CONSTRAINT `fk_exp_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL");
        echo "✔ Added column 'verified_by' to expense_requests.\n";
    }

    if (!in_array('verified_at', $columns)) {
        $pdo->exec("ALTER TABLE `expense_requests` ADD COLUMN `verified_at` DATETIME NULL AFTER `realized_at`");
        echo "✔ Added column 'verified_at' to expense_requests.\n";
    }

    if (!in_array('verification_notes', $columns)) {
        $pdo->exec("ALTER TABLE `expense_requests` ADD COLUMN `verification_notes` TEXT NULL AFTER `realization_notes`");
        echo "✔ Added column 'verification_notes' to expense_requests.\n";
    }

    // 3. Update status ENUM to include `pending_verification` and `completed`
    // ENUM('pending_pm', 'approved', 'pending_verification', 'completed', 'rejected', 'disbursed')
    $pdo->exec("
        ALTER TABLE `expense_requests` 
        MODIFY COLUMN `status` ENUM('pending_pm', 'approved', 'pending_verification', 'completed', 'rejected', 'disbursed') DEFAULT 'pending_pm'
    ");
    echo "✔ Updated 'status' ENUM in expense_requests.\n";

    echo "\nAll migration tasks completed successfully!\n";

} catch (Exception $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
