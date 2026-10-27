# Product Requirements Document (PRD)

| **Project Name** | Naquposn Beauty & Spa Reservation System |
| :--- | :--- |
| **Version** | 1.2 |
| **Status** | In Development |
| **Last Updated** | 6 Januari 2026 |

---

## 1. Pendahuluan

### 1.1 Latar Belakang
Naquposn Beauty & Spa membutuhkan sistem terintegrasi untuk mengelola reservasi multi-cabang, operasional kasir (POS), dan manajemen administrasi. Sistem saat ini (manual/terpisah) menyulitkan pelacakan jadwal terapis, ketersediaan ruangan, dan pelaporan keuangan.

### 1.2 Tujuan
- Membangun sistem reservasi online dengan custom calendar engine yang akurat.
- Memudahkan pelanggan melakukan booking mandiri dengan transparansi harga dan jadwal.
- Menyediakan laporan keuangan dan operasional yang real-time untuk manajemen.
- Mengotomatisasi notifikasi via WhatsApp.

## 2. User Personas (Pengguna)

- **Customer**: Pelanggan yang ingin melakukan perawatan, membutuhkan kemudahan booking dan kepastian jadwal.
- **Cashier (Kasir)**: Staff operasional di outlet yang menangani pembayaran, check-in tamu, dan laporan harian.
- **Admin/Owner**: Pengelola bisnis yang mengatur jadwal staff, melihat laporan laba rugi, dan manajemen pelanggan.

## 3. Spesifikasi Fungsional (Functional Requirements)

### 3.1 Modul Customer (Mobile App / Web App)
Detail lengkap dapat dilihat di document `prd_customer_mobile.md`.

| ID Fitur | Fitur Utama | Deskripsi Detail | Status (Frontend) |
| :--- | :--- | :--- | :---: |
| **C-01** | Registrasi & Auth | • Input: Nama, Tgl Lahir, WA, Email, Alamat, Password.<br>• Login via No WA/Email & Password. (UI Ready)<br>• CRUD Payment Methods (kartu kredit/debit). | ✅ |
| **C-02** | Dashboard Client | • Greeting personal.<br>• Saldo/Poin (Placeholder).<br>• Tombol "Booking Hemat" (Quick Action).<br>• Promo Banner & Rekomendasi Layanan. | ✅ |
| **C-02B** | Promo & Penawaran | • Flash Sale & Promo Spesial.<br>• Filter kategori promo.<br>• Detail S&K. | ✅ |
| **C-02C** | Berita Naqupos | • Berita terbaru, tips kecantikan, & event.<br>• Update operasional. | ✅ |
| **C-03** | Booking Engine | Alur reservasi bertahap dengan dukungan **Multi-Tamu & Multi-Layanan**:<br>1. **Jadwal**: Pilih Cabang, Tanggal, Jumlah Tamu (1-5 orang).<br>2. **Layanan (Per Tamu)**: Pilih Layanan -> Pilih Terapis -> Pilih Waktu.<br>3. **Multi-Layanan**: Satu tamu bisa booking banyak layanan.<br>4. **Ruangan**: Pilih tipe ruangan (Standard/VIP/VVIP) dengan validasi kapasitas.<br>5. **Review**: Ringkasan total biaya. | ✅ |
| **C-04** | Pembayaran | • Opsi: DP 50k atau Full Payment.<br>• Metode: QRIS (Generate QR) & VA (Bank Transfer).<br>• Timer pembayaran. | ✅ |
| **C-05** | Notifikasi & Invoice | • Notifikasi In-App (Modal).<br>• Riwayat Booking (Coming Soon, Completed, Cancelled).<br>• E-Invoice & Copy VA. | ✅ |
| **C-06** | Engagement | • Kritik & Saran (Rating & Feedback).<br>• Info Layanan Lengkap (Kategori, Detail).<br>• Notifikasi Center. | ✅ |


### 3.2 Modul Kasir / POS (Tablet / Desktop Web)

