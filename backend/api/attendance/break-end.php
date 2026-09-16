<?php
// ==========================================================
// MGI ERP / HRIS - Attendance Break End (Selesai Istirahat) API
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/location.php';

$user = requireAuth();
$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}

// Receive payload
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$lat = $input['latitude'] ?? null;
$lng = $input['longitude'] ?? null;
$accuracy = $input['accuracy'] ?? 9999;
$bypassLocation = $input['bypass_location'] ?? false;

if (!$bypassLocation && ($lat === null || $lng === null)) {
    sendError('Latitude and longitude are required.', 400);
}

// Accuracy Check (unless bypassed)
if (!$bypassLocation && (float)$accuracy > 500) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'code' => 'LOCATION_ACCURACY_LOW',
        'message' => 'Lokasi Anda kurang akurat. Pastikan GPS aktif dan berada di area terbuka, lalu coba kembali.',
        'data' => ['accuracy' => $accuracy]
    ]);
    exit();
}

try {
    $today = date('Y-m-d');
    $currentTime = date('H:i:s');

    // Get Active Location
    $stmt = $pdo->query("SELECT latitude, longitude, radius FROM attendance_locations WHERE is_active = 1 LIMIT 1");
    $location = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$location) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'code' => 'ATTENDANCE_LOCATION_INACTIVE',
            'message' => 'Office location not configured or inactive.'
        ]);
        exit();
    }

    $distance = 0;
    if (!$bypassLocation) {
        $distance = calculateDistance((float)$lat, (float)$lng, (float)$location['latitude'], (float)$location['longitude']);
        if ($distance > $location['radius']) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'code' => 'OUTSIDE_ATTENDANCE_RADIUS',
                'message' => 'Anda berada di luar radius absensi',
                'data' => [
                    'distance' => round($distance),
                    'allowed_radius' => $location['radius']
                ]
            ]);
            exit();
        }
    }

    // Check today's attendance record
    $stmt = $pdo->prepare("SELECT id, check_in, break_start, break_end, check_out FROM attendances WHERE user_id = ? AND date = ?");
    $stmt->execute([$user['id'], $today]);
    $attendance = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$attendance || !$attendance['check_in']) {
        sendError('Anda belum melakukan presensi masuk (Check In) hari ini.', 400);
    }

    if (!$attendance['break_start']) {
        sendError('Anda belum melakukan presensi awal istirahat hari ini.', 400);
    }

    if ($attendance['break_end']) {
        sendError('Anda sudah melakukan presensi selesai istirahat hari ini.', 400);
    }

    if ($attendance['check_out']) {
        sendError('Anda sudah melakukan presensi keluar (Check Out) hari ini.', 400);
    }

    // Update attendance record with break_end
    $stmt = $pdo->prepare("UPDATE attendances SET break_end = ?, break_end_latitude = ?, break_end_longitude = ?, break_end_accuracy = ?, break_end_distance = ? WHERE id = ?");
    $stmt->execute([$currentTime, $lat, $lng, $accuracy, $distance, $attendance['id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Presensi selesai istirahat berhasil',
        'data' => [
            'type' => 'break_end',
            'time' => $currentTime,
            'distance' => round($distance),
            'radius' => $location['radius']
        ]
    ]);
    exit();

} catch (Exception $e) {
    sendError('Presensi selesai istirahat gagal: ' . $e->getMessage(), 500);
}
