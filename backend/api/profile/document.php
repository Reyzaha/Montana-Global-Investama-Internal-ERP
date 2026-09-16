<?php
// ==========================================================
// File: backend/api/profile/document.php
// View/Stream Employee Documents (KTP, KK, Ijazah)
// ==========================================================
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

$user = requireAuth();
$id = isset($_GET['id']) ? (int)$_GET['id'] : $user['id'];
$type = $_GET['type'] ?? ''; // ktp, kk, ijazah

if (!in_array($type, ['ktp', 'kk', 'ijazah'])) {
    sendError('Jenis dokumen tidak valid.', 400);
}

// Access check: only HRGA (role 2), Admin (role 7), or the employee themselves can view
if ($id !== $user['id'] && !in_array($user['role_id'], [2, 7])) {
    http_response_code(403);
    exit('Forbidden: Anda tidak memiliki akses ke dokumen ini.');
}

try {
    $pdo = getDbConnection();
    $column = "{$type}_doc_path";
    $stmt = $pdo->prepare("SELECT `$column` FROM user_profiles WHERE user_id = :id");
    $stmt->execute([':id' => $id]);
    $docPath = $stmt->fetchColumn();

    if (!$docPath) {
        sendError('Dokumen belum diunggah.', 404);
    }

    $fullPath = __DIR__ . '/../../storage/' . $docPath;

    if (!file_exists($fullPath)) {
        sendError('File dokumen fisik tidak ditemukan di server.', 404);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $fullPath);
    finfo_close($finfo);

    $ext = pathinfo($fullPath, PATHINFO_EXTENSION);
    $filename = "{$type}_user_{$id}.{$ext}";

    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . filesize($fullPath));
    header('Content-Disposition: inline; filename="' . $filename . '"');
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: public');

    readfile($fullPath);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    exit('Internal Server Error: ' . $e->getMessage());
}
