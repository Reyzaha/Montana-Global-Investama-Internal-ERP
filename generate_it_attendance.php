<?php
// ==========================================================
// MGI ERP - Generate/Update Attendance for IT User
// Target: montanaglobalinvestamait@gmail.com
// Schedule:
// - Check-in: 07:30 - 08:00
// - Break start: 12:00:00
// - Break end: 13:00:00
// - Check-out: 17:00 - 17:10
// - Status: on_time
// - Period: 2026-09-01 to 2026-09-29 (all workdays)
// ==========================================================

require_once __DIR__ . '/backend/config/database.php';
$pdo = getDbConnection();

// 1. Get user
$targetEmail = 'montanaglobalinvestamait@gmail.com';
$stmtUser = $pdo->prepare("SELECT id, email FROM users WHERE email = ?");
$stmtUser->execute([$targetEmail]);
$user = $stmtUser->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo "ERROR: User with email $targetEmail not found!\n";
    exit(1);
}

$userId = $user['id'];
echo "Found user: {$user['email']} (ID: {$userId})\n";

// 2. Define workdays from 2026-09-01 to 2026-09-29
$days = [
    '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04',
    '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11',
    '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
    '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25',
    '2026-09-28', '2026-09-29'
];

$stmtUpsert = $pdo->prepare("
    INSERT INTO attendances (
        user_id, date, check_in, break_start, break_end, check_out, status
    ) VALUES (
        :user_id, :date, :check_in, :break_start, :break_end, :check_out, :status
    )
    ON DUPLICATE KEY UPDATE 
        check_in = VALUES(check_in),
        break_start = VALUES(break_start),
        break_end = VALUES(break_end),
        check_out = VALUES(check_out),
        status = VALUES(status)
");

echo "\nProcessing attendance records:\n";
echo str_repeat('-', 75) . "\n";
printf("%-12s | %-10s | %-12s | %-12s | %-10s | %-8s\n", "Date", "Check In", "Break Start", "Break End", "Check Out", "Status");
echo str_repeat('-', 75) . "\n";

foreach ($days as $idx => $day) {
    // Generate realistic random times:
    // Check-in: between 07:30:00 and 08:00:00
    $inMinute = 30 + (($idx * 7 + 3) % 30); // 30 to 59
    $inSecond = ($idx * 17 + 11) % 60;      // 00 to 59
    $checkIn = sprintf('07:%02d:%02d', $inMinute, $inSecond);

    // Break start: 12:00
    $breakStart = '12:00:00';

    // Break end: 13:00
    $breakEnd = '13:00:00';

    // Check-out: between 17:00:00 and 17:10:00
    $outMinute = ($idx * 3 + 2) % 11; // 0 to 10
    $outSecond = ($outMinute == 10) ? 0 : (($idx * 13 + 7) % 60);
    $checkOut = sprintf('17:%02d:%02d', $outMinute, $outSecond);

    $status = 'on_time';

    $stmtUpsert->execute([
        ':user_id' => $userId,
        ':date' => $day,
        ':check_in' => $checkIn,
        ':break_start' => $breakStart,
        ':break_end' => $breakEnd,
        ':check_out' => $checkOut,
        ':status' => $status
    ]);

    printf("%-12s | %-10s | %-12s | %-12s | %-10s | %-8s\n", $day, $checkIn, $breakStart, $breakEnd, $checkOut, $status);
}

echo str_repeat('-', 75) . "\n";
echo "SUCCESS: " . count($days) . " attendance records processed for {$targetEmail}.\n";
