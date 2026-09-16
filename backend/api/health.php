<?php
// ==========================================================
// MGI ERP / HRIS - Health & Foundation Status API
// ==========================================================

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDbConnection();
    
    // Check tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Count roles and users
    $roleCount = $pdo->query("SELECT COUNT(*) FROM `roles`")->fetchColumn();
    $userCount = $pdo->query("SELECT COUNT(*) FROM `users`")->fetchColumn();
    
    sendSuccess([
        'status' => 'healthy',
        'database' => DB_NAME,
        'port' => DB_PORT,
        'tables' => $tables,
        'counts' => [
            'roles' => (int)$roleCount,
            'users' => (int)$userCount
        ],
        'php_version' => PHP_VERSION,
        'server_time' => date('Y-m-d H:i:s')
    ], 'MGI ERP Backend Foundation is operational.');
} catch (Exception $e) {
    sendError('Health check failed: ' . $e->getMessage(), 500);
}
