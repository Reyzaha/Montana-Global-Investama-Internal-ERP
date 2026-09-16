<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../config/database.php';

// Require HRGA role (role_id = 2) or Admin (role_id = 7)
// But according to rules, HRGA is 2
$user = requireRole([2, 7]);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    handleGet();
} else {
    sendError('Metode tidak diizinkan.', 405);
}

function handleGet() {
    try {
        $pdo = getDbConnection();
        
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $search = $_GET['search'] ?? '';
        $position = $_GET['position'] ?? '';
        $status = $_GET['status'] ?? '';
        
        if ($page < 1) $page = 1;
        if ($limit < 1 || $limit > 100) $limit = 10;
        $offset = ($page - 1) * $limit;
        
        $where = ["u.role_id != 7"]; // Exclude admins maybe? Or keep them. Let's just exclude nothing for now, or maybe where 1=1
        $params = [];
        
        $whereSql = "1=1";
        if ($search !== '') {
            $whereSql .= " AND (u.email LIKE :search OR p.name LIKE :search)";
            $params[':search'] = "%$search%";
        }
        if ($position !== '') {
            $whereSql .= " AND p.position = :position";
            $params[':position'] = $position;
        }
        if ($status !== '') {
            $whereSql .= " AND u.status = :status";
            $params[':status'] = $status;
        }
        
        // Count total
        $countSql = "SELECT COUNT(u.id) FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE $whereSql";
        $stmtCount = $pdo->prepare($countSql);
        $stmtCount->execute($params);
        $total = $stmtCount->fetchColumn();
        
        // Fetch data
        $sql = "SELECT u.id, u.email, u.status, r.name as role_name, p.name, p.position, p.phone, p.join_date, p.photo_path
                FROM users u 
                LEFT JOIN user_profiles p ON u.id = p.user_id
                JOIN roles r ON u.role_id = r.id
                WHERE $whereSql
                ORDER BY u.id DESC
                LIMIT :limit OFFSET :offset";
                
        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendSuccess([
            'data' => $employees,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => ceil($total / $limit)
            ]
        ]);
        
    } catch (Exception $e) {
        sendError('Gagal mengambil data employee: ' . $e->getMessage(), 500);
    }
}
