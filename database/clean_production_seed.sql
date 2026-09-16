-- ==========================================================
-- MGI ERP Database Dump
-- Database: mgi_erp
-- Generated: 2026-09-15 16:57:18
-- Total Tables: 32
-- ==========================================================

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET NAMES utf8mb4;

-- --------------------------------------------------------
-- Struktur tabel `attendance_locations`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `attendance_locations`;
CREATE TABLE `attendance_locations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `radius` int(10) unsigned NOT NULL DEFAULT 100,
  `radius_unit` varchar(10) NOT NULL DEFAULT 'meter',
  `address` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(10) unsigned DEFAULT NULL,
  `updated_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_attendance_locations_created_by` (`created_by`),
  CONSTRAINT `fk_attendance_locations_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `attendance_locations` VALUES 
('1', 'MGI Head Office', '-6.12345600', '106.12345600', '100', 'meter', 'CGV, Teras Kota CBD Sektor IV Lot VIIB Lt.2, Jl. Pahlawan Seribu, BSD City, Lengkong Gudang, Serpong, Lengkong Gudang, Serpong, Tangerang, Banten 15310, Jalan Pahlawan Seribu, BSD Sunburst CBD, Babakan, BSD City, Serpong, South Tangerang, Banten, 15310, Indonesia', '1', '1', '8', '2026-09-01 16:07:27', '2026-09-15 16:55:21');

-- --------------------------------------------------------
-- Struktur tabel `attendance_settings`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `attendance_settings`;
CREATE TABLE `attendance_settings` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `check_in_time` time NOT NULL,
  `check_out_time` time NOT NULL,
  `break_start_time` time NOT NULL DEFAULT '12:00:00',
  `break_end_time` time NOT NULL DEFAULT '13:00:00',
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_attendance_settings_created_by` (`created_by`),
  CONSTRAINT `fk_attendance_settings_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `attendance_settings` VALUES 
('1', '08:00:00', '17:00:00', '12:00:00', '13:00:00', '1', '1', '2026-09-01 16:07:27', '2026-09-01 16:07:27');

-- --------------------------------------------------------
-- Struktur tabel `attendances`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `attendances`;
CREATE TABLE `attendances` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `date` date NOT NULL,
  `check_in` time DEFAULT NULL,
  `check_in_latitude` decimal(10,8) DEFAULT NULL,
  `check_in_longitude` decimal(11,8) DEFAULT NULL,
  `check_in_accuracy` decimal(8,2) DEFAULT NULL,
  `check_in_distance` int(10) unsigned DEFAULT NULL,
  `break_start` time DEFAULT NULL,
  `break_start_latitude` decimal(10,8) DEFAULT NULL,
  `break_start_longitude` decimal(11,8) DEFAULT NULL,
  `break_start_accuracy` decimal(8,2) DEFAULT NULL,
  `break_start_distance` int(10) unsigned DEFAULT NULL,
  `break_end` time DEFAULT NULL,
  `break_end_latitude` decimal(10,8) DEFAULT NULL,
  `break_end_longitude` decimal(11,8) DEFAULT NULL,
  `break_end_accuracy` decimal(8,2) DEFAULT NULL,
  `break_end_distance` int(10) unsigned DEFAULT NULL,
  `check_out` time DEFAULT NULL,
  `check_out_latitude` decimal(10,8) DEFAULT NULL,
  `check_out_longitude` decimal(11,8) DEFAULT NULL,
  `check_out_accuracy` decimal(8,2) DEFAULT NULL,
  `check_out_distance` int(10) unsigned DEFAULT NULL,
  `status` enum('on_time','late','absent','pending') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_date` (`user_id`,`date`),
  CONSTRAINT `fk_attendances_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `audit_logs`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(50) NOT NULL,
  `target_id` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_audit_logs_user_id` (`user_id`),
  CONSTRAINT `fk_audit_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `document_access`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `document_access`;
