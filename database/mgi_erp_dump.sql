-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: mgi_erp
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attendance_locations`
--

DROP TABLE IF EXISTS `attendance_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_locations`
--

LOCK TABLES `attendance_locations` WRITE;
/*!40000 ALTER TABLE `attendance_locations` DISABLE KEYS */;
INSERT INTO `attendance_locations` VALUES (1,'MGI Head Office',-6.12345600,106.12345600,100,'meter','CGV, Teras Kota CBD Sektor IV Lot VIIB Lt.2, Jl. Pahlawan Seribu, BSD City, Lengkong Gudang, Serpong, Lengkong Gudang, Serpong, Tangerang, Banten 15310, Jalan Pahlawan Seribu, BSD Sunburst CBD, Babakan, BSD City, Serpong, South Tangerang, Banten, 15310, Indonesia',1,1,8,'2026-09-01 09:07:27','2026-09-15 09:55:21');
/*!40000 ALTER TABLE `attendance_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance_settings`
--

DROP TABLE IF EXISTS `attendance_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_settings`
--

LOCK TABLES `attendance_settings` WRITE;
/*!40000 ALTER TABLE `attendance_settings` DISABLE KEYS */;
INSERT INTO `attendance_settings` VALUES (1,'08:00:00','17:00:00','12:00:00','13:00:00',1,1,'2026-09-01 09:07:27','2026-09-01 09:07:27');
/*!40000 ALTER TABLE `attendance_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendances`
--

DROP TABLE IF EXISTS `attendances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendances`
--

LOCK TABLES `attendances` WRITE;
/*!40000 ALTER TABLE `attendances` DISABLE KEYS */;
INSERT INTO `attendances` VALUES (1,1,'2026-09-01','07:40:10',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(2,1,'2026-09-02','07:41:11',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(3,1,'2026-09-03','07:42:12',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(4,1,'2026-09-04','07:43:13',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(5,1,'2026-09-07','07:44:14',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(6,1,'2026-09-08','07:45:15',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(7,1,'2026-09-09','07:46:16',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(8,1,'2026-09-10','07:47:17',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(9,1,'2026-09-11','07:48:18',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(10,1,'2026-09-14','07:49:19',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(11,1,'2026-09-15','07:50:20',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(12,1,'2026-09-16','07:51:21',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(13,1,'2026-09-17','07:52:22',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(14,1,'2026-09-18','07:53:23',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(15,1,'2026-09-21','07:54:24',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(16,1,'2026-09-22','07:55:25',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(17,1,'2026-09-23','07:56:26',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(18,1,'2026-09-24','07:57:27',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(19,1,'2026-09-25','07:40:28',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(20,1,'2026-09-28','07:41:29',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(21,4,'2026-09-01','07:40:10',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(22,4,'2026-09-02','08:24:15',NULL,NULL,NULL,NULL,'12:05:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:15:30',NULL,NULL,NULL,NULL,'late','2026-09-28 05:57:16','2026-09-28 05:57:16'),(23,4,'2026-09-03','07:42:12',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(24,4,'2026-09-04','07:43:13',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(25,4,'2026-09-07','07:44:14',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(26,4,'2026-09-08','08:24:15',NULL,NULL,NULL,NULL,'12:05:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:15:30',NULL,NULL,NULL,NULL,'late','2026-09-28 05:57:16','2026-09-28 05:57:16'),(27,4,'2026-09-09','07:46:16',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(28,4,'2026-09-10','07:47:17',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(29,4,'2026-09-11','07:48:18',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(30,4,'2026-09-14','08:24:15',NULL,NULL,NULL,NULL,'12:05:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:15:30',NULL,NULL,NULL,NULL,'late','2026-09-28 05:57:16','2026-09-28 05:57:16'),(31,4,'2026-09-15','07:50:20',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(32,4,'2026-09-16','07:51:21',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(33,4,'2026-09-17','07:52:22',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(34,4,'2026-09-18','08:24:15',NULL,NULL,NULL,NULL,'12:05:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:15:30',NULL,NULL,NULL,NULL,'late','2026-09-28 05:57:16','2026-09-28 05:57:16'),(35,4,'2026-09-21','07:54:24',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(36,4,'2026-09-22','07:55:25',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(37,4,'2026-09-23','07:56:26',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(38,4,'2026-09-24','08:24:15',NULL,NULL,NULL,NULL,'12:05:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:15:30',NULL,NULL,NULL,NULL,'late','2026-09-28 05:57:16','2026-09-28 05:57:16'),(39,4,'2026-09-25','07:40:28',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(40,4,'2026-09-28','07:41:29',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(41,2,'2026-09-01','07:33:11',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:02:07',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(42,2,'2026-09-02','07:40:28',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:20',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(43,2,'2026-09-03','07:47:45',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:08:33',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(44,2,'2026-09-04','07:54:02',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:00:46',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(45,2,'2026-09-07','07:31:19',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:03:59',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(46,2,'2026-09-08','07:38:36',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:06:12',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(47,2,'2026-09-09','07:45:53',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:09:25',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(48,2,'2026-09-10','07:52:10',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:01:38',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(49,2,'2026-09-11','07:59:27',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:04:51',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(50,2,'2026-09-14','07:36:44',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:07:04',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(51,2,'2026-09-15','07:43:01',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:10:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(52,2,'2026-09-16','07:50:18',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:02:30',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(53,2,'2026-09-17','07:57:35',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:43',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(54,2,'2026-09-18','07:34:52',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:08:56',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(55,2,'2026-09-21','07:41:09',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:00:09',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(56,2,'2026-09-22','07:48:26',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:03:22',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(57,2,'2026-09-23','07:55:43',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:06:35',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(58,2,'2026-09-24','07:32:00',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:09:48',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(59,2,'2026-09-25','07:39:17',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:01:01',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(60,2,'2026-09-28','07:46:34',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:04:14',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-29 01:53:11'),(61,3,'2026-09-01','07:40:10',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(62,3,'2026-09-02','07:41:11',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(63,3,'2026-09-03','07:42:12',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(64,3,'2026-09-04','07:43:13',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(65,3,'2026-09-07','07:44:14',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(66,3,'2026-09-08','07:45:15',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(67,3,'2026-09-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'absent','2026-09-28 05:57:16','2026-09-28 05:57:16'),(68,3,'2026-09-10','07:47:17',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(69,3,'2026-09-11','07:48:18',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(70,3,'2026-09-14','07:49:19',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(71,3,'2026-09-15','07:50:20',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(72,3,'2026-09-16','07:51:21',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(73,3,'2026-09-17','07:52:22',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(74,3,'2026-09-18','07:53:23',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(75,3,'2026-09-21','07:54:24',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(76,3,'2026-09-22','07:55:25',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(77,3,'2026-09-23','07:56:26',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(78,3,'2026-09-24','07:57:27',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(79,3,'2026-09-25','07:40:28',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(80,3,'2026-09-28','07:41:29',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(81,5,'2026-09-01','08:18:40',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:02:00',NULL,NULL,NULL,NULL,'17:45:00',NULL,NULL,NULL,NULL,'late','2026-09-28 05:57:16','2026-09-28 05:57:16'),(82,5,'2026-09-02','07:41:11',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(83,5,'2026-09-03','07:42:12',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(84,5,'2026-09-04','08:18:40',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:02:00',NULL,NULL,NULL,NULL,'17:45:00',NULL,NULL,NULL,NULL,'late','2026-09-28 05:57:16','2026-09-28 05:57:16'),(85,5,'2026-09-07','07:44:14',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(86,5,'2026-09-08','07:45:15',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(87,5,'2026-09-09','08:18:40',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:02:00',NULL,NULL,NULL,NULL,'17:45:00',NULL,NULL,NULL,NULL,'late','2026-09-28 05:57:16','2026-09-28 05:57:16'),(88,5,'2026-09-10','07:47:17',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(89,5,'2026-09-11','07:48:18',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(90,5,'2026-09-14','08:18:40',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:02:00',NULL,NULL,NULL,NULL,'17:45:00',NULL,NULL,NULL,NULL,'late','2026-09-28 05:57:16','2026-09-28 05:57:16'),(91,5,'2026-09-15','07:50:20',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(92,5,'2026-09-16','07:51:21',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(93,5,'2026-09-17','08:18:40',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:02:00',NULL,NULL,NULL,NULL,'17:45:00',NULL,NULL,NULL,NULL,'late','2026-09-28 05:57:16','2026-09-28 05:57:16'),(94,5,'2026-09-18','07:53:23',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(95,5,'2026-09-21','07:54:24',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(96,5,'2026-09-22','08:18:40',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:02:00',NULL,NULL,NULL,NULL,'17:45:00',NULL,NULL,NULL,NULL,'late','2026-09-28 05:57:16','2026-09-28 05:57:16'),(97,5,'2026-09-23','07:56:26',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(98,5,'2026-09-24','07:57:27',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(99,5,'2026-09-25','08:18:40',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:02:00',NULL,NULL,NULL,NULL,'17:45:00',NULL,NULL,NULL,NULL,'late','2026-09-28 05:57:16','2026-09-28 05:57:16'),(100,5,'2026-09-28','07:41:29',NULL,NULL,NULL,NULL,'12:00:00',NULL,NULL,NULL,NULL,'13:00:00',NULL,NULL,NULL,NULL,'17:05:00',NULL,NULL,NULL,NULL,'on_time','2026-09-28 05:57:16','2026-09-28 05:57:16'),(121,2,'2026-09-29','07:59:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'on_time','2026-09-29 01:53:11','2026-09-29 02:31:14');
/*!40000 ALTER TABLE `attendances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,2,'LOGIN_PASSWORD_OK','AUTH','2','Password verified, requires MFA enrollment','192.168.110.177','Dart/3.13 (dart:io)','2026-09-18 06:38:35'),(2,2,'LOGIN_PASSWORD_OK','AUTH','2','Password verified, requires MFA enrollment','192.168.110.177','Dart/3.13 (dart:io)','2026-09-18 08:05:56');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_access`
--

DROP TABLE IF EXISTS `document_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_access`
--

LOCK TABLES `document_access` WRITE;
/*!40000 ALTER TABLE `document_access` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_categories`
--

DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_categories`
--

LOCK TABLES `expense_categories` WRITE;
/*!40000 ALTER TABLE `expense_categories` DISABLE KEYS */;
INSERT INTO `expense_categories` VALUES (1,'Operasional Lapangan & Kantor','operational',1,200000.00,10000000.00,'6101-OPR',1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(2,'Pengadaan Proyek & Material','project',1,NULL,50000000.00,'6201-PRJ',1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(3,'Alat Tulis & Perlengkapan Kantor (ATK)','office_supplies',1,150000.00,5000000.00,'6102-ATK',1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(4,'Perjalanan Dinas & Transportasi','travel',1,250000.00,15000000.00,'6301-TRV',1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(5,'Konsumsi & Jamuan Rapat','meeting_meals',0,300000.00,5000000.00,'6103-CSM',1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(6,'Lain-lain / Kebutuhan Darurat','other',1,NULL,5000000.00,'6999-OTH',1,'2026-09-14 11:22:43','2026-09-14 11:58:57');
/*!40000 ALTER TABLE `expense_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_request_items`
--

DROP TABLE IF EXISTS `expense_request_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_request_items`
--

LOCK TABLES `expense_request_items` WRITE;
/*!40000 ALTER TABLE `expense_request_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `expense_request_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_requests`
--

