<?php
// ==========================================================
// MGI ERP - View / Stream Inline Legal Document
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
    
    // Check permission: Owner, or document_access with VIEW or VIEW_DOWNLOAD
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
        
        // Both VIEW and VIEW_DOWNLOAD have permission to view/preview inline
        if ($access && in_array($access['permission'], ['VIEW', 'VIEW_DOWNLOAD'])) {
            $hasAccess = true;
        }
    }
    
    if (!$hasAccess) {
        sendError('You do not have permission to view this document', 403);
    }
    
    // Resolve full storage path
    $fullPath = $doc['storage_path'];
    
    if (!file_exists($fullPath)) {
        sendError('Physical file not found on server', 404);
    }
    
    // Log audit
    recordAuditLog($user['id'], 'DOCUMENT_VIEWED', 'LEGAL', $docId, "Viewed document inline: {$doc['name']}");
    
    // Clean output buffers to prevent corruption
    if (ob_get_level()) {
        ob_end_clean();
    }
    
    // Stream file inline (so browser displays it instead of prompting download)
    header('Content-Type: ' . $doc['mime_type']);
    header('Content-Disposition: inline; filename="' . basename($doc['original_file_name']) . '"');
    header('Content-Length: ' . filesize($fullPath));
    header('Cache-Control: private, max-age=3600, must-revalidate');
    header('Pragma: public');
    
    readfile($fullPath);
    exit();
    
} catch (Exception $e) {
    sendError('Internal Server Error: ' . $e->getMessage(), 500);
}
