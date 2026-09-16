-- ==========================================================
-- MGI ERP / HRIS Database Schema
-- Database: mgi_erp
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `mgi_erp` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `mgi_erp`;

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(191) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role_id` INT UNSIGNED NOT NULL,
    `mfa_enabled` TINYINT(1) DEFAULT 0,
    `mfa_secret` VARCHAR(128) NULL,
    `status` ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_users_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. SESSIONS TABLE (Optional persistent tracking)
CREATE TABLE IF NOT EXISTS `sessions` (
    `id` VARCHAR(128) PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `expires_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NULL,
    `action` VARCHAR(100) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `target_id` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_audit_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. PERMIT TYPES TABLE
CREATE TABLE IF NOT EXISTS `permit_types` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `requires_attachment` TINYINT(1) DEFAULT 0,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. PERMITS TABLE
CREATE TABLE IF NOT EXISTS `permits` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `permit_type_id` INT UNSIGNED NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('pending_hrga', 'pending_pm', 'approved', 'rejected') DEFAULT 'pending_hrga',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_permits_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_permits_permit_type_id` FOREIGN KEY (`permit_type_id`) REFERENCES `permit_types` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. PERMIT ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS `permit_attachments` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `permit_id` BIGINT UNSIGNED NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `stored_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NULL,
    `file_size` INT UNSIGNED NULL,
    `uploaded_by` INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_permit_attachments_permit_id` FOREIGN KEY (`permit_id`) REFERENCES `permits` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_permit_attachments_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. PERMIT APPROVALS HISTORY TABLE
CREATE TABLE IF NOT EXISTS `permit_approvals` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `permit_id` BIGINT UNSIGNED NOT NULL,
    `approver_user_id` INT UNSIGNED NOT NULL,
    `approver_role` VARCHAR(50) NOT NULL,
    `step` INT UNSIGNED NOT NULL,
    `status` ENUM('approved', 'rejected') NOT NULL,
    `note` TEXT NULL,
    `approved_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_permit_approvals_permit_id` FOREIGN KEY (`permit_id`) REFERENCES `permits` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_permit_approvals_approver_user_id` FOREIGN KEY (`approver_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `reference_type` VARCHAR(50) NULL,
    `reference_id` BIGINT UNSIGNED NULL,
    `is_read` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. ATTENDANCE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS `attendance_settings` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `check_in_time` TIME NOT NULL,
    `check_out_time` TIME NOT NULL,
    `break_start_time` TIME NOT NULL DEFAULT '12:00:00',
    `break_end_time` TIME NOT NULL DEFAULT '13:00:00',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_by` INT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_attendance_settings_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. ATTENDANCE LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS `attendance_locations` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `radius_meters` INT UNSIGNED NOT NULL DEFAULT 100,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_by` INT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_attendance_locations_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. ATTENDANCES TABLE
CREATE TABLE IF NOT EXISTS `attendances` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `date` DATE NOT NULL,
    `check_in` TIME NULL,
    `check_in_latitude` DECIMAL(10, 8) NULL,
    `check_in_longitude` DECIMAL(11, 8) NULL,
    `check_in_accuracy` DECIMAL(8, 2) NULL,
    `check_in_distance` INT UNSIGNED NULL,
    `break_start` TIME NULL,
    `break_start_latitude` DECIMAL(10, 8) NULL,
    `break_start_longitude` DECIMAL(11, 8) NULL,
    `break_start_accuracy` DECIMAL(8, 2) NULL,
    `break_start_distance` INT UNSIGNED NULL,
    `break_end` TIME NULL,
    `break_end_latitude` DECIMAL(10, 8) NULL,
    `break_end_longitude` DECIMAL(11, 8) NULL,
    `break_end_accuracy` DECIMAL(8, 2) NULL,
    `break_end_distance` INT UNSIGNED NULL,
    `check_out` TIME NULL,
    `check_out_latitude` DECIMAL(10, 8) NULL,
    `check_out_longitude` DECIMAL(11, 8) NULL,
    `check_out_accuracy` DECIMAL(8, 2) NULL,
    `check_out_distance` INT UNSIGNED NULL,
    `status` ENUM('on_time', 'late', 'absent', 'pending') DEFAULT 'pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_attendances_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `uq_user_date` (`user_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS `user_profiles` (
    `user_id` INT UNSIGNED NOT NULL PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `gender` ENUM('LAKI-LAKI','PEREMPUAN') DEFAULT NULL,
    `birth_place` VARCHAR(191) DEFAULT NULL,
    `birth_date` DATE DEFAULT NULL,
    `address` TEXT DEFAULT NULL,
    `phone` VARCHAR(50) DEFAULT NULL,
    `marital_status` ENUM('MENIKAH','LAJANG','CERAI') DEFAULT NULL,
    `dependents` INT DEFAULT 0,
    `education` ENUM('SMA / SMK','S1','S2','Other') DEFAULT NULL,
    `major` VARCHAR(191) DEFAULT NULL,
    `school` VARCHAR(255) DEFAULT NULL,
    `position` VARCHAR(100) DEFAULT NULL,
    `join_date` DATE DEFAULT NULL,
    `ktp_no` VARCHAR(50) DEFAULT NULL,
    `kk_no` VARCHAR(50) DEFAULT NULL,
    `ktp_doc_path` VARCHAR(500) DEFAULT NULL,
    `kk_doc_path` VARCHAR(500) DEFAULT NULL,
    `ijazah_doc_path` VARCHAR(500) DEFAULT NULL,
    `photo_path` VARCHAR(500) DEFAULT NULL,
    `photo_mime` VARCHAR(100) DEFAULT NULL,
    `photo_size` BIGINT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_user_profiles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. PROFILE CHANGE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS `profile_change_requests` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    `requested_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `reviewed_at` TIMESTAMP NULL DEFAULT NULL,
    `reviewed_by` INT UNSIGNED DEFAULT NULL,
    `review_note` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pcr_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pcr_reviewer_id` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. PROFILE CHANGE REQUEST ITEMS TABLE
CREATE TABLE IF NOT EXISTS `profile_change_request_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `request_id` INT UNSIGNED NOT NULL,
    `field_name` VARCHAR(100) NOT NULL,
    `old_value` TEXT DEFAULT NULL,
    `new_value` TEXT DEFAULT NULL,
    `old_file` VARCHAR(500) DEFAULT NULL,
    `new_file` VARCHAR(500) DEFAULT NULL,
    `new_file_mime` VARCHAR(100) DEFAULT NULL,
    `new_file_size` BIGINT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pcri_req_id` FOREIGN KEY (`request_id`) REFERENCES `profile_change_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. LEGAL DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS `documents` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `original_file_name` VARCHAR(255) NOT NULL,
    `stored_file_name` VARCHAR(255) NOT NULL,
    `file_extension` VARCHAR(20) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `file_size` BIGINT UNSIGNED NOT NULL,
    `storage_disk` VARCHAR(50) DEFAULT 'local',
    `storage_path` VARCHAR(255) NOT NULL,
    `checksum` VARCHAR(128) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(100) NOT NULL,
    `reference_number` VARCHAR(100) NULL,
    `project_id` INT UNSIGNED NULL,
    `expiry_date` DATE NULL,
    `status` ENUM('ACTIVE', 'ARCHIVED') DEFAULT 'ACTIVE',
    `uploaded_by` INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    CONSTRAINT `fk_documents_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. DOCUMENT ACCESS TABLE
CREATE TABLE IF NOT EXISTS `document_access` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `document_id` VARCHAR(50) NOT NULL,
    `role_id` INT UNSIGNED NULL,
    `user_id` INT UNSIGNED NULL,
    `permission` ENUM('VIEW', 'VIEW_DOWNLOAD') NOT NULL DEFAULT 'VIEW',
    `granted_by` INT UNSIGNED NOT NULL,
    `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NULL,
    CONSTRAINT `fk_doc_access_doc_id` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_doc_access_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_doc_access_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_doc_access_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. IT DEVICES TABLE
CREATE TABLE IF NOT EXISTS `it_devices` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `asset_code` VARCHAR(50) NOT NULL UNIQUE,
    `device_name` VARCHAR(100) NOT NULL,
    `device_type` ENUM('Laptop', 'PC Desktop', 'Smartphone', 'Tablet', 'Monitor', 'Printer', 'Lainnya') NOT NULL DEFAULT 'Laptop',
    `brand` VARCHAR(50) NOT NULL,
    `model` VARCHAR(100) NOT NULL,
    `serial_number` VARCHAR(100) NULL,
    `imei_number` VARCHAR(50) NULL,
    `phone_number` VARCHAR(30) NULL,
    `department_role` VARCHAR(100) NULL,
    `specs` TEXT NULL,
    `assigned_user_id` INT UNSIGNED NULL,
    `assigned_date` DATE NULL,
    `status` ENUM('assigned', 'in_stock', 'under_maintenance', 'damaged', 'disposed') NOT NULL DEFAULT 'in_stock',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_it_devices_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. IT EMAILS TABLE
CREATE TABLE IF NOT EXISTS `it_emails` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `email_address` VARCHAR(191) NOT NULL UNIQUE,
    `account_type` ENUM('Personal Employee', 'Department / Shared', 'System / Service', 'Customer Service / External') NOT NULL DEFAULT 'Personal Employee',
    `purpose_description` TEXT NOT NULL,
    `primary_user_id` INT UNSIGNED NULL,
    `linked_device_id` INT UNSIGNED NULL,
    `status` ENUM('active', 'suspended', 'forwarded', 'archived') NOT NULL DEFAULT 'active',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_it_emails_user` FOREIGN KEY (`primary_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_it_emails_device` FOREIGN KEY (`linked_device_id`) REFERENCES `it_devices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

