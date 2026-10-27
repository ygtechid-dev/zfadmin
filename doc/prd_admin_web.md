# PRD: Web Admin Dashboard (Naqupos Beauty & Spa)

| **Project Name** | Naqupos Beauty & Spa - Admin Dashboard |
| :--- | :--- |
| **Platform** | Web Application (Desktop Optimized) |
| **Version** | 1.1 |
| **Status** | Planning |
| **Last Updated** | 6 Januari 2026 |

---

## 1. Overview
Web Admin Dashboard adalah pusat kontrol operasional dan manajemen untuk Naqupos Beauty & Spa. Sistem ini dirancang untuk mendukung operasional multi-cabang dengan hak akses bertingkat, mulai dari Kasir, Admin Operasional, hingga Super Admin/Owner.

---

## 2. Fitur Utama (Core Features)

### 2.1 Dashboard & Monitoring
Ringkasan performa bisnis secara real-time.
*   **Ringkasan Harian**: Total Omzet, Jumlah Booking (New/Ongoing/Completed), dan Total Pelanggan hari ini.
*   **Live Operations**: Status okupansi ruangan dan ketersediaan terapis saat ini.
*   **Grafik Tren**: Grafik kunjungan dan pendapatan 7 hari terakhir.
*   **Agenda Hari Ini**: Daftar booking yang harus diproses hari ini.
*   **Notifikasi Penting**: Stok menipis, pesan kritik/saran baru, reservasi baru masuk.

### 2.2 Point of Sales (POS) & Penjualan
Modul kasir untuk menangani transaksi harian di outlet.
*   **Kasir / Transaksi Baru**:
    *   Input transaksi Manual/Walk-in (pilih layanan, terapis, ruangan).
    *   Proses pelunasan Booking Online (scan QR/input kode booking).
    *   Penjualan produk ritel (jika ada add-on produk).
*   **Manajemen Pembayaran**:
    *   Support Split Payment (Cash + Transfer).
    *   Integrasi Payment Gateway (QRIS/VA) status checker.
*   **Manajemen Kas (Cash Management)**:
    *   **Laci Kas (Cash Drawer)**: Pencatatan saldo awal (modal) dan saldo akhir shift.
    *   **Closing Shift**: Rekonsiliasi uang fisik vs sistem, cetak laporan closing shift.
    *   **Kas Masuk/Keluar (Petty Cash)**: Catat pengeluaran operasional outlet (beli air, bensin, dll).
*   **Faktur & Nota**:
    *   Cetak struk thermal & Nota pelunasan.
    *   Kirim E-Invoice via WA/Email.
*   **Riwayat Penjualan Harian**:
    *   List transaksi per shift/hari ini.
    *   Rekap setoran kasir.

### 2.3 Master Data Management
Pusat pengaturan data referensi sistem.
*   **CRUD Layanan (Services)**:
    *   Nama, Kategori, Durasi, Harga, Deskripsi, Foto.
    *   Pengaturan Komisi Terapis per layanan.
*   **CRUD Staff & Terapis**:
    *   Data Diri Staff (Admin, Kasir, Terapis).
    *   **Manajemen Akses**: Role & Permission (Super Admin, Manager, Cashier, Therapist).
    *   **Jadwal Kerja (Shift)**: Atur shift harian/mingguan untuk ketersediaan booking.
*   **Manajemen Cabang (Multi-branch)**:
    *   **Lokasi**: Nama cabang, Alamat, Koordinat Maps.
    *   **Konfigurasi**: Jam operasional cabang, Nomor kontak.
*   **Manajemen Ruangan**:
    *   Kategori: Reguler, VIP, VVIP.
    *   Kapasitas & Fasilitas.
    *   Manajemen status (Aktif/Maintenance).
*   **Manajemen Aset**:
    *   Inventaris peralatan spa (Bed, Alat Facial, dll).
    *   Pencatatan kondisi & jadwal maintenance asset.

### 2.4 Customer Relationship Management (CRM)
*   **CRUD Pelanggan**:
    *   Database lengkap (Nama, WA, Email, Tgl Lahir).
    *   Riwayat kunjungan & total spending.
    *   Catatan preferensi terapis/layanan (Customer Notes).
    *   Detail Tampilan per Pelanggan (History, Poin, Notes).
    *   **Sumber Registrasi**: Label asal pelanggan (App / Walk-in Admin). ✅
    *   **Status Akun App**: Indikator apakah pelanggan memiliki akun di Customer App. ✅
    *   **Invite to App**: Kirim undangan WhatsApp untuk download & registrasi di app. ✅
