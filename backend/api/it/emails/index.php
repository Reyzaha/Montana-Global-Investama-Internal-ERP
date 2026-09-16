<?php
// ==========================================================
// MGI ERP / HRIS - IT Emails List API
// Method: GET /backend/api/it/emails/index.php
// ==========================================================

require_once __DIR__ . '/../../../helpers/response.php';
require_once __DIR__ . '/../../../helpers/auth.php';
require_once __DIR__ . '/../../../config/database.php';

$currentUser = requireRole([1, 7]);

try {
    $pdo = getDbConnection();

    $search = trim($_GET['search'] ?? '');
    $accountType = trim($_GET['account_type'] ?? '');
    $status = trim($_GET['status'] ?? '');

    $query = "
        SELECT 
            e.id,
            e.email_address,
            e.account_type,
            e.purpose_description,
            e.primary_user_id,
            e.linked_device_id,
            e.status,
            e.notes,
            e.created_at,
            e.updated_at,
            u.email as user_email,
            COALESCE(up.name, u.email) as user_full_name,
            r.name as user_role,
            d.asset_code as device_asset_code,
            d.device_name as device_name,
            d.device_type as device_type,
            d.brand as device_brand,
            d.model as device_model,
            d.serial_number as device_sn,
            d.imei_number as device_imei,
            d.phone_number as device_phone,
            d.department_role as device_dept
        FROM `it_emails` e
        LEFT JOIN `users` u ON e.primary_user_id = u.id
        LEFT JOIN `user_profiles` up ON u.id = up.user_id
        LEFT JOIN `roles` r ON u.role_id = r.id
        LEFT JOIN `it_devices` d ON e.linked_device_id = d.id
        WHERE 1=1
    ";

    $params = [];

    if ($search !== '') {
        $query .= " AND (
            e.email_address LIKE :s
            OR e.purpose_description LIKE :s
            OR u.email LIKE :s
            OR up.name LIKE :s
            OR d.asset_code LIKE :s
            OR d.serial_number LIKE :s
            OR d.brand LIKE :s
            OR d.model LIKE :s
        )";
        $params[':s'] = '%' . $search . '%';
    }

    if ($accountType !== '') {
        $query .= " AND e.account_type = :account_type";
        $params[':account_type'] = $accountType;
    }

    if ($status !== '') {
        $query .= " AND e.status = :status";
        $params[':status'] = $status;
    }

    $query .= " ORDER BY e.id DESC";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $emails = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Summary statistics
    $statsStmt = $pdo->query("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN account_type = 'Personal Employee' THEN 1 ELSE 0 END) as personal,
            SUM(CASE WHEN account_type = 'Department / Shared' THEN 1 ELSE 0 END) as shared,
            SUM(CASE WHEN linked_device_id IS NOT NULL THEN 1 ELSE 0 END) as linked_device_count,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
        FROM `it_emails`
    ");
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    sendSuccess([
        'emails' => $emails,
        'stats' => $stats
    ], 'Data email berhasil dimuat');
} catch (Exception $e) {
    sendError('Gagal mengambil data email: ' . $e->getMessage(), 500);
}
