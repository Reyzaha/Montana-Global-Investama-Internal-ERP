<?php
// tests/test_hrga_features.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$_SESSION['user_id'] = 1;
$_SESSION['role_id'] = 7; // Admin
$_SESSION['role_name'] = 'Admin';
$_SESSION['email'] = 'admin@mgi.com';
$_SESSION['mfa_verified'] = true;
$_SERVER['REQUEST_METHOD'] = 'GET';

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/helpers/leave.php';

$pdo = getDbConnection();

echo "=============================================\n";
echo "TESTING MGI ERP - HRGA REQUEST IMPLEMENTATION\n";
echo "=============================================\n\n";

// 1. Test Permit Sub-Types
echo "1. Checking Permit Sub-Types...\n";
$stmt = $pdo->query("SELECT pst.id, pt.name as cat_name, pst.name as sub_name, pst.is_active FROM permit_sub_types pst JOIN permit_types pt ON pst.category_id = pt.id WHERE pst.is_active = 1 ORDER BY pt.id, pst.id");
$subs = $stmt->fetchAll(PDO::FETCH_ASSOC);

$cats = [];
foreach ($subs as $s) {
    $cats[$s['cat_name']][] = $s['sub_name'];
}

foreach ($cats as $cat => $names) {
    echo "  [{$cat}]: " . implode(', ', $names) . "\n";
}

// Assertions
assert(in_array('Terlambat', $cats['Izin'] ?? []), "Izin must contain Terlambat");
assert(in_array('Pulang Cepat', $cats['Izin'] ?? []), "Izin must contain Pulang Cepat");
assert(in_array('Dinas', $cats['Izin'] ?? []), "Izin must contain Dinas");
assert(count($cats['Izin']) === 3, "Izin must only have 3 active options");

assert(in_array('Cuti Tahunan', $cats['Cuti'] ?? []), "Cuti must contain Cuti Tahunan");
assert(in_array('Cuti Khusus', $cats['Cuti'] ?? []), "Cuti must contain Cuti Khusus");
assert(count($cats['Cuti']) === 2, "Cuti must only have 2 active options");

assert(in_array('Sakit dengan Surat Dokter', $cats['Sakit'] ?? []), "Sakit must contain Sakit dengan Surat Dokter");
assert(in_array('Sakit tanpa Surat', $cats['Sakit'] ?? []), "Sakit must contain Sakit tanpa Surat");
assert(count($cats['Sakit']) === 2, "Sakit must only have 2 active options");
echo "  ✓ Permit Sub-Types Verified: OK!\n\n";

// 2. Test Quota Deductible Logic
echo "2. Checking Quota Deductible Logic (Cuti Tahunan vs Cuti Khusus)...\n";
$stmtCuti = $pdo->query("SELECT id FROM permit_types WHERE code = 'cuti'");
$cutiTypeId = (int)$stmtCuti->fetchColumn();

$stmtCutiTahunan = $pdo->query("SELECT id FROM permit_sub_types WHERE name = 'Cuti Tahunan'");
$cutiTahunanId = (int)$stmtCutiTahunan->fetchColumn();

$stmtCutiKhusus = $pdo->query("SELECT id FROM permit_sub_types WHERE name = 'Cuti Khusus'");
$cutiKhususId = (int)$stmtCutiKhusus->fetchColumn();

$stmtIzin = $pdo->query("SELECT id FROM permit_types WHERE code = 'izin'");
$izinTypeId = (int)$stmtIzin->fetchColumn();

$isTahunanDeductible = isQuotaDeductiblePermitType($pdo, $cutiTypeId, $cutiTahunanId);
$isKhususDeductible = isQuotaDeductiblePermitType($pdo, $cutiTypeId, $cutiKhususId);
$isIzinDeductible = isQuotaDeductiblePermitType($pdo, $izinTypeId, null);

