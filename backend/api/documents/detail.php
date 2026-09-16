<?php
// ==========================================================
// MGI ERP - Document Detail
// ==========================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

try {
    $user = requireAuth();
    $docId = $_GET['id'] ?? '';
    
    if (empty($docId)) {
        sendError('Document ID is required');
    }
    
    $pdo = getDbConnection();
    
    // Get document metadata
    $stmt = $pdo->prepare("
        SELECT d.*, u.email as uploader_email 
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.id = :id AND d.status = 'ACTIVE'
    ");
    $stmt->execute([':id' => $docId]);
    $doc = $stmt->fetch();
    
    if (!$doc) {
        sendError('Document not found or archived', 404);
    }
    
    // Check if user has access.
    // User has access if they uploaded it (Legal role handles own docs).
    // Otherwise, check document_access.
    $hasAccess = false;
    $permission = null;
    
    if ($doc['uploaded_by'] === $user['id']) {
        $hasAccess = true;
        $permission = 'OWNER';
    } else {
        $accessStmt = $pdo->prepare("
            SELECT permission FROM document_access 
            WHERE document_id = :docId 
            AND (user_id = :userId OR role_id = :roleId)
            AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY permission DESC -- Prioritize VIEW_DOWNLOAD over VIEW
            LIMIT 1
        ");
        $accessStmt->execute([
            ':docId' => $docId,
            ':userId' => $user['id'],
            ':roleId' => $user['role_id']
        ]);
        $access = $accessStmt->fetch();
        
        if ($access) {
            $hasAccess = true;
            $permission = $access['permission'];
        }
    }
    
    if (!$hasAccess) {
        sendError('You do not have permission to view this document', 403);
    }
    
    $response = [
        'id' => $doc['id'],
        'name' => $doc['name'],
        'original_file_name' => $doc['original_file_name'],
        'file_extension' => $doc['file_extension'],
        'mime_type' => $doc['mime_type'],
        'file_size' => $doc['file_size'],
        'description' => $doc['description'],
        'category' => $doc['category'],
        'reference_number' => $doc['reference_number'],
        'expiry_date' => $doc['expiry_date'],
        'created_at' => $doc['created_at'],
        'uploaded_by' => [
            'id' => $doc['uploaded_by'],
            'email' => $doc['uploader_email']
        ],
        'my_permission' => $permission
    ];
    
    // If owner, fetch who has access to it
    if ($permission === 'OWNER') {
        $sharedStmt = $pdo->prepare("
            SELECT da.id as access_id, da.permission, da.granted_at, da.expires_at,
                   r.name as role_name, u.email as user_email
            FROM document_access da
            LEFT JOIN roles r ON da.role_id = r.id
            LEFT JOIN users u ON da.user_id = u.id
            WHERE da.document_id = :docId
        ");
        $sharedStmt->execute([':docId' => $docId]);
        $response['shared_with'] = $sharedStmt->fetchAll();
    }
    
    sendSuccess($response);
    
} catch (Exception $e) {
    sendError('Internal Server Error: ' . $e->getMessage(), 500);
}
