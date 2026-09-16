<?php
// ==========================================================
// MGI ERP / HRIS - HRGA Leave Balances API
// Method: GET, POST
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../helpers/leave.php';

// Only HRGA (2) and Admin (7)
$user = requireRole([2, 7]);
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
        $search = trim($_GET['search'] ?? '');

        $where = ["lb.year = :year"];
        $params = [':year' => $year];

        if (!empty($search)) {
            $where[] = "(u.email LIKE :search OR up.name LIKE :search)";
            $params[':search'] = "%$search%";
        }

        $whereClause = "WHERE " . implode(" AND ", $where);

        $sql = "
            SELECT 
                lb.id,
                lb.user_id,
                u.email,
                COALESCE(up.name, u.email) AS employee_name,
                r.name AS role_name,
                lb.permit_type_id,
                pt.name AS permit_type_name,
                lb.year,
                lb.quota_days,
                lb.used_days,
                lb.carried_over_days,
                ((lb.quota_days + lb.carried_over_days) - lb.used_days) AS remaining_days,
                lb.updated_at
            FROM leave_balances lb
            JOIN users u ON lb.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            JOIN roles r ON u.role_id = r.id
            JOIN permit_types pt ON lb.permit_type_id = pt.id
            $whereClause
            ORDER BY employee_name ASC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Summary stats
        $statsStmt = $pdo->prepare("
            SELECT 
                COUNT(DISTINCT lb.user_id) AS total_employees,
                COALESCE(SUM(lb.quota_days), 0) AS total_allocated,
                COALESCE(SUM(lb.used_days), 0) AS total_used,
                COALESCE(SUM((lb.quota_days + lb.carried_over_days) - lb.used_days), 0) AS total_remaining
            FROM leave_balances lb
            WHERE lb.year = ?
        ");
        $statsStmt->execute([$year]);
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

        sendSuccess($records, 'Daftar kuota cuti karyawan berhasil diambil.', [
            'year' => $year,
            'stats' => $stats
        ]);

    } catch (Exception $e) {
        sendError('Gagal mengambil data kuota cuti: ' . $e->getMessage(), 500);
    }

} elseif ($method === 'POST') {
    // Set or adjust quota
    try {
        $input = getJsonInput();
        $targetUserId = (int)($input['user_id'] ?? 0);
        $quotaDays = isset($input['quota_days']) ? (float)$input['quota_days'] : null;
        $carriedOverDays = isset($input['carried_over_days']) ? (float)$input['carried_over_days'] : null;
        $year = isset($input['year']) ? (int)$input['year'] : (int)date('Y');
        $permitTypeId = isset($input['permit_type_id']) ? (int)$input['permit_type_id'] : null;

        if ($targetUserId <= 0) {
            sendError('ID Karyawan wajib diisi.', 400);
        }

        if ($permitTypeId === null || $permitTypeId <= 0) {
            // Default to 'cuti' permit type
            $stmtC = $pdo->query("SELECT id FROM permit_types WHERE code = 'cuti' LIMIT 1");
            $permitTypeId = (int)$stmtC->fetchColumn();
        }

        if ($quotaDays === null || $quotaDays < 0) {
            sendError('Jumlah kuota cuti harus berupa angka positif.', 400);
        }

        // Check if user exists
        $stmtUser = $pdo->prepare("SELECT id, email FROM users WHERE id = ?");
        $stmtUser->execute([$targetUserId]);
        $targetUser = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if (!$targetUser) {
            sendError('Karyawan tidak ditemukan.', 404);
        }

        $balance = getOrCreateLeaveBalance($pdo, $targetUserId, $permitTypeId, $year);

        $newCarried = ($carriedOverDays !== null && $carriedOverDays >= 0) ? $carriedOverDays : $balance['carried_over_days'];

        $stmtUpdate = $pdo->prepare("
            UPDATE `leave_balances` 
            SET `quota_days` = ?, `carried_over_days` = ?
            WHERE `id` = ?
        ");
        $stmtUpdate->execute([$quotaDays, $newCarried, $balance['id']]);

        recordAuditLog($user['id'], 'UPDATE_LEAVE_BALANCE', 'HRGA', (string)$balance['id'], "Updated leave quota for user #{$targetUserId} ({$targetUser['email']}) to {$quotaDays} days");

        $updatedBalance = getOrCreateLeaveBalance($pdo, $targetUserId, $permitTypeId, $year);

        sendSuccess($updatedBalance, "Kuota cuti untuk {$targetUser['email']} tahun {$year} berhasil diperbarui.");

    } catch (Exception $e) {
        sendError('Gagal memperbarui kuota cuti: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Method not allowed.', 405);
}
