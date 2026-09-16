<?php
// ==========================================================
// MGI ERP / HRIS - Overtime Approval API (HRGA & PM)
// Method: POST /backend/api/hrga/overtime-approve.php?id={id}
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';

// Allowed: HRGA (2), PM (6), Admin (7)
$user = requireRole([2, 6, 7]);
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', 405);
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    sendError('ID pengajuan lembur tidak valid.', 400);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = strtolower(trim($input['action'] ?? 'approve'));
$note = trim($input['note'] ?? '');

if (!in_array($action, ['approve', 'reject'])) {
    sendError('Aksi tidak valid. Pilih approve atau reject.', 400);
}

if ($action === 'reject' && empty($note)) {
    sendError('Catatan alasan penolakan wajib diisi.', 400);
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT * FROM overtime_requests WHERE id = ? FOR UPDATE");
    $stmt->execute([$id]);
    $overtime = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$overtime) {
        $pdo->rollBack();
        sendError('Data pengajuan lembur tidak ditemukan.', 404);
    }

    $currentStatus = $overtime['status'];
    $newStatus = '';
    $userRoleId = (int)$user['role_id'];

    if ($action === 'reject') {
        if (in_array($currentStatus, ['approved', 'rejected'])) {
            $pdo->rollBack();
            sendError("Pengajuan ini sudah berstatus {$currentStatus} dan tidak dapat ditolak.", 400);
        }
        $newStatus = 'rejected';
        $stmtUpdate = $pdo->prepare("
            UPDATE overtime_requests 
            SET status = 'rejected', rejection_note = ?
            WHERE id = ?
        ");
        $stmtUpdate->execute([$note, $id]);
    } else {
        // APPROVE LOGIC
        if ($userRoleId === 2) {
            // HRGA Approval (Step 1)
            if ($currentStatus !== 'pending_hrga') {
                $pdo->rollBack();
                sendError("Status saat ini ({$currentStatus}) tidak membutuhkan verifikasi HRGA.", 400);
            }
            $newStatus = 'pending_pm';
            $stmtUpdate = $pdo->prepare("
                UPDATE overtime_requests 
                SET status = 'pending_pm', hrga_approved_by = ?, hrga_approved_at = NOW()
                WHERE id = ?
            ");
            $stmtUpdate->execute([$user['id'], $id]);
        } elseif ($userRoleId === 6) {
            // PM Approval (Step 2 - Final)
            if ($currentStatus !== 'pending_pm') {
                $pdo->rollBack();
                sendError("Status saat ini ({$currentStatus}) belum diverifikasi oleh HRGA atau sudah diproses.", 400);
            }
            $newStatus = 'approved';
            $stmtUpdate = $pdo->prepare("
                UPDATE overtime_requests 
                SET status = 'approved', pm_approved_by = ?, pm_approved_at = NOW()
                WHERE id = ?
            ");
            $stmtUpdate->execute([$user['id'], $id]);
        } elseif ($userRoleId === 7) {
            // Admin can do final approval directly if needed
            $newStatus = ($currentStatus === 'pending_hrga') ? 'pending_pm' : 'approved';
            if ($newStatus === 'pending_pm') {
                $stmtUpdate = $pdo->prepare("
                    UPDATE overtime_requests 
                    SET status = 'pending_pm', hrga_approved_by = ?, hrga_approved_at = NOW()
                    WHERE id = ?
                ");
                $stmtUpdate->execute([$user['id'], $id]);
            } else {
                $stmtUpdate = $pdo->prepare("
                    UPDATE overtime_requests 
                    SET status = 'approved', pm_approved_by = ?, pm_approved_at = NOW()
                    WHERE id = ?
                ");
                $stmtUpdate->execute([$user['id'], $id]);
            }
        }
    }

    $pdo->commit();

    recordAuditLog(
        $user['id'],
        strtoupper($action) . '_OVERTIME',
        'OVERTIME',
        (string)$id,
        "Aksi {$action} lembur #{$id} oleh user {$user['email']}. Status baru: {$newStatus}"
    );

    sendSuccess([
        'id' => $id,
        'status' => $newStatus,
        'action' => $action
    ], "Pengajuan lembur berhasil di-" . ($action === 'approve' ? 'setujui' : 'tolak') . ".");
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendError('Gagal memproses persetujuan lembur: ' . $e->getMessage(), 500);
}
