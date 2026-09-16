<?php
// ==========================================================
// MGI ERP / HRIS - PM Expense Verification API (Pengecekan Barang & Nota)
// Method: GET, POST
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';

// PM (6) or Admin (7)
$user = requireRole([6, 7]);
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $status = $_GET['status'] ?? 'pending_verification';
        $search = trim($_GET['search'] ?? '');

        $where = [];
        $params = [];

        if ($status === 'pending_verification') {
            $where[] = "er.status = 'pending_verification'";
        } elseif ($status === 'completed') {
            $where[] = "er.status IN ('completed', 'disbursed')";
        } elseif ($status !== 'all') {
            $where[] = "er.status = :status";
            $params[':status'] = $status;
        }

        if (!empty($search)) {
            $where[] = "(er.ticket_number LIKE :search OR er.title LIKE :search OR u.email LIKE :search)";
            $params[':search'] = "%$search%";
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                er.*,
                u.email AS creator_email,
                COALESCE(up.name, u.email) AS creator_name,
                approver.email AS approver_email,
                COALESCE(approver_p.name, approver.email) AS approver_name,
                verifier.email AS verifier_email,
                COALESCE(verifier_p.name, verifier.email) AS verifier_name
            FROM expense_requests er
            JOIN users u ON er.created_by = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN users approver ON er.approved_by = approver.id
            LEFT JOIN user_profiles approver_p ON approver.id = approver_p.user_id
            LEFT JOIN users verifier ON er.verified_by = verifier.id
            LEFT JOIN user_profiles verifier_p ON verifier.id = verifier_p.user_id
            $whereClause
            ORDER BY 
                CASE WHEN er.status = 'pending_verification' THEN 1 ELSE 2 END,
                er.realized_at DESC, er.updated_at DESC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Attach items
        foreach ($tickets as &$ticket) {
            $itemStmt = $pdo->prepare("SELECT * FROM expense_request_items WHERE expense_request_id = ? ORDER BY id ASC");
            $itemStmt->execute([$ticket['id']]);
            $ticket['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        sendSuccess($tickets, 'Daftar tiket verifikasi barang PM.');

    } catch (Exception $e) {
        sendError('Gagal mengambil data verifikasi PM: ' . $e->getMessage(), 500);
    }

} elseif ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = isset($input['id']) ? (int)$input['id'] : (int)($_GET['id'] ?? 0);
        $action = strtolower(trim($input['action'] ?? 'approve'));
        $notes = trim($input['notes'] ?? '');

        if ($id <= 0) {
            sendError('ID tiket tidak valid.', 400);
        }

        if (!in_array($action, ['approve', 'reject'])) {
            sendError('Aksi verifikasi harus approve atau reject.', 400);
        }

        if ($action === 'reject' && empty($notes)) {
            sendError('Catatan alasan penolakan/revisi barang wajib diisi.', 400);
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT * FROM expense_requests WHERE id = ? FOR UPDATE");
        $stmt->execute([$id]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            $pdo->rollBack();
            sendError('Tiket pengajuan biaya tidak ditemukan.', 404);
        }

        if ($ticket['status'] !== 'pending_verification') {
            $pdo->rollBack();
            sendError('Tiket ini tidak dalam status menunggu verifikasi barang (Status: ' . $ticket['status'] . ').', 400);
        }

        if ($action === 'approve') {
            $finalStatus = 'completed';
            $finalAmount = !empty($ticket['realized_amount']) ? (float)$ticket['realized_amount'] : (float)$ticket['amount'];

            // 1. Update expense request to completed
            $updateStmt = $pdo->prepare("
                UPDATE expense_requests 
                SET 
                    status = 'completed',
                    verified_by = ?,
                    verified_at = NOW(),
                    verification_notes = ?,
                    disbursed_at = NOW(),
                    disbursed_by = ?
                WHERE id = ?
            ");
            $updateStmt->execute([$user['id'], $notes, $user['id'], $id]);

            // 2. Automatically record outflow in Petty Cash ledger if not already recorded
            $stmtLock = $pdo->query("SELECT current_balance FROM petty_cash_transactions ORDER BY id DESC LIMIT 1 FOR UPDATE");
            $lastBalance = (float)($stmtLock->fetchColumn() ?: 0.00);
            $newBalance = $lastBalance - $finalAmount;

            $desc = "[{$ticket['ticket_number']}] Realisasi sah: " . $ticket['title'];
            $stmtPetty = $pdo->prepare("
                INSERT INTO petty_cash_transactions 
                (`transaction_type`, `expense_request_id`, `amount`, `current_balance`, `description`, `proof_doc_path`, `created_by`)
                VALUES ('outflow', ?, ?, ?, ?, ?, ?)
            ");
            $stmtPetty->execute([
                $id,
                $finalAmount,
                $newBalance,
                $desc,
                $ticket['receipt_doc_path'],
                $user['id']
            ]);

            // Notify HRGA
            $notifStmt = $pdo->prepare("
                INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
                VALUES (?, 'Barang Terverifikasi Sah', ?, 'success', 'expense', ?)
            ");
            $notifMsg = "Tiket #{$ticket['ticket_number']}: Fisik barang & nota telah dicek dan disahkan oleh PM. Biaya Rp " . number_format($finalAmount, 0, ',', '.') . " resmi dibukukan ke Petty Cash.";
            $notifStmt->execute([$ticket['created_by'], $notifMsg, $id]);

            recordAuditLog($user['id'], 'EXPENSE_VERIFY_APPROVE', 'EXPENSE', (string)$id, "PM verified goods and settled petty cash for {$ticket['ticket_number']}");

            $pdo->commit();
            sendSuccess(['id' => $id, 'status' => 'completed', 'current_balance' => $newBalance], 'Barang dan nota berhasil diverifikasi & disahkan oleh PM.');

        } else {
            // Reject / Revision requested
            // Revert status back to 'approved' so HRGA can re-upload correct photo / nota
            $updateStmt = $pdo->prepare("
                UPDATE expense_requests 
                SET 
                    status = 'approved',
                    verification_notes = ?
                WHERE id = ?
            ");
            $updateStmt->execute([$notes, $id]);

            // Notify HRGA
            $notifStmt = $pdo->prepare("
                INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
                VALUES (?, 'Revisi Bukti Belanja Diperlukan', ?, 'warning', 'expense_realization', ?)
            ");
            $notifMsg = "Tiket #{$ticket['ticket_number']}: PM meminta perbaikan bukti barang/nota. Alasan: $notes";
            $notifStmt->execute([$ticket['created_by'], $notifMsg, $id]);

            recordAuditLog($user['id'], 'EXPENSE_VERIFY_REJECT', 'EXPENSE', (string)$id, "PM rejected goods verification for {$ticket['ticket_number']}: $notes");

            $pdo->commit();
            sendSuccess(['id' => $id, 'status' => 'approved'], 'Verifikasi ditolak. Tiket dikembalikan ke HRGA untuk revisi bukti belanja.');
        }

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendError('Gagal memproses verifikasi PM: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Method not allowed.', 405);
}
