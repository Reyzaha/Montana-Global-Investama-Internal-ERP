<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../config/database.php';

$user = requireRole([2, 7]); // HRGA or Admin

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    if ($id) {
        handleGetDetail($id);
    } else {
        handleGetList();
    }
} else if ($method === 'POST') {
    $id = $_GET['id'] ?? null;
    $action = $_GET['action'] ?? null; // approve, reject
    
    if (!$id || !$action) {
        sendError('Parameter tidak lengkap.', 400);
    }
    
    if ($action === 'approve') {
        handleApprove($id, $user);
    } else if ($action === 'reject') {
        handleReject($id, $user);
    } else {
        sendError('Action tidak valid.', 400);
    }
} else {
    sendError('Metode tidak diizinkan.', 405);
}

function handleGetList() {
    try {
        $pdo = getDbConnection();
        $stmt = $pdo->query("SELECT r.id, r.status, r.requested_at, u.email, p.name 
                             FROM profile_change_requests r 
                             JOIN users u ON r.user_id = u.id 
                             LEFT JOIN user_profiles p ON u.id = p.user_id
                             WHERE r.status = 'PENDING'
                             ORDER BY r.requested_at DESC");
        sendSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (Exception $e) {
        sendError('Gagal mengambil daftar request.', 500);
    }
}

function handleGetDetail($id) {
    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare("SELECT r.*, u.email, p.name 
                               FROM profile_change_requests r 
                               JOIN users u ON r.user_id = u.id 
                               LEFT JOIN user_profiles p ON u.id = p.user_id
                               WHERE r.id = :id");
        $stmt->execute([':id' => $id]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$request) sendError('Request tidak ditemukan.', 404);
        
        $stmtItems = $pdo->prepare("SELECT * FROM profile_change_request_items WHERE request_id = :req_id");
        $stmtItems->execute([':req_id' => $id]);
        $request['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
        
        sendSuccess($request);
    } catch (Exception $e) {
        sendError('Gagal mengambil detail request.', 500);
    }
}

function handleApprove($id, $user) {
    try {
        $pdo = getDbConnection();
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("SELECT user_id, status FROM profile_change_requests WHERE id = :id FOR UPDATE");
        $stmt->execute([':id' => $id]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$request) throw new Exception("Request tidak ditemukan.");
        if ($request['status'] !== 'PENDING') throw new Exception("Request ini sudah diproses.");
        
        $targetUserId = $request['user_id'];
        
        // Ensure profile exists
        $stmtP = $pdo->prepare("SELECT user_id FROM user_profiles WHERE user_id = :uid");
        $stmtP->execute([':uid' => $targetUserId]);
        if (!$stmtP->fetch()) {
             $pdo->prepare("INSERT INTO user_profiles (user_id, name) VALUES (:uid, '')")->execute([':uid' => $targetUserId]);
        }
        
        // Apply changes
        $stmtItems = $pdo->prepare("SELECT * FROM profile_change_request_items WHERE request_id = :req_id");
        $stmtItems->execute([':req_id' => $id]);
        $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($items as $item) {
            $field = $item['field_name'];
            if ($field === 'photo') {
                // Move file from temp to final
                $tempPath = __DIR__ . '/../../storage/employees/' . $item['new_file'];
                $finalFile = 'profile_' . $targetUserId . '_' . time() . '.' . pathinfo($tempPath, PATHINFO_EXTENSION);
                $finalPath = __DIR__ . '/../../storage/employees/' . $finalFile;
                
                if (file_exists($tempPath)) {
                    rename($tempPath, $finalPath);
                    $dbPath = 'employees/' . $finalFile;
                    
                    $sql = "UPDATE user_profiles SET photo_path = :path, photo_mime = :mime, photo_size = :size WHERE user_id = :uid";
                    $pdo->prepare($sql)->execute([
                        ':path' => $dbPath, 
                        ':mime' => $item['new_file_mime'], 
                        ':size' => $item['new_file_size'], 
                        ':uid' => $targetUserId
                    ]);
                }
            } else {
                // Ensure valid fields
                $allowed = ['phone', 'address', 'marital_status', 'dependents', 'education', 'major', 'school'];
                if (in_array($field, $allowed)) {
                    $sql = "UPDATE user_profiles SET `$field` = :val WHERE user_id = :uid";
                    $pdo->prepare($sql)->execute([':val' => $item['new_value'], ':uid' => $targetUserId]);
                }
            }
        }
        
        // Mark as approved
        $stmtApprove = $pdo->prepare("UPDATE profile_change_requests SET status = 'APPROVED', reviewed_at = NOW(), reviewed_by = :reviewer WHERE id = :id");
        $stmtApprove->execute([':reviewer' => $user['id'], ':id' => $id]);
        
        // Notify user
        $msg = "Permintaan perubahan profil Anda telah disetujui.";
        $pdo->prepare("INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)")
            ->execute([$targetUserId, "Profile Update Approved", $msg, "success", "PROFILE_REQ", $id]);
            
        recordAuditLog($user['id'], 'PROFILE_CHANGE_APPROVED', 'PROFILE', $id, "HRGA approved profile change request $id");
        
        $pdo->commit();
        sendSuccess(null, 'Permintaan berhasil disetujui.');
    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
        sendError('Gagal menyetujui: ' . $e->getMessage(), 500);
    }
}

function handleReject($id, $user) {
    try {
        $input = getJsonInput();
        $reason = trim($input['reason'] ?? '');
        if (empty($reason)) sendError('Alasan penolakan harus diisi.', 400);
        
        $pdo = getDbConnection();
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("SELECT user_id, status FROM profile_change_requests WHERE id = :id FOR UPDATE");
        $stmt->execute([':id' => $id]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$request) throw new Exception("Request tidak ditemukan.");
        if ($request['status'] !== 'PENDING') throw new Exception("Request ini sudah diproses.");
        
        $targetUserId = $request['user_id'];
        
        $stmtReject = $pdo->prepare("UPDATE profile_change_requests SET status = 'REJECTED', reviewed_at = NOW(), reviewed_by = :reviewer, review_note = :reason WHERE id = :id");
        $stmtReject->execute([':reviewer' => $user['id'], ':reason' => $reason, ':id' => $id]);
        
        $msg = "Permintaan perubahan profil ditolak. Alasan: " . $reason;
        $pdo->prepare("INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)")
            ->execute([$targetUserId, "Profile Update Rejected", $msg, "danger", "PROFILE_REQ", $id]);
            
        recordAuditLog($user['id'], 'PROFILE_CHANGE_REJECTED', 'PROFILE', $id, "HRGA rejected profile change request $id");
        
        $pdo->commit();
        sendSuccess(null, 'Permintaan berhasil ditolak.');
    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
        sendError('Gagal menolak: ' . $e->getMessage(), 500);
    }
}
