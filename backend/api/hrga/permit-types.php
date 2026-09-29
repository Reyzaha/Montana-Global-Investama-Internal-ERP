<?php
// ==========================================================
// MGI ERP / HRIS - HRGA Permit Types (Label Utama: Izin, Sakit, Cuti) API
// Method: GET, POST
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Validasi Session Authentication
    $user = requireAuth();

    try {
        $status = $_GET['status'] ?? 'active'; // 'active', 'all'
        
        $where = [];
        if ($status === 'active') {
            $where[] = "`is_active` = 1";
        }
        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                pt.`id`, 
                pt.`code`, 
                pt.`name`, 
                pt.`description`, 
                pt.`requires_attachment`, 
                pt.`is_active`, 
                pt.`created_at`,
                (SELECT COUNT(*) FROM `permit_sub_types` WHERE `category_id` = pt.`id`) AS total_sub_types,
                (SELECT COUNT(*) FROM `permits` WHERE `permit_type_id` = pt.`id`) AS total_permits
            FROM `permit_types` pt
            {$whereClause}
            GROUP BY pt.`name`
            ORDER BY pt.`id` ASC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $permitTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($permitTypes as &$pt) {
            $pt['requires_attachment'] = (bool)$pt['requires_attachment'];
            $pt['is_active'] = (bool)$pt['is_active'];
            $pt['total_sub_types'] = (int)$pt['total_sub_types'];
            $pt['total_permits'] = (int)$pt['total_permits'];
        }
        unset($pt);

        sendSuccess($permitTypes, 'Permit types retrieved successfully.');
    } catch (Exception $e) {
        sendError('Gagal mengambil data tipe permit: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    // Hanya HRGA (2) dan Admin (7) yang diizinkan mengelola kategori permit
    $user = requireRole([2, 7]);

    try {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $input['action'] ?? 'create';

        if ($action === 'create' || $action === 'update') {
            $id = (int)($input['id'] ?? 0);
            $name = trim($input['name'] ?? '');
            $code = strtolower(trim($input['code'] ?? ''));
            $description = trim($input['description'] ?? '');
            $requiresAttachment = !empty($input['requires_attachment']) ? 1 : 0;
            $isActive = isset($input['is_active']) ? (!empty($input['is_active']) ? 1 : 0) : 1;

            if (empty($name)) {
                sendError('Nama kategori / label utama permit wajib diisi.', 400);
            }

            // Generate code jika kosong
            if (empty($code)) {
                $code = preg_replace('/[^a-z0-9]+/', '_', strtolower($name));
                $code = trim($code, '_');
            }

            if ($action === 'create') {
                // Cek keunikan code
                $stmtCheck = $pdo->prepare("SELECT id FROM `permit_types` WHERE `code` = ?");
                $stmtCheck->execute([$code]);
                if ($stmtCheck->fetchColumn()) {
                    // Tambahkan suffix acak jika duplikat
                    $code .= '_' . substr(md5(uniqid()), 0, 4);
                }

                $stmtInsert = $pdo->prepare("
                    INSERT INTO `permit_types` (`code`, `name`, `description`, `requires_attachment`, `is_active`)
                    VALUES (?, ?, ?, ?, ?)
                ");
                $stmtInsert->execute([$code, $name, $description, $requiresAttachment, $isActive]);
                $newId = (int)$pdo->lastInsertId();

                recordAuditLog(
                    $user['id'],
                    'CREATE_PERMIT_TYPE',
                    'PERMIT_CONFIG',
                    (string)$newId,
                    "Menambahkan kategori utama permit baru: '{$name}' (Kode: {$code})"
                );

                sendSuccess(['id' => $newId, 'code' => $code], 'Kategori permit berhasil ditambahkan.', null, 201);
            } else {
                if ($id <= 0) {
                    sendError('ID kategori permit tidak valid untuk diperbarui.', 400);
                }

                // Cek keunikan code untuk record lain
                $stmtCheck = $pdo->prepare("SELECT id FROM `permit_types` WHERE `code` = ? AND `id` != ?");
                $stmtCheck->execute([$code, $id]);
                if ($stmtCheck->fetchColumn()) {
                    sendError("Kode '{$code}' sudah digunakan oleh kategori permit lain.", 400);
                }

                $stmtUpdate = $pdo->prepare("
                    UPDATE `permit_types` 
                    SET `code` = ?, `name` = ?, `description` = ?, `requires_attachment` = ?
                    WHERE `id` = ?
                ");
                $stmtUpdate->execute([$code, $name, $description, $requiresAttachment, $id]);

                recordAuditLog(
                    $user['id'],
                    'UPDATE_PERMIT_TYPE',
                    'PERMIT_CONFIG',
                    (string)$id,
                    "Memperbarui kategori utama permit ID {$id}: '{$name}' (Kode: {$code})"
                );

                sendSuccess(['id' => $id, 'code' => $code], 'Kategori permit berhasil diperbarui.');
            }
        } elseif ($action === 'toggle_status') {
            $id = (int)($input['id'] ?? 0);
            $isActive = !empty($input['is_active']) ? 1 : 0;

            if ($id <= 0) {
                sendError('ID kategori permit tidak valid.', 400);
            }

            $stmtToggle = $pdo->prepare("UPDATE `permit_types` SET `is_active` = ? WHERE `id` = ?");
            $stmtToggle->execute([$isActive, $id]);

            recordAuditLog(
                $user['id'],
                'TOGGLE_PERMIT_TYPE',
                'PERMIT_CONFIG',
                (string)$id,
                "Mengubah status keaktifan kategori permit ID {$id} menjadi " . ($isActive ? 'AKTIF' : 'NONAKTIF')
            );

            sendSuccess(['id' => $id, 'is_active' => $isActive], 'Status kategori permit berhasil diubah.');
        } elseif ($action === 'delete') {
            $id = (int)($input['id'] ?? 0);

            if ($id <= 0) {
                sendError('ID kategori permit tidak valid.', 400);
            }

            $stmtCheck = $pdo->prepare("SELECT id, name FROM `permit_types` WHERE id = ?");
            $stmtCheck->execute([$id]);
            $type = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            if (!$type) {
                sendError('Kategori permit tidak ditemukan.', 404);
            }

            // Cek apakah ada sub-jenis izin di bawah kategori ini
            $stmtSubCount = $pdo->prepare("SELECT COUNT(*) FROM `permit_sub_types` WHERE `category_id` = ?");
            $stmtSubCount->execute([$id]);
            $subCount = (int)$stmtSubCount->fetchColumn();

            // Cek apakah pernah diajukan dalam riwayat permits
            $stmtPermitCount = $pdo->prepare("SELECT COUNT(*) FROM `permits` WHERE `permit_type_id` = ?");
            $stmtPermitCount->execute([$id]);
            $permitCount = (int)$stmtPermitCount->fetchColumn();

            if ($subCount > 0 || $permitCount > 0) {
                // Nonaktifkan / arsipkan agar integritas data tidak rusak
                $stmtDeactivate = $pdo->prepare("UPDATE `permit_types` SET `is_active` = 0 WHERE `id` = ?");
                $stmtDeactivate->execute([$id]);

                recordAuditLog(
                    $user['id'],
                    'ARCHIVE_PERMIT_TYPE',
                    'PERMIT_CONFIG',
                    (string)$id,
                    "Menonaktifkan kategori ID {$id} ('{$type['name']}') karena memiliki {$subCount} sub-jenis dan {$permitCount} riwayat pengajuan permit."
                );

                sendSuccess([
                    'id' => $id,
                    'archived' => true,
                    'sub_count' => $subCount,
                    'permit_count' => $permitCount
                ], "Kategori '{$type['name']}' memiliki {$subCount} sub-jenis dan {$permitCount} riwayat pengajuan permit, sehingga statusnya otomatis dinonaktifkan (diarsipkan) agar integritas data tetap aman.");
            } else {
                $stmtDel = $pdo->prepare("DELETE FROM `permit_types` WHERE `id` = ?");
                $stmtDel->execute([$id]);

                recordAuditLog(
                    $user['id'],
                    'DELETE_PERMIT_TYPE',
                    'PERMIT_CONFIG',
                    (string)$id,
                    "Menghapus permanen kategori permit ID {$id}: '{$type['name']}'"
                );

                sendSuccess([
                    'id' => $id,
                    'deleted' => true
                ], "Kategori permit '{$type['name']}' berhasil dihapus permanen.");
            }
        } else {
            sendError('Aksi request tidak dikenali.', 400);
        }
    } catch (Exception $e) {
        sendError('Gagal memproses kategori permit: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Metode request tidak diizinkan.', 405);
}
