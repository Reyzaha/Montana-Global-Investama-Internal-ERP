<?php
// ==========================================================
// MGI ERP / HRIS - Migration: Granular Master Data & Access Control
// ==========================================================

require_once __DIR__ . '/backend/config/database.php';

echo "=== MEMULAI MIGRASI: GRANULAR MASTER DATA & ACCESS CONTROL ===" . PHP_EOL . PHP_EOL;

try {
    $pdo = getDbConnection();

    // 1. Table module_permissions (Matriks Role x Modul)
    echo "1. Memeriksa tabel `module_permissions`..." . PHP_EOL;
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `module_permissions` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `role_id` INT NOT NULL,
            `module_code` VARCHAR(50) NOT NULL,
            `can_view` TINYINT(1) NOT NULL DEFAULT 0,
            `can_create` TINYINT(1) NOT NULL DEFAULT 0,
            `can_edit` TINYINT(1) NOT NULL DEFAULT 0,
            `can_delete` TINYINT(1) NOT NULL DEFAULT 0,
            `can_approve` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY `uniq_role_module` (`role_id`, `module_code`),
            INDEX `idx_perm_role` (`role_id`),
            INDEX `idx_perm_module` (`module_code`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "   ✓ Tabel `module_permissions` siap." . PHP_EOL;

    // 2. Table user_permission_overrides (Pengecualian Per User dengan Alasan & Masa Berlaku)
    echo "2. Memeriksa tabel `user_permission_overrides`..." . PHP_EOL;
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `user_permission_overrides` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `module_code` VARCHAR(50) NOT NULL,
            `action` ENUM('view', 'create', 'edit', 'delete', 'approve') NOT NULL,
            `override_type` ENUM('grant', 'deny') NOT NULL DEFAULT 'grant',
            `reason` TEXT NOT NULL,
            `granted_by` INT NOT NULL,
            `expires_at` DATETIME NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_user_override` (`user_id`, `module_code`, `action`),
            INDEX `idx_override_expiry` (`expires_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "   ✓ Tabel `user_permission_overrides` siap." . PHP_EOL;

    // 3. Table permit_sub_types (Sub-Izin Dinamis di Bawah Kategori Utama)
    echo "3. Memeriksa tabel `permit_sub_types`..." . PHP_EOL;
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `permit_sub_types` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `category_id` INT NOT NULL,
            `name` VARCHAR(150) NOT NULL,
            `description` TEXT NULL,
            `requires_attachment` TINYINT(1) NOT NULL DEFAULT 0,
            `attachment_label` VARCHAR(150) NULL,
            `quota_days` DECIMAL(5,1) NULL,
            `quota_period` ENUM('per_year', 'per_event', 'lifetime', 'unlimited') NOT NULL DEFAULT 'per_year',
            `carry_over_max_days` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
            `gender_restriction` ENUM('any', 'male', 'female') NOT NULL DEFAULT 'any',
            `is_paid` TINYINT(1) NOT NULL DEFAULT 1,
            `requires_approval_step` TINYINT(1) NOT NULL DEFAULT 2,
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `idx_sub_category` (`category_id`),
            INDEX `idx_sub_active` (`is_active`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "   ✓ Tabel `permit_sub_types` siap." . PHP_EOL;

    // 4. Alter table permits (Tambahkan permit_sub_type_id jika belum ada)
    echo "4. Memeriksa kolom `permit_sub_type_id` pada tabel `permits`..." . PHP_EOL;
    $columns = $pdo->query("SHOW COLUMNS FROM `permits` LIKE 'permit_sub_type_id'")->fetchAll();
    if (empty($columns)) {
        $pdo->exec("ALTER TABLE `permits` ADD COLUMN `permit_sub_type_id` INT NULL AFTER `permit_type_id`");
        $pdo->exec("ALTER TABLE `permits` ADD INDEX `idx_permits_sub_type` (`permit_sub_type_id`)");
        echo "   ✓ Kolom `permit_sub_type_id` berhasil ditambahkan ke tabel `permits`." . PHP_EOL;
    } else {
        echo "   ✓ Kolom `permit_sub_type_id` sudah ada." . PHP_EOL;
    }

    // 5. Table expense_categories (Sub-Kategori Pengeluaran Dinamis)
    echo "5. Memeriksa tabel `expense_categories`..." . PHP_EOL;
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `expense_categories` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `name` VARCHAR(150) NOT NULL,
            `code` VARCHAR(50) NOT NULL,
            `requires_pm_approval` TINYINT(1) NOT NULL DEFAULT 1,
            `auto_approve_below_amount` DECIMAL(15,2) NULL,
            `budget_limit_monthly` DECIMAL(15,2) NULL,
            `default_gl_account_code` VARCHAR(50) NULL,
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY `uniq_exp_code` (`code`),
            INDEX `idx_exp_cat_active` (`is_active`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "   ✓ Tabel `expense_categories` siap." . PHP_EOL;

    // 6. Inisialisasi Data Default: Modul Permissions
    echo "6. Inisialisasi default permissions per role..." . PHP_EOL;
    $modules = [
        'devices' => 'Device Management (IT)',
        'emails' => 'Email & Accounts (IT)',
        'users' => 'User Management (IT)',
        'attendance' => 'Attendance Management (HRGA)',
        'permits' => 'Permit & Leave (HRGA)',
        'expense' => 'Expense Ticketing (HRGA/Finance/PM)',
        'petty_cash' => 'Petty Cash Ledger (HRGA/PM/Finance)',
        'legal_docs' => 'Legal Documents (Legal)',
        'payroll' => 'Payroll & Compensation (HRGA)',
        'overtime' => 'Overtime Tracking',
        'access_control' => 'Access Control Matrix (IT)'
    ];

    // Role IDs: 1=IT, 2=HRGA, 3=LEGAL, 4=FINANCE, 5=BIZDEV, 6=PM, 7=ADMIN
    // Matriks default
    $defaultMatrix = [
        1 => [ // IT
            'devices' => [1,1,1,1,0], 'emails' => [1,1,1,1,0], 'users' => [1,1,1,1,0],
            'attendance' => [1,0,0,0,0], 'permits' => [1,0,0,0,0], 'expense' => [1,1,0,0,0],
            'petty_cash' => [1,0,0,0,0], 'legal_docs' => [0,0,0,0,0], 'payroll' => [0,0,0,0,0],
            'overtime' => [1,1,0,0,0], 'access_control' => [1,1,1,1,1]
        ],
        2 => [ // HRGA
            'devices' => [1,0,0,0,0], 'emails' => [0,0,0,0,0], 'users' => [1,0,0,0,0],
            'attendance' => [1,1,1,1,1], 'permits' => [1,1,1,0,1], 'expense' => [1,1,1,0,0],
            'petty_cash' => [1,1,1,0,1], 'legal_docs' => [0,0,0,0,0], 'payroll' => [1,1,1,1,1],
            'overtime' => [1,1,1,0,1], 'access_control' => [0,0,0,0,0]
        ],
        3 => [ // LEGAL
            'devices' => [0,0,0,0,0], 'emails' => [0,0,0,0,0], 'users' => [0,0,0,0,0],
            'attendance' => [1,0,0,0,0], 'permits' => [1,1,0,0,0], 'expense' => [1,1,0,0,0],
            'petty_cash' => [0,0,0,0,0], 'legal_docs' => [1,1,1,1,1], 'payroll' => [0,0,0,0,0],
            'overtime' => [1,1,0,0,0], 'access_control' => [0,0,0,0,0]
        ],
        4 => [ // FINANCE
            'devices' => [0,0,0,0,0], 'emails' => [0,0,0,0,0], 'users' => [0,0,0,0,0],
            'attendance' => [1,0,0,0,0], 'permits' => [1,1,0,0,0], 'expense' => [1,1,1,0,1],
            'petty_cash' => [1,1,1,0,1], 'legal_docs' => [0,0,0,0,0], 'payroll' => [1,0,0,0,1],
            'overtime' => [1,1,0,0,0], 'access_control' => [0,0,0,0,0]
        ],
        5 => [ // BIZDEV
            'devices' => [0,0,0,0,0], 'emails' => [0,0,0,0,0], 'users' => [0,0,0,0,0],
            'attendance' => [1,0,0,0,0], 'permits' => [1,1,0,0,0], 'expense' => [1,1,0,0,0],
            'petty_cash' => [0,0,0,0,0], 'legal_docs' => [0,0,0,0,0], 'payroll' => [0,0,0,0,0],
            'overtime' => [1,1,0,0,0], 'access_control' => [0,0,0,0,0]
        ],
        6 => [ // PM
            'devices' => [1,0,0,0,0], 'emails' => [0,0,0,0,0], 'users' => [1,0,0,0,0],
            'attendance' => [1,0,0,0,0], 'permits' => [1,0,0,0,1], 'expense' => [1,1,1,0,1],
            'petty_cash' => [1,0,0,0,1], 'legal_docs' => [0,0,0,0,0], 'payroll' => [0,0,0,0,0],
            'overtime' => [1,1,0,0,1], 'access_control' => [0,0,0,0,0]
        ],
        7 => [ // ADMIN (All Full)
            'devices' => [1,1,1,1,1], 'emails' => [1,1,1,1,1], 'users' => [1,1,1,1,1],
            'attendance' => [1,1,1,1,1], 'permits' => [1,1,1,1,1], 'expense' => [1,1,1,1,1],
            'petty_cash' => [1,1,1,1,1], 'legal_docs' => [1,1,1,1,1], 'payroll' => [1,1,1,1,1],
            'overtime' => [1,1,1,1,1], 'access_control' => [1,1,1,1,1]
        ]
    ];

    $stmtPerm = $pdo->prepare("
        INSERT INTO `module_permissions` (`role_id`, `module_code`, `can_view`, `can_create`, `can_edit`, `can_delete`, `can_approve`)
        VALUES (:role_id, :module_code, :v, :c, :e, :d, :a)
        ON DUPLICATE KEY UPDATE
            can_view = VALUES(can_view),
            can_create = VALUES(can_create),
            can_edit = VALUES(can_edit),
            can_delete = VALUES(can_delete),
            can_approve = VALUES(can_approve)
    ");

    $seededPerms = 0;
    foreach ($defaultMatrix as $roleId => $roleModules) {
        foreach ($roleModules as $mod => $actions) {
            $stmtPerm->execute([
                ':role_id' => $roleId,
                ':module_code' => $mod,
                ':v' => $actions[0],
                ':c' => $actions[1],
                ':e' => $actions[2],
                ':d' => $actions[3],
                ':a' => $actions[4]
            ]);
            $seededPerms++;
        }
    }
    echo "   ✓ Berhasil inisialisasi {$seededPerms} data hak akses modul per role." . PHP_EOL;

    // 7. Inisialisasi Data Default: Sub-Izin Dinamis
    echo "7. Inisialisasi data default sub-izin (permit_sub_types)..." . PHP_EOL;
    // Category: 1 = Izin, 2 = Sakit, 3 = Cuti
    $defaultSubTypes = [
        // Category 1: Izin
        [1, 'Izin Keperluan Pribadi', 'Pengajuan izin keperluan personal/keluarga mendesak', 0, null, 3.0, 'per_year', 0, 'any', 1, 2],
        [1, 'Izin Menikah Karyawan', 'Izin melangsungkan pernikahan karyawan', 0, null, 3.0, 'lifetime', 0, 'any', 1, 2],
        [1, 'Izin Kematian Keluarga Inti', 'Izin kedukaan untuk keluarga inti (orang tua/suami/istri/anak)', 0, null, 2.0, 'per_event', 0, 'any', 1, 2],
        [1, 'Izin Ibadah Keagamaan (Haji/Umroh)', 'Izin menjalankan ibadah keagamaan panjang', 1, 'Bukti Pendaftaran / Tiket Keberangkatan', null, 'unlimited', 0, 'any', 1, 2],

        // Category 2: Sakit
        [2, 'Sakit Ringan (1-2 Hari)', 'Sakit ringan istirahat di rumah tanpa rawat inap', 0, 'Surat Keterangan Dokter (Opsional)', null, 'unlimited', 0, 'any', 1, 2],
        [2, 'Sakit dengan Surat Dokter (>2 Hari)', 'Sakit lebih dari 2 hari kerja dengan surat dokter wajib', 1, 'Surat Keterangan Dokter', null, 'unlimited', 0, 'any', 1, 2],
        [2, 'Rawat Inap / Opname RS', 'Menjalani perawatan rawat inap di rumah sakit', 1, 'Surat Rawat Inap RS / Resume Medis', null, 'unlimited', 0, 'any', 1, 2],

        // Category 3: Cuti
        [3, 'Cuti Tahunan', 'Hak cuti tahunan reguler karyawan (12 hari/tahun)', 0, null, 12.0, 'per_year', 3.0, 'any', 1, 2],
        [3, 'Cuti Melahirkan (Maternity)', 'Cuti melahirkan untuk karyawati perempuan', 1, 'Surat HPL / Keterangan Dokter Kandungan', 90.0, 'per_event', 0, 'female', 1, 2],
        [3, 'Cuti Istri Melahirkan (Paternity)', 'Cuti mendampingi istri melahirkan khusus karyawan laki-laki', 0, null, 2.0, 'per_event', 0, 'male', 1, 2],
        [3, 'Cuti di Luar Tanggungan (Unpaid Leave)', 'Cuti panjang khusus tanpa pembayaran gaji pokok', 1, 'Surat Permohonan Resmi', null, 'unlimited', 0, 'any', 0, 2]
    ];

    $stmtSub = $pdo->prepare("
        INSERT INTO `permit_sub_types` (
            `category_id`, `name`, `description`, `requires_attachment`, `attachment_label`,
            `quota_days`, `quota_period`, `carry_over_max_days`, `gender_restriction`, `is_paid`, `requires_approval_step`, `is_active`
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, 1
        ) ON DUPLICATE KEY UPDATE name = VALUES(name)
    ");

    $seededSub = 0;
    foreach ($defaultSubTypes as $st) {
        // Cek duplicate by name & category
        $chk = $pdo->prepare("SELECT id FROM permit_sub_types WHERE category_id = ? AND name = ?");
        $chk->execute([$st[0], $st[1]]);
        if (!$chk->fetchColumn()) {
            $stmtSub->execute($st);
            $seededSub++;
        }
    }
    echo "   ✓ Berhasil inisialisasi {$seededSub} sub-jenis izin dinamis." . PHP_EOL;

    // 8. Inisialisasi Data Default: Sub-Kategori Pengeluaran
    echo "8. Inisialisasi data default sub-kategori pengeluaran (expense_categories)..." . PHP_EOL;
    $defaultExpCats = [
        ['Operasional Lapangan & Kantor', 'operational', 1, 200000.00, 10000000.00, '6101-OPR'],
        ['Pengadaan Proyek & Material', 'project', 1, null, 50000000.00, '6201-PRJ'],
        ['Alat Tulis & Perlengkapan Kantor (ATK)', 'office_supplies', 1, 150000.00, 5000000.00, '6102-ATK'],
        ['Perjalanan Dinas & Transportasi', 'travel', 1, 250000.00, 15000000.00, '6301-TRV'],
        ['Konsumsi & Jamuan Rapat', 'meeting_meals', 0, 300000.00, 5000000.00, '6103-CSM'],
        ['Lain-lain / Kebutuhan Darurat', 'other', 1, null, 5000000.00, '6999-OTH']
    ];

    $stmtExp = $pdo->prepare("
        INSERT INTO `expense_categories` (
            `name`, `code`, `requires_pm_approval`, `auto_approve_below_amount`, `budget_limit_monthly`, `default_gl_account_code`, `is_active`
        ) VALUES (
            ?, ?, ?, ?, ?, ?, 1
        ) ON DUPLICATE KEY UPDATE name = VALUES(name)
    ");

    $seededExp = 0;
    foreach ($defaultExpCats as $ec) {
        $chk = $pdo->prepare("SELECT id FROM expense_categories WHERE code = ?");
        $chk->execute([$ec[1]]);
        if (!$chk->fetchColumn()) {
            $stmtExp->execute($ec);
            $seededExp++;
        }
    }
    echo "   ✓ Berhasil inisialisasi {$seededExp} sub-kategori pengeluaran dinamis." . PHP_EOL;

    echo PHP_EOL . "=== MIGRASI MASTER DATA GRANULAR SELESAI DENGAN SUKSES! ===" . PHP_EOL;
} catch (Exception $e) {
    echo "❌ Terjadi error saat migrasi: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
