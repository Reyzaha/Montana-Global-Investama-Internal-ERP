<?php
// ==========================================================
// MGI ERP / HRIS - Delete IT Email API
// Method: POST / DELETE /backend/api/it/emails/delete.php
// ==========================================================

require_once __DIR__ . '/../../../helpers/response.php';
require_once __DIR__ . '/../../../helpers/auth.php';
require_once __DIR__ . '/../../../helpers/audit.php';
require_once __DIR__ . '/../../../config/database.php';

$currentUser = requireRole([1, 7]);

$input = getJsonInput();
$id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);

if ($id <= 0) {
    sendError('ID email tidak valid.', 400);
}

try {
    $pdo = getDbConnection();

    $stmtFind = $pdo->prepare("SELECT email_address FROM `it_emails` WHERE `id` = :id LIMIT 1");
    $stmtFind->execute([':id' => $id]);
    $email = $stmtFind->fetch(PDO::FETCH_ASSOC);

    if (!$email) {
        sendError('Data email tidak ditemukan.', 404);
    }

    $stmtDelete = $pdo->prepare("DELETE FROM `it_emails` WHERE `id` = :id");
    $stmtDelete->execute([':id' => $id]);

    recordAuditLog(
        $currentUser['id'],
        'DELETE_EMAIL',
        'IT',
        (string)$id,
        "Deleted IT Email: {$email['email_address']}"
    );

    sendSuccess(null, 'Data email berhasil dihapus');
} catch (Exception $e) {
    sendError('Gagal menghapus data email: ' . $e->getMessage(), 500);
}
