<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../config/database.php';

$user = requireRole([2, 7]); // HRGA or Admin

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$id = $_GET['id'] ?? null;

if (!$id) {
    sendError('ID Employee tidak diberikan.', 400);
}

if ($method === 'GET') {
    handleGet($id);
} else if ($method === 'PATCH') {
    handlePatch($id, $user);
} else {
    sendError('Metode tidak diizinkan.', 405);
}

function handleGet($id) {
    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare("SELECT u.id, u.email, u.status, p.* 
                               FROM users u 
                               LEFT JOIN user_profiles p ON u.id = p.user_id 
                               WHERE u.id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$employee) {
            sendError('Employee tidak ditemukan.', 404);
        }

        // Return empty structure if no profile yet
        if (empty($employee['name'])) {
             $employee = array_merge($employee, [
                'name' => '', 'gender' => null, 'birth_place' => '', 'birth_date' => null,
                'address' => '', 'phone' => '', 'marital_status' => null, 'dependents' => 0,
                'education' => null, 'major' => '', 'school' => '', 'position' => '',
                'join_date' => null, 'ktp_no' => '', 'kk_no' => '',
                'ktp_doc_path' => null, 'kk_doc_path' => null, 'ijazah_doc_path' => null,
                'photo_path' => null
             ]);
        }

        sendSuccess($employee);
    } catch (Exception $e) {
        sendError('Gagal mengambil detail employee.', 500);
    }
}

function handlePatch($id, $user) {
    try {
        $input = getJsonInput();
        $pdo = getDbConnection();
        
        $pdo->beginTransaction();
        
        // Cek apakah profile sudah ada
        $stmt = $pdo->prepare("SELECT user_id FROM user_profiles WHERE user_id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $exists = $stmt->fetch();
        
        if ($exists) {
            $sql = "UPDATE user_profiles SET 
                    name = :name, gender = :gender, birth_place = :birth_place, birth_date = :birth_date,
                    address = :address, phone = :phone, marital_status = :marital_status, dependents = :dependents,
                    education = :education, major = :major, school = :school, position = :position,
                    join_date = :join_date, ktp_no = :ktp_no, kk_no = :kk_no
                    WHERE user_id = :id";
        } else {
            $sql = "INSERT INTO user_profiles 
                    (user_id, name, gender, birth_place, birth_date, address, phone, marital_status, dependents, education, major, school, position, join_date, ktp_no, kk_no) 
                    VALUES (:id, :name, :gender, :birth_place, :birth_date, :address, :phone, :marital_status, :dependents, :education, :major, :school, :position, :join_date, :ktp_no, :kk_no)";
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $id,
            ':name' => $input['name'] ?? '',
            ':gender' => empty($input['gender']) ? null : $input['gender'],
            ':birth_place' => $input['birth_place'] ?? '',
            ':birth_date' => empty($input['birth_date']) ? null : $input['birth_date'],
            ':address' => $input['address'] ?? '',
            ':phone' => $input['phone'] ?? '',
            ':marital_status' => empty($input['marital_status']) ? null : $input['marital_status'],
            ':dependents' => (int)($input['dependents'] ?? 0),
            ':education' => empty($input['education']) ? null : $input['education'],
            ':major' => $input['major'] ?? '',
            ':school' => $input['school'] ?? '',
            ':position' => $input['position'] ?? '',
            ':join_date' => empty($input['join_date']) ? null : $input['join_date'],
            ':ktp_no' => $input['ktp_no'] ?? '',
            ':kk_no' => $input['kk_no'] ?? ''
        ]);
        
        recordAuditLog($user['id'], 'EMPLOYEE_UPDATED', 'EMPLOYEE', $id, "HRGA updated master data for employee $id");
        
        $pdo->commit();
        sendSuccess(null, 'Data employee berhasil disimpan.');
    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendError('Gagal menyimpan data employee: ' . $e->getMessage(), 500);
    }
}
