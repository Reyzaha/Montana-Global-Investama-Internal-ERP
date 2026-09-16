<?php
// ==========================================================
// MGI ERP / HRIS - GET Notifications API
// ==========================================================

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/auth.php';

$user = requireAuth();
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

try {
    // Only get the latest 20 notifications
    $stmt = $pdo->prepare("
        SELECT id, title, message, type, reference_type, reference_id, is_read, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    ");
    $stmt->execute([$user['id']]);
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Mark as read optionally (can be a separate endpoint, but for simplicity let's just return them)
    // You could also add logic to mark them read here, but better to keep it clean.

    sendSuccess($notifications, 'Notifications retrieved.');

} catch (Exception $e) {
    sendError('Failed to fetch notifications: ' . $e->getMessage(), 500);
}
