<?php
// backend/api/users/update.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

$currentUser = getCurrentUser();

if (!$currentUser || !in_array((int)$currentUser['role_id'], [1, 7])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Akses ditolak. Hanya IT Admin dan Admin yang diizinkan.'
    ]);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data || empty($data['user_id']) || empty($data['action'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Parameter user_id dan action wajib diisi.'
    ]);
    exit;
}

$userId = (int)$data['user_id'];
$action = trim($data['action']);

$pdo = getDbConnection();

try {
    // Verify target user exists
    $stmt = $pdo->prepare("SELECT id, email, role_id, status FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$targetUser) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'User tidak ditemukan.'
        ]);
        exit;
    }

    if ($action === 'update_role') {
        if (empty($data['role_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'role_id wajib diisi.']);
            exit;
        }
        $newRoleId = (int)$data['role_id'];
        $newStatus = !empty($data['status']) ? trim($data['status']) : $targetUser['status'];

        $updateStmt = $pdo->prepare("UPDATE users SET role_id = ?, status = ? WHERE id = ?");
        $updateStmt->execute([$newRoleId, $newStatus, $userId]);

        // Audit log
        $auditStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, target_id, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $auditStmt->execute([
            $currentUser['id'],
            'UPDATE_USER',
            'IT_MANAGEMENT',
            (string)$userId,
            "Updated user {$targetUser['email']} role to {$newRoleId} and status to {$newStatus}",
            $_SERVER['REMOTE_ADDR'] ?? NULL,
            $_SERVER['HTTP_USER_AGENT'] ?? NULL
        ]);

        echo json_encode(['success' => true, 'message' => 'Data user berhasil diperbarui.']);
        exit;

    } elseif ($action === 'reset_password') {
        if (empty($data['new_password']) || strlen($data['new_password']) < 8) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Password baru minimal 8 karakter.']);
            exit;
        }
        $newHash = password_hash($data['new_password'], PASSWORD_BCRYPT, ['cost' => defined('BCRYPT_COST') ? BCRYPT_COST : 12]);

        $updateStmt = $pdo->prepare("UPDATE users SET password_hash = ?, force_password_change = 1 WHERE id = ?");
        $updateStmt->execute([$newHash, $userId]);

        // Audit log
        $auditStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, target_id, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $auditStmt->execute([
            $currentUser['id'],
            'RESET_PASSWORD',
            'IT_MANAGEMENT',
            (string)$userId,
            "Reset password for user {$targetUser['email']}",
            $_SERVER['REMOTE_ADDR'] ?? NULL,
            $_SERVER['HTTP_USER_AGENT'] ?? NULL
        ]);

        echo json_encode(['success' => true, 'message' => 'Password user berhasil direset.']);
        exit;

    } elseif ($action === 'toggle_status') {
        $newStatus = ($targetUser['status'] === 'active') ? 'inactive' : 'active';
        if (!empty($data['status'])) {
            $newStatus = trim($data['status']);
        }

        $updateStmt = $pdo->prepare("UPDATE users SET status = ? WHERE id = ?");
        $updateStmt->execute([$newStatus, $userId]);

        // Audit log
        $auditStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, target_id, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $auditStmt->execute([
            $currentUser['id'],
            'TOGGLE_USER_STATUS',
            'IT_MANAGEMENT',
            (string)$userId,
            "Changed status of user {$targetUser['email']} to {$newStatus}",
            $_SERVER['REMOTE_ADDR'] ?? NULL,
            $_SERVER['HTTP_USER_AGENT'] ?? NULL
        ]);

        echo json_encode(['success' => true, 'message' => "Status user berhasil diubah menjadi {$newStatus}."]);
        exit;
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Action tidak valid.']);
        exit;
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
    exit;
}
