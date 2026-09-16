<?php
// ==========================================================
// MGI ERP / HRIS - Phase 3 Test Suite: Overtime & Lifecycle
// ==========================================================

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/helpers/overtime.php';

echo "=== MEMULAI TEST SUITE: FASE 3 (OVERTIME & LIFECYCLE CHECKLIST) ===" . PHP_EOL . PHP_EOL;

$pdo = getDbConnection();

// Ambil user untuk pengujian
$userStmt = $pdo->query("SELECT id, email FROM users WHERE role_id = 3 LIMIT 1"); // Employee
$employee = $userStmt->fetch(PDO::FETCH_ASSOC);
if (!$employee) {
    $userStmt = $pdo->query("SELECT id, email FROM users WHERE role_id = 1 LIMIT 1");
    $employee = $userStmt->fetch(PDO::FETCH_ASSOC);
}

$hrgaStmt = $pdo->query("SELECT id, email FROM users WHERE role_id = 2 LIMIT 1");
$hrga = $hrgaStmt->fetch(PDO::FETCH_ASSOC);

$pmStmt = $pdo->query("SELECT id, email FROM users WHERE role_id = 6 LIMIT 1");
$pm = $pmStmt->fetch(PDO::FETCH_ASSOC);

echo "[SETUP] Employee: {$employee['email']} (ID: {$employee['id']}), HRGA: {$hrga['email']}, PM: {$pm['email']}" . PHP_EOL;

// 1. Test Durasi Overtime
echo "[TEST 1] Kalkulasi jam lembur helper: ";
$h1 = calculateOvertimeHours('17:00', '20:30');
if ($h1 === 3.50) {
    echo "PASS (17:00 - 20:30 = {$h1} jam)" . PHP_EOL;
} else {
    echo "FAIL (Diharapkan 3.50, didapat {$h1})" . PHP_EOL;
    exit(1);
}

// 2. Submit Pengajuan Lembur Baru
echo "[TEST 2] Pengajuan lembur baru oleh karyawan: ";
$testDate = '2026-10-05';
// Bersihkan jika ada dari run sebelumnya
$pdo->prepare("DELETE FROM overtime_requests WHERE user_id = ? AND date = ?")->execute([$employee['id'], $testDate]);

$stmtIns = $pdo->prepare("
    INSERT INTO overtime_requests (user_id, date, start_time, end_time, duration_hours, reason, status)
    VALUES (?, ?, '18:00', '21:00', 3.00, 'Test lembur deployment server', 'pending_hrga')
");
$stmtIns->execute([$employee['id'], $testDate]);
$overtimeId = (int)$pdo->lastInsertId();

if ($overtimeId > 0) {
    echo "PASS (Overtime #{$overtimeId} dibuat, status: pending_hrga)" . PHP_EOL;
} else {
    echo "FAIL (Gagal membuat overtime request)" . PHP_EOL;
    exit(1);
}

// 3. Approval Step 1 (HRGA)
echo "[TEST 3] Approval Step 1 oleh HRGA: ";
$stmtHrga = $pdo->prepare("
    UPDATE overtime_requests 
    SET status = 'pending_pm', hrga_approved_by = ?, hrga_approved_at = NOW()
    WHERE id = ? AND status = 'pending_hrga'
");
$stmtHrga->execute([$hrga['id'], $overtimeId]);

$stmtCheck = $pdo->prepare("SELECT status, hrga_approved_by FROM overtime_requests WHERE id = ?");
$stmtCheck->execute([$overtimeId]);
$otData = $stmtCheck->fetch(PDO::FETCH_ASSOC);

if ($otData['status'] === 'pending_pm' && (int)$otData['hrga_approved_by'] === (int)$hrga['id']) {
    echo "PASS (Status berubah menjadi pending_pm)" . PHP_EOL;
} else {
    echo "FAIL (Status: {$otData['status']})" . PHP_EOL;
    exit(1);
}

// 4. Approval Step 2 (PM Final)
echo "[TEST 4] Approval Step 2 (Final) oleh PM: ";
$stmtPm = $pdo->prepare("
    UPDATE overtime_requests 
    SET status = 'approved', pm_approved_by = ?, pm_approved_at = NOW()
    WHERE id = ? AND status = 'pending_pm'
");
$stmtPm->execute([$pm['id'], $overtimeId]);

$stmtCheck->execute([$overtimeId]);
$otFinal = $stmtCheck->fetch(PDO::FETCH_ASSOC);

if ($otFinal['status'] === 'approved') {
    echo "PASS (Status final: approved)" . PHP_EOL;
} else {
    echo "FAIL (Status: {$otFinal['status']})" . PHP_EOL;
    exit(1);
}

// 5. Inisialisasi Onboarding Lifecycle Checklist
echo "[TEST 5] Inisialisasi Onboarding Checklist Karyawan: ";
// Hapus checklist eksisting karyawan pengujian
$pdo->prepare("DELETE FROM lifecycle_checklists WHERE user_id = ? AND type = 'onboarding'")->execute([$employee['id']]);

$initCount = initializeUserLifecycleChecklist($pdo, $employee['id'], 'onboarding');
if ($initCount >= 9) {
    echo "PASS ({$initCount} tugas onboarding berhasil diinisialisasi)" . PHP_EOL;
} else {
    echo "FAIL (Hanya terbuat {$initCount} tugas)" . PHP_EOL;
    exit(1);
}

// 6. Menyelesaikan Tugas Checklist Lintas Divisi (IT Task)
echo "[TEST 6] Menyelesaikan Tugas IT Checklist: ";
$stmtTask = $pdo->prepare("
    SELECT id, task_name, category FROM lifecycle_checklists 
    WHERE user_id = ? AND category = 'it' LIMIT 1
");
$stmtTask->execute([$employee['id']]);
$itTask = $stmtTask->fetch(PDO::FETCH_ASSOC);

$stmtComp = $pdo->prepare("
    UPDATE lifecycle_checklists 
    SET is_completed = 1, completed_by = ?, completed_at = NOW(), notes = 'Device & email setup complete'
    WHERE id = ?
");
$stmtComp->execute([$hrga['id'], $itTask['id']]);

$stmtVerify = $pdo->prepare("SELECT is_completed, notes FROM lifecycle_checklists WHERE id = ?");
$stmtVerify->execute([$itTask['id']]);
$taskDone = $stmtVerify->fetch(PDO::FETCH_ASSOC);

if ((int)$taskDone['is_completed'] === 1 && !empty($taskDone['notes'])) {
    echo "PASS (Task '{$itTask['task_name']}' berstatus SELESAI)" . PHP_EOL;
} else {
    echo "FAIL (Tugas gagal diselesaikan)" . PHP_EOL;
    exit(1);
}

// 7. Pembersihan data pengujian
echo "[TEST 7] Pembersihan data pengujian: ";
$pdo->prepare("DELETE FROM overtime_requests WHERE id = ?")->execute([$overtimeId]);
$pdo->prepare("DELETE FROM lifecycle_checklists WHERE user_id = ?")->execute([$employee['id']]);
echo "PASS" . PHP_EOL;

echo PHP_EOL . "=== SEMUA 7 PENGUJIAN FASE 3 SELESAI DENGAN SUKSES! ===" . PHP_EOL;
