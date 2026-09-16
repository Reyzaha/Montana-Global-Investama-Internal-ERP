<?php
// ==========================================================
// MGI ERP - Download Legal Document
// ==========================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';

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
    
    $stmt = $pdo->prepare("SELECT * FROM documents WHERE id = :id AND status = 'ACTIVE'");
    $stmt->execute([':id' => $docId]);
    $doc = $stmt->fetch();
    
    if (!$doc) {
        sendError('Document not found or archived', 404);
    }
    
    // Check permission
    $hasAccess = false;
    if ($doc['uploaded_by'] === $user['id']) {
        $hasAccess = true;
    } else {
        $accessStmt = $pdo->prepare("
            SELECT permission FROM document_access 
            WHERE document_id = :docId 
            AND (user_id = :userId OR role_id = :roleId)
            AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY permission DESC
            LIMIT 1
        ");
        $accessStmt->execute([
            ':docId' => $docId,
            ':userId' => $user['id'],
            ':roleId' => $user['role_id']
        ]);
        $access = $accessStmt->fetch();
        
        if ($access && $access['permission'] === 'VIEW_DOWNLOAD') {
            $hasAccess = true;
        }
    }
    
    if (!$hasAccess) {
        sendError('You do not have permission to download this document', 403);
    }
    
    // Resolve full storage path
    $fullPath = $doc['storage_path'];
    
    if (!file_exists($fullPath)) {
        sendError('Physical file not found on server', 404);
    }
    
    // Log audit
    recordAuditLog($user['id'], 'DOCUMENT_DOWNLOADED', 'LEGAL', $docId, "Downloaded document: {$doc['name']}");
    
    // Stream file
    header('Content-Type: ' . $doc['mime_type']);
    header('Content-Disposition: attachment; filename="' . basename($doc['original_file_name']) . '"');
    header('Content-Length: ' . filesize($fullPath));
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Use readfile to stream
    readfile($fullPath);
    exit();
    
} catch (Exception $e) {
    sendError('Internal Server Error: ' . $e->getMessage(), 500);
}
