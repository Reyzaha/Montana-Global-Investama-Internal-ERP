<?php
// ==========================================================
// MGI ERP / HRIS - HRGA Expense Realization (Upload Foto Barang & Nota)
// Method: GET, POST
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../helpers/upload.php';

// HRGA (2) or Admin (7)
$user = requireRole([2, 7]);
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $status = $_GET['status'] ?? 'approved'; // Default to approved tickets ready for realization
        $search = trim($_GET['search'] ?? '');

        $where = [];
        $params = [];

        if ($status === 'approved') {
            $where[] = "er.status = 'approved'";
        } elseif ($status === 'pending_verification') {
            $where[] = "er.status = 'pending_verification'";
        } elseif ($status === 'completed') {
            $where[] = "er.status IN ('completed', 'disbursed')";
        } elseif ($status !== 'all') {
            $where[] = "er.status = :status";
            $params[':status'] = $status;
        }

        if (!empty($search)) {
            $where[] = "(er.ticket_number LIKE :search OR er.title LIKE :search)";
            $params[':search'] = "%$search%";
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                er.id,
                er.ticket_number,
                er.title,
                er.category,
                er.amount AS estimated_amount,
                er.realized_amount,
                er.description,
                er.receipt_doc_path,
                er.item_photo_path,
                er.status,
                er.note,
                er.realization_notes,
                er.verification_notes,
                er.approved_at,
                er.realized_at,
                er.verified_at,
                er.created_at,
                approver.email AS approver_email,
                COALESCE(approver_p.name, approver.email) AS approver_name,
                (SELECT COUNT(*) FROM expense_request_items WHERE expense_request_id = er.id) AS total_items
            FROM expense_requests er
            LEFT JOIN users approver ON er.approved_by = approver.id
            LEFT JOIN user_profiles approver_p ON approver.id = approver_p.user_id
            $whereClause
            ORDER BY 
                CASE WHEN er.status = 'approved' THEN 1 WHEN er.status = 'pending_verification' THEN 2 ELSE 3 END,
                er.updated_at DESC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch items for each ticket
        foreach ($data as &$ticket) {
            $itemStmt = $pdo->prepare("SELECT * FROM expense_request_items WHERE expense_request_id = ? ORDER BY id ASC");
            $itemStmt->execute([$ticket['id']]);
            $ticket['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        sendSuccess($data, 'Daftar tiket realisasi belanja HRGA.');

    } catch (Exception $e) {
        sendError('Gagal mengambil data tiket realisasi: ' . $e->getMessage(), 500);
    }

} elseif ($method === 'POST') {
    try {
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
        $realizedAmount = isset($_POST['realized_amount']) ? (float)$_POST['realized_amount'] : 0;
        $notes = trim($_POST['realization_notes'] ?? '');

        if ($id <= 0) {
            sendError('ID tiket pengajuan biaya tidak valid.', 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM expense_requests WHERE id = ? FOR UPDATE");
        $stmt->execute([$id]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            sendError('Tiket pengajuan biaya tidak ditemukan.', 404);
        }

        if ($ticket['status'] !== 'approved') {
            sendError('Hanya tiket yang telah disetujui PM (Status: Approved) yang dapat dikirimkan bukti realisasinya.', 400);
        }

        if ($realizedAmount <= 0) {
            $realizedAmount = (float)$ticket['amount']; // Fallback to estimated amount if 0
        }

        // VALIDASI WAJIB FOTO BARANG
        if (!isset($_FILES['item_photo']) || $_FILES['item_photo']['error'] !== UPLOAD_ERR_OK) {
            sendError('Foto fisik barang yang dibeli WAJIB diunggah.', 422, ['item_photo' => 'Wajib upload foto barang']);
        }

        // VALIDASI WAJIB NOTA/KUITANSI
        if (!isset($_FILES['receipt_doc']) || $_FILES['receipt_doc']['error'] !== UPLOAD_ERR_OK) {
            // Check if there was an earlier receipt uploaded, otherwise it's mandatory
            if (empty($ticket['receipt_doc_path'])) {
                sendError('Dokumen nota/kuitansi pembelian WAJIB diunggah (format JPG, PNG, atau PDF).', 422, ['receipt_doc' => 'Wajib upload nota']);
            }
        }

        // Process item photo upload with magic-bytes detection
        $photoUploadRes = secureUploadFile(
            $_FILES['item_photo'],
            ['image/jpeg', 'image/png', 'image/webp'],
            12 * 1024 * 1024,
            __DIR__ . '/../../uploads/realization/' . date('Y/m/'),
            'item_' . $ticket['id'],
            'uploads/realization/' . date('Y/m/')
        );

        if (!$photoUploadRes['success']) {
            sendError($photoUploadRes['message'], 400);
        }
        $itemPhotoPath = $photoUploadRes['relative_path'];

        // Process receipt document upload
        $receiptPath = $ticket['receipt_doc_path'];
        if (isset($_FILES['receipt_doc']) && $_FILES['receipt_doc']['error'] !== UPLOAD_ERR_NO_FILE) {
            $rcUploadRes = secureUploadFile(
                $_FILES['receipt_doc'],
                ['image/jpeg', 'image/png', 'application/pdf'],
                15 * 1024 * 1024,
                __DIR__ . '/../../uploads/realization/' . date('Y/m/'),
                'nota_' . $ticket['id'],
                'uploads/realization/' . date('Y/m/')
            );

            if (!$rcUploadRes['success']) {
                sendError($rcUploadRes['message'], 400);
            }
            $receiptPath = $rcUploadRes['relative_path'];
        }

        $pdo->beginTransaction();

        $stmtUpdate = $pdo->prepare("
            UPDATE expense_requests 
            SET 
                item_photo_path = ?,
                receipt_doc_path = ?,
                realized_amount = ?,
                realization_notes = ?,
                realized_at = NOW(),
                status = 'pending_verification'
            WHERE id = ?
        ");
        $stmtUpdate->execute([
            $itemPhotoPath,
            $receiptPath,
            $realizedAmount,
            $notes,
            $id
        ]);

        // Send Notification to PM
        $pmStmt = $pdo->query("SELECT id FROM users WHERE role_id = 6 AND status = 'active'");
        $pmIds = $pmStmt->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($pmIds)) {
            $notifStmt = $pdo->prepare("
                INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
                VALUES (?, 'Realisasi Belanja Masuk', ?, 'info', 'expense_verification', ?)
            ");
            $msg = "Tiket #{$ticket['ticket_number']}: HRGA telah mengunggah foto barang & nota. Menunggu pengecekan/verifikasi PM.";
            foreach ($pmIds as $pmId) {
                $notifStmt->execute([$pmId, $msg, $id]);
            }
        }

        // Audit log
        recordAuditLog($user['id'], 'EXPENSE_REALIZATION_SUBMIT', 'EXPENSE', (string)$id, "HRGA uploaded goods photo and receipt for ticket {$ticket['ticket_number']}");

        $pdo->commit();

        sendSuccess([
            'id' => $id,
            'ticket_number' => $ticket['ticket_number'],
            'item_photo_path' => $itemPhotoPath,
            'receipt_doc_path' => $receiptPath,
            'realized_amount' => $realizedAmount,
            'status' => 'pending_verification'
        ], 'Bukti fisik barang dan nota berhasil dikirimkan ke PM untuk pengecekan & verifikasi.');

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendError('Gagal mengirimkan realisasi belanja: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Method not allowed.', 405);
}
