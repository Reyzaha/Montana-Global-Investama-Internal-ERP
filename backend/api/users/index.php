<?php
// ==========================================================
// MGI ERP / HRIS - Users List API
// Method: GET /backend/api/users/index.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';

try {
    $pdo = getDbConnection();
    
    $search = $_GET['search'] ?? '';
    $roleId = $_GET['role_id'] ?? '';
    $status = $_GET['status'] ?? '';
    
    $query = "
        SELECT u.id, u.email, u.role_id, r.name as role_name, u.mfa_enabled, u.status, u.created_at
        FROM `users` u
        JOIN `roles` r ON u.role_id = r.id
        WHERE 1=1
    ";
    
    $params = [];
    
    if (!empty($search)) {
        $query .= " AND u.email LIKE :search";
        $params[':search'] = '%' . $search . '%';
    }
    
    if (!empty($roleId)) {
        $query .= " AND u.role_id = :role_id";
        $params[':role_id'] = (int)$roleId;
    }
    
    if (!empty($status)) {
        $query .= " AND u.status = :status";
        $params[':status'] = $status;
    }
    
    $query .= " ORDER BY u.id ASC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    sendSuccess($users, 'Data user berhasil diambil');
} catch (Exception $e) {
    sendError('Gagal mengambil data user: ' . $e->getMessage(), 500);
}
