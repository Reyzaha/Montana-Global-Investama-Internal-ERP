-- ==========================================================
-- MGI ERP / HRIS Database Schema Update
-- Module: Legal Document Management
-- ==========================================================

USE `mgi_erp`;

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

-- Use try/catch logic for indexes if needed in prod, but for simple script we just run it.
-- It might fail if already exists, but we can safely ignore.
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_document_access_role ON document_access(document_id, role_id);
CREATE INDEX idx_document_access_user ON document_access(document_id, user_id);