DROP TABLE IF EXISTS `expense_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_requests`
--

LOCK TABLES `expense_requests` WRITE;
/*!40000 ALTER TABLE `expense_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `expense_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `it_devices`
--

DROP TABLE IF EXISTS `it_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `it_devices`
--

LOCK TABLES `it_devices` WRITE;
/*!40000 ALTER TABLE `it_devices` DISABLE KEYS */;
/*!40000 ALTER TABLE `it_devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `it_emails`
--

DROP TABLE IF EXISTS `it_emails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `it_emails`
--

LOCK TABLES `it_emails` WRITE;
/*!40000 ALTER TABLE `it_emails` DISABLE KEYS */;
/*!40000 ALTER TABLE `it_emails` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_balances`
--

DROP TABLE IF EXISTS `leave_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_balances`
--

LOCK TABLES `leave_balances` WRITE;
/*!40000 ALTER TABLE `leave_balances` DISABLE KEYS */;
INSERT INTO `leave_balances` VALUES (1,2,3,2026,4.0,0.0,0.0,'2026-09-29 02:45:17','2026-09-29 02:45:17');
/*!40000 ALTER TABLE `leave_balances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lifecycle_checklists`
--

DROP TABLE IF EXISTS `lifecycle_checklists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lifecycle_checklists`
--

LOCK TABLES `lifecycle_checklists` WRITE;
/*!40000 ALTER TABLE `lifecycle_checklists` DISABLE KEYS */;
/*!40000 ALTER TABLE `lifecycle_checklists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_attempts`
--

DROP TABLE IF EXISTS `login_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_attempts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(191) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `is_success` tinyint(1) NOT NULL DEFAULT 0,
  `attempted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts_email` (`email`,`attempted_at`),
  KEY `idx_login_attempts_ip` (`ip_address`,`attempted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_attempts`
--

LOCK TABLES `login_attempts` WRITE;
/*!40000 ALTER TABLE `login_attempts` DISABLE KEYS */;
INSERT INTO `login_attempts` VALUES (1,'montanaglobalinvestamait@gmail.com','192.168.110.177',1,'2026-09-18 06:38:35'),(2,'montanaglobalinvestamait@gmail.com','192.168.110.177',1,'2026-09-18 08:05:56'),(3,'hrga@tes.com','::1',0,'2026-09-28 06:38:44'),(4,'hrga@tes.com','::1',0,'2026-09-28 06:38:49');
/*!40000 ALTER TABLE `login_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `module_permissions`
--

DROP TABLE IF EXISTS `module_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `module_permissions`
--

LOCK TABLES `module_permissions` WRITE;
/*!40000 ALTER TABLE `module_permissions` DISABLE KEYS */;
INSERT INTO `module_permissions` VALUES (1,1,'devices',1,1,1,1,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(2,1,'emails',1,1,1,1,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(3,1,'users',1,1,1,1,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(4,1,'attendance',1,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(5,1,'permits',1,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(6,1,'expense',1,1,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(7,1,'petty_cash',1,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(8,1,'legal_docs',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(9,1,'payroll',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(10,1,'overtime',1,1,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(11,1,'access_control',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(12,2,'devices',1,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(13,2,'emails',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(14,2,'users',1,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(15,2,'attendance',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(16,2,'permits',1,1,1,0,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(17,2,'expense',1,1,1,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(18,2,'petty_cash',1,1,1,0,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(19,2,'legal_docs',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(20,2,'payroll',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(21,2,'overtime',1,1,1,0,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(22,2,'access_control',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(23,3,'devices',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(24,3,'emails',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(25,3,'users',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(26,3,'attendance',1,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(27,3,'permits',1,1,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(28,3,'expense',1,1,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(29,3,'petty_cash',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(30,3,'legal_docs',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(31,3,'payroll',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(32,3,'overtime',1,1,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(33,3,'access_control',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(34,4,'devices',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(35,4,'emails',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(36,4,'users',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(37,4,'attendance',1,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(38,4,'permits',1,1,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(39,4,'expense',1,1,1,0,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(40,4,'petty_cash',1,1,1,0,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(41,4,'legal_docs',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(42,4,'payroll',1,0,0,0,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(43,4,'overtime',1,1,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(44,4,'access_control',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(45,5,'devices',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(46,5,'emails',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(47,5,'users',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(48,5,'attendance',1,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(49,5,'permits',1,1,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(50,5,'expense',1,1,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(51,5,'petty_cash',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(52,5,'legal_docs',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(53,5,'payroll',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(54,5,'overtime',1,1,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(55,5,'access_control',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(56,6,'devices',1,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(57,6,'emails',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(58,6,'users',1,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(59,6,'attendance',1,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(60,6,'permits',1,0,0,0,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(61,6,'expense',1,1,1,0,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(62,6,'petty_cash',1,0,0,0,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(63,6,'legal_docs',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(64,6,'payroll',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(65,6,'overtime',1,1,0,0,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(66,6,'access_control',0,0,0,0,0,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(67,7,'devices',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(68,7,'emails',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(69,7,'users',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(70,7,'attendance',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(71,7,'permits',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(72,7,'expense',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(73,7,'petty_cash',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(74,7,'legal_docs',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(75,7,'payroll',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(76,7,'overtime',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43'),(77,7,'access_control',1,1,1,1,1,'2026-09-14 11:22:43','2026-09-14 11:22:43');
/*!40000 ALTER TABLE `module_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `overtime_requests`
--

DROP TABLE IF EXISTS `overtime_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `overtime_requests`
--

LOCK TABLES `overtime_requests` WRITE;
/*!40000 ALTER TABLE `overtime_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `overtime_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_components`
--

DROP TABLE IF EXISTS `payroll_components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_components`
--

LOCK TABLES `payroll_components` WRITE;
/*!40000 ALTER TABLE `payroll_components` DISABLE KEYS */;
/*!40000 ALTER TABLE `payroll_components` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_runs`
--

DROP TABLE IF EXISTS `payroll_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_runs`
--

LOCK TABLES `payroll_runs` WRITE;
/*!40000 ALTER TABLE `payroll_runs` DISABLE KEYS */;
/*!40000 ALTER TABLE `payroll_runs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permit_approvals`
--

DROP TABLE IF EXISTS `permit_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permit_approvals`
--

LOCK TABLES `permit_approvals` WRITE;
/*!40000 ALTER TABLE `permit_approvals` DISABLE KEYS */;
/*!40000 ALTER TABLE `permit_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permit_attachments`
--

DROP TABLE IF EXISTS `permit_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permit_attachments`
--

LOCK TABLES `permit_attachments` WRITE;
/*!40000 ALTER TABLE `permit_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `permit_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permit_sub_types`
--

DROP TABLE IF EXISTS `permit_sub_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permit_sub_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `requires_attachment` tinyint(1) NOT NULL DEFAULT 0,
  `requires_time` tinyint(1) NOT NULL DEFAULT 0,
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
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permit_sub_types`
--

LOCK TABLES `permit_sub_types` WRITE;
/*!40000 ALTER TABLE `permit_sub_types` DISABLE KEYS */;
INSERT INTO `permit_sub_types` VALUES (13,1,'Terlambat','Izin datang terlambat ke kantor',0,1,NULL,NULL,'per_year',0.0,'any',1,2,1,'2026-09-23 15:32:24','2026-09-29 09:37:30'),(14,1,'Pulang Cepat','Izin pulang lebih cepat dari jam kerja resmi',0,1,NULL,NULL,'per_year',0.0,'any',1,2,1,'2026-09-23 15:32:24','2026-09-29 09:37:30'),(15,1,'Dinas','Tugas / perjalanan dinas kantor di luar area kerja',0,0,NULL,NULL,'per_year',0.0,'any',1,2,1,'2026-09-23 15:32:24','2026-09-29 09:37:30'),(16,1,'Izin Tidak Masuk Kerja',NULL,0,0,NULL,NULL,'per_year',0.0,'any',1,2,0,'2026-09-23 15:32:24','2026-09-29 09:37:30'),(17,2,'Sakit','Pengajuan sakit (dengan surat dokter)',1,0,'Surat Keterangan Dokter',NULL,'per_year',0.0,'any',1,2,0,'2026-09-23 15:32:24','2026-09-29 09:37:30'),(18,3,'Cuti Tahunan','Hak cuti tahunan reguler karyawan (memotong kuota cuti tahunan)',0,0,NULL,12.0,'per_year',0.0,'any',1,2,1,'2026-09-23 15:32:24','2026-09-29 09:37:30'),(19,3,'Istri Melahirkan',NULL,0,0,NULL,2.0,'per_event',0.0,'male',1,2,0,'2026-09-23 15:32:24','2026-09-29 09:37:30'),(20,3,'Cuti Melahirkan',NULL,1,0,'Surat HPL / Keterangan Dokter Kandungan',90.0,'per_event',0.0,'female',1,2,0,'2026-09-23 15:32:24','2026-09-29 09:37:30'),(21,3,'Kematian',NULL,0,0,NULL,2.0,'per_event',0.0,'any',1,2,0,'2026-09-23 15:32:24','2026-09-29 09:37:30'),(22,3,'Sunatan',NULL,0,0,NULL,2.0,'per_event',0.0,'any',1,2,0,'2026-09-23 15:32:24','2026-09-29 09:37:30'),(23,3,'Pernikahan Karyawan',NULL,0,0,NULL,3.0,'lifetime',0.0,'any',1,2,0,'2026-09-23 15:32:24','2026-09-29 09:37:30'),(24,3,'Pernikahan Anak',NULL,0,0,NULL,2.0,'per_event',0.0,'any',1,2,0,'2026-09-23 15:32:24','2026-09-29 09:37:30'),(25,2,'Sakit dengan Surat Dokter','Pengajuan sakit dengan melampirkan surat dokter resmi',1,0,'Surat Keterangan Dokter',NULL,'per_year',0.0,'any',1,2,1,'2026-09-29 09:37:30','2026-09-29 09:37:30'),(26,2,'Sakit tanpa Surat','Pengajuan sakit ringan tanpa surat keterangan dokter',0,0,NULL,NULL,'per_year',0.0,'any',1,2,1,'2026-09-29 09:37:30','2026-09-29 09:37:30'),(27,3,'Cuti Khusus','Cuti khusus berbayar sesuai ketentuan (melahirkan, pernikahan, kedukaan, dll)',0,0,NULL,NULL,'per_event',0.0,'any',1,2,1,'2026-09-29 09:37:30','2026-09-29 09:37:30');
/*!40000 ALTER TABLE `permit_sub_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permit_types`
--

DROP TABLE IF EXISTS `permit_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permit_types`
--

LOCK TABLES `permit_types` WRITE;
/*!40000 ALTER TABLE `permit_types` DISABLE KEYS */;
INSERT INTO `permit_types` VALUES (1,'izin','Izin','Pengajuan izin umum',0,1,'2026-09-01 08:35:37','2026-09-03 08:01:16'),(2,'sakit','Sakit','Pengajuan sakit (dengan surat dokter)',0,1,'2026-09-01 08:35:37','2026-09-03 08:01:16'),(3,'cuti','Cuti','Pengajuan cuti tahunan/khusus',0,1,'2026-09-01 08:35:37','2026-09-03 08:01:16');
/*!40000 ALTER TABLE `permit_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permits`
--

DROP TABLE IF EXISTS `permits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permits` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `permit_type_id` int(10) unsigned NOT NULL,
  `permit_sub_type_id` int(11) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `permit_time` time DEFAULT NULL,
  `permit_end_time` time DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permits`
--

LOCK TABLES `permits` WRITE;
/*!40000 ALTER TABLE `permits` DISABLE KEYS */;
INSERT INTO `permits` VALUES (2,2,3,18,'2026-09-15','2026-09-15',NULL,NULL,'Cuti tahunan acara keluarga','approved','2026-09-29 02:50:43','2026-09-29 02:50:43');
/*!40000 ALTER TABLE `permits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `petty_cash_transactions`
--

DROP TABLE IF EXISTS `petty_cash_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `petty_cash_transactions`
--

LOCK TABLES `petty_cash_transactions` WRITE;
/*!40000 ALTER TABLE `petty_cash_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `petty_cash_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profile_change_request_items`
--

DROP TABLE IF EXISTS `profile_change_request_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profile_change_request_items`
--

LOCK TABLES `profile_change_request_items` WRITE;
/*!40000 ALTER TABLE `profile_change_request_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `profile_change_request_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profile_change_requests`
--

DROP TABLE IF EXISTS `profile_change_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profile_change_requests`
--

LOCK TABLES `profile_change_requests` WRITE;
/*!40000 ALTER TABLE `profile_change_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `profile_change_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'IT','Information Technology Administrator & System Maintainer','2026-09-01 07:34:17'),(2,'HRGA','Human Resources & General Affairs','2026-09-01 07:34:17'),(3,'LEGAL','Legal Officer & Compliance','2026-09-01 07:34:17'),(4,'FINANCE','Finance & Accounting','2026-09-01 07:34:17'),(5,'BUSINESS DEVELOPMENT','Business Development & Partnerships','2026-09-01 07:34:17'),(6,'PM','Project Management & Coordination / Operations','2026-09-01 07:34:17'),(7,'ADMIN','Executive & General Administrator','2026-09-01 07:34:17');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_permission_overrides`
--

DROP TABLE IF EXISTS `user_permission_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_permission_overrides`
--

LOCK TABLES `user_permission_overrides` WRITE;
/*!40000 ALTER TABLE `user_permission_overrides` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_permission_overrides` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_profiles`
--

DROP TABLE IF EXISTS `user_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_profiles`
--

LOCK TABLES `user_profiles` WRITE;
/*!40000 ALTER TABLE `user_profiles` DISABLE KEYS */;
INSERT INTO `user_profiles` VALUES (1,'Administrator MGI',NULL,NULL,NULL,NULL,'081200000001',NULL,0,NULL,NULL,NULL,'Executive Administrator','2026-09-15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-15 09:55:21','2026-09-15 09:55:21'),(2,'IT Support MGI','LAKI-LAKI',NULL,NULL,NULL,'081200000002',NULL,0,NULL,NULL,NULL,'IT Support Administrator','2026-09-15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-15 09:55:21','2026-09-28 05:55:37'),(3,'Legal Officer MGI',NULL,NULL,NULL,NULL,'081200000003',NULL,0,NULL,NULL,NULL,'Legal Officer & Compliance','2026-09-15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-15 09:55:21','2026-09-15 09:55:21'),(4,'HRGA Officer MGI',NULL,NULL,NULL,NULL,'081200000004',NULL,0,NULL,NULL,NULL,'Human Resources & General Affairs','2026-09-15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-15 09:55:21','2026-09-15 09:55:21'),(5,'Operations Manager MGI',NULL,NULL,NULL,NULL,'081200000005',NULL,0,NULL,NULL,NULL,'Operations Manager','2026-09-15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-15 09:55:21','2026-09-15 09:55:21');
/*!40000 ALTER TABLE `user_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin@gmail.com','$2y$12$82nVA3qgHZBeHqfP5DFSK.001ibvYYFOQjXzZlYrxtMVHrxW18zom',7,0,NULL,'active',0,'2026-09-15 09:55:21','2026-09-15 09:55:21'),(2,'montanaglobalinvestamait@gmail.com','$2y$12$82nVA3qgHZBeHqfP5DFSK.001ibvYYFOQjXzZlYrxtMVHrxW18zom',1,0,NULL,'active',0,'2026-09-15 09:55:21','2026-09-15 09:55:21'),(3,'montanaglobalinvestamalegal@gmail.com','$2y$12$82nVA3qgHZBeHqfP5DFSK.001ibvYYFOQjXzZlYrxtMVHrxW18zom',3,0,NULL,'active',0,'2026-09-15 09:55:21','2026-09-15 09:55:21'),(4,'montanaglobalinvestamahrga@gmail.com','$2y$12$82nVA3qgHZBeHqfP5DFSK.001ibvYYFOQjXzZlYrxtMVHrxW18zom',2,0,NULL,'active',0,'2026-09-15 09:55:21','2026-09-15 09:55:21'),(5,'montanaglobalinvestamaom@gmail.com','$2y$12$82nVA3qgHZBeHqfP5DFSK.001ibvYYFOQjXzZlYrxtMVHrxW18zom',6,0,NULL,'active',0,'2026-09-15 09:55:21','2026-09-15 09:55:21');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-29 10:05:06
