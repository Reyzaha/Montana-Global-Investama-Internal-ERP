<?php
// ==========================================================
// MGI ERP - Archive Legal Document
// ==========================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    sendError('Method not allowed', 405);
}

try {
    // Only Legal (Role ID 3) can archive documents
    $user = requireRole(3);
    $docId = $_GET['id'] ?? '';
    
    if (empty($docId)) {
        sendError('Document ID is required');
    }
    
    $pdo = getDbConnection();
    
    // Verify document ownership
    $docStmt = $pdo->prepare("SELECT id, name FROM documents WHERE id = :id AND uploaded_by = :uploader AND status = 'ACTIVE'");
    $docStmt->execute([':id' => $docId, ':uploader' => $user['id']]);
    $doc = $docStmt->fetch();
    
    if (!$doc) {
        sendError('Document not found, already archived, or you do not have permission to manage it.', 404);
    }
    
    $updStmt = $pdo->prepare("UPDATE documents SET status = 'ARCHIVED', deleted_at = NOW() WHERE id = :id");
    $updStmt->execute([':id' => $docId]);
    
    recordAuditLog($user['id'], 'DOCUMENT_ARCHIVED', 'LEGAL', $docId, "Archived document: {$doc['name']}");
    
    sendSuccess(null, 'Document archived successfully.');
    
} catch (Exception $e) {
    sendError('Internal Server Error: ' . $e->getMessage(), 500);
}
