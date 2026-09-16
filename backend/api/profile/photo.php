<?php
// ==========================================================
// File: backend/api/profile/photo.php
// Get profile photo inline
// ==========================================================
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

$user = requireAuth();
$id = $_GET['id'] ?? $user['id']; // Default to own photo if no ID provided

// If trying to access someone else's photo, must be HRGA or Admin
if ($id != $user['id'] && !in_array($user['role_id'], [2, 7])) {
    http_response_code(403);
    exit('Forbidden');
}

try {
    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT photo_path, photo_mime FROM user_profiles WHERE user_id = :id");
    $stmt->execute([':id' => $id]);
    $profile = $stmt->fetch();
    
    function outputFallbackAvatar() {
        header('Content-Type: image/svg+xml');
        echo '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128"><circle cx="64" cy="64" r="64" fill="#0f2042"/><circle cx="64" cy="46" r="24" fill="#f8fafc"/><path d="M22 108c0-24 18-38 42-38s42 14 42 38" fill="#f8fafc"/></svg>';
        exit;
    }

    if (!$profile || empty($profile['photo_path'])) {
        outputFallbackAvatar();
    }
    
    $path = __DIR__ . '/../../storage/' . $profile['photo_path'];
    
    if (file_exists($path)) {
        header('Content-Type: ' . $profile['photo_mime']);
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit;
    } else {
        outputFallbackAvatar();
    }
} catch (Exception $e) {
    http_response_code(500);
    exit('Internal Server Error');
}
