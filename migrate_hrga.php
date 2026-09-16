<?php
require 'backend/config/database.php';
$pdo = getDbConnection();

$sql = "
CREATE TABLE IF NOT EXISTS `user_profiles` (
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

CREATE TABLE IF NOT EXISTS `profile_change_requests` (
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
    CONSTRAINT `fk_pcr_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pcr_reviewer_id` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `profile_change_request_items` (
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
    CONSTRAINT `fk_pcri_req_id` FOREIGN KEY (`request_id`) REFERENCES `profile_change_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

try {
    $pdo->exec($sql);
    echo "Tables created successfully.\n";
} catch (Exception $e) {
    echo "Error creating tables: " . $e->getMessage() . "\n";
}
