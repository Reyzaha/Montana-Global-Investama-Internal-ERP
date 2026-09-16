-- ==========================================================
-- MGI ERP / HRIS Initial Seed Data
-- Database: mgi_erp
-- ==========================================================

USE `mgi_erp`;

-- 1. SEED ROLES
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'IT', 'Information Technology Administrator & System Maintainer'),
(2, 'HRGA', 'Human Resources & General Affairs'),
(3, 'LEGAL', 'Legal Officer & Compliance'),
(4, 'FINANCE', 'Finance & Accounting'),
(5, 'BUSINESS DEVELOPMENT', 'Business Development & Partnerships'),
(6, 'PM', 'Project Management & Coordination'),
(7, 'ADMIN', 'Executive & General Administrator')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`);

-- 2. SEED INITIAL USERS
-- Default password: Password123!
-- password_hash generated using PASSWORD_BCRYPT (cost 10)
-- $2y$10$wT3G1B/Vsk6y6nflcZfFjeR.9N1j16s5V1r.V6wM.wK0Y36t8P/Xy is a placeholder hash for 'Password123!'
-- Let's put standard hashes for quick testing:
-- hash for 'Password123!': $2y$10$WqB8g2rU9xT6.zJkF6xUeeY8eN3iZJ1hI5p6l7K9o0q1r2s3t4u5v (we will generate dynamic via php in api/auth/init.php or standard seed)

INSERT INTO `users` (`id`, `email`, `password_hash`, `role_id`, `mfa_enabled`, `mfa_secret`, `status`) VALUES
(1, 'admin@mgi.co.id', '$2y$10$iMZZ.qHqXl6RjD3q9.X58.aUu1G5hZ5u2vO9l4H1k6kK0.Q5kU6gG', 7, 0, NULL, 'active'),
(2, 'it@mgi.co.id', '$2y$10$iMZZ.qHqXl6RjD3q9.X58.aUu1G5hZ5u2vO9l4H1k6kK0.Q5kU6gG', 1, 0, NULL, 'active')
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`), `status` = VALUES(`status`);

-- 3. SEED PERMIT TYPES
INSERT INTO `permit_types` (`id`, `code`, `name`, `description`, `requires_attachment`, `is_active`) VALUES
(1, 'izin', 'Izin', 'Pengajuan izin', 0, 1),
(2, 'sakit', 'Sakit', 'Pengajuan sakit', 1, 1),
(3, 'cuti', 'Cuti', 'Pengajuan cuti', 0, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`), `requires_attachment` = VALUES(`requires_attachment`), `is_active` = VALUES(`is_active`);

-- 4. SEED ATTENDANCE SETTINGS
INSERT INTO `attendance_settings` (`id`, `check_in_time`, `check_out_time`, `break_start_time`, `break_end_time`, `is_active`, `created_by`) VALUES
(1, '08:00:00', '17:00:00', '12:00:00', '13:00:00', 1, 1)
ON DUPLICATE KEY UPDATE `check_in_time` = VALUES(`check_in_time`), `check_out_time` = VALUES(`check_out_time`), `break_start_time` = VALUES(`break_start_time`), `break_end_time` = VALUES(`break_end_time`);

-- 5. SEED ATTENDANCE LOCATIONS
INSERT INTO `attendance_locations` (`id`, `name`, `latitude`, `longitude`, `radius_meters`, `is_active`, `created_by`) VALUES
(1, 'MGI Head Office', -6.12345600, 106.12345600, 100, 1, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `latitude` = VALUES(`latitude`), `longitude` = VALUES(`longitude`), `radius_meters` = VALUES(`radius_meters`);
