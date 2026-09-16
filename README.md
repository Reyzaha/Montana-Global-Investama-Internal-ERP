# 🏢 PT Montana Global Investama (MGI) — ERP & HRIS System

Selamat datang di repositori resmi **MGI ERP & HRIS**.

Sistem ini dirancang untuk mengintegrasikan operasional perusahaan PT Montana Global Investama yang mencakup:
- **HRIS & Presensi Geofencing GPS** (Check-In, Break In/Out, Check-Out)
- **Employee Self-Service (ESS) & Pengajuan Perubahan Profil Karyawan**
- **Perizinan Karyawan (Izin, Sakit, Cuti) 2-Tier Approval (HRGA & PM)**
- **Pengadaan Biaya Operasional (Expense Ticketing) & Verifikasi Fisik Barang PM**
- **Buku Kas Kecil Terintegrasi (Petty Cash Ledger with Concurrency Lock)**
- **Manajemen Berkas Hukum & Akses Granular (Legal Document Vault)**
- **Manajemen Aset Perangkat Hardware & Akun Email Perusahaan (IT Governance)**
- **Multi-Factor Authentication (MFA / 2FA RFC 6238 TOTP) & Audit Trail**

---

## 📖 Dokumentasi Lengkap & Master Prompt

Dokumentasi teknis menyeluruh, arsitektur database, diagram alur bisnis (Mermaid), daftar REST API, hingga master AI prompt tersedia di:
👉 **[MGI_ERP_DOCUMENTATION.md](./MGI_ERP_DOCUMENTATION.md)**

---

## 🚀 Panduan Singkat Menjalankan Sistem

1. Pastikan modul **Apache** dan **MySQL** pada control panel **XAMPP** telah berjalan (`Start`).
2. Buat basis data bernama `mgi_erp` di phpMyAdmin / MySQL CLI.
3. Impor skema dan seeder awal:
   ```bash
   php fresh_reset_and_seed.php
   ```
4. Buka browser dan akses aplikasi melalui:
   ```
   http://localhost/Montana-Global-Investama-ERP/
   ```
5. Akun bawaan sistem untuk pengujian:
   * **IT Admin**: `it@mgi.co.id` | Password: `Password123!`
   * **HRGA Officer**: `hrga@mgi.co.id` | Password: `Password123!`
   * **Legal Officer**: `legal@mgi.co.id` | Password: `Password123!`
   * **Finance Officer**: `finance@mgi.co.id` | Password: `Password123!`
   * **BizDev**: `bizdev@mgi.co.id` | Password: `Password123!`
   * **Project Manager (PM)**: `pm@mgi.co.id` | Password: `Password123!`
   * **Superadmin**: `admin@mgi.co.id` | Password: `Password123!`
