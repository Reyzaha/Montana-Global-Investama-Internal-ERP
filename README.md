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

---

## 🗂️ Struktur Repositori (Web vs Mobile App vs Backend)

Repositori ini menerapkan arsitektur terpadu (*mono-repo*) yang memisahkan aplikasi Web, Mobile, dan Backend secara terstruktur:

```text
Montana-Global-Investama-ERP/
├── 🌐 WEB APPLICATION
│   ├── frontend/            # Web Portal Utama (HTML5, Bootstrap 5, Vanilla JS)
│   └── web/                 # Web Portal Modern (Next.js / TypeScript)
│
├── 📱 MOBILE APPLICATION
│   └── mobile/              # Aplikasi Mobile Resmi (Flutter Android & iOS)
│       ├── lib/app/         # Konfigurasi Tema, Rute & Endpoint API
│       ├── lib/core/        # Dio Client + CookieJar, Anti-Fake GPS, Widgets
│       └── lib/features/    # Auth, Dashboard, Attendance, Permit, HRGA, PM
│
├── ⚙️ BACKEND & DATABASE
│   ├── backend/             # Core REST API (PHP 8.x + MySQL PDO, Sesi & Auth)
│   ├── database/            # Database Schema, Migrations & Production Seeders
│   └── tests/               # Pengujian Otomatis & Concurrency Tests
│
└── 📚 DOKUMENTASI
    ├── MGI_ERP_DOCUMENTATION.md      # Dokumentasi Utama Sistem ERP
    └── FLUTTER_ERP_SPECIFICATION.md  # Spesifikasi Lengkap Aplikasi Mobile Flutter
```

---

## 🚀 Panduan Menjalankan

### 1. Menjalankan Backend & Web
1. Pastikan modul **Apache** dan **MySQL** pada control panel **XAMPP** telah berjalan (`Start`).
2. Buat basis data bernama `mgi_erp` di phpMyAdmin / MySQL CLI.
3. Impor skema dan seeder awal:
   ```bash
   php fresh_reset_and_seed.php
   ```
4. Akses Web Portal melalui browser:
   ```
   http://localhost/Montana-Global-Investama-ERP/
   ```

### 2. Menjalankan Aplikasi Mobile (Flutter)
1. Masuk ke direktori `mobile`:
   ```bash
   cd mobile
   ```
2. Pastikan dependensi terpasang:
   ```bash
   flutter pub get
   ```
3. Jalankan aplikasi pada emulator atau perangkat fisik:
   ```bash
   flutter run
   ```
   *(Konfigurasi IP server backend dapat disesuaikan pada `mobile/lib/app/config/api_constants.dart`)*.

---

### 🔑 Akun Pengujian Sistem:
* **IT Admin**: `it@mgi.co.id` | Password: `Password123!`
* **HRGA Officer**: `hrga@mgi.co.id` | Password: `Password123!`
* **Legal Officer**: `legal@mgi.co.id` | Password: `Password123!`
* **Finance Officer**: `finance@mgi.co.id` | Password: `Password123!`
* **BizDev**: `bizdev@mgi.co.id` | Password: `Password123!`
* **Project Manager (PM)**: `pm@mgi.co.id` | Password: `Password123!`
* **Superadmin**: `admin@mgi.co.id` | Password: `Password123!`

