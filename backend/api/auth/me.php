<?php
// ==========================================================
// MGI ERP / HRIS - Current Authenticated User API
// Method: GET /backend/api/auth/me.php
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

$user = getCurrentUser();

if (!$user) {
    sendError('Sesi tidak ditemukan atau telah kedaluwarsa.', 401);
}

sendSuccess([
    'user' => $user
], 'Informasi sesi user aktif');
