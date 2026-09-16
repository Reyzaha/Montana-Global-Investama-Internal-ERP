<?php
// ==========================================================
// MGI ERP / HRIS - IT Options Helper API
// Method: GET /backend/api/it/options.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../config/database.php';

$currentUser = requireRole([1, 7]); // Only IT and Admin

try {
    $pdo = getDbConnection();

    // 1. Fetch active users with their role and profile name
    $stmtUsers = $pdo->query("
        SELECT 
            u.id, 
            u.email, 
            r.id as role_id,
            r.name as role_name,
            COALESCE(up.name, u.email) as full_name,
            up.position
        FROM `users` u
        JOIN `roles` r ON u.role_id = r.id
        LEFT JOIN `user_profiles` up ON u.id = up.user_id
        WHERE u.status = 'active'
        ORDER BY r.name ASC, full_name ASC
    ");
    $users = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);

    // 2. Fetch devices list for linking dropdown
    $stmtDevices = $pdo->query("
        SELECT 
            d.id,
            d.asset_code,
            d.device_name,
            d.device_type,
            d.brand,
            d.model,
            d.serial_number,
            d.imei_number,
            d.phone_number,
            d.department_role,
            d.status,
            d.assigned_user_id,
            COALESCE(up.name, u.email) as assigned_user_name
        FROM `it_devices` d
        LEFT JOIN `users` u ON d.assigned_user_id = u.id
        LEFT JOIN `user_profiles` up ON u.id = up.user_id
        ORDER BY d.id DESC
    ");
    $devices = $stmtDevices->fetchAll(PDO::FETCH_ASSOC);

    sendSuccess([
        'users' => $users,
        'devices' => $devices
    ], 'Options retrieved successfully');
} catch (Exception $e) {
    sendError('Gagal memuat data options: ' . $e->getMessage(), 500);
}
