<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../config/database.php';

$user = requireAuth();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    handleGet($user);
} else if ($method === 'POST') {
    handlePost($user);
} else {
    sendError('Metode tidak diizinkan.', 405);
}

function handleGet($user) {
    try {
        $pdo = getDbConnection();
        // Fetch current profile
        $stmt = $pdo->prepare("SELECT * FROM user_profiles WHERE user_id = :id LIMIT 1");
        $stmt->execute([':id' => $user['id']]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        // If no profile exists, return a structured empty profile
        if (!$profile) {
            $profile = [
                'user_id' => $user['id'],
                'name' => '', 'gender' => null, 'birth_place' => '', 'birth_date' => null,
                'address' => '', 'phone' => '', 'marital_status' => null, 'dependents' => 0,
                'education' => null, 'major' => '', 'school' => '', 'position' => '',
                'join_date' => null, 'ktp_no' => '', 'kk_no' => '',
                'ktp_doc_path' => null, 'kk_doc_path' => null, 'ijazah_doc_path' => null,
                'photo_path' => null
            ];
        }

        // Fetch active pending request
        $stmt = $pdo->prepare("SELECT id, status, review_note, requested_at FROM profile_change_requests WHERE user_id = :id AND status = 'PENDING' LIMIT 1");
        $stmt->execute([':id' => $user['id']]);
        $pendingRequest = $stmt->fetch(PDO::FETCH_ASSOC);

        $pendingItems = [];
        if ($pendingRequest) {
            $stmt = $pdo->prepare("SELECT field_name, old_value, new_value, old_file, new_file FROM profile_change_request_items WHERE request_id = :req_id");
            $stmt->execute([':req_id' => $pendingRequest['id']]);
            $pendingItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // We also want email from users table
        $stmt = $pdo->prepare("SELECT email FROM users WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $user['id']]);
        $u = $stmt->fetch(PDO::FETCH_ASSOC);
        $profile['email'] = $u['email'];

        sendSuccess([
            'profile' => $profile,
            'pending_request' => $pendingRequest ? [
                'id' => $pendingRequest['id'],
                'status' => $pendingRequest['status'],
                'review_note' => $pendingRequest['review_note'],
                'requested_at' => $pendingRequest['requested_at'],
                'items' => $pendingItems
            ] : null
        ]);
    } catch (Exception $e) {
        sendError('Gagal mengambil data profile: ' . $e->getMessage(), 500);
    }
}

function handlePost($user) {
    try {
        $pdo = getDbConnection();
        
        // Cek PENDING request
        $stmt = $pdo->prepare("SELECT id FROM profile_change_requests WHERE user_id = :id AND status = 'PENDING' LIMIT 1");
        $stmt->execute([':id' => $user['id']]);
        if ($stmt->fetch()) {
            sendError('Anda masih memiliki permintaan perubahan profil yang berstatus PENDING.', 400);
        }

        // Dapatkan data input form. Kita bisa pakai $_POST karena ini ada upload file multipart/form-data
        $allowedFields = [
            'phone', 'address', 'marital_status', 'dependents', 'education', 'major', 'school'
        ];
        
        $changes = [];

        // Fetch current profile to get old values
        $stmt = $pdo->prepare("SELECT * FROM user_profiles WHERE user_id = :id LIMIT 1");
        $stmt->execute([':id' => $user['id']]);
        $currentProfile = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        foreach ($allowedFields as $field) {
            if (isset($_POST[$field])) {
                $old = $currentProfile[$field] ?? '';
                $new = trim($_POST[$field]);
                if ($old !== $new) {
                    $changes[] = [
                        'field_name' => $field,
                        'old_value' => (string)$old,
                        'new_value' => (string)$new,
                        'old_file' => null,
                        'new_file' => null,
                        'new_file_mime' => null,
                        'new_file_size' => null
                    ];
                }
            }
        }

        // Handle profile photo upload
        if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['photo'];
            $maxSize = 10 * 1024 * 1024; // 10MB
            $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            
            if ($file['size'] > $maxSize) {
                sendError('Ukuran foto profil maksimal 10MB.', 400);
            }
            
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
            
            if (!in_array($mime, $allowedMimes)) {
                sendError('Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP.', 400);
            }
            
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'profile_' . $user['id'] . '_' . time() . '.' . $ext;
            
            // Simpan file sementara di storage/employees/temp/
            $uploadDir = __DIR__ . '/../../storage/employees/temp/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            $destPath = $uploadDir . $filename;
            if (move_uploaded_file($file['tmp_name'], $destPath)) {
                $changes[] = [
                    'field_name' => 'photo',
                    'old_value' => null,
                    'new_value' => null,
                    'old_file' => $currentProfile['photo_path'] ?? null,
                    'new_file' => 'temp/' . $filename,
                    'new_file_mime' => $mime,
                    'new_file_size' => $file['size']
                ];
            } else {
                sendError('Gagal mengupload foto.', 500);
            }
        }

        if (empty($changes)) {
            sendError('Tidak ada perubahan yang diajukan.', 400);
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("INSERT INTO profile_change_requests (user_id, status) VALUES (:uid, 'PENDING')");
        $stmt->execute([':uid' => $user['id']]);
        $requestId = $pdo->lastInsertId();

        $stmtItem = $pdo->prepare("INSERT INTO profile_change_request_items 
            (request_id, field_name, old_value, new_value, old_file, new_file, new_file_mime, new_file_size) 
            VALUES (:req_id, :field, :oldv, :newv, :oldf, :newf, :mime, :size)");
            
        foreach ($changes as $change) {
            $stmtItem->execute([
                ':req_id' => $requestId,
                ':field' => $change['field_name'],
                ':oldv' => $change['old_value'],
                ':newv' => $change['new_value'],
                ':oldf' => $change['old_file'],
                ':newf' => $change['new_file'],
                ':mime' => $change['new_file_mime'],
                ':size' => $change['new_file_size']
            ]);
        }
        
        // Get user display name for notification
        $senderName = $user['name'] ?? '';
        if (empty($senderName) || $senderName === 'User') {
            $stmtSender = $pdo->prepare("SELECT p.name, u.email FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.id = :id");
            $stmtSender->execute([':id' => $user['id']]);
            $sInfo = $stmtSender->fetch(PDO::FETCH_ASSOC);
            $senderName = (!empty($sInfo['name'])) ? $sInfo['name'] : ($sInfo['email'] ?? 'User');
        }

        // Notify HRGA (role_id 2) and Admin (role_id 7)
        $stmtHrga = $pdo->query("SELECT id FROM users WHERE role_id IN (2, 7) AND status = 'active'");
        $hrgas = $stmtHrga->fetchAll(PDO::FETCH_COLUMN);
        
        $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)");
        $title = "Profile Update Request";
        $msg = "User {$senderName} mengajukan perubahan profil. Silakan periksa dan tinjau.";
        foreach ($hrgas as $hrgaId) {
            $notifStmt->execute([$hrgaId, $title, $msg, 'info', 'PROFILE_REQ', $requestId]);
        }
        
        recordAuditLog($user['id'], 'PROFILE_CHANGE_REQUESTED', 'PROFILE', $requestId, "User {$senderName} requested profile change");

        $pdo->commit();
        sendSuccess(['request_id' => $requestId], 'Permintaan perubahan profil berhasil diajukan.');

    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendError('Gagal mengajukan perubahan: ' . $e->getMessage(), 500);
    }
}
