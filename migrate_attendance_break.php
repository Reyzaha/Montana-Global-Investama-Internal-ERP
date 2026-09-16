<?php
/**
 * MGI ERP - Migration: Add Break Times to Attendance Settings & Attendances
 */
require_once __DIR__ . '/backend/config/database.php';

try {
    $pdo = getDbConnection();
    echo "=== MEMULAI MIGRATION BREAK ATTENDANCE ===\n";

    // 1. Alter attendance_settings to add break_start_time and break_end_time if not exists
    $colsSettings = $pdo->query("SHOW COLUMNS FROM `attendance_settings`")->fetchAll(PDO::FETCH_COLUMN);
    
    if (!in_array('break_start_time', $colsSettings)) {
        $pdo->exec("ALTER TABLE `attendance_settings` ADD COLUMN `break_start_time` TIME NOT NULL DEFAULT '12:00:00' AFTER `check_out_time`");
        echo "✓ Kolom break_start_time berhasil ditambahkan ke attendance_settings.\n";
    } else {
        echo "- Kolom break_start_time sudah ada di attendance_settings.\n";
    }

    if (!in_array('break_end_time', $colsSettings)) {
        $pdo->exec("ALTER TABLE `attendance_settings` ADD COLUMN `break_end_time` TIME NOT NULL DEFAULT '13:00:00' AFTER `break_start_time`");
        echo "✓ Kolom break_end_time berhasil ditambahkan ke attendance_settings.\n";
    } else {
        echo "- Kolom break_end_time sudah ada di attendance_settings.\n";
    }

    // 2. Alter attendances to add break columns if not exists
    $colsAttendances = $pdo->query("SHOW COLUMNS FROM `attendances`")->fetchAll(PDO::FETCH_COLUMN);

    $breakColumns = [
        'break_start' => "TIME NULL AFTER `check_in_distance`",
        'break_start_latitude' => "DECIMAL(10,8) NULL AFTER `break_start`",
        'break_start_longitude' => "DECIMAL(11,8) NULL AFTER `break_start_latitude`",
        'break_start_accuracy' => "DECIMAL(8,2) NULL AFTER `break_start_longitude`",
        'break_start_distance' => "INT UNSIGNED NULL AFTER `break_start_accuracy`",
        'break_end' => "TIME NULL AFTER `break_start_distance`",
        'break_end_latitude' => "DECIMAL(10,8) NULL AFTER `break_end`",
        'break_end_longitude' => "DECIMAL(11,8) NULL AFTER `break_end_latitude`",
        'break_end_accuracy' => "DECIMAL(8,2) NULL AFTER `break_end_longitude`",
        'break_end_distance' => "INT UNSIGNED NULL AFTER `break_end_accuracy`"
    ];

    foreach ($breakColumns as $col => $definition) {
        if (!in_array($col, $colsAttendances)) {
            $pdo->exec("ALTER TABLE `attendances` ADD COLUMN `$col` $definition");
            echo "✓ Kolom $col berhasil ditambahkan ke attendances.\n";
        } else {
            echo "- Kolom $col sudah ada di attendances.\n";
        }
    }

    // Pastikan setting default terisi jika belum ada
    $pdo->exec("UPDATE `attendance_settings` SET `break_start_time` = '12:00:00', `break_end_time` = '13:00:00' WHERE `break_start_time` IS NULL OR `break_start_time` = '00:00:00'");

    echo "\n=== MIGRATION SELESAI DENGAN SUKSES ===\n";
} catch (Exception $e) {
    echo "ERROR MIGRATION: " . $e->getMessage() . "\n";
    exit(1);
}
