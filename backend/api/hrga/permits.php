<?php
// ==========================================================
// MGI ERP / HRIS - GET & POST Permits API
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../helpers/upload.php';
require_once __DIR__ . '/../../helpers/leave.php';

$user = requireAuth();
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // List Permits
    try {
        $status = $_GET['status'] ?? null;
        $permit_type_id = $_GET['permit_type_id'] ?? null;
        $start_date = $_GET['start_date'] ?? null;
        $end_date = $_GET['end_date'] ?? null;
        $search = $_GET['search'] ?? null;

        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, (int)($_GET['limit'] ?? 20));
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];

        // Role-based visibility
        // HRGA = 2, PM = 6
        if (!in_array($user['role_id'], [2, 6])) {
            $where[] = "p.user_id = :user_id";
            $params[':user_id'] = $user['id'];
        }

        if ($status) {
            $where[] = "p.status = :status";
            $params[':status'] = $status;
        }

        if ($permit_type_id) {
            $where[] = "p.permit_type_id = :permit_type_id";
            $params[':permit_type_id'] = $permit_type_id;
        }
        
        if ($start_date && $end_date) {
            $where[] = "(p.start_date <= :end_date AND p.end_date >= :start_date)";
            $params[':start_date'] = $start_date;
            $params[':end_date'] = $end_date;
        }

        if ($search) {
            $where[] = "(u.email LIKE :search OR pt.name LIKE :search)";
            $params[':search'] = "%$search%";
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        // Get total
        $countSql = "SELECT COUNT(*) FROM permits p 
                     JOIN users u ON p.user_id = u.id 
                     JOIN permit_types pt ON p.permit_type_id = pt.id 
                     $whereClause";
        $stmtCount = $pdo->prepare($countSql);
        $stmtCount->execute($params);
        $total = $stmtCount->fetchColumn();

        // Get Data
        $sql = "SELECT p.id, p.user_id, u.email as employee_email, pt.name as permit_type_name, 
                p.permit_sub_type_id, pst.name as permit_sub_type_name,
                p.start_date, p.end_date, p.description, p.status, p.created_at,
                (SELECT COUNT(*) FROM permit_attachments WHERE permit_id = p.id) as has_attachment
                FROM permits p
                JOIN users u ON p.user_id = u.id
                JOIN permit_types pt ON p.permit_type_id = pt.id
                LEFT JOIN permit_sub_types pst ON p.permit_sub_type_id = pst.id
                $whereClause
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset";
                
        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendSuccess($data, 'Permits retrieved.', [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'total_pages' => ceil($total / $limit)
        ]);

    } catch (Exception $e) {
        sendError('Failed to fetch permits: ' . $e->getMessage(), 500);
    }

} elseif ($method === 'POST') {
    // Create Permit
    try {
        $permit_type_id = $_POST['permit_type_id'] ?? null;
        $permit_sub_type_id = !empty($_POST['permit_sub_type_id']) ? (int)$_POST['permit_sub_type_id'] : null;
        $start_date = $_POST['start_date'] ?? null;
        $end_date = $_POST['end_date'] ?? null;
        $description = $_POST['description'] ?? null;

        $errors = [];
        if (!$permit_type_id) $errors['permit_type_id'] = 'Permit Type is required.';
        if (!$start_date) $errors['start_date'] = 'Start Date is required.';
        if (!$end_date) $errors['end_date'] = 'End Date is required.';
        if (!$description) $errors['description'] = 'Description is required.';
        
        if (!empty($errors)) {
            sendValidationError($errors, 'Validation error');
        }

        // Check if permit type requires attachment
        $stmt = $pdo->prepare("SELECT id, code, name, requires_attachment FROM permit_types WHERE id = ? AND is_active = 1");
        $stmt->execute([$permit_type_id]);
        $permitType = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$permitType) {
            sendError('Invalid or inactive permit type.', 400);
        }

        $durationDays = calculatePermitDays($start_date, $end_date);
        if ($durationDays <= 0) {
            sendError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.', 400);
        }

        $hasFile = isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK;

        // Validasi Sub-Tipe Izin jika dipilih
        if ($permit_sub_type_id) {
            $stmtSub = $pdo->prepare("SELECT * FROM permit_sub_types WHERE id = ? AND category_id = ? AND is_active = 1");
            $stmtSub->execute([$permit_sub_type_id, $permit_type_id]);
            $subType = $stmtSub->fetch(PDO::FETCH_ASSOC);

            if (!$subType) {
                sendError('Sub-tipe izin tidak valid atau tidak cocok dengan kategori yang dipilih.', 400);
            }

            // Validasi Gender Restriction
            if ($subType['gender_restriction'] !== 'any') {
                $stmtProfile = $pdo->prepare("SELECT gender FROM user_profiles WHERE user_id = ?");
                $stmtProfile->execute([$user['id']]);
                $userGender = strtoupper(trim((string)$stmtProfile->fetchColumn()));

                if ($subType['gender_restriction'] === 'female' && $userGender !== 'PEREMPUAN') {
                    sendError("Sub-izin '{$subType['name']}' khusus diperuntukkan bagi karyawan perempuan.", 400);
                }
                if ($subType['gender_restriction'] === 'male' && $userGender !== 'LAKI-LAKI') {
                    sendError("Sub-izin '{$subType['name']}' khusus diperuntukkan bagi karyawan laki-laki.", 400);
                }
            }

            // Validasi Wajib Lampiran Sub-Tipe
            if ($subType['requires_attachment'] && !$hasFile) {
                $attLabel = !empty($subType['attachment_label']) ? $subType['attachment_label'] : 'Surat Pendukung';
                sendError("Sub-izin '{$subType['name']}' mewajibkan unggah dokumen: {$attLabel}.", 400);
            }

            // Validasi Kuota Durasi Maksimal Sub-Tipe
            if ($subType['quota_days'] !== null && (float)$subType['quota_days'] > 0) {
                if ($durationDays > (float)$subType['quota_days']) {
                    sendError("Maksimal durasi pengajuan untuk '{$subType['name']}' adalah {$subType['quota_days']} hari.", 400);
                }
            }
        }

        // Jika pengajuan cuti tahunan, validasi kuota tersisa
        if (strtolower($permitType['code']) === 'cuti') {
            $year = (int)date('Y', strtotime($start_date));
            $balance = getOrCreateLeaveBalance($pdo, (int)$user['id'], (int)$permitType['id'], $year);

            if ($durationDays > $balance['remaining_days']) {
                sendError("Sisa kuota cuti Anda untuk tahun {$year} adalah {$balance['remaining_days']} hari. Anda mengajukan {$durationDays} hari.", 400, [
                    'remaining_days' => $balance['remaining_days'],
                    'requested_days' => $durationDays
                ]);
            }
        }

        if ($permitType['requires_attachment'] && !$hasFile) {
            sendError("Attachment is required for {$permitType['name']}.", 400);
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("INSERT INTO permits (user_id, permit_type_id, permit_sub_type_id, start_date, end_date, description, status) VALUES (?, ?, ?, ?, ?, ?, 'pending_hrga')");
        $stmt->execute([$user['id'], $permit_type_id, $permit_sub_type_id, $start_date, $end_date, $description]);
        $permitId = $pdo->lastInsertId();

        if ($hasFile) {
            $allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
            $maxSize = 5 * 1024 * 1024; // 5MB

            $uploadRes = secureUploadFile(
                $_FILES['attachment'],
                $allowedMimes,
                $maxSize,
                __DIR__ . '/../../uploads/permits/' . date('Y/m/'),
                'permit_' . $permitId,
                'uploads/permits/' . date('Y/m/')
            );

            if (!$uploadRes['success']) {
                $pdo->rollBack();
                sendError($uploadRes['message'], 400);
            }

            $stmt = $pdo->prepare("INSERT INTO permit_attachments (permit_id, original_name, stored_name, file_path, mime_type, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $permitId,
                $uploadRes['original_name'],
                $uploadRes['stored_name'],
                $uploadRes['relative_path'],
                $uploadRes['mime_type'],
                $uploadRes['file_size'],
                $user['id']
            ]);
        }

        recordAuditLog($user['id'], 'CREATE_PERMIT', 'PERMIT', $permitId, "Created permit request {$permitType['name']}");

        $pdo->commit();
        sendSuccess(['permit_id' => $permitId], 'Permit submitted successfully.');

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendError('Failed to submit permit: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Method not allowed.', 405);
}
