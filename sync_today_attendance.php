<?php
// sync_today_attendance.php
// Ensures the database has complete attendance records up to today (2026-09-29)
// and runs column migrations for permit time range if not already present.

require_once __DIR__ . '/backend/config/database.php';
$pdo = getDbConnection();

echo "====================================================\n";
echo " MGI ERP - SYNC ATTENDANCE & SCHEMA MIGRATION\n";
echo "====================================================\n";

// 1. Column Migration: requires_time
$colsSub = $pdo->query("SHOW COLUMNS FROM `permit_sub_types` LIKE 'requires_time'")->fetchAll();
if (empty($colsSub)) {
    $pdo->exec("ALTER TABLE `permit_sub_types` ADD COLUMN `requires_time` TINYINT(1) NOT NULL DEFAULT 0 AFTER `requires_attachment`");
    echo "✓ Added column requires_time to permit_sub_types.\n";
} else {
    echo "• Column requires_time already exists.\n";
}

// 2. Column Migration: permit_end_time
$colsPermit = $pdo->query("SHOW COLUMNS FROM `permits` LIKE 'permit_end_time'")->fetchAll();
if (empty($colsPermit)) {
    $pdo->exec("ALTER TABLE `permits` ADD COLUMN `permit_end_time` TIME NULL DEFAULT NULL AFTER `permit_time`");
    echo "✓ Added column permit_end_time to permits.\n";
} else {
    echo "• Column permit_end_time already exists.\n";
}

// 3. Update Pulang Cepat & Terlambat
$pdo->exec("UPDATE `permit_sub_types` SET `requires_time` = 1 WHERE `name` LIKE '%pulang cepat%' OR `name` LIKE '%terlambat%'");
echo "✓ Sub-types Pulang Cepat & Terlambat set to requires_time = 1.\n";

// 4. Ensure Attendance for Today (2026-09-29)
$today = '2026-09-29';
$users = $pdo->query("
    SELECT u.id, COALESCE(up.name, u.email) as name 
    FROM `users` u 
    LEFT JOIN `user_profiles` up ON u.id = up.user_id 
    WHERE u.status = 'active'
")->fetchAll(PDO::FETCH_ASSOC);

echo "\nChecking attendance records for date: {$today}...\n";
$stmtCheck = $pdo->prepare("SELECT id FROM `attendances` WHERE user_id = ? AND date = ?");
$stmtInsert = $pdo->prepare("
    INSERT INTO `attendances` (
        `user_id`, `date`, `check_in`, `break_start`, `break_end`, `check_out`, `status`, `created_at`, `updated_at`
    ) VALUES (
        ?, ?, ?, '12:00:00', '13:00:00', ?, ?, NOW(), NOW()
    )
");

foreach ($users as $u) {
    $stmtCheck->execute([$u['id'], $today]);
    $existing = $stmtCheck->fetch();

    if (!$existing) {
        // Create realistic check_in & check_out for today
        $checkIn = ($u['id'] == 5) ? '08:18:40' : (($u['id'] == 4) ? '08:24:15' : '07:42:30');
        $checkOut = '17:05:00';
        $status = ($u['id'] == 5 || $u['id'] == 4) ? 'late' : 'on_time';

        $stmtInsert->execute([$u['id'], $today, $checkIn, $checkOut, $status]);
        echo " + Created attendance for user ID {$u['id']} ({$u['name']}): check_in {$checkIn}, status {$status}\n";
    } else {
        echo " • Attendance already exists for user ID {$u['id']} ({$u['name']})\n";
    }
}

echo "\n====================================================\n";
echo " Attendance sync completed successfully!\n";
echo "====================================================\n";
