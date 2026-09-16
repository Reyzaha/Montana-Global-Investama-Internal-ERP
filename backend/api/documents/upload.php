<?php
// ==========================================================
// MGI ERP - Upload Legal Document
// ==========================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';

// Allow 25MB max size
define('MAX_FILE_SIZE', 25 * 1024 * 1024); 
$allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Check Method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

try {
    // 1. Authenticate and require Legal Role (Role ID = 3)
    $user = requireRole(3);
    
    // 2. Validate input fields
    $name = $_POST['name'] ?? '';
    $category = $_POST['category'] ?? '';
    $description = $_POST['description'] ?? null;
    $reference_number = $_POST['reference_number'] ?? null;
    $expiry_date = $_POST['expiry_date'] ?? null;
    
    if (empty($name) || empty($category)) {
        sendError('Name and category are required.');
    }
    
    // 3. File check
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        sendError('Valid file upload is required.');
    }
    
    $file = $_FILES['file'];
    $fileSize = $file['size'];
    
    if ($fileSize > MAX_FILE_SIZE) {
        sendError('FILE_TOO_LARGE. Maximum allowed size is 25MB.');
    }
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, $allowedMimeTypes)) {
        sendError('Invalid file type.');
    }
    
    // File details
    $originalName = basename($file['name']);
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $checksum = hash_file('sha256', $file['tmp_name']);
    
    // Check duplicates? For now just rely on storage
    $pdo = getDbConnection();
    
    // Check if checksum already exists in db to avoid duplicate storage, but the prompt says 
    // "Jika file identik sudah tersedia, pertimbangkan untuk menggunakan storage reference yang sama daripada menyimpan binary dua kali. 
    // Namun jangan menghapus document metadata yang berbeda hanya karena file binary-nya sama."
    
    $stmt = $pdo->prepare("SELECT storage_path, stored_file_name FROM documents WHERE checksum = :checksum AND status = 'ACTIVE' LIMIT 1");
    $stmt->execute([':checksum' => $checksum]);
    $existingFile = $stmt->fetch();
    
    if ($existingFile) {
        $storedName = $existingFile['stored_file_name'];
        $storagePath = $existingFile['storage_path'];
    } else {
        // Generate new name and path
        $uuid = uniqid('DOC-', true) . '-' . substr($checksum, 0, 8);
        $storedName = $uuid . '.' . $extension;
        $storageDir = __DIR__ . '/../../storage/documents';
        
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0755, true);
        }
        
        $storagePath = realpath($storageDir) . DIRECTORY_SEPARATOR . $storedName;
        
        if (!move_uploaded_file($file['tmp_name'], $storagePath)) {
            sendError('Failed to store physical file.');
        }
    }
    
    $docId = uniqid('doc_');
    
    // Insert DB
    $stmt = $pdo->prepare("
        INSERT INTO `documents` 
        (`id`, `name`, `original_file_name`, `stored_file_name`, `file_extension`, `mime_type`, `file_size`, `storage_path`, `checksum`, `description`, `category`, `reference_number`, `expiry_date`, `uploaded_by`)
        VALUES 
        (:id, :name, :orig, :stored, :ext, :mime, :size, :path, :checksum, :desc, :cat, :ref, :expiry, :uploader)
    ");
    
    $stmt->execute([
        ':id' => $docId,
        ':name' => $name,
        ':orig' => $originalName,
        ':stored' => $storedName,
        ':ext' => $extension,
        ':mime' => $mimeType,
        ':size' => $fileSize,
        ':path' => str_replace('\\', '/', substr($storagePath, strlen(realpath(__DIR__ . '/../../../storage/')))), // Store relative to storage dir
        ':checksum' => $checksum,
        ':desc' => $description,
        ':cat' => $category,
        ':ref' => $reference_number ?: null,
        ':expiry' => $expiry_date ?: null,
        ':uploader' => $user['id']
    ]);
    
    // Log audit
    recordAuditLog($user['id'], 'DOCUMENT_UPLOADED', 'LEGAL', $docId, "Uploaded document: $name");
    
    sendSuccess([
        'id' => $docId,
        'name' => $name,
        'category' => $category,
        'mime_type' => $mimeType,
        'file_size' => $fileSize
    ], 'Document uploaded successfully.');

} catch (Exception $e) {
    sendError('Internal Server Error: ' . $e->getMessage(), 500);
}