echo "  Cuti Tahunan deductible: " . ($isTahunanDeductible ? "YES (Correct)" : "NO (Wrong)") . "\n";
echo "  Cuti Khusus deductible: " . ($isKhususDeductible ? "YES (Wrong)" : "NO (Correct, does not reduce annual quota)") . "\n";
echo "  Izin deductible: " . ($isIzinDeductible ? "YES (Wrong)" : "NO (Correct)") . "\n";

assert($isTahunanDeductible === true, "Cuti Tahunan must deduct quota");
assert($isKhususDeductible === false, "Cuti Khusus must NOT deduct quota");
assert($isIzinDeductible === false, "Izin must NOT deduct quota");
echo "  ✓ Leave Quota Deduction Logic: OK!\n\n";

// 3. Test Leave Balance Retrieval for Dashboard
echo "3. Checking Leave Balance for User (Dashboard Jatah Cuti)...\n";
$stmtUser = $pdo->query("SELECT id, email FROM users WHERE email = 'montanaglobalinvestamait@gmail.com' LIMIT 1");
$u = $stmtUser->fetch(PDO::FETCH_ASSOC);
if ($u) {
    $bal = getOrCreateLeaveBalance($pdo, (int)$u['id'], $cutiTypeId, 2026);
    echo "  User: {$u['email']}\n";
    echo "  Quota Days: {$bal['quota_days']}\n";
    echo "  Used Days: {$bal['used_days']}\n";
    echo "  Remaining Days: {$bal['remaining_days']}\n";
    assert($bal['remaining_days'] >= 0, "Remaining days should be >= 0");
    echo "  ✓ Dashboard Leave Quota Display: OK!\n\n";
}

// 4. Test Approved Permit Simulation in Attendance Recap
echo "4. Testing Attendance Recap with Approved Permits Integration...\n";

// Let's create a test approved permit for testing recap if none exists
$testDate = '2026-09-15';
// Check if user has an approved permit or create one
$stmtPermitCheck = $pdo->prepare("SELECT id FROM permits WHERE user_id = ? AND start_date <= ? AND end_date >= ? AND status = 'approved'");
$stmtPermitCheck->execute([$u['id'], $testDate, $testDate]);
$hasApprovedPermit = $stmtPermitCheck->fetchColumn();

if (!$hasApprovedPermit) {
    echo "  Creating sample approved permit for {$u['email']} on {$testDate}...\n";
    $insPermit = $pdo->prepare("
        INSERT INTO permits (user_id, permit_type_id, permit_sub_type_id, start_date, end_date, description, status)
        VALUES (?, ?, ?, ?, ?, ?, 'approved')
    ");
    $insPermit->execute([$u['id'], $cutiTypeId, $cutiTahunanId, $testDate, $testDate, 'Cuti tahunan acara keluarga']);
    $samplePermitId = $pdo->lastInsertId();
    echo "  Sample approved permit created (ID: {$samplePermitId})\n";
}

// Now simulate fetching all-attendance for date range 2026-09-01 to 2026-09-30
$_GET['start_date'] = '2026-09-01';
$_GET['end_date'] = '2026-09-30';

ob_start();
require __DIR__ . '/../backend/api/attendance/all-attendance.php';
$output = ob_get_clean();

$response = json_decode($output, true);
assert($response !== null, "Response should be valid JSON: " . substr($output, 0, 200));
assert($response['success'] === true, "Response success should be true");

$data = $response['data'];
echo "  Total records returned for period {$data['start_date']} s/d {$data['end_date']}: " . count($data['attendances']) . "\n";

$foundPermitNote = false;
foreach ($data['attendances'] as $att) {
    if ($att['has_approved_permit']) {
        echo "  [FOUND APPROVED PERMIT LOG] Date: {$att['date']} | Status: {$att['status']} | Notes: {$att['notes']}\n";
        if (strpos($att['notes'], 'Disetujui OM & HR') !== false) {
            $foundPermitNote = true;
        }
    }
}

assert($foundPermitNote === true, "Must find permit with note 'Disetujui OM & HR' in attendance recap");
echo "  ✓ Attendance Recap & Approved Permit Integration: OK!\n\n";

echo "ALL TESTS PASSED SUCCESSFULLY!\n";
