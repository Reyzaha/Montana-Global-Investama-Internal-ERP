<?php
// ==========================================================
// MGI ERP / HRIS - Leave Balance Helper
// ==========================================================

require_once __DIR__ . '/../config/database.php';

/**
 * Get or initialize leave balance for a given user, permit type, and year
 */
function getOrCreateLeaveBalance(PDO $pdo, int $userId, int $permitTypeId, ?int $year = null): array {
    $year = $year ?? (int)date('Y');

    $stmt = $pdo->prepare("
        SELECT id, user_id, permit_type_id, year, quota_days, used_days, carried_over_days,
               ((quota_days + carried_over_days) - used_days) AS remaining_days
        FROM `leave_balances`
        WHERE user_id = ? AND permit_type_id = ? AND year = ?
        LIMIT 1
    ");
    $stmt->execute([$userId, $permitTypeId, $year]);
    $balance = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($balance) {
        $balance['quota_days'] = (float)$balance['quota_days'];
        $balance['used_days'] = (float)$balance['used_days'];
        $balance['carried_over_days'] = (float)$balance['carried_over_days'];
        $balance['remaining_days'] = (float)$balance['remaining_days'];
        return $balance;
    }

    // Auto-create with default 12 days quota
    $stmtInsert = $pdo->prepare("
        INSERT INTO `leave_balances` (`user_id`, `permit_type_id`, `year`, `quota_days`, `used_days`, `carried_over_days`)
        VALUES (?, ?, ?, 12.0, 0.0, 0.0)
    ");
    $stmtInsert->execute([$userId, $permitTypeId, $year]);
    $newId = (int)$pdo->lastInsertId();

    return [
        'id' => $newId,
        'user_id' => $userId,
        'permit_type_id' => $permitTypeId,
        'year' => $year,
        'quota_days' => 12.0,
        'used_days' => 0.0,
        'carried_over_days' => 0.0,
        'remaining_days' => 12.0
    ];
}

/**
 * Calculate leave duration in days between two dates inclusive
 */
function calculatePermitDays(string $startDate, string $endDate): int {
    $start = new DateTime($startDate);
    $end = new DateTime($endDate);
    if ($start > $end) {
        return 0;
    }
    // Inclusive days count
    $interval = $start->diff($end);
    return (int)$interval->days + 1;
}

/**
 * Check if permit type code is considered a quota deduction (e.g. 'cuti')
 */
function isQuotaDeductiblePermitType(PDO $pdo, int $permitTypeId): bool {
    $stmt = $pdo->prepare("SELECT code FROM `permit_types` WHERE id = ? LIMIT 1");
    $stmt->execute([$permitTypeId]);
    $code = strtolower((string)$stmt->fetchColumn());
    return ($code === 'cuti');
}
