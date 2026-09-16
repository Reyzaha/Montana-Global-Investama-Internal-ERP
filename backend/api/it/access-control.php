<?php
// ==========================================================
// MGI ERP / HRIS - Access Control Management API (IT & Admin)
// Method: GET, POST
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';

// Allowed: IT (1) and Admin (7)
$currentUser = requireRole([1, 7]);
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$modules = [
    'devices' => ['name' => 'Device Management', 'category' => 'IT'],
    'emails' => ['name' => 'Email & Accounts', 'category' => 'IT'],
    'users' => ['name' => 'User Management', 'category' => 'IT'],
    'attendance' => ['name' => 'Attendance Management', 'category' => 'HRGA'],
    'permits' => ['name' => 'Permits & Leave', 'category' => 'HRGA'],
    'expense' => ['name' => 'Expense Requests', 'category' => 'Finance/HRGA'],
    'petty_cash' => ['name' => 'Petty Cash Ledger', 'category' => 'Finance/HRGA'],
    'legal_docs' => ['name' => 'Legal Documents', 'category' => 'Legal'],
    'payroll' => ['name' => 'Payroll & Compensation', 'category' => 'HRGA'],
    'overtime' => ['name' => 'Overtime Tracking', 'category' => 'HRGA'],
    'access_control' => ['name' => 'Access Control Matrix', 'category' => 'IT']
];

