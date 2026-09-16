<?php
// ==========================================================
// MGI ERP - Document Access Management
// ==========================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';

try {
    // Only Legal (Role ID 3) can manage access
    $user = requireRole(3);
    $pdo = getDbConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // GRANT ACCESS
        $input = getJsonInput();
        $docId = $_GET['id'] ?? $input['document_id'] ?? '';
        $roleIds = isset($input['role_ids']) ? $input['role_ids'] : (isset($input['role_id']) ? [$input['role_id']] : []);
        $userId = isset($input['user_id']) ? (int)$input['user_id'] : null;
        $permission = $input['permission'] ?? 'VIEW';
        $expiresAt = !empty($input['expires_at']) ? $input['expires_at'] : null;
        
        if (empty($docId) || (empty($roleIds) && $userId === null)) {
            sendError('Document ID and at least one recipient (Role or User) are required.');
        }
        
        if (!in_array($permission, ['VIEW', 'VIEW_DOWNLOAD'])) {
            sendError('Invalid permission type.');
        }
        
        // Verify document exists and belongs to this user (or is active)
        $docStmt = $pdo->prepare("SELECT name, description FROM documents WHERE id = :id AND uploaded_by = :uploader AND status = 'ACTIVE'");
        $docStmt->execute([':id' => $docId, ':uploader' => $user['id']]);
        $doc = $docStmt->fetch();
        
        if (!$doc) {
            sendError('Document not found or you do not have permission to share it.', 404);
        }
        
        $pdo->beginTransaction();
        
        try {
            $docName = $doc['name'];
            $docDesc = !empty($doc['description']) ? $doc['description'] : 'Tidak ada deskripsi';
            $notifTitle = "Dokumen Baru: {$docName}";
            $notifMsg = "Tim Legal telah memberikan Anda akses ke dokumen berikut:\n\n"
                      . "Title: {$docName}\n"
                      . "Deskripsi: {$docDesc}\n"
                      . "Permission: " . str_replace('_', ' & ', $permission);

            $checkStmt = $pdo->prepare("SELECT id FROM document_access WHERE document_id = :docId AND role_id <=> :roleId AND user_id <=> :userId");
            $updStmt = $pdo->prepare("UPDATE document_access SET permission = :perm, expires_at = :exp, granted_at = NOW() WHERE id = :id");
            $insStmt = $pdo->prepare("INSERT INTO document_access (document_id, role_id, user_id, permission, granted_by, expires_at) VALUES (:docId, :roleId, :userId, :perm, :grantedBy, :exp)");
            $uStmt = $pdo->prepare("SELECT id FROM users WHERE role_id = :rId AND status = 'active'");
            $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)");

            // Handle multiple roles
            foreach ($roleIds as $rId) {
                $checkStmt->execute([':docId' => $docId, ':roleId' => $rId, ':userId' => null]);
                $existing = $checkStmt->fetch();
                if ($existing) {
                    $updStmt->execute([':perm' => $permission, ':exp' => $expiresAt, ':id' => $existing['id']]);
                } else {
                    $insStmt->execute([
                        ':docId' => $docId, ':roleId' => $rId, ':userId' => null,
                        ':perm' => $permission, ':grantedBy' => $user['id'], ':exp' => $expiresAt
                    ]);
                }
                
                // Notifications for role
                $uStmt->execute([':rId' => $rId]);
                $usersInRole = $uStmt->fetchAll(PDO::FETCH_COLUMN);
                foreach ($usersInRole as $uId) {
                    $notifStmt->execute([$uId, $notifTitle, $notifMsg, 'DOCUMENT', "DOC:{$docId}", null]);
                }
                
                recordAuditLog($user['id'], 'DOCUMENT_ACCESS_GRANTED', 'LEGAL', $docId, "Shared with Role:$rId Perm:$permission");
            }

            // Handle specific user if any
            if ($userId) {
                $checkStmt->execute([':docId' => $docId, ':roleId' => null, ':userId' => $userId]);
                $existing = $checkStmt->fetch();
                if ($existing) {
                    $updStmt->execute([':perm' => $permission, ':exp' => $expiresAt, ':id' => $existing['id']]);
                } else {
                    $insStmt->execute([
                        ':docId' => $docId, ':roleId' => null, ':userId' => $userId,
                        ':perm' => $permission, ':grantedBy' => $user['id'], ':exp' => $expiresAt
                    ]);
                }
                $notifStmt->execute([$userId, $notifTitle, $notifMsg, 'DOCUMENT', "DOC:{$docId}", null]);
                recordAuditLog($user['id'], 'DOCUMENT_ACCESS_GRANTED', 'LEGAL', $docId, "Shared with User:$userId Perm:$permission");
            }
            
            $pdo->commit();
            sendSuccess(null, 'Access granted successfully.');
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // REVOKE ACCESS
        // We will pass document_id as ?id=... and access_id as ?access_id=...
        $docId = $_GET['id'] ?? '';
        $accessId = $_GET['access_id'] ?? '';
        
        if (empty($docId) || empty($accessId)) {
            sendError('Document ID and Access ID are required.');
        }
        
        // Verify document ownership
        $docStmt = $pdo->prepare("SELECT id FROM documents WHERE id = :id AND uploaded_by = :uploader");
        $docStmt->execute([':id' => $docId, ':uploader' => $user['id']]);
        if (!$docStmt->fetch()) {
            sendError('Document not found or you do not have permission to manage it.', 404);
        }
        
        $delStmt = $pdo->prepare("DELETE FROM document_access WHERE id = :accessId AND document_id = :docId");
        $delStmt->execute([':accessId' => $accessId, ':docId' => $docId]);
        
        recordAuditLog($user['id'], 'DOCUMENT_ACCESS_REVOKED', 'LEGAL', $docId, "Revoked access ID $accessId");
        
        sendSuccess(null, 'Access revoked successfully.');
        
    } else {
        sendError('Method not allowed', 405);
    }
    
} catch (Exception $e) {
    sendError('Internal Server Error: ' . $e->getMessage(), 500);
}
