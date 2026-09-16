<?php
// ==========================================================
// MGI ERP / HRIS - Migration: PM Account & Expense / Petty Cash Tables
// ==========================================================

require_once __DIR__ . '/backend/config/database.php';

try {
    $pdo = getDbConnection();
    echo "Starting migration...\n";

    // 1. Create table `expense_requests`
    $sqlExpenses = "
    CREATE TABLE IF NOT EXISTS `expense_requests` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `ticket_number` VARCHAR(50) NOT NULL UNIQUE,
        `created_by` INT UNSIGNED NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `category` ENUM('operational', 'project', 'office_supplies', 'travel', 'other') DEFAULT 'operational',
        `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        `description` TEXT NULL,
        `receipt_doc_path` VARCHAR(500) NULL,
        `status` ENUM('pending_pm', 'approved', 'rejected', 'disbursed') DEFAULT 'pending_pm',
        `note` TEXT NULL,
        `approved_by` INT UNSIGNED NULL,
        `approved_at` DATETIME NULL,
        `disbursed_at` DATETIME NULL,
        `disbursed_by` INT UNSIGNED NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT `fk_exp_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
        CONSTRAINT `fk_exp_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
        CONSTRAINT `fk_exp_disbursed_by` FOREIGN KEY (`disbursed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($sqlExpenses);
    echo "✔ Table 'expense_requests' created or already exists.\n";

    // 2. Create table `petty_cash_transactions`
    $sqlPettyCash = "
    CREATE TABLE IF NOT EXISTS `petty_cash_transactions` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `transaction_type` ENUM('inflow', 'outflow') NOT NULL,
        `expense_request_id` INT UNSIGNED NULL,
        `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        `current_balance` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        `description` TEXT NOT NULL,
        `proof_doc_path` VARCHAR(500) NULL,
        `created_by` INT UNSIGNED NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT `fk_pct_expense_id` FOREIGN KEY (`expense_request_id`) REFERENCES `expense_requests` (`id`) ON DELETE SET NULL,
        CONSTRAINT `fk_pct_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($sqlPettyCash);
    echo "✔ Table 'petty_cash_transactions' created or already exists.\n";

    // 3. Seed initial Petty Cash balance if empty
    $countPct = (int)$pdo->query("SELECT COUNT(*) FROM `petty_cash_transactions`")->fetchColumn();
    if ($countPct === 0) {
        $adminId = 1; // Default admin/system
        $initAmount = 5000000.00; // Rp 5.000.000 default balance
        $stmtInit = $pdo->prepare("
            INSERT INTO `petty_cash_transactions` 
            (`transaction_type`, `amount`, `current_balance`, `description`, `created_by`) 
            VALUES ('inflow', ?, ?, 'Initial Petty Cash Opening Balance', ?)
        ");
        $stmtInit->execute([$initAmount, $initAmount, $adminId]);
        echo "✔ Initialized Petty Cash starting balance: Rp 5,000,000.\n";
    }

    // 4. Create default PM User account if not exists
    $pmEmail = 'pm@mgi.co.id';
    $stmtCheckPm = $pdo->prepare("SELECT id FROM `users` WHERE `email` = ?");
    $stmtCheckPm->execute([$pmEmail]);
    $pmId = $stmtCheckPm->fetchColumn();

    if (!$pmId) {
        $passwordHash = password_hash('Password123!', PASSWORD_BCRYPT, ['cost' => 10]);
        $stmtInsertUser = $pdo->prepare("
            INSERT INTO `users` (`email`, `password_hash`, `role_id`, `mfa_enabled`, `status`)
            VALUES (?, ?, 6, 0, 'active')
        ");
        $stmtInsertUser->execute([$pmEmail, $passwordHash]);
        $pmId = $pdo->lastInsertId();

        // Create PM Profile
        $stmtInsertProfile = $pdo->prepare("
            INSERT INTO `user_profiles` (`user_id`, `name`, `gender`, `position`, `join_date`)
            VALUES (?, 'Project Manager MGI', 'LAKI-LAKI', 'Project Manager', CURDATE())
        ");
        $stmtInsertProfile->execute([$pmId]);
        echo "✔ Created default PM user: pm@mgi.co.id (Password: Password123!) with profile.\n";
    } else {
        echo "✔ PM user pm@mgi.co.id already exists (ID: #$pmId).\n";
    }

    echo "\nAll migrations completed successfully!\n";

} catch (Exception $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
