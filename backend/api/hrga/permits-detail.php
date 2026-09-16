<?php
// ==========================================================
// MGI ERP / HRIS - GET Permit Detail API
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

$user = requireAuth();
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$permitId = $_GET['id'] ?? null;
if (!$permitId) {
    sendError('Permit ID is required.', 400);
}

try {
    $stmt = $pdo->prepare("
        SELECT p.id, p.user_id, u.email as employee_email, pt.name as permit_type_name, 
               p.start_date, p.end_date, p.description, p.status, p.created_at
        FROM permits p
        JOIN users u ON p.user_id = u.id
        JOIN permit_types pt ON p.permit_type_id = pt.id
        WHERE p.id = ?
    ");
    $stmt->execute([$permitId]);
    $permit = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$permit) {
        sendError('Permit not found.', 404);
    }

    // Role check: HRGA and PM can view any permit. Regular users can only view their own.
    if (!in_array($user['role_id'], [2, 6]) && $permit['user_id'] !== $user['id']) {
        sendError('Forbidden. You do not have permission to view this permit.', 403);
    }

    // Get Attachments
    $stmt = $pdo->prepare("SELECT id, original_name, file_path, file_size FROM permit_attachments WHERE permit_id = ?");
    $stmt->execute([$permitId]);
    $permit['attachments'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get Approval History
    $stmt = $pdo->prepare("
        SELECT pa.id, u.email as approver_email, pa.approver_role, pa.step, pa.status, pa.note, pa.approved_at
        FROM permit_approvals pa
        JOIN users u ON pa.approver_user_id = u.id
        WHERE pa.permit_id = ?
        ORDER BY pa.approved_at ASC
    ");
    $stmt->execute([$permitId]);
    $permit['history'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendSuccess($permit, 'Permit detail retrieved.');

} catch (Exception $e) {
    sendError('Failed to fetch permit detail: ' . $e->getMessage(), 500);
}
