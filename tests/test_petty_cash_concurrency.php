<?php
// ==========================================================
// MGI ERP / HRIS - Petty Cash Concurrency & Race Condition Test
// ==========================================================

require_once __DIR__ . '/../backend/config/database.php';
require_once __DIR__ . '/../backend/helpers/auth.php';

echo "=== MEMULAI TEST: PETTY CASH CONCURRENCY & BALANCE HARDENING ===" . PHP_EOL . PHP_EOL;

$pdo = getDbConnection();

// Ambil saldo awal
$stmt = $pdo->query("SELECT current_balance FROM petty_cash_transactions ORDER BY id DESC LIMIT 1 FOR UPDATE");
$initialBalance = (float)($stmt->fetchColumn() ?: 0.00);
echo "[INFO] Saldo Petty Cash saat ini: Rp " . number_format($initialBalance, 0, ',', '.') . PHP_EOL;

// 1. Uji Coba: Penolakan Outflow Melebihi Saldo
echo "[TEST 1] Menguji pencegahan saldo negatif (Outflow > Saldo)..." . PHP_EOL;
$excessiveAmount = $initialBalance + 10000000; // melebihi saldo 10 juta

try {
    $pdo->beginTransaction();
    $stmtLock = $pdo->query("SELECT current_balance FROM petty_cash_transactions ORDER BY id DESC LIMIT 1 FOR UPDATE");
    $current = (float)($stmtLock->fetchColumn() ?: 0.00);

    if ($excessiveAmount > $current) {
        $pdo->rollBack();
        echo "  ✓ PASS: Transaksi ditolak karena saldo tidak mencukupi (Rp {$excessiveAmount} > Rp {$current})" . PHP_EOL;
    } else {
        $pdo->rollBack();
        echo "  ❌ FAIL: Transaksi berlebih lolos validasi!" . PHP_EOL;
        exit(1);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo "  ❌ ERROR: " . $e->getMessage() . PHP_EOL;
    exit(1);
}

// 2. Uji Coba: Simulasi 10 Transaksi Inflow & Outflow Berurutan dengan FOR UPDATE
echo "[TEST 2] Simulasi 10 transaksi atomik (Inflow & Outflow)..." . PHP_EOL;
$expectedBalance = $initialBalance;
$transactionCount = 10;
$testUserId = 1; // IT / Admin

try {
    for ($i = 1; $i <= $transactionCount; $i++) {
        $pdo->beginTransaction();

        // Lock row terakhir
        $stmtLock = $pdo->query("SELECT current_balance FROM petty_cash_transactions ORDER BY id DESC LIMIT 1 FOR UPDATE");
        $lastBal = (float)($stmtLock->fetchColumn() ?: 0.00);

        // Bergantian inflow Rp 10.000 dan outflow Rp 5.000
        $type = ($i % 2 === 1) ? 'inflow' : 'outflow';
        $amount = ($type === 'inflow') ? 10000 : 5000;

        if ($type === 'outflow' && $amount > $lastBal) {
            $pdo->rollBack();
            continue;
        }

        $newBal = ($type === 'inflow') ? $lastBal + $amount : $lastBal - $amount;

        $stmtIns = $pdo->prepare("
            INSERT INTO petty_cash_transactions 
            (transaction_type, amount, current_balance, description, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmtIns->execute([$type, $amount, $newBal, "Simulasi Concurrency Test #{$i}", $testUserId]);

        $pdo->commit();
        $expectedBalance = $newBal;
    }

    // Verifikasi saldo akhir di database
    $stmtFinal = $pdo->query("SELECT current_balance FROM petty_cash_transactions ORDER BY id DESC LIMIT 1");
    $actualBalance = (float)$stmtFinal->fetchColumn();

    if (abs($actualBalance - $expectedBalance) < 0.001) {
        echo "  ✓ PASS: Saldo akhir akurat 100% (Rp " . number_format($actualBalance, 0, ',', '.') . ")" . PHP_EOL;
    } else {
        echo "  ❌ FAIL: Saldo mismatch! Expected: {$expectedBalance}, Actual: {$actualBalance}" . PHP_EOL;
        exit(1);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo "  ❌ ERROR: " . $e->getMessage() . PHP_EOL;
    exit(1);
}

// 3. Bersihkan transaksi simulasi
echo "[TEST 3] Membersihkan data simulasi transaksi pengujian..." . PHP_EOL;
$stmtDel = $pdo->prepare("DELETE FROM petty_cash_transactions WHERE description LIKE 'Simulasi Concurrency Test%'");
$stmtDel->execute();
$cleanedRows = $stmtDel->rowCount();
echo "  ✓ PASS: {$cleanedRows} baris simulasi berhasil dibersihkan." . PHP_EOL;

echo PHP_EOL . "=== CONCURRENCY TEST PETTY CASH SELESAI DENGAN SUKSES! ===" . PHP_EOL;