*   **Poin Loyalitas (Loyalty Point)**: ✅
    *   Pengaturan skema poin (Earn & Burn).
    *   Riwayat perolehan dan penukaran poin.
    *   Manajemen Member & Tier (Bronze, Silver, Gold, Platinum).
    *   Adjustment poin manual (tambah/kurangi) dengan alasan.
    *   Pengaturan bonus (ulang tahun, kunjungan pertama).
*   **Review & Feedback**:
    *   Monitoring rating & review dari Customer App.
    *   Balas review (Reply).

### 2.5 Marketing & Konten (CMS)
Mengelola strategi pemasaran dan konten aplikasi customer.
*   **CRUD Voucher & Promo**:
    *   Tipe: Diskon Nominal, Diskon Persen, Buy 1 Get 1.
    *   Kuota pemaikaian & Masa berlaku.
*   **Flash Sale**: Pengaturan promo waktu terbatas (Countdown).
*   **Manajemen Konten Customer App**:
    *   **Berita/Artikel**: Tips kecantikan, Info promo.
    *   **Banner CMS**: Slider promosi di halaman Home. ✅
    *   **Layanan Unggulan**: Set layanan yang muncul di "Rekomendasi".
*   **Modul Marketing** (Integrasi Pihak ke-3/Internal):
    *   Broadcast WA (Filter by: Ulang tahun bulan ini, Lama tidak berkunjung).
    *   **Manajemen Kampanye Digital (Campaign Manager)**:
        *   **Blast Engine**: Pengiriman pesan massal terintegrasi (WhatsApp API/Push Notif).
        *   **Smart Segmentation**: Target audiens spesifik (contoh: "Customer Inaktif > 30 hari", "VIP Members", "Pecinta Facial").
        *   **Automation (Auto-Pilot)**:
            *   *Birthday Series*: Kirim ucapan & voucher H-3 ulang tahun.
            *   *Win-Back*: Sapaan otomatis untuk customer yang lama tidak kembali.
            *   *Post-Treatment*: Kirim permintaan feedback H+1 setelah treatment.
        *   **Performance Tracking**: Monitor Click-Through Rate (CTR) dan konversi ke Booking.

### 2.6 Booking & Kalender
*   **Master Calendar**:
    *   **Kalender Booking**: View Harian/Mingguan/Bulanan.
    *   **Customer Booking Details**: Tampilan detail booking per hari (Timeline view).
    *   **Kalender Working**: Jadwal kerja terapis & ketersediaan ruangan.
*   **Manajemen Reservasi**:
    *   Ubah Agenda / Reschedule (Drag & Drop atau Form Edit).
    *   Refund (Proses pengembalian dana jika cancel).
    *   Drafting (Booking sementara).
    *   Konfirmasi Pembayaran DP.
    *   Check-in & Check-out tamu.
*   **Laporan Agenda**:
    *   Rekap booking per hari (List View).

### 2.7 Analitik & Laporan (Super Admin View)
Laporan menyeluruh yang bisa difilter per cabang atau konsolidasi (Global).

#### 2.7.1 Laporan Keuangan & Penjualan
*   **Laba Rugi (P&L)**: Pemasukan (Gross) - Pengeluaran Operasional = Net Profit.
*   **Laporan Penjualan**: Breakdown sales per hari/minggu/bulan.
*   **Laporan Metode Pembayaran**:
    *   Total Cash.
    *   Total Transfer / VA.
    *   Total QRIS.
*   **Laporan Arus Kas**:
    *   **Laporan Kas Masuk**: petty cash in, modal awal, penjualan cash.
    *   **Laporan Kas Keluar**: petty cash out (biaya operasional).
*   **Status Pembayaran**:
    *   **Laporan DP**: Total Deposit masuk.
    *   **Laporan Full Payment**: Total pelunasan.
    *   **Laporan DP Hangus**: Deposit yang tidak dikembalikan karena No-Show/Cancel.
    *   **Laporan Pelunasan**: Sisa tagihan yang dibayarkan di kasir.

#### 2.7.2 Analitik Operasional
*   **Analitik Booking**: Total booking, Conversion rate, Cancellation rate.
*   **Laporan Laku**: Layanan paling laku (Best Seller Services).
*   **Laporan Staff / Terapis**:
    *   **Terapis Terpopuler**: Terapis yang paling banyak dipesan (Most Requested).
    *   **Terapis Disibukkan**: Terapis dengan jam kerja tertinggi (Most Booked Hours).
    *   **Komisi Staff**: Perhitungan insentif berdasarkan performa.
    *   **Jadwal Shift**: Rekap kehadiran dan shift terapis.
