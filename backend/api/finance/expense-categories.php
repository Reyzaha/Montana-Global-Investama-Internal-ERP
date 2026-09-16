<?php
// ==========================================================
// MGI ERP / HRIS - Finance Expense Categories API
// Method: GET, POST
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';

$currentUser = requireAuth();
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $status = $_GET['status'] ?? 'active';
        $month = (int)($_GET['month'] ?? date('n'));
        $year = (int)($_GET['year'] ?? date('Y'));

        $where = [];
        if ($status === 'active') {
            $where[] = "ec.is_active = 1";
        }
        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                ec.id,
                ec.name,
                ec.code,
                ec.requires_pm_approval,
                ec.auto_approve_below_amount,
                ec.budget_limit_monthly,
                ec.default_gl_account_code,
                ec.is_active,
                ec.created_at,
                COALESCE((
                    SELECT SUM(er.estimated_amount) 
                    FROM expense_requests er 
                    WHERE er.category = ec.code 
                      AND er.status IN ('approved', 'pending_verification', 'completed')
                      AND MONTH(er.created_at) = :month 
                      AND YEAR(er.created_at) = :year
                ), 0.00) as current_month_spent
            FROM `expense_categories` ec
            $whereClause
            ORDER BY ec.is_active DESC, ec.name ASC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':month' => $month, ':year' => $year]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        sendSuccess([
            'period' => sprintf('%04d-%02d', $year, $month),
            'categories' => $items
        ], 'Daftar kategori pengeluaran berhasil diambil.');
    } catch (Exception $e) {
        sendError('Gagal mengambil kategori pengeluaran: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    // Finance (4), HRGA (2), Admin (7)
    $user = requireRole([2, 4, 7]);

    try {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $input['action'] ?? 'create';

        if ($action === 'create' || $action === 'update') {
            $id = (int)($input['id'] ?? 0);
            $name = trim($input['name'] ?? '');
            $code = strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '_', $input['code'] ?? '')));
            $requiresPmApproval = !empty($input['requires_pm_approval']) ? 1 : 0;
            $autoApproveBelow = isset($input['auto_approve_below_amount']) && $input['auto_approve_below_amount'] !== '' ? (float)$input['auto_approve_below_amount'] : null;
            $budgetLimit = isset($input['budget_limit_monthly']) && $input['budget_limit_monthly'] !== '' ? (float)$input['budget_limit_monthly'] : null;
            $glCode = trim($input['default_gl_account_code'] ?? '');

            if (empty($name)) {
                sendError('Nama kategori pengeluaran wajib diisi.', 400);
            }

            if ($action === 'create') {
                if (empty($code)) {
                    $code = strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '_', $name)));
                }

                $stmtInsert = $pdo->prepare("
                    INSERT INTO `expense_categories` (
                        `name`, `code`, `requires_pm_approval`, `auto_approve_below_amount`,
                        `budget_limit_monthly`, `default_gl_account_code`, `is_active`
                    ) VALUES (
                        ?, ?, ?, ?,
                        ?, ?, 1
                    )
                ");
                $stmtInsert->execute([
                    $name, $code, $requiresPmApproval, $autoApproveBelow,
                    $budgetLimit, $glCode
                ]);
                $newId = (int)$pdo->lastInsertId();

                recordAuditLog(
                    $user['id'],
                    'CREATE_EXPENSE_CATEGORY',
                    'FINANCE_CONFIG',
                    (string)$newId,
                    "Menambahkan kategori pengeluaran: '{$name}' (Kode: {$code})"
                );

                sendSuccess(['id' => $newId], 'Kategori pengeluaran berhasil ditambahkan.', null, 201);
            } else {
                if ($id <= 0) {
                    sendError('ID kategori tidak valid untuk update.', 400);
                }

                $stmtUpdate = $pdo->prepare("
                    UPDATE `expense_categories` SET
                        `name` = ?,
                        `requires_pm_approval` = ?,
                        `auto_approve_below_amount` = ?,
                        `budget_limit_monthly` = ?,
                        `default_gl_account_code` = ?
                    WHERE `id` = ?
                ");
                $stmtUpdate->execute([
                    $name, $requiresPmApproval, $autoApproveBelow,
                    $budgetLimit, $glCode, $id
                ]);

                recordAuditLog(
                    $user['id'],
                    'UPDATE_EXPENSE_CATEGORY',
                    'FINANCE_CONFIG',
                    (string)$id,
                    "Memperbarui kategori pengeluaran ID {$id}: '{$name}'"
                );

                sendSuccess(['id' => $id], 'Kategori pengeluaran berhasil diperbarui.');
            }
        } elseif ($action === 'toggle_status') {
            $id = (int)($input['id'] ?? 0);
            $isActive = !empty($input['is_active']) ? 1 : 0;

            if ($id <= 0) {
                sendError('ID kategori tidak valid.', 400);
            }

            $stmtToggle = $pdo->prepare("UPDATE `expense_categories` SET `is_active` = ? WHERE `id` = ?");
            $stmtToggle->execute([$isActive, $id]);

            recordAuditLog(
                $user['id'],
                'TOGGLE_EXPENSE_CATEGORY',
                'FINANCE_CONFIG',
                (string)$id,
                "Mengubah status aktif kategori pengeluaran ID {$id} menjadi " . ($isActive ? 'AKTIF' : 'NONAKTIF')
            );

            sendSuccess(['id' => $id, 'is_active' => $isActive], 'Status kategori berhasil diubah.');
        } else {
            sendError('Aksi request tidak dikenali.', 400);
        }
    } catch (Exception $e) {
        sendError('Gagal memproses kategori pengeluaran: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Metode request tidak diizinkan.', 405);
}
