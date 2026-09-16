<?php
// ==========================================================
// MGI ERP / HRIS - GET Permit Types API
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

// Validasi Session Authentication
$user = requireAuth();

try {
    $pdo = getDbConnection();
    
    // Ambil data permit_types
    $stmt = $pdo->prepare("SELECT `id`, `code`, `name`, `description`, `requires_attachment` FROM `permit_types` WHERE `is_active` = 1 ORDER BY `id` ASC");
    $stmt->execute();
    
    $permitTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format `requires_attachment` to boolean
    foreach ($permitTypes as &$pt) {
        $pt['requires_attachment'] = (bool)$pt['requires_attachment'];
    }
    
    sendSuccess($permitTypes, 'Permit types retrieved successfully.');

} catch (Exception $e) {
    sendError('Gagal mengambil data tipe permit: ' . $e->getMessage(), 500);
}
