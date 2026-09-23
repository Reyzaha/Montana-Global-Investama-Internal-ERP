<?php
// ==========================================================
// MGI ERP / HRIS - Attendance Check-In API
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
$accuracy = $input['accuracy'] ?? null;
$bypassLocation = $input['bypass_location'] ?? false; // Only for local testing

if (!$bypassLocation && ($lat === null || $lng === null)) {
    sendError('Latitude and longitude are required.', 400);
}

if (!$bypassLocation && $accuracy !== null && (float)$accuracy > 500) {
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

    // Get Active Settings
    $stmt = $pdo->query("SELECT check_in_time, check_out_time FROM attendance_settings WHERE is_active = 1 LIMIT 1");
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$settings) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'code' => 'ATTENDANCE_LOCATION_NOT_CONFIGURED',
            'message' => 'Attendance settings not configured.'
        ]);
        exit();
    }

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

    // Check if already checked in
    $stmt = $pdo->prepare("SELECT id, check_in FROM attendances WHERE user_id = ? AND date = ?");
    $stmt->execute([$user['id'], $today]);
    $attendance = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($attendance && $attendance['check_in']) {
        sendError('Anda sudah melakukan check-in hari ini.', 400);
    }

    // Determine status
    $status = ($currentTime > $settings['check_in_time']) ? 'late' : 'on_time';

    // Apply custom rule for montanaglobalinvestamait@gmail.com
    if ($user['email'] === 'montanaglobalinvestamait@gmail.com') {
        $status = 'on_time';
    }
    if ($attendance) {
        // Update existing record
        $stmt = $pdo->prepare("UPDATE attendances SET check_in = ?, check_in_latitude = ?, check_in_longitude = ?, check_in_accuracy = ?, check_in_distance = ?, status = ? WHERE id = ?");
        $stmt->execute([$currentTime, $lat, $lng, $accuracy, $distance, $status, $attendance['id']]);
    } else {
        // Insert new record
        $stmt = $pdo->prepare("INSERT INTO attendances (user_id, date, check_in, check_in_latitude, check_in_longitude, check_in_accuracy, check_in_distance, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$user['id'], $today, $currentTime, $lat, $lng, $accuracy, $distance, $status]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Check in berhasil',
        'data' => [
            'type' => 'check_in',
            'time' => $currentTime,
            'status' => $status,
            'distance' => round($distance),
            'radius' => $location['radius']
        ]
    ]);
    exit();

} catch (Exception $e) {
    sendError('Check-in failed: ' . $e->getMessage(), 500);
}
