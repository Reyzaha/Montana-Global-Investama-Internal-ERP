<?php
// ==========================================================
// MGI ERP / HRIS - Auth Helper & RFC6238 TOTP
// ==========================================================

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/response.php';

define('BCRYPT_COST', 12);

/**
 * Start PHP session safely
 */
function startAppSession(): void {
    if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
        // Secure session parameters
        ini_set('session.cookie_httponly', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_samesite', 'Lax');
        ini_set('session.cookie_path', '/');
        session_start();
    }
}

/**
 * Check if the email or IP is currently rate-limited due to repeated failed logins
 * 5 failures in 15 mins -> 5 min lockout
 * 10 failures in 15 mins -> 30 min lockout
 */
function checkLoginRateLimit(string $email, string $ip): array {
    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare("
            SELECT COUNT(*) AS failed_count, MAX(attempted_at) AS last_failed_at
            FROM `login_attempts`
            WHERE (email = :email OR ip_address = :ip)
              AND is_success = 0
              AND attempted_at >= (NOW() - INTERVAL 15 MINUTE)
        ");
        $stmt->execute([':email' => $email, ':ip' => $ip]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $failedCount = (int)($row['failed_count'] ?? 0);
        $lastFailedTime = !empty($row['last_failed_at']) ? strtotime($row['last_failed_at']) : 0;
        $now = time();

        if ($failedCount >= 10) {
            $lockoutSeconds = 1800; // 30 minutes
            $elapsed = $now - $lastFailedTime;
            if ($elapsed < $lockoutSeconds) {
                $remaining = max(1, ceil(($lockoutSeconds - $elapsed) / 60));
                return [
                    'allowed' => false,
                    'retry_after' => $lockoutSeconds - $elapsed,
                    'message' => "Terlalu banyak percobaan login gagal ($failedCount kali). Akun/IP diblokir sementara selama $remaining menit."
                ];
            }
        } elseif ($failedCount >= 5) {
            $lockoutSeconds = 300; // 5 minutes
            $elapsed = $now - $lastFailedTime;
            if ($elapsed < $lockoutSeconds) {
                $remaining = max(1, ceil(($lockoutSeconds - $elapsed) / 60));
                return [
                    'allowed' => false,
                    'retry_after' => $lockoutSeconds - $elapsed,
                    'message' => "Terlalu banyak percobaan login gagal ($failedCount kali). Silakan tunggu $remaining menit sebelum mencoba kembali."
                ];
            }
        }

        return [
            'allowed' => true,
            'failed_attempts' => $failedCount
        ];
    } catch (Exception $e) {
        error_log("Rate limit check failed: " . $e->getMessage());
        return ['allowed' => true, 'failed_attempts' => 0];
    }
}

/**
 * Record a login attempt into `login_attempts`
 */
function recordLoginAttempt(string $email, string $ip, bool $isSuccess): void {
    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare("
            INSERT INTO `login_attempts` (`email`, `ip_address`, `is_success`, `attempted_at`)
            VALUES (:email, :ip, :is_success, NOW())
        ");
        $stmt->execute([
            ':email' => substr($email, 0, 191),
            ':ip' => substr($ip, 0, 45),
            ':is_success' => $isSuccess ? 1 : 0
        ]);

        // If success, clean up old failed attempts for this email & IP
        if ($isSuccess) {
            $stmtClean = $pdo->prepare("
                DELETE FROM `login_attempts` 
                WHERE (email = :email OR ip_address = :ip)
                  AND is_success = 0
            ");
            $stmtClean->execute([':email' => $email, ':ip' => $ip]);
        }
    } catch (Exception $e) {
        error_log("Failed to record login attempt: " . $e->getMessage());
    }
}

/**
 * Rehash password to higher Bcrypt cost (12) seamlessly if needed
 */
function rehashPasswordIfNeeded(PDO $pdo, int $userId, string $currentHash, string $plainPassword): void {
    if (password_needs_rehash($currentHash, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST])) {
        $newHash = password_hash($plainPassword, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
        $stmt = $pdo->prepare("UPDATE `users` SET `password_hash` = :hash WHERE `id` = :id");
        $stmt->execute([':hash' => $newHash, ':id' => $userId]);
    }
}

/**
 * Regenerate session ID safely
 */
function rotateSession(): void {
    startAppSession();
    if (session_id()) {
        session_regenerate_id(true);
    }
}

/**
 * Check if current user is logged in
 */
function getCurrentUser(): ?array {
    startAppSession();
    if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
        return null;
    }
    
    $user = [
        'id' => (int)$_SESSION['user_id'],
        'email' => $_SESSION['email'] ?? '',
        'role_id' => (int)($_SESSION['role_id'] ?? 0),
        'role_name' => $_SESSION['role_name'] ?? '',
        'mfa_verified' => (bool)($_SESSION['mfa_verified'] ?? false),
        'must_change_password' => (bool)($_SESSION['must_change_password'] ?? false)
    ];

    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare("SELECT name, photo_path FROM user_profiles WHERE user_id = :id LIMIT 1");
        $stmt->execute([':id' => $user['id']]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($profile) {
            $user['name'] = $profile['name'];
            $user['photo_path'] = $profile['photo_path'];
        } else {
            $user['name'] = 'User';
            $user['photo_path'] = null;
        }
    } catch (Exception $e) {
        $user['name'] = 'User';
        $user['photo_path'] = null;
    }

    return $user;
}

/**
 * Require valid authenticated session middleware
 */
function requireAuth(bool $allowPasswordChangePending = false): array {
    $user = getCurrentUser();
    if (!$user) {
        sendError('Unauthorized. Please login to continue.', 401);
    }
    
    if (!$user['mfa_verified']) {
        sendError('MFA verification required.', 403);
    }

    if (!$allowPasswordChangePending && !empty($user['must_change_password'])) {
        sendError('Anda wajib mengubah kata sandi pada login pertama sebelum dapat mengakses sistem.', 403, [
            'must_change_password' => true
        ]);
    }
    
    return $user;
}

/**
 * Require specific role or permission
 */
function requireRole(array|int $allowedRoles): array {
    $user = requireAuth();
    $roles = is_array($allowedRoles) ? $allowedRoles : [$allowedRoles];
    
    if (!in_array($user['role_id'], $roles, true)) {
        sendError('Forbidden. You do not have permission to access this resource.', 403);
    }
    
    return $user;
}

/**
 * Check if a user has granular permission on a module and action
 * Action: 'view', 'create', 'edit', 'delete', 'approve'
 */
function hasPermission(array $user, string $moduleCode, string $action = 'view'): bool {
    // Admin (role 7) always has full access
    if ((int)$user['role_id'] === 7) {
        return true;
    }

    $validActions = ['view', 'create', 'edit', 'delete', 'approve'];
    if (!in_array($action, $validActions, true)) {
        return false;
    }

    try {
        $pdo = getDbConnection();

        // 1. Check User Override (takes precedence over role default)
        $stmtOverride = $pdo->prepare("
            SELECT override_type, expires_at 
            FROM `user_permission_overrides` 
            WHERE user_id = :user_id 
              AND module_code = :module 
              AND action = :action 
              AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY id DESC LIMIT 1
        ");
        $stmtOverride->execute([
            ':user_id' => $user['id'],
            ':module' => $moduleCode,
            ':action' => $action
        ]);
        $override = $stmtOverride->fetch(PDO::FETCH_ASSOC);

        if ($override) {
            return $override['override_type'] === 'grant';
        }

        // 2. Check Role Module Permissions
        $col = 'can_' . $action;
        $stmtRole = $pdo->prepare("
            SELECT `$col` 
            FROM `module_permissions` 
            WHERE role_id = :role_id AND module_code = :module 
            LIMIT 1
        ");
        $stmtRole->execute([
            ':role_id' => $user['role_id'],
            ':module' => $moduleCode
        ]);
        $hasRolePerm = $stmtRole->fetchColumn();

        return (bool)$hasRolePerm;
    } catch (Exception $e) {
        error_log("Permission check error: " . $e->getMessage());
        return false;
    }
}

/**
 * Middleware: require granular permission or send 403
 */
function requirePermission(string $moduleCode, string $action = 'view'): array {
    $user = requireAuth();
    if (!hasPermission($user, $moduleCode, $action)) {
        sendError("Forbidden. Anda tidak memiliki izin '{$action}' pada modul '{$moduleCode}'.", 403);
    }
    return $user;
}

// ==========================================================
// PURE PHP TOTP (RFC 6238) - Google Authenticator Compatible
// ==========================================================

class TOTP {
    private static string $base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate 16-character Base32 secret
     */
    public static function generateSecret(int $length = 16): string {
        $secret = '';
        for ($i = 0; $i < $length; $i++) {
            $secret .= self::$base32Chars[random_int(0, 31)];
        }
        return $secret;
    }

    /**
     * Calculate current 6-digit TOTP code
     */
    public static function getCode(string $secret, ?int $timeSlice = null): string {
        if ($timeSlice === null) {
            $timeSlice = (int)floor(time() / 30);
        }

        $secretKey = self::base32Decode($secret);
        // Pack time into 8-byte big-endian binary string
        $time = pack('N*', 0) . pack('N*', $timeSlice);
        $hash = hash_hmac('sha1', $time, $secretKey, true);

        // Dynamic truncation
        $offset = ord(substr($hash, -1)) & 0x0F;
        $hashPart = substr($hash, $offset, 4);

        $value = unpack('N', $hashPart)[1] & 0x7FFFFFFF;
        $modulo = $value % 1000000;

        return str_pad((string)$modulo, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Verify provided OTP with time window drift tolerance (±4 slices = ±120s)
     */
    public static function verifyCode(string $secret, string $code, int $discrepancy = 4): bool {
        $currentTimeSlice = (int)floor(time() / 30);
        $code = trim($code);
        $secret = strtoupper(trim(str_replace(' ', '', $secret)));

        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $calculated = self::getCode($secret, $currentTimeSlice + $i);
            if (hash_equals($calculated, $code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Generate standard otpauth:// URI for QR generation
     */
    public static function getOtpAuthUrl(string $account, string $secret, string $issuer = 'MGI ERP'): string {
        return 'otpauth://totp/' . rawurlencode($issuer) . ':' . rawurlencode($account) .
               '?secret=' . rawurlencode($secret) .
               '&issuer=' . rawurlencode($issuer) .
               '&algorithm=SHA1&digits=6&period=30';
    }

    /**
     * Base32 decode helper
     */
    private static function base32Decode(string $b32): string {
        $b32 = strtoupper($b32);
        $buffer = 0;
        $length = 0;
        $binary = '';

        for ($i = 0; $i < strlen($b32); $i++) {
            $char = $b32[$i];
            $val = strpos(self::$base32Chars, $char);
            if ($val === false) continue;

            $buffer = ($buffer << 5) | $val;
            $length += 5;

            if ($length >= 8) {
                $length -= 8;
                $binary .= chr(($buffer >> $length) & 0xFF);
            }
        }
        return $binary;
    }
}
