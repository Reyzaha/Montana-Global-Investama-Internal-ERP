<?php
// ==========================================================
// MGI ERP - List Legal Documents
// ==========================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

try {
    // Authenticate and require Legal Role (Role ID = 3)
    $user = requireRole(3);
    
    $pdo = getDbConnection();
    
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 10;
    $offset = ($page - 1) * $limit;
    
    $search = $_GET['search'] ?? '';
    $category = $_GET['category'] ?? '';
    $status = $_GET['status'] ?? 'ACTIVE'; // default hide archived
    
    $where = ["uploaded_by = :user_id"];
    $params = [':user_id' => $user['id']];
    
    if (!empty($status)) {
        $where[] = "status = :status";
        $params[':status'] = $status;
    }
    
    if (!empty($category)) {
        $where[] = "category = :category";
        $params[':category'] = $category;
    }
    
    if (!empty($search)) {
        $where[] = "(name LIKE :search OR description LIKE :search OR original_file_name LIKE :search)";
        $params[':search'] = "%$search%";
    }
    
    $whereClause = implode(' AND ', $where);
    
    // Count total
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM documents WHERE $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();
    
    // Get records
    $stmt = $pdo->prepare("
        SELECT id, name, category, file_extension, mime_type, file_size, status, created_at, updated_at
        FROM documents
        WHERE $whereClause
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    ");
    
    // Bind all params for the main query
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
