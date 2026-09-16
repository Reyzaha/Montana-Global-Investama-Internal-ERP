<?php
/**
 * ==========================================================
 * MGI ERP / HRIS - Automated Database Backup Script
 * ==========================================================
 * Usage:
 *   CLI: php backup_database.php
 *   Can be scheduled via Windows Task Scheduler or Linux crontab
 */

require_once __DIR__ . '/backend/config/database.php';

$startTime = microtime(true);
$backupDir = __DIR__ . '/backend/storage/backups';

echo "=== MGI ERP DATABASE BACKUP UTILITY ===\n";
echo "Waktu mulai : " . date('Y-m-d H:i:s') . "\n";

// 1. Ensure backup directory exists
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

// 2. Protect backup directory with .htaccess against direct HTTP access
$htaccessPath = $backupDir . '/.htaccess';
if (!file_exists($htaccessPath)) {
    file_put_contents($htaccessPath, "Order Deny,Allow\nDeny from all\n");
}

try {
    $pdo = getDbConnection();
    $dbName = DB_NAME;

    echo "Menghubungkan ke database '{$dbName}'...\n";

    // Get all tables
    $tables = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")->fetchAll(PDO::FETCH_NUM);
    $tableList = array_map(function($t) { return $t[0]; }, $tables);

    $timestamp = date('Ymd_His');
    $backupFileName = "backup_{$dbName}_{$timestamp}.sql";
    $backupFilePath = $backupDir . '/' . $backupFileName;

    $handle = fopen($backupFilePath, 'w');
    if (!$handle) {
        throw new Exception("Gagal membuat file backup di {$backupFilePath}");
    }

    // Write header
    fwrite($handle, "-- ==========================================================\n");
    fwrite($handle, "-- MGI ERP Database Dump\n");
    fwrite($handle, "-- Database: {$dbName}\n");
    fwrite($handle, "-- Generated: " . date('Y-m-d H:i:s') . "\n");
    fwrite($handle, "-- Total Tables: " . count($tableList) . "\n");
    fwrite($handle, "-- ==========================================================\n\n");
    fwrite($handle, "SET FOREIGN_KEY_CHECKS=0;\n");
    fwrite($handle, "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n");
    fwrite($handle, "SET NAMES utf8mb4;\n\n");

    $totalRows = 0;

    foreach ($tableList as $table) {
        echo "- Memproses tabel `{$table}`... ";

        // Table schema
        $stmtCreate = $pdo->query("SHOW CREATE TABLE `{$table}`");
        $createRow = $stmtCreate->fetch(PDO::FETCH_NUM);
        $createTableSql = $createRow[1] ?? '';

        fwrite($handle, "-- --------------------------------------------------------\n");
        fwrite($handle, "-- Struktur tabel `{$table}`\n");
        fwrite($handle, "-- --------------------------------------------------------\n");
        fwrite($handle, "DROP TABLE IF EXISTS `{$table}`;\n");
        fwrite($handle, $createTableSql . ";\n\n");

        // Table rows
        $stmtRows = $pdo->query("SELECT * FROM `{$table}`");
        $rowCount = 0;

        $insertBuffer = [];
        while ($row = $stmtRows->fetch(PDO::FETCH_ASSOC)) {
            $rowCount++;
            $totalRows++;
            $escapedValues = array_map(function($val) use ($pdo) {
                if ($val === null) return 'NULL';
                return $pdo->quote($val);
            }, $row);
            $insertBuffer[] = "(" . implode(", ", $escapedValues) . ")";

            // Write in batches of 100 rows
            if (count($insertBuffer) >= 100) {
                fwrite($handle, "INSERT INTO `{$table}` VALUES \n" . implode(",\n", $insertBuffer) . ";\n");
                $insertBuffer = [];
            }
        }

        if (!empty($insertBuffer)) {
            fwrite($handle, "INSERT INTO `{$table}` VALUES \n" . implode(",\n", $insertBuffer) . ";\n");
        }

        fwrite($handle, "\n");
        echo "{$rowCount} baris.\n";
    }

    fwrite($handle, "SET FOREIGN_KEY_CHECKS=1;\n");
    fwrite($handle, "-- Dump completed at " . date('Y-m-d H:i:s') . "\n");
    fclose($handle);

    $originalSize = filesize($backupFilePath);
    echo "✓ Dump SQL berhasil dibuat: {$backupFileName} (" . round($originalSize / 1024, 2) . " KB)\n";

    // 3. Compress with GZIP if available
    $finalFilePath = $backupFilePath;
    if (function_exists('gzopen')) {
        $gzFilePath = $backupFilePath . '.gz';
        echo "Mengompresi backup ke .gz... ";
        $gz = gzopen($gzFilePath, 'w9');
        $fp = fopen($backupFilePath, 'r');
        while (!feof($fp)) {
            gzwrite($gz, fread($fp, 1024 * 512));
        }
        fclose($fp);
        gzclose($gz);

        if (file_exists($gzFilePath) && filesize($gzFilePath) > 0) {
            unlink($backupFilePath); // Remove uncompressed SQL
            $finalFilePath = $gzFilePath;
            $gzSize = filesize($gzFilePath);
            echo "Selesai! Ukuran terkompresi: " . round($gzSize / 1024, 2) . " KB\n";
        }
    }

    // 4. Prune old backups (Retention: 30 days)
    echo "Memeriksa retensi backup (> 30 hari)...\n";
    $deletedCount = 0;
    $retentionLimit = time() - (30 * 24 * 60 * 60);

    $files = scandir($backupDir);
    foreach ($files as $f) {
        if ($f === '.' || $f === '..' || $f === '.htaccess') continue;
        $fullPath = $backupDir . '/' . $f;
        if (is_file($fullPath) && filemtime($fullPath) < $retentionLimit) {
            if (unlink($fullPath)) {
                $deletedCount++;
                echo "  - Menghapus backup usang: {$f}\n";
            }
        }
    }
    echo "✓ Pembersihan selesai. {$deletedCount} backup usang dihapus.\n";

    $duration = round(microtime(true) - $startTime, 2);
    echo "=== BACKUP BERHASIL SELESAI DALAM {$duration} DETIK ===\n";

} catch (Exception $e) {
    echo "❌ ERROR SAAT BACKUP: " . $e->getMessage() . "\n";
    exit(1);
}
