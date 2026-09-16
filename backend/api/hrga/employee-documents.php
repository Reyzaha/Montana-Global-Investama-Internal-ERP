<?php
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../config/database.php';

$user = requireRole([2, 7]);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Metode tidak diizinkan.', 405);
}

$id = $_POST['user_id'] ?? null;
$docType = $_POST['doc_type'] ?? null; // ktp, kk, ijazah, photo

if (!$id || !$docType) {
    sendError('Parameter tidak lengkap.', 400);
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    sendError('File tidak valid atau tidak ada.', 400);
}

$file = $_FILES['file'];
$maxSize = 10 * 1024 * 1024; // 10MB

if ($file['size'] > $maxSize) {
    sendError('Ukuran file maksimal 10MB.', 400);
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedMimes = [];
if ($docType === 'photo') {
    $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
} else {
    $allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
}

if (!in_array($mime, $allowedMimes)) {
    sendError('Format file tidak didukung.', 400);
}

$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = "{$docType}_{$id}_" . time() . '.' . $ext;

$uploadDir = __DIR__ . '/../../storage/employees/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
    // Create .htaccess to deny access
    file_put_contents($uploadDir . '.htaccess', "Require all denied\n");
}

$destPath = $uploadDir . $filename;

if (move_uploaded_file($file['tmp_name'], $destPath)) {
    try {
        $pdo = getDbConnection();
        $dbPath = 'employees/' . $filename;
        
        $column = '';
        if ($docType === 'ktp') $column = 'ktp_doc_path';
        else if ($docType === 'kk') $column = 'kk_doc_path';
        else if ($docType === 'ijazah') $column = 'ijazah_doc_path';
        else if ($docType === 'photo') $column = 'photo_path';
        
        // Ensure profile exists
        $stmt = $pdo->prepare("SELECT user_id FROM user_profiles WHERE user_id = :id");
        $stmt->execute([':id' => $id]);
        if (!$stmt->fetch()) {
            $pdo->prepare("INSERT INTO user_profiles (user_id, name) VALUES (:id, '')")->execute([':id' => $id]);
        }
        
        if ($docType === 'photo') {
            $sql = "UPDATE user_profiles SET $column = :path, photo_mime = :mime, photo_size = :size WHERE user_id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':path' => $dbPath, ':mime' => $mime, ':size' => $file['size'], ':id' => $id]);
        } else {
            $sql = "UPDATE user_profiles SET $column = :path WHERE user_id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':path' => $dbPath, ':id' => $id]);
        }
        
        recordAuditLog($user['id'], 'EMPLOYEE_DOCUMENT_UPLOADED', 'EMPLOYEE', $id, "HRGA uploaded $docType");
        
        sendSuccess(['path' => $dbPath], "Dokumen $docType berhasil diunggah.");
    } catch (Exception $e) {
        unlink($destPath); // Clean up if db fails
        sendError('Database error: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Gagal memindahkan file yang diunggah.', 500);
}
