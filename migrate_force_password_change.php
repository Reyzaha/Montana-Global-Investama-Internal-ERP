<?php
/**
 * MGI ERP - Migration: Add force_password_change column to users table
 */

require_once __DIR__ . '/backend/config/database.php';

echo "=== MEMULAI MIGRATION: FORCE PASSWORD CHANGE ON FIRST LOGIN ===\n";

try {
    $pdo = getDbConnection();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Periksa apakah kolom force_password_change sudah ada
    $stmt = $pdo->query("
        SELECT COUNT(*) 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'users' 
          AND COLUMN_NAME = 'force_password_change'
    ");
    $exists = (int)$stmt->fetchColumn();

    if ($exists === 0) {
        $pdo->exec("
            ALTER TABLE `users` 
            ADD COLUMN `force_password_change` TINYINT(1) NOT NULL DEFAULT 0 
            AFTER `status`
        ");
        echo "✓ Kolom `force_password_change` berhasil ditambahkan ke tabel `users`.\n";
    } else {
        echo "ℹ Kolom `force_password_change` sudah ada pada tabel `users`.\n";
    }

    echo "=== MIGRATION SELESAI DENGAN SUKSES! ===\n";

} catch (Exception $e) {
    echo "❌ Error migration: " . $e->getMessage() . "\n";
    exit(1);
}
