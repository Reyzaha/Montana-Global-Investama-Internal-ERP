<?php
// backend/api/audit/logs.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

$currentUser = getCurrentUser();

if (!$currentUser || !in_array((int)$currentUser['role_id'], [1, 7])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Akses ditolak. Hanya IT dan Admin yang diizinkan.'
    ]);
    exit;
}

$page = isset($_GET['page']) ? max(1, (int)$GET['page']) : 1;
$limit = isset($_GET['limit']) ? min(100, max(10, (int)$_GET['limit'])) : 25;
$offset = ($page - 1) * $limit;

$search = isset($_GET['q']) ? trim($_GET['q']) : '';
$module = isset($_GET['module']) ? trim($_GET['module']) : '';

$pdo = getDbConnection();

try {
    $where = [];
    $params = [];

    if ($search !== '') {
        $where[] = "(al.action LIKE ? OR al.module LIKE ? OR al.description LIKE ? OR u.email LIKE ? OR al.ip_address LIKE ?)";
        $term = "%{$search}%";
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
    }

    if ($module !== '') {
        $where[] = "al.module = ?";
        $params[] = $module;
    }

    $whereSql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    // Count total
    $countSql = "SELECT COUNT(*) FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id {$whereSql}";
    $stmtCount = $pdo->prepare($countSql);
    $stmtCount->execute($params);
    $totalRecords = (int)$stmtCount->fetchColumn();

    // Data query
    $dataSql = "SELECT al.id, al.user_id, u.email as user_email, al.action, al.module, al.target_id, al.description, al.ip_address, al.user_agent, al.created_at
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                {$whereSql}
                ORDER BY al.id DESC
                LIMIT {$limit} OFFSET {$offset}";

    $stmtData = $pdo->prepare($dataSql);
    $stmtData->execute($params);
    $logs = $stmtData->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $logs,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total_records' => $totalRecords,
            'total_pages' => ceil($totalRecords / $limit)
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
