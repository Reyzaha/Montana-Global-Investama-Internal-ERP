<?php
// ==========================================================
// MGI ERP / HRIS - Employee Self Service: Leave Balance API
// Method: GET /backend/api/user/leave-balance.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/leave.php';

$user = requireAuth();
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

try {
    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
    
    // Ambil jenis permit cuti
    $stmtCuti = $pdo->query("SELECT id, name FROM `permit_types` WHERE `code` = 'cuti' LIMIT 1");
    $cutiType = $stmtCuti->fetch(PDO::FETCH_ASSOC);

    if (!$cutiType) {
        sendError('Jenis permit cuti belum dikonfigurasi di sistem.', 404);
    }

    $balance = getOrCreateLeaveBalance($pdo, (int)$user['id'], (int)$cutiType['id'], $year);

    // Ambil riwayat pemakaian cuti tahun ini
    $stmtHistory = $pdo->prepare("
        SELECT 
            p.id, p.start_date, p.end_date, p.description, p.status, p.created_at,
            DATEDIFF(p.end_date, p.start_date) + 1 AS duration_days
        FROM permits p
        WHERE p.user_id = ? 
          AND p.permit_type_id = ? 
          AND YEAR(p.start_date) = ?
        ORDER BY p.start_date DESC
    ");
    $stmtHistory->execute([$user['id'], $cutiType['id'], $year]);
    $history = $stmtHistory->fetchAll(PDO::FETCH_ASSOC);

    sendSuccess([
        'year' => $year,
        'permit_type' => $cutiType['name'],
        'quota_days' => $balance['quota_days'],
        'carried_over_days' => $balance['carried_over_days'],
        'used_days' => $balance['used_days'],
        'remaining_days' => $balance['remaining_days'],
        'history' => $history
    ], 'Informasi sisa kuota cuti berhasil diambil.');

} catch (Exception $e) {
    sendError('Gagal mengambil kuota cuti: ' . $e->getMessage(), 500);
}
