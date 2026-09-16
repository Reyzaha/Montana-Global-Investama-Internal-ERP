<?php
require_once __DIR__ . '/../backend/config/database.php';

try {
    $pdo = getDbConnection();
    $sql = file_get_contents(__DIR__ . '/schema_update.sql');
    $pdo->exec($sql);
    echo "Migration successful!\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
