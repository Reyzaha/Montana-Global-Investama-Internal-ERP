<?php
// ==========================================================
// MGI ERP / HRIS - Secure File Upload Helper
// ==========================================================

/**
 * Validate and safely store an uploaded file with magic-bytes detection
 *
 * @param array $file The $_FILES['input_name'] array
 * @param array $allowedMimes Array of permitted MIME types (e.g. ['image/jpeg', 'image/png', 'application/pdf'])
 * @param int $maxBytes Maximum allowed file size in bytes
 * @param string $destinationDir Full absolute directory path on server
 * @param string $prefix Prefix for stored random filename
 * @param string $relativeDirPrefix Relative path for database storage (e.g. 'uploads/expenses/2026/09/')
 * @return array Result array with status, paths, or error message
 */
function secureUploadFile(
    array $file,
    array $allowedMimes,
    int $maxBytes,
    string $destinationDir,
    string $prefix = 'file',
    string $relativeDirPrefix = ''
): array {
    // 1. Basic PHP upload error check
    if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
        $errorCode = $file['error'] ?? UPLOAD_ERR_NO_FILE;
        return [
            'success' => false,
            'message' => getUploadErrorMessage($errorCode),
            'code' => 'UPLOAD_ERROR'
        ];
    }

    // 2. Validate file size
    if ($file['size'] <= 0 || $file['size'] > $maxBytes) {
        $maxMb = round($maxBytes / (1024 * 1024), 1);
        return [
            'success' => false,
            'message' => "Ukuran file ({$file['size']} bytes) melebihi batas maksimum {$maxMb}MB.",
            'code' => 'FILE_TOO_LARGE'
        ];
    }

    // 3. Reject double extensions and dangerous executable names
    $originalName = basename($file['name'] ?? 'file');
    $dangerousExtensions = [
        'php', 'php3', 'php4', 'php5', 'phtml', 'phar', 'exe', 'bat', 'sh', 
        'cmd', 'cgi', 'pl', 'py', 'js', 'jar', 'vbs', 'scr', 'msi', 'com', 'htc'
    ];
    
    // Split all parts by dot
    $parts = explode('.', strtolower($originalName));
    if (count($parts) > 1) {
        foreach ($parts as $part) {
            if (in_array(trim($part), $dangerousExtensions, true)) {
                return [
                    'success' => false,
                    'message' => 'Berkas terindikasi mengandung ekstensi berbahaya atau format skrip ganda.',
                    'code' => 'DANGEROUS_FILE_EXTENSION'
                ];
            }
        }
    }

    // 4. Magic-Bytes MIME Type Inspection (Server-side inspection via finfo)
    if (!file_exists($file['tmp_name']) || !is_readable($file['tmp_name'])) {
        return [
            'success' => false,
            'message' => 'Berkas sementara tidak dapat dibaca di server.',
            'code' => 'TMP_FILE_UNREADABLE'
        ];
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $detectedMime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!$detectedMime || !in_array($detectedMime, $allowedMimes, true)) {
        $allowedList = implode(', ', array_map(function($m) {
            return explode('/', $m)[1] ?? $m;
        }, $allowedMimes));
        return [
            'success' => false,
            'message' => "Format berkas ($detectedMime) tidak diizinkan. Tipe yang diizinkan: $allowedList.",
            'code' => 'INVALID_MIME_TYPE'
        ];
    }

    // 5. Map detected MIME to canonical extension
    $mimeToExt = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'application/pdf' => 'pdf',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.ms-excel' => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
    ];

    $extension = $mimeToExt[$detectedMime] ?? strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    // 6. Generate cryptographically random, collision-resistant filename
    $randomHex = bin2hex(random_bytes(8));
    $timestamp = date('Ymd_His');
    $storedName = "{$prefix}_{$timestamp}_{$randomHex}.{$extension}";

    // 7. Ensure directory exists with secure permissions
    $destinationDir = rtrim($destinationDir, '/\\') . DIRECTORY_SEPARATOR;
    if (!is_dir($destinationDir)) {
        if (!mkdir($destinationDir, 0755, true)) {
            return [
                'success' => false,
                'message' => 'Gagal membuat direktori penyimpanan berkas di server.',
                'code' => 'DIR_CREATE_FAILED'
            ];
        }
    }

    $destPath = $destinationDir . $storedName;

    // 8. Move uploaded file (supports HTTP uploads and CLI/test environments)
    $moved = false;
    if (is_uploaded_file($file['tmp_name'])) {
        $moved = move_uploaded_file($file['tmp_name'], $destPath);
    } else {
        $moved = @rename($file['tmp_name'], $destPath) || @copy($file['tmp_name'], $destPath);
    }

    if (!$moved) {
        return [
            'success' => false,
            'message' => 'Gagal memindahkan berkas yang diunggah ke media penyimpanan.',
            'code' => 'MOVE_FAILED'
        ];
    }

    $cleanRelativeDir = rtrim(str_replace('\\', '/', $relativeDirPrefix), '/');
    $relativePath = (!empty($cleanRelativeDir) ? $cleanRelativeDir . '/' : '') . $storedName;

    return [
        'success' => true,
        'original_name' => $originalName,
        'stored_name' => $storedName,
        'file_path' => $destPath,
        'relative_path' => $relativePath,
        'mime_type' => $detectedMime,
        'file_size' => (int)$file['size'],
        'extension' => $extension
    ];
}

/**
 * Human-readable error message for PHP upload errors
 */
function getUploadErrorMessage(int $code): string {
    switch ($code) {
        case UPLOAD_ERR_INI_SIZE:
            return 'Ukuran berkas melebihi batas upload_max_filesize di php.ini.';
        case UPLOAD_ERR_FORM_SIZE:
            return 'Ukuran berkas melebihi batas MAX_FILE_SIZE formulir.';
        case UPLOAD_ERR_PARTIAL:
            return 'Berkas hanya terunggah sebagian (koneksi terputus).';
        case UPLOAD_ERR_NO_FILE:
            return 'Tidak ada berkas yang dipilih untuk diunggah.';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Folder sementara (temporary folder) tidak ditemukan di server.';
        case UPLOAD_ERR_CANT_WRITE:
            return 'Gagal menulis berkas ke penyimpanan disk server.';
        case UPLOAD_ERR_EXTENSION:
            return 'Unggahan berkas dihentikan oleh ekstensi PHP.';
        default:
            return 'Terjadi kesalahan tidak dikenal saat mengunggah berkas.';
    }
}
