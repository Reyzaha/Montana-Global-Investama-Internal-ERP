<?php
// ==========================================================
// MGI ERP / HRIS - PM Permits API
// Method: GET /backend/api/pm/permits.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

// Allowed: PM (6) and Admin (7)
$user = requireRole([6, 7]);
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed. Use GET.', 405);
}

try {
    $status = $_GET['status'] ?? 'pending_pm';
    $search = trim($_GET['search'] ?? '');
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, (int)($_GET['limit'] ?? 20));
    $offset = ($page - 1) * $limit;

    $where = [];
    $params = [];

    if (!empty($status) && $status !== 'all') {
        $where[] = "p.status = :status";
        $params[':status'] = $status;
    }

    if (!empty($search)) {
        $where[] = "(u.email LIKE :search OR up.name LIKE :search OR pt.name LIKE :search OR p.description LIKE :search)";
        $params[':search'] = "%$search%";
    }

    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    // Count
    $countSql = "
        SELECT COUNT(*) 
        FROM permits p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        JOIN permit_types pt ON p.permit_type_id = pt.id
        $whereClause
    ";
    $stmtCount = $pdo->prepare($countSql);
    $stmtCount->execute($params);
    $total = (int)$stmtCount->fetchColumn();

    // Data query
    $sql = "
        SELECT 
            p.id,
            p.user_id,
            u.email AS employee_email,
            COALESCE(up.name, u.email) AS employee_name,
            up.position AS employee_position,
            pt.id AS permit_type_id,
            pt.name AS permit_type_name,
            p.start_date,
            p.end_date,
            p.description,
            p.status,
            p.created_at,
            (SELECT file_path FROM permit_attachments WHERE permit_id = p.id LIMIT 1) AS attachment_path,
            (SELECT original_name FROM permit_attachments WHERE permit_id = p.id LIMIT 1) AS attachment_name,
            (
                SELECT pa.note 
                FROM permit_approvals pa 
                WHERE pa.permit_id = p.id AND pa.step = 1 AND pa.status = 'approved'
                ORDER BY pa.id DESC LIMIT 1
            ) AS hrga_approval_note,
            (
                SELECT pa.approved_at 
                FROM permit_approvals pa 
                WHERE pa.permit_id = p.id AND pa.step = 1 AND pa.status = 'approved'
                ORDER BY pa.id DESC LIMIT 1
            ) AS hrga_approved_at
        FROM permits p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        JOIN permit_types pt ON p.permit_type_id = pt.id
        $whereClause
        ORDER BY 
            CASE WHEN p.status = 'pending_pm' THEN 1 ELSE 2 END,
            p.created_at DESC
        LIMIT :limit OFFSET :offset
    ";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendSuccess($data, 'Permits for PM retrieved.', [
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'total_pages' => ceil($total / $limit)
    ]);
} catch (Exception $e) {
    sendError('Gagal mengambil data permit PM: ' . $e->getMessage(), 500);
}
