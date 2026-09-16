<?php
// ==========================================================
// MGI ERP / HRIS - Employee Lifecycle Checklists API
// Method: GET, POST
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../helpers/overtime.php';

// Allowed roles: IT (1), HRGA (2), Legal (4), Admin (7)
$user = requireRole([1, 2, 4, 7]);
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
        $type = $_GET['type'] ?? 'onboarding';
        $category = $_GET['category'] ?? 'all';

        if (!in_array($type, ['onboarding', 'offboarding'])) {
            sendError('Tipe lifecycle tidak valid. Pilih onboarding atau offboarding.', 400);
        }

        // If specific user is requested, auto-initialize if not yet exists
        if ($userId > 0) {
            initializeUserLifecycleChecklist($pdo, $userId, $type);
        }

        $where = ["lc.type = :type"];
        $params = [':type' => $type];

        if ($userId > 0) {
            $where[] = "lc.user_id = :user_id";
            $params[':user_id'] = $userId;
        }

        if ($category !== 'all' && in_array($category, ['it', 'hrga', 'legal'])) {
            $where[] = "lc.category = :category";
            $params[':category'] = $category;
        }

        $whereClause = "WHERE " . implode(" AND ", $where);

        $sql = "
            SELECT 
                lc.id,
                lc.user_id,
                u.email AS employee_email,
                COALESCE(up.name, u.email) AS employee_name,
                r.name AS employee_role,
                lc.type,
                lc.category,
                lc.task_name,
                lc.is_completed,
                lc.completed_by,
                cu.email AS completed_by_email,
                lc.completed_at,
                lc.notes,
                lc.created_at
            FROM lifecycle_checklists lc
            JOIN users u ON lc.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN users cu ON lc.completed_by = cu.id
            $whereClause
            ORDER BY lc.user_id ASC, lc.category ASC, lc.id ASC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Group summary stats if filtering by single user
        $summary = null;
        if ($userId > 0) {
            $totalTasks = count($items);
            $completedTasks = count(array_filter($items, fn($i) => (int)$i['is_completed'] === 1));
            $summary = [
                'user_id' => $userId,
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'progress_percent' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 1) : 0
            ];
        }

        sendSuccess([
            'items' => $items,
            'summary' => $summary
        ], 'Data checklist lifecycle berhasil dimuat.');
    } catch (Exception $e) {
        sendError('Gagal memuat lifecycle checklist: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $action = $input['action'] ?? 'toggle';

        if ($action === 'init') {
            // Manual initialize checklist for an employee
            $targetUserId = (int)($input['user_id'] ?? 0);
            $lifecycleType = $input['type'] ?? 'onboarding';

            if ($targetUserId <= 0) {
                sendError('User ID target wajib diisi.', 400);
            }

            $count = initializeUserLifecycleChecklist($pdo, $targetUserId, $lifecycleType);
            sendSuccess(['initialized_count' => $count], "Berhasil menginisialisasi {$count} checklist item.");
        }

        // Toggle task completion
        $taskId = (int)($input['task_id'] ?? 0);
        $isCompleted = isset($input['is_completed']) ? ((int)$input['is_completed'] ? 1 : 0) : 1;
        $notes = trim($input['notes'] ?? '');

        if ($taskId <= 0) {
            sendError('Task ID wajib diisi.', 400);
        }

        $stmtTask = $pdo->prepare("SELECT * FROM lifecycle_checklists WHERE id = ?");
        $stmtTask->execute([$taskId]);
        $task = $stmtTask->fetch(PDO::FETCH_ASSOC);

        if (!$task) {
            sendError('Checklist item tidak ditemukan.', 404);
        }

        // Role authorization check: IT only toggles 'it', HRGA toggles 'hrga', Legal toggles 'legal', Admin can toggle all
        $userRoleId = (int)$user['role_id'];
        $taskCat = $task['category'];
        if ($userRoleId !== 7) {
            if ($taskCat === 'it' && $userRoleId !== 1) {
                sendError('Hanya divisi IT atau Admin yang dapat memproses tugas ini.', 403);
            }
            if ($taskCat === 'hrga' && $userRoleId !== 2) {
                sendError('Hanya divisi HRGA atau Admin yang dapat memproses tugas ini.', 403);
            }
            if ($taskCat === 'legal' && $userRoleId !== 4) {
                sendError('Hanya divisi Legal atau Admin yang dapat memproses tugas ini.', 403);
            }
        }

        $completedBy = $isCompleted ? $user['id'] : null;
        $completedAt = $isCompleted ? date('Y-m-d H:i:s') : null;

        $stmtUpdate = $pdo->prepare("
            UPDATE lifecycle_checklists 
            SET is_completed = ?, completed_by = ?, completed_at = ?, notes = ?
            WHERE id = ?
        ");
        $stmtUpdate->execute([$isCompleted, $completedBy, $completedAt, $notes, $taskId]);

        recordAuditLog(
            $user['id'],
            'UPDATE_LIFECYCLE_TASK',
            'LIFECYCLE',
            (string)$taskId,
            "Tugas '{$task['task_name']}' untuk user ID {$task['user_id']} diubah menjadi " . ($isCompleted ? 'SELESAI' : 'BELUM SELESAI')
        );

        sendSuccess([
            'task_id' => $taskId,
            'is_completed' => $isCompleted,
            'completed_by' => $user['email'],
            'completed_at' => $completedAt
        ], 'Status checklist berhasil diperbarui.');
    } catch (Exception $e) {
        sendError('Gagal memperbarui status checklist: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Metode request tidak diizinkan.', 405);
}
