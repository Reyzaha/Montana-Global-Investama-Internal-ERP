<?php
// ==========================================================
// MGI ERP - Shared Documents Overview
// ==========================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

try {
    $user = requireAuth();
    $pdo = getDbConnection();
    
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 10;
    $offset = ($page - 1) * $limit;
    
    $search = $_GET['search'] ?? '';
    $category = $_GET['category'] ?? '';
    
    // Base WHERE clause to fetch documents where user has access
    $where = ["d.status = 'ACTIVE'", "(da.user_id = :user_id OR da.role_id = :role_id)", "(da.expires_at IS NULL OR da.expires_at > NOW())"];
    $params = [
        ':user_id' => $user['id'],
        ':role_id' => $user['role_id']
    ];
    
    if (!empty($category)) {
        $where[] = "d.category = :category";
        $params[':category'] = $category;
    }
    
    if (!empty($search)) {
        $where[] = "(d.name LIKE :search OR d.description LIKE :search OR d.original_file_name LIKE :search)";
        $params[':search'] = "%$search%";
    }
    
    $whereClause = implode(' AND ', $where);
    
    // We use GROUP BY to avoid duplicates if user gets access via both role and user ID
    $countStmt = $pdo->prepare("
        SELECT COUNT(DISTINCT d.id) 
        FROM documents d
        JOIN document_access da ON d.id = da.document_id
        WHERE $whereClause
    ");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();
    
    // Fetch documents along with the highest permission
    $stmt = $pdo->prepare("
        SELECT d.id, d.name, d.category, d.file_extension, d.mime_type, d.file_size, d.created_at,
               MAX(da.permission) as permission, MAX(da.granted_at) as shared_date,
               u.email as shared_by_email
        FROM documents d
        JOIN document_access da ON d.id = da.document_id
        JOIN users u ON da.granted_by = u.id
        WHERE $whereClause
        GROUP BY d.id
        ORDER BY shared_date DESC
        LIMIT :limit OFFSET :offset
    ");
    
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    
    $stmt->execute();
    $documents = $stmt->fetchAll();
    
    sendSuccess([
        'items' => $documents,
        'pagination' => [
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit)
        ]
    ]);
    
} catch (Exception $e) {
    sendError('Internal Server Error: ' . $e->getMessage(), 500);
}
