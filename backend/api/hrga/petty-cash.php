<?php
// ==========================================================
// MGI ERP / HRIS - HRGA Petty Cash (Kas Kecil) API
// Method: GET, POST
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../helpers/upload.php';

// HRGA (2), PM (6), Admin (7)
$user = requireRole([2, 6, 7]);
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $type = $_GET['type'] ?? 'all';
        $search = trim($_GET['search'] ?? '');
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, (int)($_GET['limit'] ?? 20));
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];

        if (in_array($type, ['inflow', 'outflow'])) {
            $where[] = "pct.transaction_type = :type";
            $params[':type'] = $type;
        }

        if (!empty($search)) {
            $where[] = "(pct.description LIKE :search OR er.ticket_number LIKE :search)";
            $params[':search'] = "%$search%";
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        // Total records
        $countSql = "
            SELECT COUNT(*) 
            FROM petty_cash_transactions pct
            LEFT JOIN expense_requests er ON pct.expense_request_id = er.id
            $whereClause
        ";
        $stmtCount = $pdo->prepare($countSql);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        // Transaction list
        $sql = "
            SELECT 
                pct.id,
                pct.transaction_type,
                pct.expense_request_id,
                er.ticket_number,
                er.title AS expense_title,
                pct.amount,
                pct.current_balance,
                pct.description,
                pct.proof_doc_path,
                pct.created_at,
                u.email AS creator_email,
                COALESCE(up.name, u.email) AS creator_name
            FROM petty_cash_transactions pct
            LEFT JOIN expense_requests er ON pct.expense_request_id = er.id
            JOIN users u ON pct.created_by = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            $whereClause
            ORDER BY pct.id DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Balance & summary
        $latestBalanceStmt = $pdo->query("SELECT current_balance FROM petty_cash_transactions ORDER BY id DESC LIMIT 1");
        $currentBalance = (float)($latestBalanceStmt->fetchColumn() ?: 0.00);

        $stats = $pdo->query("
            SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'inflow' THEN amount ELSE 0 END), 0) AS total_inflow,
                COALESCE(SUM(CASE WHEN transaction_type = 'outflow' THEN amount ELSE 0 END), 0) AS total_outflow,
                COUNT(*) AS total_transactions
            FROM petty_cash_transactions
        ")->fetch(PDO::FETCH_ASSOC);

        // Fetch pending approved expense requests that need disbursement
        $pendingDisbursement = $pdo->query("
            SELECT id, ticket_number, title, amount, category, approved_at 
            FROM expense_requests 
            WHERE status = 'approved'
            ORDER BY approved_at ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        sendSuccess($transactions, 'Petty cash records retrieved.', [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => ceil($total / $limit),
            'current_balance' => $currentBalance,
            'stats' => $stats,
            'pending_disbursement' => $pendingDisbursement
        ]);

    } catch (Exception $e) {
        sendError('Failed to fetch petty cash data: ' . $e->getMessage(), 500);
    }

} elseif ($method === 'POST') {
    // Only HRGA (2) and Admin (7) can record petty cash transactions
    if (!in_array($user['role_id'], [2, 7])) {
        sendError('Hanya HRGA yang dapat melakukan mutasi petty cash.', 403);
    }

    try {
        $transactionType = trim($_POST['transaction_type'] ?? 'outflow');
        $amount = (float)($_POST['amount'] ?? 0);
        $description = trim($_POST['description'] ?? '');
        $expenseRequestId = !empty($_POST['expense_request_id']) ? (int)$_POST['expense_request_id'] : null;

        if (!in_array($transactionType, ['inflow', 'outflow'])) {
            sendError('Tipe transaksi harus inflow (kas masuk) atau outflow (kas keluar).', 400);
        }

        if ($amount <= 0) {
            sendError('Nominal transaksi harus lebih besar dari 0.', 400);
        }

        if (empty($description)) {
            sendError('Keterangan transaksi wajib diisi.', 400);
        }

        // Handle proof upload if provided with magic-bytes detection
        $proofPath = null;
        if (isset($_FILES['proof']) && $_FILES['proof']['error'] !== UPLOAD_ERR_NO_FILE) {
            $allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
            $maxSize = 10 * 1024 * 1024; // 10MB

            $uploadRes = secureUploadFile(
                $_FILES['proof'],
                $allowedMimes,
                $maxSize,
                __DIR__ . '/../../uploads/petty_cash/' . date('Y/m/'),
                'pc',
                'uploads/petty_cash/' . date('Y/m/')
            );

            if (!$uploadRes['success']) {
                sendError($uploadRes['message'], 400);
            }
            $proofPath = $uploadRes['relative_path'];
        }

        $pdo->beginTransaction();

        // Check and lock latest balance
        $stmtLock = $pdo->query("SELECT current_balance FROM petty_cash_transactions ORDER BY id DESC LIMIT 1 FOR UPDATE");
        $lastBalance = (float)($stmtLock->fetchColumn() ?: 0.00);

        if ($transactionType === 'outflow' && $amount > $lastBalance) {
            $pdo->rollBack();
            sendError('Saldo Petty Cash tidak mencukupi (Saldo saat ini: Rp ' . number_format($lastBalance, 0, ',', '.') . ').', 400);
        }

        $newBalance = ($transactionType === 'inflow') 
            ? $lastBalance + $amount 
            : $lastBalance - $amount;

        // If this transaction disburses an approved expense request
        if ($expenseRequestId) {
            $stmtExp = $pdo->prepare("SELECT * FROM expense_requests WHERE id = ? FOR UPDATE");
            $stmtExp->execute([$expenseRequestId]);
            $expense = $stmtExp->fetch(PDO::FETCH_ASSOC);

            if (!$expense) {
                $pdo->rollBack();
                sendError('Tiket pengajuan biaya yang dipilih tidak ditemukan.', 404);
            }

            if ($expense['status'] !== 'approved') {
                $pdo->rollBack();
                sendError('Tiket pengajuan biaya ini belum disetujui PM atau sudah dicairkan.', 400);
            }

            // Update expense request to disbursed
            $stmtUpdateExp = $pdo->prepare("
                UPDATE expense_requests 
                SET status = 'disbursed', disbursed_at = NOW(), disbursed_by = ? 
                WHERE id = ?
            ");
            $stmtUpdateExp->execute([$user['id'], $expenseRequestId]);

            // Append ticket info to description if not present
            if (strpos($description, $expense['ticket_number']) === false) {
                $description = "[{$expense['ticket_number']}] " . $description;
            }
        }

        // Insert petty cash transaction
        $stmtInsert = $pdo->prepare("
            INSERT INTO petty_cash_transactions 
            (`transaction_type`, `expense_request_id`, `amount`, `current_balance`, `description`, `proof_doc_path`, `created_by`)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmtInsert->execute([
            $transactionType,
            $expenseRequestId,
            $amount,
            $newBalance,
            $description,
            $proofPath,
            $user['id']
        ]);
        $txId = (int)$pdo->lastInsertId();

        // Audit log
        recordAuditLog($user['id'], 'PETTY_CASH_MUTATION', 'PETTY_CASH', (string)$txId, "Mutasi kas {$transactionType} sebesar Rp " . number_format($amount, 0) . ". Saldo akhir: Rp " . number_format($newBalance, 0));

        $pdo->commit();

        sendSuccess([
            'id' => $txId,
            'transaction_type' => $transactionType,
            'amount' => $amount,
            'current_balance' => $newBalance,
            'description' => $description
        ], 'Transaksi Petty Cash berhasil dicatat.', null, 201);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendError('Gagal mencatat transaksi Petty Cash: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Method not allowed.', 405);
}
