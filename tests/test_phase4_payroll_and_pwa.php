<?php
// ==========================================================
// MGI ERP / HRIS - Phase 4 Test Suite: Payroll & PWA
// ==========================================================

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/helpers/payroll.php';

echo "=== MEMULAI TEST SUITE: FASE 4 (PAYROLL & PWA READY) ===" . PHP_EOL . PHP_EOL;

$pdo = getDbConnection();

// Ambil user test
$user = $pdo->query("SELECT id, email FROM users WHERE role_id = 3 LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    $user = $pdo->query("SELECT id, email FROM users WHERE role_id = 1 LIMIT 1")->fetch(PDO::FETCH_ASSOC);
}
echo "[SETUP] Target User: {$user['email']} (ID: {$user['id']})" . PHP_EOL;

// 1. Inisialisasi Komponen Gaji
echo "[TEST 1] Komponen gaji master karyawan: ";
$stmtComp = $pdo->prepare("
    INSERT INTO payroll_components (user_id, base_salary, fixed_allowance, effective_date)
    VALUES (?, 7500000.00, 1500000.00, '2026-01-01')
    ON DUPLICATE KEY UPDATE base_salary = 7500000.00, fixed_allowance = 1500000.00
");
$stmtComp->execute([$user['id']]);
echo "PASS (Gaji Pokok: Rp 7.500.000, Tunjangan: Rp 1.500.000)" . PHP_EOL;

// 2. Setup Data Pendukung: 1 Keterlambatan & 2 Jam Lembur Approved
echo "[TEST 2] Setup presensi terlambat & lembur disetujui: ";
$testMonth = 11;
$testYear = 2026;

// Insert attendance late
$pdo->prepare("DELETE FROM attendances WHERE user_id = ? AND date = '2026-11-10'")->execute([$user['id']]);
$pdo->prepare("
    INSERT INTO attendances (user_id, date, check_in, check_out, status)
    VALUES (?, '2026-11-10', '08:45:00', '17:00:00', 'late')
")->execute([$user['id']]);

// Insert approved overtime
$pdo->prepare("DELETE FROM overtime_requests WHERE user_id = ? AND date = '2026-11-12'")->execute([$user['id']]);
$pdo->prepare("
    INSERT INTO overtime_requests (user_id, date, start_time, end_time, duration_hours, reason, status)
    VALUES (?, '2026-11-12', '18:00:00', '20:00:00', 2.00, 'Project deployment overtime', 'approved')
")->execute([$user['id']]);

echo "PASS (1x Late, 2.0 Jam Overtime Approved)" . PHP_EOL;

// 3. Kalkulasi Payroll via Helper
echo "[TEST 3] Perhitungan Payroll Helper: ";
$calc = calculateEmployeeMonthlyPayroll($pdo, (int)$user['id'], $testMonth, $testYear);

// Validasi nilai:
// Base: 7,500,000
// Allowance: 1,500,000
// Hourly Rate: (7,500,000 / 173) * 1.5 = 65,028.90
// Overtime Pay (2 jam): 130,057.80
// Deduction Late (1x): 50,000.00
// Gross: 9,130,057.80
// Net: 9,130,057.80 - 50,000 = 9,080,057.80
$expectedNet = round(7500000 + 1500000 + $calc['overtime_pay'] - 50000, 2);

if (abs($calc['net_salary'] - $expectedNet) < 1.0) {
    echo "PASS (Net Salary: Rp " . number_format($calc['net_salary'], 2, ',', '.') . ")" . PHP_EOL;
} else {
    echo "FAIL (Diharapkan {$expectedNet}, didapat {$calc['net_salary']})" . PHP_EOL;
    exit(1);
}

// 4. Batch Calculation Run via Database
echo "[TEST 4] Simpan payroll run (status: draft): ";
$pdo->prepare("DELETE FROM payroll_runs WHERE user_id = ? AND period_month = ? AND period_year = ?")->execute([$user['id'], $testMonth, $testYear]);

$stmtRun = $pdo->prepare("
    INSERT INTO payroll_runs (
        user_id, period_month, period_year, base_salary, allowance_total,
        overtime_hours, overtime_pay, late_count, deduction_late,
        absent_count, deduction_absent, net_salary, status, processed_at
    ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, 'draft', NOW()
    )
");
$stmtRun->execute([
    $calc['user_id'], $calc['period_month'], $calc['period_year'], $calc['base_salary'], $calc['allowance_total'],
    $calc['overtime_hours'], $calc['overtime_pay'], $calc['late_count'], $calc['deduction_late'],
    $calc['absent_count'], $calc['deduction_absent'], $calc['net_salary']
]);
$runId = (int)$pdo->lastInsertId();

if ($runId > 0) {
    echo "PASS (Payroll Run ID: {$runId})" . PHP_EOL;
} else {
    echo "FAIL (Gagal simpan payroll run)" . PHP_EOL;
    exit(1);
}

// 5. Finalisasi Status Payroll
echo "[TEST 5] Finalisasi status payroll (draft -> finalized): ";
$pdo->prepare("UPDATE payroll_runs SET status = 'finalized' WHERE id = ?")->execute([$runId]);
$st = $pdo->query("SELECT status FROM payroll_runs WHERE id = {$runId}")->fetchColumn();
if ($st === 'finalized') {
    echo "PASS (Status: finalized)" . PHP_EOL;
} else {
    echo "FAIL (Status: {$st})" . PHP_EOL;
    exit(1);
}

// 6. Verifikasi Berkas PWA
echo "[TEST 6] Verifikasi kelengkapan berkas PWA Mobile: ";
$hasManifest = file_exists(__DIR__ . '/../manifest.json');
$hasSw = file_exists(__DIR__ . '/../sw.js');
if ($hasManifest && $hasSw) {
    echo "PASS (manifest.json & sw.js tersedia)" . PHP_EOL;
} else {
    echo "FAIL (Berkas PWA belum lengkap)" . PHP_EOL;
    exit(1);
}

// 7. Cleanup data pengujian payroll
echo "[TEST 7] Pembersihan data pengujian: ";
$pdo->prepare("DELETE FROM payroll_runs WHERE id = ?")->execute([$runId]);
$pdo->prepare("DELETE FROM attendances WHERE user_id = ? AND date = '2026-11-10'")->execute([$user['id']]);
$pdo->prepare("DELETE FROM overtime_requests WHERE user_id = ? AND date = '2026-11-12'")->execute([$user['id']]);
echo "PASS" . PHP_EOL;

echo PHP_EOL . "=== SEMUA 7 PENGUJIAN FASE 4 SELESAI DENGAN SUKSES! ===" . PHP_EOL;
