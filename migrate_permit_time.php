<?php
// migrate_permit_time.php
require_once __DIR__ . '/backend/config/database.php';
$pdo = getDbConnection();

echo "Running Migration: Add permit_time to permits table...\n";

// Check if column permit_time exists
$cols = $pdo->query("SHOW COLUMNS FROM `permits` LIKE 'permit_time'")->fetchAll();

if (empty($cols)) {
    $pdo->exec("ALTER TABLE `permits` ADD COLUMN `permit_time` TIME NULL AFTER `end_date`");
    echo "✓ Added column permit_time TIME NULL to permits table.\n";
} else {
    echo "• Column permit_time already exists in permits table.\n";
}

echo "Migration finished successfully!\n";
