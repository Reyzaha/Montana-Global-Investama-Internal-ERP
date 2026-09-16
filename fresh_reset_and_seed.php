<?php
/**
 * MGI ERP - Fresh Reset & Seed Script
 * Menghapus SEMUA data testing/dummy dan membuat 5 akun resmi MGI:
 * 1. admin@gmail.com (ADMIN)
 * 2. montanaglobalinvestamait@gmail.com (IT)
 * 3. montanaglobalinvestamalegal@gmail.com (LEGAL)
 * 4. montanaglobalinvestamahrga@gmail.com (HRGA)
 * 5. montanaglobalinvestamaom@gmail.com (PM / Operations Manager)
 */

require_once __DIR__ . '/backend/config/database.php';

try {
    $pdo = getDbConnection();
    echo "=====================================================\n";
    echo "   MEMULAI RESET TOTAL DATABASE MGI ERP (PRODUKSI)   \n";
    echo "=====================================================\n\n";

    // 1. Nonaktifkan foreign key checks
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

    // 2. Daftar tabel transaksi/dummy yang akan di-truncate (dikosongkan total)
    $tablesToTruncate = [
        'attendances',
        'permit_approvals',
        'permit_attachments',
        'permits',
        'overtime_requests',
        'lifecycle_checklists',
        'payroll_runs',
        'payroll_components',
        'expense_request_items',
        'expense_requests',
        'petty_cash_transactions',
        'document_access',
        'documents',
        'profile_change_request_items',
        'profile_change_requests',
        'it_devices',
        'it_emails',
        'leave_balances',
        'login_attempts',
        'notifications',
        'audit_logs',
        'sessions',
        'user_permission_overrides',
        'user_profiles',
        'users'
    ];

    foreach ($tablesToTruncate as $tbl) {
        // Cek apakah tabel ada di database
        $checkTable = $pdo->query("SHOW TABLES LIKE '$tbl'")->fetchColumn();
        if ($checkTable) {
            $pdo->exec("TRUNCATE TABLE `$tbl`");
            echo "✓ Tabel `$tbl` berhasil dikosongkan (TRUNCATE).\n";
        }
    }

    echo "\n-----------------------------------------------------\n";
    echo "Menyinkronkan Master Data & Konfigurasi Sistem...\n";

    // 3. Pastikan master roles lengkap (1 - 7)
    $roles = [
        [1, 'IT', 'Information Technology Administrator & System Maintainer'],
        [2, 'HRGA', 'Human Resources & General Affairs'],
        [3, 'LEGAL', 'Legal Officer & Compliance'],
        [4, 'FINANCE', 'Finance & Accounting'],
        [5, 'BUSINESS DEVELOPMENT', 'Business Development & Partnerships'],
        [6, 'PM', 'Project Management & Coordination / Operations'],
        [7, 'ADMIN', 'Executive & General Administrator']
    ];

    $stmtRole = $pdo->prepare("
        INSERT INTO `roles` (`id`, `name`, `description`) 
        VALUES (?, ?, ?) 
        ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`)
    ");

    foreach ($roles as $r) {
        $stmtRole->execute($r);
    }
    echo "✓ Master roles (1 s/d 7) dipastikan lengkap.\n";

    // 4. Pastikan master permit_types terisi
    $pdo->exec("
        INSERT INTO `permit_types` (`id`, `code`, `name`, `description`, `requires_attachment`, `is_active`) VALUES
        (1, 'izin', 'Izin', 'Pengajuan izin umum', 0, 1),
        (2, 'sakit', 'Sakit', 'Pengajuan sakit (dengan surat dokter)', 1, 1),
        (3, 'cuti', 'Cuti', 'Pengajuan cuti tahunan/khusus', 0, 1)
        ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`), `requires_attachment` = VALUES(`requires_attachment`), `is_active` = VALUES(`is_active`)
    ");
    echo "✓ Master permit types berhasil disinkronkan.\n";

    // 5. Pastikan master attendance settings & location terisi
    $pdo->exec("
        INSERT INTO `attendance_settings` (`id`, `check_in_time`, `check_out_time`, `break_start_time`, `break_end_time`, `is_active`, `created_by`)
        VALUES (1, '08:00:00', '17:00:00', '12:00:00', '13:00:00', 1, NULL)
        ON DUPLICATE KEY UPDATE `check_in_time` = VALUES(`check_in_time`), `check_out_time` = VALUES(`check_out_time`), `break_start_time` = VALUES(`break_start_time`), `break_end_time` = VALUES(`break_end_time`)
    ");

    $pdo->exec("
        INSERT INTO `attendance_locations` (`id`, `name`, `latitude`, `longitude`, `radius`, `radius_unit`, `is_active`, `created_by`)
        VALUES (1, 'MGI Head Office', -6.12345600, 106.12345600, 100, 'meter', 1, NULL)
        ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `latitude` = VALUES(`latitude`), `longitude` = VALUES(`longitude`), `radius` = VALUES(`radius`), `radius_unit` = VALUES(`radius_unit`)
    ");
    echo "✓ Master attendance settings & locations siap.\n";

    // 6. Buat 5 Akun Resmi MGI
    $officialPassword = 'admin123321mgi';
    $passwordHash = password_hash($officialPassword, PASSWORD_BCRYPT, ['cost' => 12]);

    $accounts = [
        [
            'id' => 1,
            'email' => 'admin@gmail.com',
            'role_id' => 7,
            'name' => 'Administrator MGI',
            'position' => 'Executive Administrator',
            'phone' => '081200000001'
        ],
        [
            'id' => 2,
            'email' => 'montanaglobalinvestamait@gmail.com',
            'role_id' => 1,
            'name' => 'IT Support MGI',
            'position' => 'IT Support Administrator',
            'phone' => '081200000002'
        ],
        [
            'id' => 3,
            'email' => 'montanaglobalinvestamalegal@gmail.com',
            'role_id' => 3,
            'name' => 'Legal Officer MGI',
            'position' => 'Legal Officer & Compliance',
            'phone' => '081200000003'
        ],
        [
            'id' => 4,
            'email' => 'montanaglobalinvestamahrga@gmail.com',
            'role_id' => 2,
            'name' => 'HRGA Officer MGI',
            'position' => 'Human Resources & General Affairs',
            'phone' => '081200000004'
        ],
        [
            'id' => 5,
            'email' => 'montanaglobalinvestamaom@gmail.com',
            'role_id' => 6,
            'name' => 'Operations Manager MGI',
            'position' => 'Operations Manager',
            'phone' => '081200000005'
        ]
    ];

    echo "\n-----------------------------------------------------\n";
    echo "Membuat 5 Akun Resmi MGI...\n";

    // Cek apakah kolom force_password_change ada
    $checkCol = $pdo->query("
        SELECT COUNT(*) FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'users' 
          AND COLUMN_NAME = 'force_password_change'
    ")->fetchColumn();

    if ($checkCol > 0) {
        $stmtUser = $pdo->prepare("
            INSERT INTO `users` (`id`, `email`, `password_hash`, `role_id`, `mfa_enabled`, `mfa_secret`, `status`, `force_password_change`)
            VALUES (:id, :email, :password_hash, :role_id, 0, NULL, 'active', 0)
        ");
    } else {
        $stmtUser = $pdo->prepare("
            INSERT INTO `users` (`id`, `email`, `password_hash`, `role_id`, `mfa_enabled`, `mfa_secret`, `status`)
            VALUES (:id, :email, :password_hash, :role_id, 0, NULL, 'active')
        ");
    }

    $stmtProfile = $pdo->prepare("
        INSERT INTO `user_profiles` (`user_id`, `name`, `position`, `phone`, `join_date`, `created_at`)
        VALUES (:user_id, :name, :position, :phone, CURDATE(), NOW())
    ");

    foreach ($accounts as $acc) {
        $stmtUser->execute([
            ':id' => $acc['id'],
            ':email' => $acc['email'],
            ':password_hash' => $passwordHash,
            ':role_id' => $acc['role_id']
        ]);

        $stmtProfile->execute([
            ':user_id' => $acc['id'],
            ':name' => $acc['name'],
            ':position' => $acc['position'],
            ':phone' => $acc['phone']
        ]);

        echo "✓ Akun #{$acc['id']} {$acc['email']} | {$acc['position']} (Role ID: {$acc['role_id']}) berhasil dibuat.\n";
    }

    // Set owner created_by attendance ke user 1 (Admin)
    $pdo->exec("UPDATE `attendance_settings` SET `created_by` = 1 WHERE `id` = 1");
    $pdo->exec("UPDATE `attendance_locations` SET `created_by` = 1 WHERE `id` = 1");

    // 7. Aktifkan kembali Foreign Key Checks
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

    // 8. Hapus file dummy di backend/uploads & storage (pertahankan .htaccess)
    echo "\n-----------------------------------------------------\n";
    echo "Membersihkan Berkas Dummy di Folder Upload & Storage...\n";

    $uploadDirs = [
        __DIR__ . '/backend/uploads/expenses',
        __DIR__ . '/backend/uploads/realization',
        __DIR__ . '/backend/storage/documents',
        __DIR__ . '/backend/storage/employees',
    ];

    $deletedFilesCount = 0;
    foreach ($uploadDirs as $dir) {
        if (!is_dir($dir)) continue;
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($files as $fileinfo) {
            $filename = $fileinfo->getFilename();
            // JANGAN hapus file .htaccess
            if ($filename === '.htaccess') {
                continue;
            }
            if ($fileinfo->isFile()) {
                @unlink($fileinfo->getRealPath());
                $deletedFilesCount++;
            }
        }
    }
    echo "✓ Berhasil menghapus $deletedFilesCount file bukti/lampiran dummy dari folder uploads & storage.\n";

    echo "\n=====================================================\n";
    echo "  RESET TOTAL DATABASE & SETUP 5 AKUN RESMI BERHASIL! \n";
    echo "=====================================================\n";
    echo "Daftar Akun Siap Digunakan:\n";
    echo "1. admin@gmail.com                    -> Password: $officialPassword\n";
    echo "2. montanaglobalinvestamait@gmail.com  -> Password: $officialPassword\n";
    echo "3. montanaglobalinvestamalegal@gmail.com -> Password: $officialPassword\n";
    echo "4. montanaglobalinvestamahrga@gmail.com  -> Password: $officialPassword\n";
    echo "5. montanaglobalinvestamaom@gmail.com    -> Password: $officialPassword\n";

} catch (Exception $e) {
    if (isset($pdo)) {
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    }
    echo "ERROR: " . $e->getMessage() . "\n";
}