if ($method === 'GET') {
    try {
        // 1. Roles list
        $roles = $pdo->query("SELECT id, name FROM `roles` ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

        // 2. Matrix (module_permissions)
        $matrixStmt = $pdo->query("
            SELECT role_id, module_code, can_view, can_create, can_edit, can_delete, can_approve
            FROM `module_permissions`
            ORDER BY role_id ASC, module_code ASC
        ");
        $matrix = $matrixStmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. User Overrides (active or all)
        $overridesStmt = $pdo->query("
            SELECT 
                upo.id,
                upo.user_id,
                u.email as user_email,
                COALESCE(up.name, u.email) as user_name,
                r.name as role_name,
                upo.module_code,
                upo.action,
                upo.override_type,
                upo.reason,
                upo.granted_by,
                gu.email as granted_by_email,
                upo.expires_at,
                upo.created_at,
                CASE 
                    WHEN upo.expires_at IS NOT NULL AND upo.expires_at <= NOW() THEN 'expired'
                    ELSE 'active'
                END as status
            FROM `user_permission_overrides` upo
            JOIN `users` u ON upo.user_id = u.id
            LEFT JOIN `user_profiles` up ON u.id = up.user_id
            LEFT JOIN `roles` r ON u.role_id = r.id
            LEFT JOIN `users` gu ON upo.granted_by = gu.id
            ORDER BY upo.id DESC
        ");
        $overrides = $overridesStmt->fetchAll(PDO::FETCH_ASSOC);

        sendSuccess([
            'modules' => $modules,
            'roles' => $roles,
            'matrix' => $matrix,
            'overrides' => $overrides
        ], 'Data access control matrix berhasil diambil.');
    } catch (Exception $e) {
        sendError('Gagal memuat matriks access control: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $input['action'] ?? 'update_matrix';

        if ($action === 'update_matrix') {
            $roleId = (int)($input['role_id'] ?? 0);
            $moduleCode = trim($input['module_code'] ?? '');
            $canView = !empty($input['can_view']) ? 1 : 0;
            $canCreate = !empty($input['can_create']) ? 1 : 0;
            $canEdit = !empty($input['can_edit']) ? 1 : 0;
            $canDelete = !empty($input['can_delete']) ? 1 : 0;
            $canApprove = !empty($input['can_approve']) ? 1 : 0;

            if ($roleId <= 0 || empty($moduleCode) || !isset($modules[$moduleCode])) {
                sendError('Role ID dan modul valid wajib ditentukan.', 400);
            }

            // Anti-privilege escalation: role 7 (Admin) is protected; only Admin can configure access_control module
            if ($roleId === 7) {
                sendError('Hak akses role Admin tidak dapat diubah (Admin memiliki hak penuh).', 400);
            }
            if ($moduleCode === 'access_control' && (int)$currentUser['role_id'] !== 7) {
                sendError('Hanya Admin yang dapat mengubah izin pada modul Access Control.', 403);
            }

            $stmtUpsert = $pdo->prepare("
                INSERT INTO `module_permissions` 
                (`role_id`, `module_code`, `can_view`, `can_create`, `can_edit`, `can_delete`, `can_approve`)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    can_view = VALUES(can_view),
                    can_create = VALUES(can_create),
                    can_edit = VALUES(can_edit),
                    can_delete = VALUES(can_delete),
                    can_approve = VALUES(can_approve)
            ");
            $stmtUpsert->execute([$roleId, $moduleCode, $canView, $canCreate, $canEdit, $canDelete, $canApprove]);

            recordAuditLog(
                $currentUser['id'],
                'UPDATE_ROLE_PERMISSION',
                'ACCESS_CONTROL',
                "role_{$roleId}_{$moduleCode}",
                "Mengubah hak akses role {$roleId} untuk modul {$moduleCode} [V:{$canView}, C:{$canCreate}, E:{$canEdit}, D:{$canDelete}, A:{$canApprove}]"
            );

            sendSuccess(null, "Hak akses role berhasil diperbarui.");
        } elseif ($action === 'add_override') {
            $targetUserId = (int)($input['user_id'] ?? 0);
            $moduleCode = trim($input['module_code'] ?? '');
            $permAction = strtolower(trim($input['action_name'] ?? 'view'));
            $overrideType = strtolower(trim($input['override_type'] ?? 'grant'));
            $reason = trim($input['reason'] ?? '');
            $expiresAt = !empty($input['expires_at']) ? trim($input['expires_at']) : null;

            if ($targetUserId <= 0 || empty($moduleCode) || !isset($modules[$moduleCode])) {
                sendError('Karyawan dan modul yang valid wajib ditentukan.', 400);
            }

            if (!in_array($permAction, ['view', 'create', 'edit', 'delete', 'approve'])) {
                sendError('Aksi izin tidak valid (pilih view, create, edit, delete, atau approve).', 400);
            }

            if (!in_array($overrideType, ['grant', 'deny'])) {
                sendError('Tipe override tidak valid (pilih grant atau deny).', 400);
            }

            // Reason is MANDATORY per specification for audit trail
            if (empty($reason) || strlen($reason) < 5) {
                sendError('Kolom alasan wajib diisi minimal 5 karakter untuk keperluan audit.', 400);
            }

            // Anti-privilege escalation: cannot grant access_control unless Admin
            if ($moduleCode === 'access_control' && (int)$currentUser['role_id'] !== 7) {
                sendError('Hanya Admin yang berwenang memberikan override pada modul Access Control.', 403);
            }

            $stmtInsert = $pdo->prepare("
                INSERT INTO `user_permission_overrides` 
                (`user_id`, `module_code`, `action`, `override_type`, `reason`, `granted_by`, `expires_at`)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtInsert->execute([
                $targetUserId,
                $moduleCode,
                $permAction,
                $overrideType,
                $reason,
                $currentUser['id'],
                $expiresAt
            ]);

            $overrideId = (int)$pdo->lastInsertId();

            recordAuditLog(
                $currentUser['id'],
                'ADD_USER_OVERRIDE',
                'ACCESS_CONTROL',
                (string)$overrideId,
                "Menambahkan override {$overrideType} '{$permAction}' modul '{$moduleCode}' untuk user ID {$targetUserId}. Alasan: {$reason}"
            );

            sendSuccess(['id' => $overrideId], "Override hak akses karyawan berhasil disimpan.", null, 201);
        } elseif ($action === 'revoke_override') {
            $overrideId = (int)($input['override_id'] ?? 0);
            if ($overrideId <= 0) {
                sendError('ID override tidak valid.', 400);
            }

            $stmtGet = $pdo->prepare("SELECT * FROM `user_permission_overrides` WHERE id = ?");
            $stmtGet->execute([$overrideId]);
            $item = $stmtGet->fetch(PDO::FETCH_ASSOC);

            if (!$item) {
                sendError('Data override tidak ditemukan.', 404);
            }

            if ($item['module_code'] === 'access_control' && (int)$currentUser['role_id'] !== 7) {
                sendError('Hanya Admin yang berwenang mencabut override modul Access Control.', 403);
            }

            $stmtDel = $pdo->prepare("DELETE FROM `user_permission_overrides` WHERE id = ?");
            $stmtDel->execute([$overrideId]);

            recordAuditLog(
                $currentUser['id'],
                'REVOKE_USER_OVERRIDE',
                'ACCESS_CONTROL',
                (string)$overrideId,
                "Mencabut override ID {$overrideId} (User {$item['user_id']}, Modul: {$item['module_code']})"
            );

            sendSuccess(null, "Override hak akses berhasil dicabut.");
        } else {
            sendError('Aksi request tidak dikenali.', 400);
        }
    } catch (Exception $e) {
        sendError('Gagal memproses perubahan access control: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Metode request tidak diizinkan.', 405);
}