CREATE TABLE `document_access` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_id` varchar(50) NOT NULL,
  `role_id` int(10) unsigned DEFAULT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `permission` enum('VIEW','VIEW_DOWNLOAD') NOT NULL DEFAULT 'VIEW',
  `granted_by` int(10) unsigned NOT NULL,
  `granted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_doc_access_role_id` (`role_id`),
  KEY `fk_doc_access_user_id` (`user_id`),
  KEY `fk_doc_access_granted_by` (`granted_by`),
  KEY `idx_document_access_role` (`document_id`,`role_id`),
  KEY `idx_document_access_user` (`document_id`,`user_id`),
  CONSTRAINT `fk_doc_access_doc_id` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_doc_access_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_doc_access_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_doc_access_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `documents`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `documents`;
CREATE TABLE `documents` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `original_file_name` varchar(255) NOT NULL,
  `stored_file_name` varchar(255) NOT NULL,
  `file_extension` varchar(20) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_size` bigint(20) unsigned NOT NULL,
  `storage_disk` varchar(50) DEFAULT 'local',
  `storage_path` varchar(255) NOT NULL,
  `checksum` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `project_id` int(10) unsigned DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `status` enum('ACTIVE','ARCHIVED') DEFAULT 'ACTIVE',
  `uploaded_by` int(10) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_documents_uploaded_by` (`uploaded_by`),
  KEY `idx_documents_status` (`status`),
  KEY `idx_documents_category` (`category`),
  CONSTRAINT `fk_documents_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `expense_categories`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `expense_categories`;
CREATE TABLE `expense_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `code` varchar(50) NOT NULL,
  `requires_pm_approval` tinyint(1) NOT NULL DEFAULT 1,
  `auto_approve_below_amount` decimal(15,2) DEFAULT NULL,
  `budget_limit_monthly` decimal(15,2) DEFAULT NULL,
  `default_gl_account_code` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_exp_code` (`code`),
  KEY `idx_exp_cat_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `expense_categories` VALUES 
('1', 'Operasional Lapangan & Kantor', 'operational', '1', '200000.00', '10000000.00', '6101-OPR', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('2', 'Pengadaan Proyek & Material', 'project', '1', NULL, '50000000.00', '6201-PRJ', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('3', 'Alat Tulis & Perlengkapan Kantor (ATK)', 'office_supplies', '1', '150000.00', '5000000.00', '6102-ATK', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('4', 'Perjalanan Dinas & Transportasi', 'travel', '1', '250000.00', '15000000.00', '6301-TRV', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('5', 'Konsumsi & Jamuan Rapat', 'meeting_meals', '0', '300000.00', '5000000.00', '6103-CSM', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('6', 'Lain-lain / Kebutuhan Darurat', 'other', '1', NULL, '5000000.00', '6999-OTH', '1', '2026-09-14 11:22:43', '2026-09-14 11:58:57');

-- --------------------------------------------------------
-- Struktur tabel `expense_request_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `expense_request_items`;
CREATE TABLE `expense_request_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `expense_request_id` int(10) unsigned NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `qty` decimal(10,2) NOT NULL DEFAULT 1.00,
  `unit` varchar(50) NOT NULL DEFAULT 'pcs',
  `unit_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_eri_request_id` (`expense_request_id`),
  CONSTRAINT `fk_eri_request_id` FOREIGN KEY (`expense_request_id`) REFERENCES `expense_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `expense_requests`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `expense_requests`;
