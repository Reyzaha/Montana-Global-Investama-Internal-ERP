<?php
// migrate_permit_time_range.php
require_once __DIR__ . '/backend/config/database.php';
$pdo = getDbConnection();

echo "Running Migration: Add requires_time to permit_sub_types and permit_end_time to permits...\n";

// 1. Check & add requires_time in permit_sub_types
$colsSub = $pdo->query("SHOW COLUMNS FROM `permit_sub_types` LIKE 'requires_time'")->fetchAll();
if (empty($colsSub)) {
    $pdo->exec("ALTER TABLE `permit_sub_types` ADD COLUMN `requires_time` TINYINT(1) NOT NULL DEFAULT 0 AFTER `requires_attachment`");
    echo "✓ Added column requires_time TINYINT(1) to permit_sub_types.\n";
} else {
    echo "• Column requires_time already exists in permit_sub_types.\n";
}

// 2. Check & add permit_end_time in permits
$colsPermit = $pdo->query("SHOW COLUMNS FROM `permits` LIKE 'permit_end_time'")->fetchAll();
if (empty($colsPermit)) {
    $pdo->exec("ALTER TABLE `permits` ADD COLUMN `permit_end_time` TIME NULL DEFAULT NULL AFTER `permit_time`");
    echo "✓ Added column permit_end_time TIME NULL to permits.\n";
} else {
    echo "• Column permit_end_time already exists in permits.\n";
}

// 3. Update existing Pulang Cepat and Terlambat sub-types to have requires_time = 1
$stmtUpdate = $pdo->prepare("UPDATE `permit_sub_types` SET `requires_time` = 1 WHERE `name` LIKE '%pulang cepat%' OR `name` LIKE '%terlambat%'");
$stmtUpdate->execute();
echo "✓ Updated default sub-types (Pulang Cepat & Terlambat) to requires_time = 1.\n";

// 4. Show current sub-types with requires_time
$subTypes = $pdo->query("SELECT id, category_id, name, requires_attachment, requires_time FROM permit_sub_types WHERE is_active = 1")->fetchAll(PDO::FETCH_ASSOC);
echo "Active sub-types configuration:\n";
foreach ($subTypes as $st) {
    echo " - ID {$st['id']} ({$st['name']}): requires_attachment={$st['requires_attachment']}, requires_time={$st['requires_time']}\n";
}

echo "Migration finished successfully!\n";
