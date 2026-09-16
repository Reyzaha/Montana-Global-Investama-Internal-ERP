<?php
// ==========================================================
// MGI ERP / HRIS - HRGA Expense Requests (Pengajuan Biaya) API
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
        $singleId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($singleId > 0) {
            // Fetch single ticket with items
            $stmt = $pdo->prepare("
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
                WHERE er.id = ?
            ");
            $stmt->execute([$singleId]);
            $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$ticket) {
                sendError('Tiket pengajuan biaya tidak ditemukan.', 404);
            }

            // Fetch items
            $stmtItems = $pdo->prepare("SELECT * FROM expense_request_items WHERE expense_request_id = ? ORDER BY id ASC");
            $stmtItems->execute([$singleId]);
            $ticket['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

            sendSuccess($ticket, 'Detail tiket pengajuan biaya.');
        }

        $status = $_GET['status'] ?? 'all';
        $category = $_GET['category'] ?? 'all';
        $search = trim($_GET['search'] ?? '');
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, (int)($_GET['limit'] ?? 50));
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];

        if (!empty($status) && $status !== 'all') {
            $where[] = "er.status = :status";
            $params[':status'] = $status;
        }

        if (!empty($category) && $category !== 'all') {
            $where[] = "er.category = :category";
            $params[':category'] = $category;
        }

        if (!empty($search)) {
            $where[] = "(er.ticket_number LIKE :search OR er.title LIKE :search OR er.description LIKE :search OR u.email LIKE :search)";
            $params[':search'] = "%$search%";
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        // Total records
        $countSql = "
            SELECT COUNT(*) 
            FROM expense_requests er
            JOIN users u ON er.created_by = u.id
            $whereClause
        ";
        $stmtCount = $pdo->prepare($countSql);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        // Data query
        $sql = "
            SELECT 
                er.id,
                er.ticket_number,
                er.title,
                er.category,
                er.amount,
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
                er.disbursed_at,
                er.created_at,
                u.email AS creator_email,
                COALESCE(up.name, u.email) AS creator_name,
                approver.email AS approver_email,
                COALESCE(approver_p.name, approver.email) AS approver_name,
                verifier.email AS verifier_email,
                COALESCE(verifier_p.name, verifier.email) AS verifier_name,
                (SELECT COUNT(*) FROM expense_request_items WHERE expense_request_id = er.id) AS total_items
            FROM expense_requests er
            JOIN users u ON er.created_by = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN users approver ON er.approved_by = approver.id
            LEFT JOIN user_profiles approver_p ON approver.id = approver_p.user_id
            LEFT JOIN users verifier ON er.verified_by = verifier.id
            LEFT JOIN user_profiles verifier_p ON verifier.id = verifier_p.user_id
            $whereClause
            ORDER BY er.created_at DESC
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

        // Summary counts
        $stats = $pdo->query("
            SELECT 
                COUNT(*) AS total_count,
                SUM(CASE WHEN status = 'pending_pm' THEN 1 ELSE 0 END) AS pending_count,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
                SUM(CASE WHEN status = 'pending_verification' THEN 1 ELSE 0 END) AS pending_verification_count,
                SUM(CASE WHEN status IN ('completed', 'disbursed') THEN 1 ELSE 0 END) AS completed_count,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
                COALESCE(SUM(amount), 0) AS total_amount,
                COALESCE(SUM(CASE WHEN status IN ('approved', 'pending_verification', 'completed', 'disbursed') THEN amount ELSE 0 END), 0) AS approved_amount
            FROM expense_requests
        ")->fetch(PDO::FETCH_ASSOC);

        sendSuccess($items, 'Expense requests retrieved.', [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => ceil($total / $limit),
            'stats' => $stats
        ]);

    } catch (Exception $e) {
        sendError('Failed to fetch expense requests: ' . $e->getMessage(), 500);
    }

} elseif ($method === 'POST') {
    // Only HRGA (2) and Admin (7) can create ticketing pengajuan biaya
    if (!in_array($user['role_id'], [2, 7])) {
        sendError('Hanya HRGA yang dapat membuat tiket pengajuan biaya.', 403);
    }

    try {
        $title = trim($_POST['title'] ?? '');
        $category = trim($_POST['category'] ?? 'operational');
        $description = trim($_POST['description'] ?? '');

        // Items array or JSON
        $rawItems = $_POST['items'] ?? null;
        $itemsList = [];
        if (is_string($rawItems)) {
            $itemsList = json_decode($rawItems, true) ?? [];
        } elseif (is_array($rawItems)) {
            $itemsList = $rawItems;
        }

        $errors = [];
        if (empty($title)) $errors['title'] = 'Judul / keperluan pengajuan wajib diisi.';
        
        $validCategories = ['operational', 'project', 'office_supplies', 'travel', 'other'];
        if (!in_array($category, $validCategories)) {
            $errors['category'] = 'Kategori pengajuan tidak valid.';
        }

        // Calculate Grand Total from items
        $calculatedGrandTotal = 0.00;
        $cleanItems = [];

        if (!empty($itemsList)) {
            foreach ($itemsList as $idx => $it) {
                $itemName = trim($it['item_name'] ?? '');
                $qty = (float)($it['qty'] ?? 1);
                $unit = trim($it['unit'] ?? 'pcs');
                $unitPrice = (float)($it['unit_price'] ?? 0);
                $notes = trim($it['notes'] ?? '');

                if (!empty($itemName)) {
                    $totalPrice = $qty * $unitPrice;
                    $calculatedGrandTotal += $totalPrice;
                    $cleanItems[] = [
                        'item_name' => $itemName,
                        'qty' => $qty > 0 ? $qty : 1,
                        'unit' => !empty($unit) ? $unit : 'pcs',
                        'unit_price' => $unitPrice,
                        'total_price' => $totalPrice,
                        'notes' => $notes
                    ];
                }
            }
        }

        // If items are provided, use calculated grand total, otherwise fallback to $_POST['amount']
        $finalAmount = ($calculatedGrandTotal > 0) 
            ? $calculatedGrandTotal 
            : (float)($_POST['amount'] ?? 0);

        if ($finalAmount <= 0) {
            $errors['amount'] = 'Rincian item barang atau total nominal harus lebih besar dari 0.';
        }

        if (!empty($errors)) {
            sendValidationError($errors, 'Validasi formulir pengajuan biaya gagal.');
        }

        $receiptPath = null;
        if (isset($_FILES['receipt']) && $_FILES['receipt']['error'] !== UPLOAD_ERR_NO_FILE) {
            $allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
            $maxSize = 10 * 1024 * 1024; // 10MB

            $uploadRes = secureUploadFile(
                $_FILES['receipt'],
                $allowedMimes,
                $maxSize,
                __DIR__ . '/../../uploads/expenses/' . date('Y/m/'),
                'exp',
                'uploads/expenses/' . date('Y/m/')
            );

            if (!$uploadRes['success']) {
                sendError($uploadRes['message'], 400);
            }
            $receiptPath = $uploadRes['relative_path'];
        }

        $pdo->beginTransaction();

        // Generate unique ticket number: REQ-YYYYMM-XXXX
        $prefix = 'REQ-' . date('Ym') . '-';
        $stmtLatest = $pdo->prepare("SELECT ticket_number FROM expense_requests WHERE ticket_number LIKE ? ORDER BY id DESC LIMIT 1");
        $stmtLatest->execute([$prefix . '%']);
        $latest = $stmtLatest->fetchColumn();

        if ($latest) {
            $lastNum = (int)substr($latest, -4);
            $newNum = str_pad($lastNum + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNum = '0001';
        }
        $ticketNumber = $prefix . $newNum;

        // Insert expense request
        $stmtInsert = $pdo->prepare("
            INSERT INTO expense_requests 
            (`ticket_number`, `created_by`, `title`, `category`, `amount`, `description`, `receipt_doc_path`, `status`)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_pm')
        ");
        $stmtInsert->execute([
            $ticketNumber,
            $user['id'],
            $title,
            $category,
            $finalAmount,
            $description,
            $receiptPath
        ]);
        $newId = (int)$pdo->lastInsertId();

        // Insert items into `expense_request_items`
        if (!empty($cleanItems)) {
            $stmtItemIns = $pdo->prepare("
                INSERT INTO expense_request_items 
                (`expense_request_id`, `item_name`, `qty`, `unit`, `unit_price`, `total_price`, `notes`)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            foreach ($cleanItems as $ci) {
                $stmtItemIns->execute([
                    $newId,
                    $ci['item_name'],
                    $ci['qty'],
                    $ci['unit'],
                    $ci['unit_price'],
                    $ci['total_price'],
                    $ci['notes']
                ]);
            }
        }

        // Notify active PMs
        $pmStmt = $pdo->query("SELECT id FROM users WHERE role_id = 6 AND status = 'active'");
        $pmIds = $pmStmt->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($pmIds)) {
            $notifStmt = $pdo->prepare("
                INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
                VALUES (?, 'Pengajuan Biaya Baru', ?, 'info', 'expense', ?)
            ");
            $notifMsg = "Tiket #$ticketNumber: Pengajuan biaya Rp " . number_format($finalAmount, 0, ',', '.') . " (" . count($cleanItems) . " item) menunggu persetujuan PM.";
            foreach ($pmIds as $pmId) {
                $notifStmt->execute([$pmId, $notifMsg, $newId]);
            }
        }

        // Audit Log
        recordAuditLog($user['id'], 'CREATE_EXPENSE_REQUEST', 'EXPENSE', (string)$newId, "Created expense ticket $ticketNumber for Rp " . number_format($finalAmount, 0) . " with " . count($cleanItems) . " items");

        $pdo->commit();

        sendSuccess([
            'id' => $newId,
            'ticket_number' => $ticketNumber,
            'title' => $title,
            'amount' => $finalAmount,
            'total_items' => count($cleanItems),
            'status' => 'pending_pm'
        ], 'Tiket pengajuan biaya beserta rincian item berhasil dibuat dan dikirim ke PM.', null, 201);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendError('Gagal membuat tiket pengajuan biaya: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Method not allowed.', 405);
}
