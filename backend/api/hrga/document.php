<?php
// ==========================================================
// File: backend/api/hrga/document.php
// Get HRGA documents (KTP, KK, Ijazah) inline
// ==========================================================
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

$user = requireAuth();

// Only HRGA/Admin or the user themselves can view these docs
$id = $_GET['id'] ?? null;
$type = $_GET['type'] ?? null; // ktp, kk, ijazah

if (!$id || !$type) {
    http_response_code(400);
    exit('Missing parameters');
}

if ($id != $user['id'] && !in_array($user['role_id'], [2, 7])) {
    http_response_code(403);
    exit('Forbidden');
}

$validTypes = ['ktp', 'kk', 'ijazah'];
if (!in_array($type, $validTypes)) {
    http_response_code(400);
    exit('Invalid type');
}

try {
    $pdo = getDbConnection();
    $column = $type . '_doc_path';
    $stmt = $pdo->prepare("SELECT $column as doc_path FROM user_profiles WHERE user_id = :id");
    $stmt->execute([':id' => $id]);
    $profile = $stmt->fetch();
    
    if (!$profile || empty($profile['doc_path'])) {
        http_response_code(404);
        exit('Document not found');
    }
    
    $path = __DIR__ . '/../../storage/' . $profile['doc_path'];
    
    if (file_exists($path)) {
        $mime = mime_content_type($path);
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($path));
        // Force download for PDF to avoid browser bugs with inline sometimes, but inline for images is fine
        if ($mime === 'application/pdf') {
            header('Content-Disposition: inline; filename="' . basename($path) . '"');
        }
        readfile($path);
        exit;
    } else {
        http_response_code(404);
        exit('File missing on disk');
    }
} catch (Exception $e) {
    http_response_code(500);
    exit('Internal Server Error');
}