| ID Fitur | Fitur Utama | Deskripsi Detail |
| :--- | :--- | :--- |
| **K-01** | Point of Sale (POS) | • Input transaksi walk-in atau pelunasan booking online.<br>• Kalkulasi otomatis total harga (Layanan + Ruangan + Add-on). |
| **K-02** | Metode Pembayaran | Pencatatan pembayaran via Cash, QRIS, atau VA. |
| **K-03** | Manajemen Shift | • Clock-in/Clock-out kasir.<br>• Laporan Closing Shift: Rekonsiliasi uang kas fisik vs sistem. |
| **K-04** | Analitik Operasional | • Kalender Working (Tampilan jadwal hari ini).<br>• Jadwal Terapis sesuai shift aktif.<br>• Tracking Terapis yang sedang dibooking. |


### 3.3 Modul Admin (Web Dashboard)
Detail lengkap dapat dilihat di document `prd_admin_web.md`.

| ID Fitur | Fitur Utama | Deskripsi Detail |
| :--- | :--- | :--- |
| **A-01** | Dashboard Utama | Ringkasan eksekutif: Total Omzet, Total Booking Hari Ini, Grafik Kunjungan. |
| **A-02** | Master Calendar | • Tampilan Kalender Booking (Harian/Bulanan).<br>• Filter per Cabang/Terapis. |
| **A-03** | Manajemen Reservasi | • Ubah Agenda (Reschedule) dengan validasi slot.<br>• Proses Refund.<br>• Manual Booking. |
| **A-04** | Manajemen SDM | • Manage Terapis & Shift Kerja (Critical untuk Booking Engine).<br>• Perhitungan Komisi. |
| **A-05** | CMS & Master Data | • Manage Layanan, Ruangan, Cabang.<br>• Manage Promo & Berita (Feed Customer App). |
| **A-06** | Laporan Bisnis | • Laporan Laba Rugi (P&L).<br>• Laporan Penjualan & Performa. |

## 4. Spesifikasi Teknis & Non-Fungsional

### 4.1 Custom Calendar Engine
Sistem kalender dikembangkan sendiri (custom logic) dengan aturan validasi ketat:
- **Logika Ketersediaan**: Slot tersedia JIKA (Terapis Available pada jam tersebut) DAN (Terapis tidak bentrok dengan booking lain) DAN (Ruangan Kapasitas Cukup).
- **Durasi**: Slot waktu dikunci berdasarkan durasi layanan terpilih.
- **Multi-Services**: Terapis bisa berbeda untuk setiap layanan dalam satu rangkaian booking tamu.

### 4.2 Integrasi Pihak Ketiga
- **WhatsApp Notification**: Menggunakan API Cekat.ai/Wacon.
- **Payment Gateway**: Handling status pembayaran otomatis.

### 4.3 Keamanan
- **RBAC**: Pemisahan hak akses Customer, Kasir, dan Admin.

## 5. Alur Booking (User Flow)
Berdasarkan implementasi di Frontend:
1. **Home**: Klik "Booking Now".
2. **Step 1 (Jadwal)**: Pilih Cabang, Tanggal, dan Jumlah Tamu.
3. **Step 2 (Layanan)**: 
   - Tab per Tamu (jika > 1).
   - Tamu pilih **Layanan** dulu.
   - Sistem filter Terapis yang bisa handle layanan tsb.
   - Tamu pilih **Terapis** & **Slot Waktu**.
   - (Opsional) Tambah layanan lain.
4. **Step 3 (Ruangan)**: Pilih tipe ruangan (Standard/VIP). Validasi ketersediaan room real-time.
5. **Step 4 (Review)**: Cek total biaya & detail pesanan all guests.
6. **Step 5 (Bayar)**: Pilih DP/Full -> QRIS/VA => Selesai.

## 6. Future Development
- Sistem membership/poin loyalty.
- Aplikasi khusus untuk Terapis.
- Integrasi stok barang.