<?php
// ==========================================================
// MGI ERP / HRIS - Overtime Requests API
// Method: GET, POST
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../helpers/overtime.php';

$user = requireAuth();
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $status = $_GET['status'] ?? 'all';
        $search = trim($_GET['search'] ?? '');
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, (int)($_GET['limit'] ?? 20));
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];

        // Role restriction: Normal employees (role != 2 [HRGA], 6 [PM], 7 [Admin]) only see their own requests
        $isPrivileged = in_array((int)$user['role_id'], [2, 6, 7]);
        if (!$isPrivileged) {
            $where[] = "o.user_id = :current_user_id";
            $params[':current_user_id'] = $user['id'];
        } elseif (isset($_GET['user_id']) && (int)$_GET['user_id'] > 0) {
            $where[] = "o.user_id = :filter_user_id";
            $params[':filter_user_id'] = (int)$_GET['user_id'];
        }

        if (!empty($status) && $status !== 'all') {
            $where[] = "o.status = :status";
            $params[':status'] = $status;
        }

        if (!empty($search)) {
            $where[] = "(u.email LIKE :search OR up.name LIKE :search OR o.reason LIKE :search)";
            $params[':search'] = "%$search%";
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        // Total count
        $countSql = "
            SELECT COUNT(*) 
            FROM overtime_requests o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            $whereClause
        ";
        $stmtCount = $pdo->prepare($countSql);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        // Data list
        $sql = "
            SELECT 
                o.id,
                o.user_id,
                u.email AS employee_email,
                COALESCE(up.name, u.email) AS employee_name,
                r.name AS employee_role,
                o.date,
                o.start_time,
                o.end_time,
                o.duration_hours,
                o.reason,
                o.status,
                o.hrga_approved_by,
                o.hrga_approved_at,
                o.pm_approved_by,
                o.pm_approved_at,
                o.rejection_note,
                o.created_at,
                a.check_out AS attendance_check_out
            FROM overtime_requests o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN attendances a ON o.user_id = a.user_id AND o.date = a.date
            $whereClause
            ORDER BY o.date DESC, o.id DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        sendSuccess([
            'items' => $items,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => ceil($total / $limit)
            ]
        ], 'Daftar pengajuan lembur berhasil diambil.');
    } catch (Exception $e) {
        sendError('Gagal mengambil data lembur: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $date = trim($input['date'] ?? date('Y-m-d'));
        $startTime = trim($input['start_time'] ?? '');
        $endTime = trim($input['end_time'] ?? '');
        $reason = trim($input['reason'] ?? '');

        if (empty($date) || empty($startTime) || empty($endTime) || empty($reason)) {
            sendError('Tanggal, jam mulai, jam selesai, dan alasan lembur wajib diisi.', 400);
        }

        // Validate date format
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            sendError('Format tanggal tidak valid (gunakan YYYY-MM-DD).', 400);
        }

        // Calculate duration
        $durationHours = calculateOvertimeHours($startTime, $endTime);
        if ($durationHours <= 0) {
            sendError('Jam selesai lembur harus lebih besar dari jam mulai lembur.', 400);
        }

        // Check if there is already a pending or approved request on that date
        $stmtExisting = $pdo->prepare("
            SELECT id, status FROM overtime_requests 
            WHERE user_id = ? AND date = ? AND status IN ('pending_hrga', 'pending_pm', 'approved')
            LIMIT 1
        ");
        $stmtExisting->execute([$user['id'], $date]);
        $existing = $stmtExisting->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            sendError("Anda sudah memiliki pengajuan lembur pada tanggal tersebut (Status: {$existing['status']}).", 400);
        }

        // Insert request
        $stmtInsert = $pdo->prepare("
            INSERT INTO overtime_requests (user_id, date, start_time, end_time, duration_hours, reason, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending_hrga')
        ");
        $stmtInsert->execute([
            $user['id'],
            $date,
            $startTime,
            $endTime,
            $durationHours,
            $reason
        ]);

        $newId = (int)$pdo->lastInsertId();

        recordAuditLog(
            $user['id'],
            'SUBMIT_OVERTIME',
            'OVERTIME',
            (string)$newId,
            "Pengajuan lembur diajukan pada {$date} ({$durationHours} jam)"
        );

        sendSuccess([
            'id' => $newId,
            'user_id' => $user['id'],
            'date' => $date,
            'duration_hours' => $durationHours,
            'status' => 'pending_hrga'
        ], 'Permohonan lembur berhasil diajukan dan menunggu verifikasi HRGA.', null, 201);
    } catch (Exception $e) {
        sendError('Gagal memproses permohonan lembur: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Metode request tidak diizinkan.', 405);
}
