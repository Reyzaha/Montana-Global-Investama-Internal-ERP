<?php
// ==========================================================
// MGI ERP / HRIS - IT Devices List API
// Method: GET /backend/api/it/devices/index.php
// ==========================================================

require_once __DIR__ . '/../../../helpers/response.php';
require_once __DIR__ . '/../../../helpers/auth.php';
require_once __DIR__ . '/../../../config/database.php';

$currentUser = requireRole([1, 7]);

try {
    $pdo = getDbConnection();

    $search = trim($_GET['search'] ?? '');
    $deviceType = trim($_GET['device_type'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $department = trim($_GET['department'] ?? '');

    $query = "
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
            d.specs,
            d.assigned_user_id,
            d.assigned_date,
            d.status,
            d.notes,
            d.created_at,
            d.updated_at,
            u.email as assigned_user_email,
            COALESCE(up.name, u.email) as assigned_user_name,
            r.name as assigned_user_role,
            (SELECT COUNT(*) FROM `it_emails` e WHERE e.linked_device_id = d.id) as linked_email_count
        FROM `it_devices` d
        LEFT JOIN `users` u ON d.assigned_user_id = u.id
        LEFT JOIN `user_profiles` up ON u.id = up.user_id
        LEFT JOIN `roles` r ON u.role_id = r.id
        WHERE 1=1
    ";

    $params = [];

    if ($search !== '') {
        $query .= " AND (
            d.asset_code LIKE :s 
            OR d.device_name LIKE :s 
            OR d.brand LIKE :s 
            OR d.model LIKE :s 
            OR d.serial_number LIKE :s 
            OR d.imei_number LIKE :s 
            OR d.phone_number LIKE :s 
            OR d.department_role LIKE :s
            OR u.email LIKE :s
            OR up.name LIKE :s
        )";
        $params[':s'] = '%' . $search . '%';
    }

    if ($deviceType !== '') {
        $query .= " AND d.device_type = :device_type";
        $params[':device_type'] = $deviceType;
    }

    if ($status !== '') {
        $query .= " AND d.status = :status";
        $params[':status'] = $status;
    }

    if ($department !== '') {
        $query .= " AND d.department_role LIKE :department";
        $params[':department'] = '%' . $department . '%';
    }

    $query .= " ORDER BY d.id DESC";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $devices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Summary statistics
    $statsStmt = $pdo->query("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
            SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as in_stock,
            SUM(CASE WHEN status = 'under_maintenance' THEN 1 ELSE 0 END) as maintenance,
            SUM(CASE WHEN status = 'damaged' THEN 1 ELSE 0 END) as damaged
        FROM `it_devices`
    ");
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    sendSuccess([
        'devices' => $devices,
        'stats' => $stats
    ], 'Data perangkat berhasil diambil');
} catch (Exception $e) {
    sendError('Gagal mengambil data perangkat: ' . $e->getMessage(), 500);
}
