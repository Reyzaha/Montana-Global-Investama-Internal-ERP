<?php
// ==========================================================
// MGI ERP / HRIS - Payroll Management API
// Method: GET, POST
// ==========================================================

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/audit.php';
require_once __DIR__ . '/../../helpers/payroll.php';

$user = requireAuth();
$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $month = (int)($_GET['month'] ?? date('n'));
        $year = (int)($_GET['year'] ?? date('Y'));
        $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
        $status = $_GET['status'] ?? 'all';

        // Check permission: Non-HRGA/Finance/Admin (roles 2, 7) can only see their own payslip
        $isManager = in_array((int)$user['role_id'], [2, 7]);
        if (!$isManager) {
            $userId = (int)$user['id'];
        }

        $where = ["pr.period_month = :month", "pr.period_year = :year"];
        $params = [':month' => $month, ':year' => $year];

        if ($userId > 0) {
            $where[] = "pr.user_id = :user_id";
            $params[':user_id'] = $userId;
        }

        if ($status !== 'all' && in_array($status, ['draft', 'finalized', 'paid'])) {
            $where[] = "pr.status = :status";
            $params[':status'] = $status;
        }

        $whereClause = "WHERE " . implode(" AND ", $where);

        $sql = "
            SELECT 
                pr.id,
                pr.user_id,
                u.email AS employee_email,
                COALESCE(up.name, u.email) AS employee_name,
                r.name AS employee_role,
                pr.period_month,
                pr.period_year,
                pr.base_salary,
                pr.allowance_total,
                pr.overtime_hours,
                pr.overtime_pay,
                pr.late_count,
                pr.deduction_late,
                pr.absent_count,
                pr.deduction_absent,
                pr.net_salary,
                pr.status,
                pr.processed_at,
                pu.email AS processed_by_email
            FROM payroll_runs pr
            JOIN users u ON pr.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN users pu ON pr.processed_by = pu.id
            $whereClause
            ORDER BY u.email ASC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Aggregate summary
        $totalNet = 0;
        $totalOvertime = 0;
        $totalDeductions = 0;
        foreach ($records as $r) {
            $totalNet += (float)$r['net_salary'];
            $totalOvertime += (float)$r['overtime_pay'];
            $totalDeductions += ((float)$r['deduction_late'] + (float)$r['deduction_absent']);
        }

        sendSuccess([
            'period' => sprintf('%04d-%02d', $year, $month),
            'summary' => [
                'total_employees' => count($records),
                'total_net_payout' => $totalNet,
                'total_overtime_payout' => $totalOvertime,
                'total_deductions' => $totalDeductions
            ],
            'records' => $records
        ], 'Data payroll berhasil diambil.');
    } catch (Exception $e) {
        sendError('Gagal memuat data payroll: ' . $e->getMessage(), 500);
    }
} elseif ($method === 'POST') {
    // Only HRGA (2) and Admin (7) can run/finalize payroll
    $user = requireRole([2, 7]);

    try {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $input['action'] ?? 'calculate'; // 'calculate', 'finalize', 'pay'
        $month = (int)($input['month'] ?? date('n'));
        $year = (int)($input['year'] ?? date('Y'));

        if ($month < 1 || $month > 12 || $year < 2020) {
            sendError('Periode bulan dan tahun tidak valid.', 400);
        }

        if ($action === 'calculate') {
            // Ambil semua karyawan aktif
            $employees = $pdo->query("SELECT id FROM users WHERE status = 'active'")->fetchAll(PDO::FETCH_COLUMN);

            $pdo->beginTransaction();
            $processed = 0;

            foreach ($employees as $empId) {
                $calc = calculateEmployeeMonthlyPayroll($pdo, (int)$empId, $month, $year);

                $stmtUpsert = $pdo->prepare("
                    INSERT INTO payroll_runs (
                        user_id, period_month, period_year, base_salary, allowance_total,
                        overtime_hours, overtime_pay, late_count, deduction_late,
                        absent_count, deduction_absent, net_salary, status, processed_by, processed_at
                    ) VALUES (
                        :uid, :m, :y, :base, :allowance,
                        :ot_hours, :ot_pay, :late_cnt, :ded_late,
                        :abs_cnt, :ded_abs, :net, 'draft', :proc_by, NOW()
                    ) ON DUPLICATE KEY UPDATE
                        base_salary = VALUES(base_salary),
                        allowance_total = VALUES(allowance_total),
                        overtime_hours = VALUES(overtime_hours),
                        overtime_pay = VALUES(overtime_pay),
                        late_count = VALUES(late_count),
                        deduction_late = VALUES(deduction_late),
                        absent_count = VALUES(absent_count),
                        deduction_absent = VALUES(deduction_absent),
                        net_salary = VALUES(net_salary),
                        processed_by = VALUES(processed_by),
                        processed_at = NOW()
                ");

                $stmtUpsert->execute([
                    ':uid' => $calc['user_id'],
                    ':m' => $calc['period_month'],
                    ':y' => $calc['period_year'],
                    ':base' => $calc['base_salary'],
                    ':allowance' => $calc['allowance_total'],
                    ':ot_hours' => $calc['overtime_hours'],
                    ':ot_pay' => $calc['overtime_pay'],
                    ':late_cnt' => $calc['late_count'],
                    ':ded_late' => $calc['deduction_late'],
                    ':abs_cnt' => $calc['absent_count'],
                    ':ded_abs' => $calc['deduction_absent'],
                    ':net' => $calc['net_salary'],
                    ':proc_by' => $user['id']
                ]);
                $processed++;
            }

            $pdo->commit();

            recordAuditLog(
                $user['id'],
                'RUN_PAYROLL_CALCULATION',
                'PAYROLL',
                sprintf('%04d-%02d', $year, $month),
                "Kalkulasi payroll periode {$year}-{$month} untuk {$processed} karyawan berhasil dijalankan."
            );

            sendSuccess([
                'processed_count' => $processed,
                'period' => sprintf('%04d-%02d', $year, $month)
            ], "Kalkulasi payroll berhasil diproses untuk {$processed} karyawan.");
        } elseif (in_array($action, ['finalize', 'pay'])) {
            $newStatus = ($action === 'finalize') ? 'finalized' : 'paid';

            $stmtUpdate = $pdo->prepare("
                UPDATE payroll_runs 
                SET status = ?, processed_by = ?, processed_at = NOW()
                WHERE period_month = ? AND period_year = ?
            ");
            $stmtUpdate->execute([$newStatus, $user['id'], $month, $year]);
            $affected = $stmtUpdate->rowCount();

            recordAuditLog(
                $user['id'],
                strtoupper($action) . '_PAYROLL',
                'PAYROLL',
                sprintf('%04d-%02d', $year, $month),
                "Payroll periode {$year}-{$month} diubah statusnya menjadi {$newStatus} ({$affected} baris terpengaruh)"
            );

            sendSuccess([
                'status' => $newStatus,
                'affected' => $affected
            ], "Status payroll periode {$year}-{$month} berhasil diperbarui menjadi {$newStatus}.");
        } else {
            sendError('Aksi payroll tidak dikenali.', 400);
        }
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        sendError('Gagal memproses payroll: ' . $e->getMessage(), 500);
    }
} else {
    sendError('Metode request tidak diizinkan.', 405);
}
