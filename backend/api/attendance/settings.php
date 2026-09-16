<?php
// ==========================================================
// MGI ERP / HRIS - Attendance Settings API
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

$user = requireRole([2, 7]); // HRGA or Admin
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM attendance_settings WHERE is_active = 1 LIMIT 1");
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $pdo->query("SELECT id, name, address, latitude, longitude, radius, radius_unit, is_active FROM attendance_locations WHERE is_active = 1 LIMIT 1");
        $location = $stmt->fetch(PDO::FETCH_ASSOC);

        sendSuccess(['settings' => $settings, 'location' => $location], 'Settings retrieved.');
    } 
    else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $checkIn = $input['check_in_time'] ?? null;
        $checkOut = $input['check_out_time'] ?? null;
        $breakStart = $input['break_start_time'] ?? null;
        $breakEnd = $input['break_end_time'] ?? null;
        $name = $input['name'] ?? null;
        $address = $input['address'] ?? null;
        $lat = $input['latitude'] ?? null;
        $lng = $input['longitude'] ?? null;
        $radius = $input['radius'] ?? null;
        $radiusUnit = $input['radius_unit'] ?? 'meter';

        if (!$checkIn || !$checkOut || !$breakStart || !$breakEnd || $lat === null || $lng === null || $radius === null || !$name) {
            sendError('Semua field wajib diisi, termasuk jam masuk, jam keluar, dan jam istirahat.', 400);
        }
        
        if (!is_numeric($radius) || (int)$radius <= 0) {
            sendError('Radius must be a positive number.', 400);
        }

        $pdo->beginTransaction();

        try {
            // Get old states for audit logging
            $stmtOldSett = $pdo->query("SELECT * FROM attendance_settings WHERE is_active = 1 LIMIT 1");
            $oldSettings = $stmtOldSett->fetch(PDO::FETCH_ASSOC);

            $stmtOldLoc = $pdo->query("SELECT * FROM attendance_locations WHERE is_active = 1 LIMIT 1");
            $oldLocation = $stmtOldLoc->fetch(PDO::FETCH_ASSOC);

            // Update Settings
            $stmt = $pdo->prepare("UPDATE attendance_settings SET check_in_time = ?, check_out_time = ?, break_start_time = ?, break_end_time = ? WHERE is_active = 1");
            $stmt->execute([$checkIn, $checkOut, $breakStart, $breakEnd]);

            // Update Location
            if ($oldLocation) {
                $stmt = $pdo->prepare("UPDATE attendance_locations SET name = ?, address = ?, latitude = ?, longitude = ?, radius = ?, radius_unit = ?, updated_by = ? WHERE is_active = 1");
                $stmt->execute([$name, $address, $lat, $lng, $radius, $radiusUnit, $user['id']]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO attendance_locations (name, address, latitude, longitude, radius, radius_unit, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, 1, ?)");
                $stmt->execute([$name, $address, $lat, $lng, $radius, $radiusUnit, $user['id']]);
            }

            // Create Audit Log
            $logData = [
                'old_settings' => $oldSettings,
                'new_settings' => [
                    'check_in_time' => $checkIn,
                    'check_out_time' => $checkOut,
                    'break_start_time' => $breakStart,
                    'break_end_time' => $breakEnd,
                ],
                'old_location' => $oldLocation,
                'new_location' => [
                    'name' => $name,
                    'address' => $address,
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'radius' => $radius,
                    'radius_unit' => $radiusUnit
                ]
            ];
            $stmtLog = $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, target_id, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmtLog->execute([
                $user['id'],
                'UPDATE',
                'Attendance Settings',
                'attendance_settings',
                json_encode($logData),
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);

            $pdo->commit();
            sendSuccess(null, 'Settings updated successfully.');
        } catch (Exception $ex) {
            $pdo->rollBack();
            throw $ex;
        }
    }
    else {
        sendError('Method not allowed.', 405);
    }
} catch (Exception $e) {
    sendError('Failed to process settings: ' . $e->getMessage(), 500);
}
