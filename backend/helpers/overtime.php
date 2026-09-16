<?php
// ==========================================================
// MGI ERP / HRIS - Overtime & Lifecycle Helper
// ==========================================================

/**
 * Menghitung selisih jam lembur dalam format desimal (misal 2.50 jam)
 */
function calculateOvertimeHours(string $startTime, string $endTime): float {
    $start = strtotime("1970-01-01 $startTime");
    $end = strtotime("1970-01-01 $endTime");

    if ($end <= $start) {
        // Jika lembur melewati tengah malam
        $end += 86400;
    }

    $diffSeconds = $end - $start;
    return round($diffSeconds / 3600, 2);
}

/**
 * Daftar template standar Onboarding karyawan baru
 */
function getDefaultOnboardingTasks(): array {
    return [
        ['category' => 'it', 'task_name' => 'Pembuatan akun email korporat (@mgi.co.id)'],
        ['category' => 'it', 'task_name' => 'Penyerahan laptop/device kerja & setup akses jaringan/VPN'],
        ['category' => 'it', 'task_name' => 'Pemberian kredensial akun ERP & aktivasi MFA'],
        ['category' => 'hrga', 'task_name' => 'Pengumpulan berkas fisik (KTP, KK, Ijazah, NPWP)'],
        ['category' => 'hrga', 'task_name' => 'Penerbitan ID Card & Kartu Akses Gedung'],
        ['category' => 'hrga', 'task_name' => 'Pendaftaran BPJS Ketenagakerjaan & Kesehatan'],
        ['category' => 'legal', 'task_name' => 'Penandatanganan Perjanjian Kerja (PKWT/PKWTT)'],
        ['category' => 'legal', 'task_name' => 'Penandatanganan Non-Disclosure Agreement (NDA)'],
        ['category' => 'legal', 'task_name' => 'Sosialisasi Pakta Integritas & Tata Tertib Perusahaan']
    ];
}

/**
 * Daftar template standar Offboarding karyawan keluar
 */
function getDefaultOffboardingTasks(): array {
    return [
        ['category' => 'it', 'task_name' => 'Penarikan laptop, monitor, dan seluruh aksesori device kerja'],
        ['category' => 'it', 'task_name' => 'Deaktivasi akun email korporat & akun sistem ERP'],
        ['category' => 'it', 'task_name' => 'Pencabutan akses repositori, cloud, dan server kantor'],
        ['category' => 'hrga', 'task_name' => 'Pengembalian ID Card & Kartu Akses Gedung'],
        ['category' => 'hrga', 'task_name' => 'Penyelesaian administrasi sisa hak cuti & kompensasi'],
        ['category' => 'hrga', 'task_name' => 'Surat Keterangan Pengalaman Kerja (Paklaring)'],
        ['category' => 'legal', 'task_name' => 'Penegasan kewajiban kerahasiaan data paska-kerja (Exit NDA)'],
        ['category' => 'legal', 'task_name' => 'Penyelesaian kewajiban & serah terima tanggung jawab hukum']
    ];
}

/**
 * Inisialisasi daftar checklist untuk user tertentu jika belum ada
 */
function initializeUserLifecycleChecklist(PDO $pdo, int $userId, string $type = 'onboarding'): int {
    $tasks = ($type === 'offboarding') ? getDefaultOffboardingTasks() : getDefaultOnboardingTasks();

    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM `lifecycle_checklists` WHERE `user_id` = ? AND `type` = ?");
    $stmtCheck->execute([$userId, $type]);
    if ((int)$stmtCheck->fetchColumn() > 0) {
        return 0; // Sudah pernah diinisialisasi
    }

    $stmtInsert = $pdo->prepare("
        INSERT INTO `lifecycle_checklists` (`user_id`, `type`, `category`, `task_name`, `is_completed`)
        VALUES (?, ?, ?, ?, 0)
    ");

    $count = 0;
    foreach ($tasks as $task) {
        $stmtInsert->execute([$userId, $type, $task['category'], $task['task_name']]);
        $count++;
    }

    return $count;
}
