<?php
// clean_duplicate_permit_types.php
// Cleans duplicate permit_types entries, remaps foreign keys, and ensures proper configuration.
require_once __DIR__ . '/backend/config/database.php';

$pdo = getDbConnection();
echo "Running Cleanup: Deduplicate permit_types and normalize configuration...\n";

// Discover available databases and ensure we operate on mgi_erp
$databases = $pdo->query("SHOW DATABASES")->fetchAll(PDO::FETCH_COLUMN);
echo "• Available databases on MySQL server: " . implode(', ', $databases) . "\n";

if (!in_array('mgi_erp', $databases)) {
    echo "• Database 'mgi_erp' does not exist yet in accessible databases.\n";
    try {
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `mgi_erp` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "✓ Database 'mgi_erp' created successfully.\n";
    } catch (Exception $e) {
        echo "• Notice: User '" . DB_USER . "' does not have permission to CREATE DATABASE. Please create 'mgi_erp' via root.\n";
    }
}

$pdo->exec("USE `mgi_erp`");
$activeDb = $pdo->query("SELECT DATABASE()")->fetchColumn();
echo "• Active Database: {$activeDb}\n";

$hasTable = $pdo->query("SHOW TABLES LIKE 'permit_types'")->fetchColumn();
if (!$hasTable) {
    echo "• Database '{$activeDb}' is empty. Importing seed data...\n";
    $seedFile = __DIR__ . '/database/clean_production_seed.sql';
    if (!file_exists($seedFile)) {
        $seedFile = __DIR__ . '/database/mgi_erp_dump.sql';
    }
    
    if (file_exists($seedFile)) {
        echo "• Importing schema and seed data from " . basename($seedFile) . "...\n";
        $sql = file_get_contents($seedFile);
        $pdo->exec($sql);
        echo "✓ Database schema and seed data imported successfully.\n";
    } else {
        die("FATAL: Table 'permit_types' was not found in '{$activeDb}', and seed file was not found in " . __DIR__ . "/database/.\n");
    }
}

// 1. Ensure primary types (1: Izin, 2: Sakit, 3: Cuti) exist
$types = [
    1 => ['code' => 'izin', 'name' => 'Izin', 'desc' => 'Pengajuan izin umum', 'req' => 0],
    2 => ['code' => 'sakit', 'name' => 'Sakit', 'desc' => 'Pengajuan sakit (dengan / tanpa surat dokter)', 'req' => 0],
    3 => ['code' => 'cuti', 'name' => 'Cuti', 'desc' => 'Pengajuan cuti tahunan / cuti khusus', 'req' => 0],
];

foreach ($types as $id => $t) {
    $stmt = $pdo->prepare("SELECT id FROM permit_types WHERE id = ?");
    $stmt->execute([$id]);
    if ($stmt->fetch()) {
        $pdo->prepare("UPDATE permit_types SET code = ?, name = ?, description = ?, requires_attachment = ?, is_active = 1 WHERE id = ?")
            ->execute([$t['code'], $t['name'], $t['desc'], $t['req'], $id]);
    } else {
        $pdo->prepare("INSERT INTO permit_types (id, code, name, description, requires_attachment, is_active) VALUES (?, ?, ?, ?, ?, 1)")
            ->execute([$id, $t['code'], $t['name'], $t['desc'], $t['req']]);
    }
}
echo "✓ Primary permit_types (1: Izin, 2: Sakit, 3: Cuti) normalized.\n";

// 2. Find any duplicate permit_types where id > 3
$duplicates = $pdo->query("SELECT id, code, name FROM permit_types WHERE id > 3")->fetchAll(PDO::FETCH_ASSOC);

if (!empty($duplicates)) {
    echo "Found " . count($duplicates) . " duplicate permit_types to merge and clean up:\n";
    foreach ($duplicates as $dup) {
        $dupId = $dup['id'];
        $nameLower = strtolower($dup['name']);
        $codeLower = strtolower($dup['code']);

        $targetId = 1; // Default to Izin
        if (strpos($codeLower, 'sakit') !== false || strpos($nameLower, 'sakit') !== false) {
            $targetId = 2; // Sakit
        } elseif (strpos($codeLower, 'cuti') !== false || strpos($nameLower, 'cuti') !== false) {
            $targetId = 3; // Cuti
        }

        echo " - Remapping type ID {$dupId} ('{$dup['name']}') -> target ID {$targetId}...\n";

        // Remap permits
        $pdo->prepare("UPDATE permits SET permit_type_id = ? WHERE permit_type_id = ?")->execute([$targetId, $dupId]);

        // Remap permit_sub_types
        $pdo->prepare("UPDATE permit_sub_types SET category_id = ? WHERE category_id = ?")->execute([$targetId, $dupId]);

        // Remap leave_balances if table exists
        try {
            $pdo->prepare("UPDATE leave_balances SET permit_type_id = ? WHERE permit_type_id = ?")->execute([$targetId, $dupId]);
        } catch (Exception $e) {}

        // Delete duplicate permit_type
        $pdo->prepare("DELETE FROM permit_types WHERE id = ?")->execute([$dupId]);
    }
    echo "✓ All duplicate permit_types deleted successfully.\n";
} else {
    echo "• No duplicate permit_types found.\n";
}

// 3. Ensure Sakit sub-types exist with proper requires_attachment
$sakitSubs = $pdo->query("SELECT id, name, requires_attachment FROM permit_sub_types WHERE category_id = 2")->fetchAll(PDO::FETCH_ASSOC);
echo "Checking Sakit sub-types:\n";
$hasTanpaSurat = false;
$hasDenganSurat = false;

foreach ($sakitSubs as $ss) {
    echo " - ID: {$ss['id']}, Name: {$ss['name']}, Requires Attachment: {$ss['requires_attachment']}\n";
    if (stripos($ss['name'], 'tanpa surat') !== false) $hasTanpaSurat = true;
    if (stripos($ss['name'], 'surat dokter') !== false) $hasDenganSurat = true;
    if (trim($ss['name']) === 'Sakit') {
        // Legacy redundant sub-type, deactivate
        $pdo->prepare("UPDATE permit_sub_types SET is_active = 0 WHERE id = ?")->execute([$ss['id']]);
        echo " - Deactivated legacy redundant sub-type ID {$ss['id']} ('Sakit').\n";
    }
}

if (!$hasTanpaSurat) {
    $pdo->prepare("INSERT INTO permit_sub_types (category_id, name, description, requires_attachment, is_paid, is_active) VALUES (2, 'Sakit tanpa Surat', 'Izin sakit tanpa melampirkan surat dokter', 0, 1, 1)")->execute();
    echo "✓ Added 'Sakit tanpa Surat' sub-type (requires_attachment = 0).\n";
}

if (!$hasDenganSurat) {
    $pdo->prepare("INSERT INTO permit_sub_types (category_id, name, description, requires_attachment, attachment_label, is_paid, is_active) VALUES (2, 'Sakit dengan Surat Dokter', 'Izin sakit dengan melampirkan surat keterangan dokter', 1, 'Surat Keterangan Dokter', 1, 1)")->execute();
    echo "✓ Added 'Sakit dengan Surat Dokter' sub-type (requires_attachment = 1).\n";
}

echo "Cleanup finished successfully!\n";
