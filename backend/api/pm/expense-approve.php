<?php
// ==========================================================
// MGI ERP / HRIS - PM Expense Approval API
// Method: POST /backend/api/pm/expense-approve.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';

// Allowed: PM (6) and Admin (7)
$user = requireRole([6, 7]);
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', 405);
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    sendError('ID tiket pengajuan biaya tidak valid.', 400);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = strtolower(trim($input['action'] ?? 'approve'));
$note = trim($input['note'] ?? '');

if (!in_array($action, ['approve', 'reject'])) {
    sendError('Aksi approval tidak valid. Pilih approve atau reject.', 400);
}

if ($action === 'reject' && empty($note)) {
    sendError('Catatan alasan penolakan wajib diisi.', 400);
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT * FROM expense_requests WHERE id = ? FOR UPDATE");
    $stmt->execute([$id]);
    $expense = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$expense) {
        sendError('Tiket pengajuan biaya tidak ditemukan.', 404);
    }

    if ($expense['status'] !== 'pending_pm') {
        sendError('Tiket ini sudah diproses sebelumnya (Status: ' . $expense['status'] . ').', 400);
    }

    $newStatus = ($action === 'approve') ? 'approved' : 'rejected';

    $updateStmt = $pdo->prepare("
        UPDATE expense_requests 
        SET status = ?, note = ?, approved_by = ?, approved_at = NOW() 
        WHERE id = ?
    ");
    $updateStmt->execute([$newStatus, $note, $user['id'], $id]);

    // Send notification to HRGA creator
    $notifTitle = ($action === 'approve') 
        ? 'Pengajuan Biaya Disetujui PM' 
        : 'Pengajuan Biaya Ditolak PM';
    $notifType = ($action === 'approve') ? 'success' : 'danger';
    $notifMsg = "Tiket #{$expense['ticket_number']} (" . htmlspecialchars($expense['title']) . ") telah " . 
        ($action === 'approve' ? 'disetujui' : 'ditolak') . " oleh PM." . 
        (!empty($note) ? " Catatan: " . $note : "");

    $stmtNotif = $pdo->prepare("
        INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
        VALUES (?, ?, ?, ?, 'expense', ?)
    ");
    $stmtNotif->execute([$expense['created_by'], $notifTitle, $notifMsg, $notifType, $id]);

    // Audit log
    $auditAction = ($action === 'approve') ? 'EXPENSE_APPROVE' : 'EXPENSE_REJECT';
    recordAuditLog($user['id'], $auditAction, 'EXPENSE', (string)$id, "PM {$user['name']} {$action}ed expense ticket {$expense['ticket_number']}");

    $pdo->commit();

    sendSuccess([
        'id' => $id,
        'ticket_number' => $expense['ticket_number'],
        'status' => $newStatus,
        'note' => $note
    ], 'Tiket pengajuan biaya berhasil ' . ($action === 'approve' ? 'disetujui.' : 'ditolak.'));

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendError('Gagal memproses approval pengajuan biaya: ' . $e->getMessage(), 500);
}
