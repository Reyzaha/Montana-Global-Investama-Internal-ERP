<?php
// ==========================================================
// MGI ERP / HRIS - Payroll Helper
// ==========================================================

/**
 * Menghitung gaji kotor, potongan presensi, kompensasi lembur, dan gaji bersih bulanan
 * 
 * Aturan Bisnis Standar:
 * - Tarif lembur per jam = (Gaji Pokok / 173) * 1.5 (Sesuai standar Depnaker RI)
 * - Potongan terlambat per kejadian = Rp 50.000 / hari
 * - Potongan absen tanpa izin/keterangan = Gaji Pokok / 22 hari kerja
 */
function calculateEmployeeMonthlyPayroll(
    PDO $pdo,
    int $userId,
    int $month,
    int $year,
    float $latePenaltyPerIncident = 50000.00
): array {
    // 1. Ambil master komponen gaji karyawan
    $stmtComp = $pdo->prepare("SELECT base_salary, fixed_allowance FROM payroll_components WHERE user_id = ?");
    $stmtComp->execute([$userId]);
    $comp = $stmtComp->fetch(PDO::FETCH_ASSOC);

    $baseSalary = $comp ? (float)$comp['base_salary'] : 5000000.00;
    $fixedAllowance = $comp ? (float)$comp['fixed_allowance'] : 0.00;

    // 2. Ambil data presensi bulan & tahun berjalan
    $stmtAtt = $pdo->prepare("
        SELECT 
            COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
            COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count
        FROM attendances 
        WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
    ");
    $stmtAtt->execute([$userId, $month, $year]);
    $att = $stmtAtt->fetch(PDO::FETCH_ASSOC);

    $lateCount = (int)($att['late_count'] ?? 0);
    $absentCount = (int)($att['absent_count'] ?? 0);

    // 3. Ambil data lembur yang telah berstatus 'approved' pada bulan & tahun tersebut
    $stmtOt = $pdo->prepare("
        SELECT COALESCE(SUM(duration_hours), 0) as total_ot_hours
        FROM overtime_requests
        WHERE user_id = ? AND status = 'approved' AND MONTH(date) = ? AND YEAR(date) = ?
    ");
    $stmtOt->execute([$userId, $month, $year]);
    $overtimeHours = (float)$stmtOt->fetchColumn();

    // 4. Kalkulasi finansial
    // Tarif lembur per jam = (Gaji Pokok / 173) * 1.5
    $hourlyRate = ($baseSalary > 0) ? ($baseSalary / 173) * 1.5 : 0;
    $overtimePay = round($overtimeHours * $hourlyRate, 2);

    // Potongan keterlambatan
    $deductionLate = round($lateCount * $latePenaltyPerIncident, 2);

    // Potongan absen (1/22 per hari kerja absen)
    $dailyRate = ($baseSalary > 0) ? ($baseSalary / 22) : 0;
    $deductionAbsent = round($absentCount * $dailyRate, 2);

    // Gaji Bersih (Net Salary)
    $grossSalary = $baseSalary + $fixedAllowance + $overtimePay;
    $totalDeduction = $deductionLate + $deductionAbsent;
    $netSalary = max(0.00, round($grossSalary - $totalDeduction, 2));

    return [
        'user_id' => $userId,
        'period_month' => $month,
        'period_year' => $year,
        'base_salary' => $baseSalary,
        'allowance_total' => $fixedAllowance,
        'overtime_hours' => $overtimeHours,
        'overtime_pay' => $overtimePay,
        'late_count' => $lateCount,
        'deduction_late' => $deductionLate,
        'absent_count' => $absentCount,
        'deduction_absent' => $deductionAbsent,
        'net_salary' => $netSalary
    ];
}
