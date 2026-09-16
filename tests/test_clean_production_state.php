<?php
require_once __DIR__ . '/../backend/config/database.php';

$pdo = getDbConnection();

echo "=== VERIFIKASI AKUN PRODUKSI ===\n";
$users = $pdo->query("
    SELECT u.id, u.email, u.role_id, r.name as role_name, up.name as profile_name, up.position, u.password_hash, u.force_password_change
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    ORDER BY u.id ASC
")->fetchAll(PDO::FETCH_ASSOC);

$allPasswordValid = true;
foreach ($users as $u) {
    $passOk = password_verify('admin123321mgi', $u['password_hash']);
    if (!$passOk) $allPasswordValid = false;
    echo sprintf(
        "User #%d: %s | Role: %s (%d) | Pos: %s | ForcePass: %d | PassValid: %s\n",
        $u['id'],
        $u['email'],
        $u['role_name'],
        $u['role_id'],
        $u['position'],
        $u['force_password_change'],
        $passOk ? 'YES (OK)' : 'NO (FAILED)'
    );
}

echo "\nTotal User di Database: " . count($users) . " (Target: 5)\n";
if (count($users) === 5 && $allPasswordValid) {
    echo "✓ Verifikasi Akun: SEMPURNA!\n";
} else {
    echo "✗ Verifikasi Akun: ADA KETIDAKSESUAIAN!\n";
}

echo "\n=== VERIFIKASI TABEL TRANSAKSI DUMMY (HARUS 0) ===\n";
$tables = [
    'attendances', 'permit_approvals', 'permit_attachments', 'permits',
    'overtime_requests', 'lifecycle_checklists', 'payroll_runs', 'payroll_components',
    'expense_request_items', 'expense_requests', 'petty_cash_transactions',
    'document_access', 'documents', 'profile_change_requests', 'it_devices',
    'it_emails', 'leave_balances', 'notifications', 'audit_logs', 'sessions'
];

$allClean = true;
foreach ($tables as $t) {
    $exists = $pdo->query("SHOW TABLES LIKE '$t'")->fetchColumn();
    if ($exists) {
        $cnt = (int)$pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
        if ($cnt > 0) {
            echo "✗ Tabel `$t`: $cnt baris (BELUM BERSIH)\n";
            $allClean = false;
        } else {
            echo "✓ Tabel `$t`: 0 baris (BERSIH)\n";
        }
    }
}

if ($allClean) {
    echo "✓ Seluruh tabel transaksi telah 100% bersih dan kosong!\n";
}
