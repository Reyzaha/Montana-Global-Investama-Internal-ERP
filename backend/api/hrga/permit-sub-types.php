<?php
// ==========================================================
// MGI ERP / HRIS - HRGA Permit Sub-Types API
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
        $categoryId = isset($_GET['category_id']) ? (int)$_GET['category_id'] : 0;
        $gender = trim($_GET['gender'] ?? '');
        $status = $_GET['status'] ?? 'active'; // 'active', 'all'

        $where = [];
        $params = [];

        if ($categoryId > 0) {
            $where[] = "pst.category_id = :cat_id";
            $params[':cat_id'] = $categoryId;
        }

        if ($status === 'active') {
            $where[] = "pst.is_active = 1";
        }

        if (!empty($gender) && in_array($gender, ['male', 'female'])) {
            $where[] = "(pst.gender_restriction = 'any' OR pst.gender_restriction = :gender)";
            $params[':gender'] = $gender;
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                pst.id,
                pst.category_id,
                pt.name as category_name,
                pt.code as category_code,
                pst.name,
                pst.description,
                pst.requires_attachment,
                pst.attachment_label,
                pst.quota_days,
                pst.quota_period,
                pst.carry_over_max_days,
                pst.gender_restriction,
                pst.is_paid,
                pst.requires_approval_step,
                pst.is_active,
                pst.created_at
            FROM `permit_sub_types` pst
            JOIN `permit_types` pt ON pst.category_id = pt.id
            $whereClause
            ORDER BY pst.category_id ASC, pst.is_active DESC, pst.name ASC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        sendSuccess($items, 'Daftar sub-tipe izin berhasil diambil.');
    } catch (Exception $e) {
        sendError('Gagal mengambil daftar sub-tipe izin: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    // Only HRGA (2) and Admin (7) can manage sub-types
    $user = requireRole([2, 7]);

    try {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $input['action'] ?? 'create';

        if ($action === 'create' || $action === 'update') {
            $id = (int)($input['id'] ?? 0);
            $categoryId = (int)($input['category_id'] ?? 0);
            $name = trim($input['name'] ?? '');
            $description = trim($input['description'] ?? '');
            $requiresAttachment = !empty($input['requires_attachment']) ? 1 : 0;
            $attachmentLabel = trim($input['attachment_label'] ?? '');
            $quotaDays = isset($input['quota_days']) && $input['quota_days'] !== '' ? (float)$input['quota_days'] : null;
            $quotaPeriod = trim($input['quota_period'] ?? 'per_year');
            $carryOverMaxDays = isset($input['carry_over_max_days']) ? (float)$input['carry_over_max_days'] : 0.0;
            $genderRestriction = trim($input['gender_restriction'] ?? 'any');
            $isPaid = isset($input['is_paid']) ? (!empty($input['is_paid']) ? 1 : 0) : 1;
            $approvalStep = (int)($input['requires_approval_step'] ?? 2);

            if ($categoryId <= 0 || empty($name)) {
                sendError('Kategori utama dan nama sub-izin wajib diisi.', 400);
            }

            if (!in_array($quotaPeriod, ['per_year', 'per_event', 'lifetime', 'unlimited'])) {
                $quotaPeriod = 'per_year';
            }

            if (!in_array($genderRestriction, ['any', 'male', 'female'])) {
                $genderRestriction = 'any';
            }

            if ($action === 'create') {
                $stmtInsert = $pdo->prepare("
                    INSERT INTO `permit_sub_types` (
                        `category_id`, `name`, `description`, `requires_attachment`, `attachment_label`,
                        `quota_days`, `quota_period`, `carry_over_max_days`, `gender_restriction`,
                        `is_paid`, `requires_approval_step`, `is_active`
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, 1
                    )
                ");
                $stmtInsert->execute([
                    $categoryId, $name, $description, $requiresAttachment, $attachmentLabel,
                    $quotaDays, $quotaPeriod, $carryOverMaxDays, $genderRestriction,
                    $isPaid, $approvalStep
                ]);
                $newId = (int)$pdo->lastInsertId();

                recordAuditLog(
                    $user['id'],
                    'CREATE_PERMIT_SUB_TYPE',
                    'PERMIT_CONFIG',
                    (string)$newId,
                    "Menambahkan sub-izin baru: '{$name}' pada kategori ID {$categoryId}"
                );

                sendSuccess(['id' => $newId], 'Sub-izin berhasil ditambahkan.', null, 201);
            } else {
                if ($id <= 0) {
                    sendError('ID sub-izin tidak valid untuk update.', 400);
                }

                $stmtUpdate = $pdo->prepare("
                    UPDATE `permit_sub_types` SET
                        `category_id` = ?,
                        `name` = ?,
                        `description` = ?,
                        `requires_attachment` = ?,
                        `attachment_label` = ?,
                        `quota_days` = ?,
                        `quota_period` = ?,
                        `carry_over_max_days` = ?,
                        `gender_restriction` = ?,
                        `is_paid` = ?,
                        `requires_approval_step` = ?
                    WHERE `id` = ?
                ");
                $stmtUpdate->execute([
                    $categoryId, $name, $description, $requiresAttachment, $attachmentLabel,
                    $quotaDays, $quotaPeriod, $carryOverMaxDays, $genderRestriction,
                    $isPaid, $approvalStep, $id
                ]);

                recordAuditLog(
                    $user['id'],
                    'UPDATE_PERMIT_SUB_TYPE',
                    'PERMIT_CONFIG',
                    (string)$id,
                    "Memperbarui sub-izin ID {$id}: '{$name}'"
                );

                sendSuccess(['id' => $id], 'Sub-izin berhasil diperbarui.');
            }
        } elseif ($action === 'toggle_status') {
            $id = (int)($input['id'] ?? 0);
            $isActive = !empty($input['is_active']) ? 1 : 0;

            if ($id <= 0) {
                sendError('ID sub-izin tidak valid.', 400);
            }

            $stmtToggle = $pdo->prepare("UPDATE `permit_sub_types` SET `is_active` = ? WHERE `id` = ?");
            $stmtToggle->execute([$isActive, $id]);

            recordAuditLog(
                $user['id'],
                'TOGGLE_PERMIT_SUB_TYPE',
                'PERMIT_CONFIG',
                (string)$id,
                "Mengubah status aktif sub-izin ID {$id} menjadi " . ($isActive ? 'AKTIF' : 'NONAKTIF')
            );

            sendSuccess(['id' => $id, 'is_active' => $isActive], 'Status sub-izin berhasil diubah.');
        } elseif ($action === 'delete') {
            $id = (int)($input['id'] ?? 0);

            if ($id <= 0) {
                sendError('ID sub-izin tidak valid.', 400);
            }

            $stmtCheck = $pdo->prepare("SELECT id, name FROM `permit_sub_types` WHERE id = ?");
            $stmtCheck->execute([$id]);
            $subType = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            if (!$subType) {
                sendError('Sub-izin tidak ditemukan.', 404);
            }

            // Cek apakah sudah pernah digunakan pada riwayat pengajuan permit
            $stmtUsage = $pdo->prepare("SELECT COUNT(*) FROM `permits` WHERE `permit_sub_type_id` = ?");
            $stmtUsage->execute([$id]);
            $usageCount = (int)$stmtUsage->fetchColumn();

            if ($usageCount > 0) {
                // Nonaktifkan agar tidak merusak relasi data riwayat permit lama
                $stmtDeactivate = $pdo->prepare("UPDATE `permit_sub_types` SET `is_active` = 0 WHERE `id` = ?");
                $stmtDeactivate->execute([$id]);

                recordAuditLog(
                    $user['id'],
                    'ARCHIVE_PERMIT_SUB_TYPE',
                    'PERMIT_CONFIG',
                    (string)$id,
                    "Menonaktifkan sub-izin ID {$id} ('{$subType['name']}') karena memiliki {$usageCount} riwayat pengajuan permit."
                );

                sendSuccess([
                    'id' => $id,
                    'archived' => true,
                    'usage_count' => $usageCount
                ], "Sub-izin '{$subType['name']}' memiliki {$usageCount} riwayat permit, sehingga otomatis dinonaktifkan (diarsipkan).");
            } else {
                $stmtDel = $pdo->prepare("DELETE FROM `permit_sub_types` WHERE `id` = ?");
                $stmtDel->execute([$id]);

                recordAuditLog(
                    $user['id'],
                    'DELETE_PERMIT_SUB_TYPE',
                    'PERMIT_CONFIG',
                    (string)$id,
                    "Menghapus permanen sub-izin ID {$id}: '{$subType['name']}'"
                );

                sendSuccess([
                    'id' => $id,
                    'deleted' => true
                ], "Sub-izin '{$subType['name']}' berhasil dihapus permanen.");
            }
        } else {
            sendError('Aksi request tidak dikenali.', 400);
        }
    } catch (Exception $e) {
        sendError('Gagal memproses sub-izin: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Metode request tidak diizinkan.', 405);
}