*   **Laporan Closing Shift**: Ringkasan akhir shift kasir (Total uang fisik vs sistem).

#### 2.7.3 Lainnya
*   **Laporan Voucher**: Efektivitas promo & total diskon diberikan.
*   **Laporan Pelanggan**: New user growth, retention rate.

### 2.8 Pengaturan Sistem (Settings)
*   **Konfigurasi Payment Gateway**:
    *   API Keys (Midtrans/Xendit).
    *   Metode pembayaran yang aktif (QRIS/VA/E-wallet).
*   **User Management**: ✅
    *   CRUD User (Admin, Kasir, Terapis, Marketing).
    *   CRUD Role & Permission (akses per modul).
    *   Assignment user ke cabang.
    *   Toggle status aktif/nonaktif user.
*   **Audit Log**: ✅
    *   Log aktivitas sistem (Create, Update, Delete, Login, Logout).
    *   Filter berdasarkan modul, user, aksi, dan tanggal.
    *   Export log ke CSV.
    *   Detail log dengan informasi IP dan browser.
*   **Pengaturan Umum**: ✅
    *   Kebijakan pembatalan & Refund.
    *   Pajak & Service Charge.

---

## 3. Struktur Modul & Navigasi

```
1. Dashboard
2. Kasir (POS)
   - Transaksi Baru
   - Riwayat Transaksi
   - Laci Kas (Cash Drawer)
   - Laporan Closing Shift
3. Kalender
   - Kalender Booking (Harian/Bulanan)
   - Jadwal Terapis
   - Agenda & Reschedule
4. Reservasi (Booking List)
   - Daftar Booking
   - Refund & Cancel
5. Pelanggan (CRM)
   - Data Pelanggan
   - Review & Rating
   - Loyalty Point
6. Layanan & Produk
   - Daftar Layanan
   - Kategori
   - Paket
7. Staff & Jadwal
   - Data Staff
   - Atur Jadwal Shift
   - Perhitungan Gaji/Komisi
8. Keuangan & Laporan
   - Laba Rugi
   - Penjualan Harian
   - Kas Masuk/Keluar
   - Laporan DP & Pelunasan
   - Laporan Metode Pembayaran
   - Analitik Layanan & Terapis
9. Marketing
   - Voucher & Promo
   - Konten Berita
   - Banner CMS ✅
   - Campaign
10. Master Data
    - Manajemen Cabang ✅
    - Manajemen Ruangan ✅
    - Manajemen Aset ✅
11. Sistem
    - User Management ✅
    - Audit Log ✅
    - Pengaturan ✅
```

## 4. Prioritas Pengembangan

| Phase | Deskripsi | Status |
|:------|:----------|:------:|
| **Phase 1** | Core Operations (POS, Booking, Kalender, Master Otentikasi, CRUD Layanan/Staff/Ruangan) | ✅ Complete |
| **Phase 2** | Customer Connect (CMS Banner/Berita, Integrasi Booking Online, Multi-branch, Rooms) | ✅ Complete |
| **Phase 3** | Growth & Data (Loyalty Point, Audit Log, User Management, Collapsible Navigation) | ✅ Complete |

---

## 5. Fitur Baru Phase 3 (Januari 2026)

### 5.1 Loyalty Point (`/loyalty`)
- ✅ Statistik: Total poin diperoleh, poin ditukar, member aktif
- ✅ Tab Riwayat Transaksi: Perolehan & penukaran poin
- ✅ Tab Member: Daftar member dengan tier (Bronze, Silver, Gold, Platinum)
- ✅ Modal Adjust Poin: Tambah/kurangi poin manual
- ✅ Modal Pengaturan Loyalty: Skema earn/burn, bonus spesial

### 5.2 Audit Log (`/audit-log`)
- ✅ Log aktivitas sistem dengan filter lengkap
- ✅ Export ke CSV
- ✅ Modal detail log

### 5.3 User Management (`/users`)
- ✅ CRUD User dengan toggle status
- ✅ CRUD Role dengan permission per modul
- ✅ Assignment user ke cabang

### 5.4 Customer CRM Enhancement
- ✅ Label Sumber Registrasi (App / Walk-in)
- ✅ Status Akun App (Aktif / Belum)
- ✅ Invite to App via WhatsApp

### 5.5 Collapsible Navigation
- ✅ Menu sidebar dikelompokkan berdasarkan kategori
- ✅ Kategori: Menu Utama, Operasional, Pelanggan, Marketing, Laporan & Analitik, Master Data, Sistem
- ✅ Auto-expand kategori berdasarkan halaman aktif
