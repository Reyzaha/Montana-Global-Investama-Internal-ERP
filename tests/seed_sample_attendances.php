<?php
require_once __DIR__ . '/../backend/config/database.php';
$pdo = getDbConnection();

$users = $pdo->query("SELECT id, email FROM users")->fetchAll(PDO::FETCH_ASSOC);
$stmt = $pdo->prepare("
    INSERT INTO attendances (user_id, date, check_in, break_start, break_end, check_out, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?) 
    ON DUPLICATE KEY UPDATE check_in=VALUES(check_in), break_start=VALUES(break_start), break_end=VALUES(break_end), check_out=VALUES(check_out), status=VALUES(status)
");

$days = [
    '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04',
    '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11',
    '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
    '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25',
    '2026-09-28', '2026-09-29'
];

foreach ($users as $u) {
    $uid = $u['id'];
    foreach ($days as $idx => $d) {
        if ($u['email'] === 'montanaglobalinvestamait@gmail.com' || $uid == 2) {
            // IT: Check in 07:30 - 08:00, Break 12:00 - 13:00, Check out 17:00 - 17:10
            if ($d === '2026-09-29') {
                $stmt->execute([$uid, $d, '07:59:00', null, null, null, 'on_time']);
            } else {
                $inMin = 30 + (($idx * 7 + 3) % 30);
                $inSec = ($idx * 17 + 11) % 60;
                $inTime = sprintf('07:%02d:%02d', $inMin, $inSec);

                $outMin = ($idx * 3 + 2) % 11;
                $outSec = ($outMin == 10) ? 0 : (($idx * 13 + 7) % 60);
                $outTime = sprintf('17:%02d:%02d', $outMin, $outSec);

                $stmt->execute([$uid, $d, $inTime, '12:00:00', '13:00:00', $outTime, 'on_time']);
            }
        } elseif ($uid == 4 && $idx % 4 == 1) {
            // HRGA late
            $stmt->execute([$uid, $d, '08:24:15', '12:05:00', '13:00:00', '17:15:30', 'late']);
        } elseif ($uid == 3 && $idx == 6) {
            // Legal absent
            $stmt->execute([$uid, $d, null, null, null, null, 'absent']);
        } elseif ($uid == 5 && $idx % 3 == 0) {
            // OM late
            $stmt->execute([$uid, $d, '08:18:40', '12:00:00', '13:02:00', '17:45:00', 'late']);
        } else {
            // On time
            $min = str_pad((string)(40 + ($idx % 18)), 2, '0', STR_PAD_LEFT);
            $sec = str_pad((string)(10 + ($idx % 48)), 2, '0', STR_PAD_LEFT);
            $stmt->execute([$uid, $d, '07:' . $min . ':' . $sec, '12:00:00', '13:00:00', '17:05:00', 'on_time']);
        }
    }
}
echo 'Berhasil men-generate sample absensi untuk ' . count($users) . ' karyawan.' . PHP_EOL;
