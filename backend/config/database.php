<?php
// ==========================================================
// MGI ERP / HRIS - Database Configuration
// ==========================================================
date_default_timezone_set(getenv('APP_TIMEZONE') ?: 'Asia/Jakarta');

define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3307'); // Default XAMPP port 3307, in Docker typically 3306
// Prioritize mgi_erp for ERP system even if server container env has mgi_landing
$envDb = getenv('DB_NAME');
$dbName = ($envDb && $envDb !== 'mgi_landing') ? $envDb : 'mgi_erp';
define('DB_NAME', $dbName);

define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');

/**
 * Get PDO Database Connection
 * @return PDO
 */
function getDbConnection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            // Double check if active database has ERP tables, fallback to mgi_erp if not
            $curDb = $pdo->query("SELECT DATABASE()")->fetchColumn();
            if ($curDb === 'mgi_landing') {
                $hasPermit = $pdo->query("SHOW TABLES LIKE 'permit_types'")->fetchColumn();
                if (!$hasPermit) {
                    $pdo->exec("USE `mgi_erp`");
                }
            }
        } catch (PDOException $e) {
            try {
                $rawDsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8mb4";
                $pdo = new PDO($rawDsn, DB_USER, DB_PASS, $options);
                $dbs = $pdo->query("SHOW DATABASES")->fetchAll(PDO::FETCH_COLUMN);
                if (in_array('mgi_erp', $dbs)) {
                    $pdo->exec("USE `mgi_erp`");
                } elseif (in_array(DB_NAME, $dbs)) {
                    $pdo->exec("USE `" . DB_NAME . "`");
                }
            } catch (PDOException $e2) {
                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'success' => false,
                    'message' => 'Database connection failed: ' . $e->getMessage()
                ]);
                exit();
            }
        }
    }
    return $pdo;
}