CREATE TABLE `expense_requests` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_number` varchar(50) NOT NULL,
  `created_by` int(10) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` enum('operational','project','office_supplies','travel','other') DEFAULT 'operational',
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `realized_amount` decimal(15,2) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `receipt_doc_path` varchar(500) DEFAULT NULL,
  `item_photo_path` varchar(500) DEFAULT NULL,
  `status` enum('pending_pm','approved','pending_verification','completed','rejected','disbursed') DEFAULT 'pending_pm',
  `note` text DEFAULT NULL,
  `realization_notes` text DEFAULT NULL,
  `verification_notes` text DEFAULT NULL,
  `approved_by` int(10) unsigned DEFAULT NULL,
  `verified_by` int(10) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `realized_at` datetime DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `disbursed_at` datetime DEFAULT NULL,
  `disbursed_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_number` (`ticket_number`),
  KEY `fk_exp_created_by` (`created_by`),
  KEY `fk_exp_approved_by` (`approved_by`),
  KEY `fk_exp_disbursed_by` (`disbursed_by`),
  KEY `fk_exp_verified_by` (`verified_by`),
  CONSTRAINT `fk_exp_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_exp_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_exp_disbursed_by` FOREIGN KEY (`disbursed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_exp_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `it_devices`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `it_devices`;
CREATE TABLE `it_devices` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `asset_code` varchar(50) NOT NULL,
  `device_name` varchar(100) NOT NULL,
  `device_type` enum('Laptop','PC Desktop','Smartphone','Tablet','Monitor','Printer','Lainnya') NOT NULL DEFAULT 'Laptop',
  `brand` varchar(50) NOT NULL,
  `model` varchar(100) NOT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `imei_number` varchar(50) DEFAULT NULL,
  `phone_number` varchar(30) DEFAULT NULL,
  `department_role` varchar(100) DEFAULT NULL,
  `specs` text DEFAULT NULL,
  `assigned_user_id` int(10) unsigned DEFAULT NULL,
  `assigned_date` date DEFAULT NULL,
  `status` enum('assigned','in_stock','under_maintenance','damaged','disposed') NOT NULL DEFAULT 'in_stock',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_code` (`asset_code`),
  KEY `fk_it_devices_user` (`assigned_user_id`),
  CONSTRAINT `fk_it_devices_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `it_emails`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `it_emails`;
CREATE TABLE `it_emails` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `email_address` varchar(191) NOT NULL,
  `account_type` enum('Personal Employee','Department / Shared','System / Service','Customer Service / External') NOT NULL DEFAULT 'Personal Employee',
  `purpose_description` text NOT NULL,
  `primary_user_id` int(10) unsigned DEFAULT NULL,
  `linked_device_id` int(10) unsigned DEFAULT NULL,
  `status` enum('active','suspended','forwarded','archived') NOT NULL DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_address` (`email_address`),
  KEY `fk_it_emails_user` (`primary_user_id`),
  KEY `fk_it_emails_device` (`linked_device_id`),
  CONSTRAINT `fk_it_emails_device` FOREIGN KEY (`linked_device_id`) REFERENCES `it_devices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_it_emails_user` FOREIGN KEY (`primary_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `leave_balances`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `leave_balances`;
CREATE TABLE `leave_balances` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `permit_type_id` int(10) unsigned NOT NULL,
  `year` smallint(5) unsigned NOT NULL,
  `quota_days` decimal(5,1) NOT NULL DEFAULT 12.0,
  `used_days` decimal(5,1) NOT NULL DEFAULT 0.0,
  `carried_over_days` decimal(5,1) NOT NULL DEFAULT 0.0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_type_year` (`user_id`,`permit_type_id`,`year`),
  KEY `fk_lb_permit_type_id` (`permit_type_id`),
  CONSTRAINT `fk_lb_permit_type_id` FOREIGN KEY (`permit_type_id`) REFERENCES `permit_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lb_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `lifecycle_checklists`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `lifecycle_checklists`;
CREATE TABLE `lifecycle_checklists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('onboarding','offboarding') NOT NULL DEFAULT 'onboarding',
  `category` enum('it','hrga','legal') NOT NULL,
  `task_name` varchar(255) NOT NULL,
  `is_completed` tinyint(1) NOT NULL DEFAULT 0,
  `completed_by` int(11) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_lifecycle_user_type` (`user_id`,`type`),
  KEY `idx_lifecycle_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `login_attempts`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `login_attempts`;
CREATE TABLE `login_attempts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(191) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `is_success` tinyint(1) NOT NULL DEFAULT 0,
  `attempted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts_email` (`email`,`attempted_at`),
  KEY `idx_login_attempts_ip` (`ip_address`,`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `module_permissions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `module_permissions`;
CREATE TABLE `module_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) NOT NULL,
  `module_code` varchar(50) NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT 0,
  `can_create` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `can_approve` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_role_module` (`role_id`,`module_code`),
  KEY `idx_perm_role` (`role_id`),
  KEY `idx_perm_module` (`module_code`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `module_permissions` VALUES 
('1', '1', 'devices', '1', '1', '1', '1', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('2', '1', 'emails', '1', '1', '1', '1', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('3', '1', 'users', '1', '1', '1', '1', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('4', '1', 'attendance', '1', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('5', '1', 'permits', '1', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('6', '1', 'expense', '1', '1', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('7', '1', 'petty_cash', '1', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('8', '1', 'legal_docs', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('9', '1', 'payroll', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('10', '1', 'overtime', '1', '1', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('11', '1', 'access_control', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('12', '2', 'devices', '1', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('13', '2', 'emails', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('14', '2', 'users', '1', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('15', '2', 'attendance', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('16', '2', 'permits', '1', '1', '1', '0', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('17', '2', 'expense', '1', '1', '1', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('18', '2', 'petty_cash', '1', '1', '1', '0', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('19', '2', 'legal_docs', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('20', '2', 'payroll', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('21', '2', 'overtime', '1', '1', '1', '0', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('22', '2', 'access_control', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('23', '3', 'devices', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('24', '3', 'emails', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('25', '3', 'users', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('26', '3', 'attendance', '1', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('27', '3', 'permits', '1', '1', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('28', '3', 'expense', '1', '1', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('29', '3', 'petty_cash', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('30', '3', 'legal_docs', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('31', '3', 'payroll', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('32', '3', 'overtime', '1', '1', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('33', '3', 'access_control', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('34', '4', 'devices', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('35', '4', 'emails', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('36', '4', 'users', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('37', '4', 'attendance', '1', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('38', '4', 'permits', '1', '1', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('39', '4', 'expense', '1', '1', '1', '0', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('40', '4', 'petty_cash', '1', '1', '1', '0', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('41', '4', 'legal_docs', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('42', '4', 'payroll', '1', '0', '0', '0', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('43', '4', 'overtime', '1', '1', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('44', '4', 'access_control', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('45', '5', 'devices', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('46', '5', 'emails', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('47', '5', 'users', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('48', '5', 'attendance', '1', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('49', '5', 'permits', '1', '1', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('50', '5', 'expense', '1', '1', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('51', '5', 'petty_cash', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('52', '5', 'legal_docs', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('53', '5', 'payroll', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('54', '5', 'overtime', '1', '1', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('55', '5', 'access_control', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('56', '6', 'devices', '1', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('57', '6', 'emails', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('58', '6', 'users', '1', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('59', '6', 'attendance', '1', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('60', '6', 'permits', '1', '0', '0', '0', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('61', '6', 'expense', '1', '1', '1', '0', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('62', '6', 'petty_cash', '1', '0', '0', '0', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('63', '6', 'legal_docs', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('64', '6', 'payroll', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('65', '6', 'overtime', '1', '1', '0', '0', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('66', '6', 'access_control', '0', '0', '0', '0', '0', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('67', '7', 'devices', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('68', '7', 'emails', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('69', '7', 'users', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('70', '7', 'attendance', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('71', '7', 'permits', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('72', '7', 'expense', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('73', '7', 'petty_cash', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('74', '7', 'legal_docs', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('75', '7', 'payroll', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('76', '7', 'overtime', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('77', '7', 'access_control', '1', '1', '1', '1', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43');

-- --------------------------------------------------------
-- Struktur tabel `notifications`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) NOT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` bigint(20) unsigned DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_notifications_user_id` (`user_id`),
  CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `overtime_requests`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `overtime_requests`;
CREATE TABLE `overtime_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `duration_hours` decimal(4,2) NOT NULL DEFAULT 0.00,
  `reason` text NOT NULL,
  `status` enum('pending_hrga','pending_pm','approved','rejected') NOT NULL DEFAULT 'pending_hrga',
  `hrga_approved_by` int(11) DEFAULT NULL,
  `hrga_approved_at` datetime DEFAULT NULL,
  `pm_approved_by` int(11) DEFAULT NULL,
  `pm_approved_at` datetime DEFAULT NULL,
  `rejection_note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_overtime_user_date` (`user_id`,`date`),
  KEY `idx_overtime_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `payroll_components`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `payroll_components`;
CREATE TABLE `payroll_components` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `base_salary` decimal(15,2) NOT NULL DEFAULT 0.00,
  `fixed_allowance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `effective_date` date NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_component` (`user_id`),
  KEY `idx_comp_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `payroll_runs`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `payroll_runs`;
CREATE TABLE `payroll_runs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `period_month` tinyint(4) NOT NULL,
  `period_year` smallint(6) NOT NULL,
  `base_salary` decimal(15,2) NOT NULL DEFAULT 0.00,
  `allowance_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `overtime_hours` decimal(5,2) NOT NULL DEFAULT 0.00,
  `overtime_pay` decimal(15,2) NOT NULL DEFAULT 0.00,
  `late_count` int(11) NOT NULL DEFAULT 0,
  `deduction_late` decimal(15,2) NOT NULL DEFAULT 0.00,
  `absent_count` int(11) NOT NULL DEFAULT 0,
  `deduction_absent` decimal(15,2) NOT NULL DEFAULT 0.00,
  `net_salary` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` enum('draft','finalized','paid') NOT NULL DEFAULT 'draft',
  `processed_by` int(11) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_period` (`user_id`,`period_month`,`period_year`),
  KEY `idx_payroll_period` (`period_year`,`period_month`),
  KEY `idx_payroll_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `permit_approvals`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `permit_approvals`;
CREATE TABLE `permit_approvals` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `permit_id` bigint(20) unsigned NOT NULL,
  `approver_user_id` int(10) unsigned NOT NULL,
  `approver_role` varchar(50) NOT NULL,
  `step` int(10) unsigned NOT NULL,
  `status` enum('approved','rejected') NOT NULL,
  `note` text DEFAULT NULL,
  `approved_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_permit_approvals_permit_id` (`permit_id`),
  KEY `fk_permit_approvals_approver_user_id` (`approver_user_id`),
  CONSTRAINT `fk_permit_approvals_approver_user_id` FOREIGN KEY (`approver_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_permit_approvals_permit_id` FOREIGN KEY (`permit_id`) REFERENCES `permits` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `permit_attachments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `permit_attachments`;
CREATE TABLE `permit_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `permit_id` bigint(20) unsigned NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `stored_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size` int(10) unsigned DEFAULT NULL,
  `uploaded_by` int(10) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_permit_attachments_permit_id` (`permit_id`),
  KEY `fk_permit_attachments_uploaded_by` (`uploaded_by`),
  CONSTRAINT `fk_permit_attachments_permit_id` FOREIGN KEY (`permit_id`) REFERENCES `permits` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_permit_attachments_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `permit_sub_types`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `permit_sub_types`;
CREATE TABLE `permit_sub_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `requires_attachment` tinyint(1) NOT NULL DEFAULT 0,
  `attachment_label` varchar(150) DEFAULT NULL,
  `quota_days` decimal(5,1) DEFAULT NULL,
  `quota_period` enum('per_year','per_event','lifetime','unlimited') NOT NULL DEFAULT 'per_year',
  `carry_over_max_days` decimal(5,1) NOT NULL DEFAULT 0.0,
  `gender_restriction` enum('any','male','female') NOT NULL DEFAULT 'any',
  `is_paid` tinyint(1) NOT NULL DEFAULT 1,
  `requires_approval_step` tinyint(1) NOT NULL DEFAULT 2,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sub_category` (`category_id`),
  KEY `idx_sub_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permit_sub_types` VALUES 
('1', '1', 'Izin Keperluan Pribadi', 'Pengajuan izin keperluan personal/keluarga mendesak', '0', NULL, '3.0', 'per_year', '0.0', 'any', '1', '2', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('2', '1', 'Izin Menikah Karyawan', 'Izin melangsungkan pernikahan karyawan', '0', NULL, '3.0', 'lifetime', '0.0', 'any', '1', '2', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('3', '1', 'Izin Kematian Keluarga Inti', 'Izin kedukaan untuk keluarga inti (orang tua/suami/istri/anak)', '0', NULL, '2.0', 'per_event', '0.0', 'any', '1', '2', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('4', '1', 'Izin Ibadah Keagamaan (Haji/Umroh)', 'Izin menjalankan ibadah keagamaan panjang', '1', 'Bukti Pendaftaran / Tiket Keberangkatan', NULL, 'unlimited', '0.0', 'any', '1', '2', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('5', '2', 'Sakit Ringan (1-2 Hari)', 'Sakit ringan istirahat di rumah tanpa rawat inap', '0', 'Surat Keterangan Dokter (Opsional)', NULL, 'unlimited', '0.0', 'any', '1', '2', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('6', '2', 'Sakit dengan Surat Dokter (>2 Hari)', 'Sakit lebih dari 2 hari kerja dengan surat dokter wajib', '1', 'Surat Keterangan Dokter', NULL, 'unlimited', '0.0', 'any', '1', '2', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('7', '2', 'Rawat Inap / Opname RS', 'Menjalani perawatan rawat inap di rumah sakit', '1', 'Surat Rawat Inap RS / Resume Medis', NULL, 'unlimited', '0.0', 'any', '1', '2', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('8', '3', 'Cuti Tahunan', 'Hak cuti tahunan reguler karyawan (12 hari/tahun)', '0', NULL, '12.0', 'per_year', '3.0', 'any', '1', '2', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('9', '3', 'Cuti Melahirkan (Maternity)', 'Cuti melahirkan untuk karyawati perempuan', '1', 'Surat HPL / Keterangan Dokter Kandungan', '90.0', 'per_event', '0.0', 'female', '1', '2', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('10', '3', 'Cuti Istri Melahirkan (Paternity)', 'Cuti mendampingi istri melahirkan khusus karyawan laki-laki', '0', NULL, '2.0', 'per_event', '0.0', 'male', '1', '2', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43'),
('11', '3', 'Cuti di Luar Tanggungan (Unpaid Leave)', 'Cuti panjang khusus tanpa pembayaran gaji pokok', '1', 'Surat Permohonan Resmi', NULL, 'unlimited', '0.0', 'any', '0', '2', '1', '2026-09-14 11:22:43', '2026-09-14 11:22:43');

-- --------------------------------------------------------
-- Struktur tabel `permit_types`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `permit_types`;
CREATE TABLE `permit_types` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `requires_attachment` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permit_types` VALUES 
('1', 'izin', 'Izin', 'Pengajuan izin umum', '0', '1', '2026-09-01 15:35:37', '2026-09-03 15:01:16'),
('2', 'sakit', 'Sakit', 'Pengajuan sakit (dengan surat dokter)', '1', '1', '2026-09-01 15:35:37', '2026-09-03 15:01:16'),
('3', 'cuti', 'Cuti', 'Pengajuan cuti tahunan/khusus', '0', '1', '2026-09-01 15:35:37', '2026-09-03 15:01:16');

-- --------------------------------------------------------
-- Struktur tabel `permits`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `permits`;
CREATE TABLE `permits` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `permit_type_id` int(10) unsigned NOT NULL,
  `permit_sub_type_id` int(11) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `description` text NOT NULL,
  `status` enum('pending_hrga','pending_pm','approved','rejected') DEFAULT 'pending_hrga',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_permits_user_id` (`user_id`),
  KEY `fk_permits_permit_type_id` (`permit_type_id`),
  KEY `idx_permits_sub_type` (`permit_sub_type_id`),
  CONSTRAINT `fk_permits_permit_type_id` FOREIGN KEY (`permit_type_id`) REFERENCES `permit_types` (`id`),
  CONSTRAINT `fk_permits_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `petty_cash_transactions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `petty_cash_transactions`;
CREATE TABLE `petty_cash_transactions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `transaction_type` enum('inflow','outflow') NOT NULL,
  `expense_request_id` int(10) unsigned DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `current_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `description` text NOT NULL,
  `proof_doc_path` varchar(500) DEFAULT NULL,
  `created_by` int(10) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_pct_expense_id` (`expense_request_id`),
  KEY `fk_pct_created_by` (`created_by`),
  CONSTRAINT `fk_pct_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_pct_expense_id` FOREIGN KEY (`expense_request_id`) REFERENCES `expense_requests` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `profile_change_request_items`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `profile_change_request_items`;
CREATE TABLE `profile_change_request_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `request_id` int(10) unsigned NOT NULL,
  `field_name` varchar(100) NOT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `old_file` varchar(500) DEFAULT NULL,
  `new_file` varchar(500) DEFAULT NULL,
  `new_file_mime` varchar(100) DEFAULT NULL,
  `new_file_size` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_pcri_req_id` (`request_id`),
  CONSTRAINT `fk_pcri_req_id` FOREIGN KEY (`request_id`) REFERENCES `profile_change_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `profile_change_requests`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `profile_change_requests`;
CREATE TABLE `profile_change_requests` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` int(10) unsigned DEFAULT NULL,
  `review_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_pcr_user_id` (`user_id`),
  KEY `fk_pcr_reviewer_id` (`reviewed_by`),
  CONSTRAINT `fk_pcr_reviewer_id` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pcr_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `roles`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` VALUES 
('1', 'IT', 'Information Technology Administrator & System Maintainer', '2026-09-01 14:34:17'),
('2', 'HRGA', 'Human Resources & General Affairs', '2026-09-01 14:34:17'),
('3', 'LEGAL', 'Legal Officer & Compliance', '2026-09-01 14:34:17'),
('4', 'FINANCE', 'Finance & Accounting', '2026-09-01 14:34:17'),
('5', 'BUSINESS DEVELOPMENT', 'Business Development & Partnerships', '2026-09-01 14:34:17'),
('6', 'PM', 'Project Management & Coordination / Operations', '2026-09-01 14:34:17'),
('7', 'ADMIN', 'Executive & General Administrator', '2026-09-01 14:34:17');

-- --------------------------------------------------------
-- Struktur tabel `sessions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` varchar(128) NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_sessions_user_id` (`user_id`),
  CONSTRAINT `fk_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `user_permission_overrides`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `user_permission_overrides`;
CREATE TABLE `user_permission_overrides` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `module_code` varchar(50) NOT NULL,
  `action` enum('view','create','edit','delete','approve') NOT NULL,
  `override_type` enum('grant','deny') NOT NULL DEFAULT 'grant',
  `reason` text NOT NULL,
  `granted_by` int(11) NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_override` (`user_id`,`module_code`,`action`),
  KEY `idx_override_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- Struktur tabel `user_profiles`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `user_profiles`;
CREATE TABLE `user_profiles` (
  `user_id` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `gender` enum('LAKI-LAKI','PEREMPUAN') DEFAULT NULL,
  `birth_place` varchar(191) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `marital_status` enum('MENIKAH','LAJANG','CERAI') DEFAULT NULL,
  `dependents` int(11) DEFAULT 0,
  `education` enum('SMA / SMK','S1','S2','Other') DEFAULT NULL,
  `major` varchar(191) DEFAULT NULL,
  `school` varchar(255) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `join_date` date DEFAULT NULL,
  `ktp_no` varchar(50) DEFAULT NULL,
  `kk_no` varchar(50) DEFAULT NULL,
  `ktp_doc_path` varchar(500) DEFAULT NULL,
  `kk_doc_path` varchar(500) DEFAULT NULL,
  `ijazah_doc_path` varchar(500) DEFAULT NULL,
  `photo_path` varchar(500) DEFAULT NULL,
  `photo_mime` varchar(100) DEFAULT NULL,
  `photo_size` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_profiles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `user_profiles` VALUES 
('1', 'Administrator MGI', NULL, NULL, NULL, NULL, '081200000001', NULL, '0', NULL, NULL, NULL, 'Executive Administrator', '2026-09-15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-15 16:55:21', '2026-09-15 16:55:21'),
('2', 'IT Support MGI', NULL, NULL, NULL, NULL, '081200000002', NULL, '0', NULL, NULL, NULL, 'IT Support Administrator', '2026-09-15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-15 16:55:21', '2026-09-15 16:55:21'),
('3', 'Legal Officer MGI', NULL, NULL, NULL, NULL, '081200000003', NULL, '0', NULL, NULL, NULL, 'Legal Officer & Compliance', '2026-09-15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-15 16:55:21', '2026-09-15 16:55:21'),
('4', 'HRGA Officer MGI', NULL, NULL, NULL, NULL, '081200000004', NULL, '0', NULL, NULL, NULL, 'Human Resources & General Affairs', '2026-09-15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-15 16:55:21', '2026-09-15 16:55:21'),
('5', 'Operations Manager MGI', NULL, NULL, NULL, NULL, '081200000005', NULL, '0', NULL, NULL, NULL, 'Operations Manager', '2026-09-15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-15 16:55:21', '2026-09-15 16:55:21');

-- --------------------------------------------------------
-- Struktur tabel `users`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` int(10) unsigned NOT NULL,
  `mfa_enabled` tinyint(1) DEFAULT 0,
  `mfa_secret` varchar(128) DEFAULT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `force_password_change` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_role_id` (`role_id`),
  CONSTRAINT `fk_users_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` VALUES 
('1', 'admin@gmail.com', '$2y$12$82nVA3qgHZBeHqfP5DFSK.001ibvYYFOQjXzZlYrxtMVHrxW18zom', '7', '0', NULL, 'active', '0', '2026-09-15 16:55:21', '2026-09-15 16:55:21'),
('2', 'montanaglobalinvestamait@gmail.com', '$2y$12$82nVA3qgHZBeHqfP5DFSK.001ibvYYFOQjXzZlYrxtMVHrxW18zom', '1', '0', NULL, 'active', '0', '2026-09-15 16:55:21', '2026-09-15 16:55:21'),
('3', 'montanaglobalinvestamalegal@gmail.com', '$2y$12$82nVA3qgHZBeHqfP5DFSK.001ibvYYFOQjXzZlYrxtMVHrxW18zom', '3', '0', NULL, 'active', '0', '2026-09-15 16:55:21', '2026-09-15 16:55:21'),
('4', 'montanaglobalinvestamahrga@gmail.com', '$2y$12$82nVA3qgHZBeHqfP5DFSK.001ibvYYFOQjXzZlYrxtMVHrxW18zom', '2', '0', NULL, 'active', '0', '2026-09-15 16:55:21', '2026-09-15 16:55:21'),
('5', 'montanaglobalinvestamaom@gmail.com', '$2y$12$82nVA3qgHZBeHqfP5DFSK.001ibvYYFOQjXzZlYrxtMVHrxW18zom', '6', '0', NULL, 'active', '0', '2026-09-15 16:55:21', '2026-09-15 16:55:21');

SET FOREIGN_KEY_CHECKS=1;
-- Dump completed at 2026-09-15 16:57:18
