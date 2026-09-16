<?php
// ==========================================================
// MGI ERP / HRIS - Logout API Endpoint
// Method: POST /backend/api/auth/logout.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';

startAppSession();
$userId = $_SESSION['user_id'] ?? null;

if ($userId) {
    recordAuditLog((int)$userId, 'LOGOUT', 'AUTH', (string)$userId, 'User logged out successfully');
}

// Clear all session variables and destroy session
$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}
session_destroy();

sendSuccess(null, 'Anda telah berhasil keluar dari sistem.');
