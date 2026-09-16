<?php
// ==========================================================
// MGI ERP / HRIS - Audit Logging Helper
// ==========================================================

require_once __DIR__ . '/../config/database.php';

/**
 * Log user action into audit_logs table
 *
 * @param int|null $userId
 * @param string $action (e.g. 'LOGIN', 'CREATE_USER', 'LOGOUT')
 * @param string $module (e.g. 'AUTH', 'USER', 'ATTENDANCE')
 * @param string|null $targetId
 * @param string|null $description
 * @return bool
 */
function recordAuditLog(?int $userId, string $action, string $module, ?string $targetId = null, ?string $description = null): bool {
    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare("
            INSERT INTO `audit_logs` (`user_id`, `action`, `module`, `target_id`, `description`, `ip_address`, `user_agent`)
            VALUES (:user_id, :action, :module, :target_id, :description, :ip_address, :user_agent)
        ");
        
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        
        return $stmt->execute([
            ':user_id' => $userId,
            ':action' => strtoupper($action),
            ':module' => strtoupper($module),
            ':target_id' => $targetId,
            ':description' => $description,
            ':ip_address' => $ip,
            ':user_agent' => substr($ua, 0, 500)
        ]);
    } catch (Exception $e) {
        // Audit log failure should not break critical paths, but log to error log
        error_log("Audit log failed: " . $e->getMessage());
        return false;
    }
}
