# PRD: Customer Mobile App (Naqupos Beauty & Spa)

| **Project Name** | Naqupos Beauty & Spa - Customer Mobile App |
| :--- | :--- |
| **Platform** | Mobile (iOS & Android) via Capacitor |
| **Version** | 1.2 |
| **Status** | In Development |
| **Last Updated** | 6 Januari 2026 |

---

## 1. Overview
Aplikasi mobile ini ditujukan khusus untuk **Customer** Naqupos Beauty & Spa. Tujuan utamanya adalah memudahkan pelanggan melakukan reservasi mandiri, melihat riwayat transaksi, dan mendapatkan informasi terbaru tanpa harus menghubungi admin secara manual. Aplikasi ini akan dibangun menggunakan teknologi web yang dikemas menjadi aplikasi native menggunakan **Capacitor**.

## 2. Tech Stack
- **Framework**: React.js (Frontend) / Vite
- **Mobile Wrapper**: Capacitor (untuk build ke iOS & Android)
- **Styling**: Tailwind CSS (sesuai Design System Naqupos)
- **State Management**: React Context / Zustand
- **Router**: React Router DOM (v6)

## 3. Fitur Utama (Core Features)

### 3.1 Otentikasi & Profil (Auth Code: C-01)
*   **Register**: Input Nama, Tgl Lahir, WA, Email, Alamat, Password.
*   **Login**: Menggunakan No WhatsApp atau Email & Password.
*   **Profile Management**: Edit profil, ganti password, simpan alamat. ✅
*   **Payment Methods**: CRUD metode pembayaran (kartu kredit/debit). ✅
    - Tambah kartu baru dengan validasi input
    - Simpan ke localStorage
    - Hapus kartu dengan konfirmasi

### 3.2 Dashboard (Home) (Feature Code: C-02)
*   **Greeting**: Sapaan personal ("Halo, [Nama Customer]"). ✅
*   **Quick Actions**: Tombol cepat "Booking Hemat", Search Location. ✅
*   **Promo Banner**: Slider info promo/flash sale (Hero Section). ✅
*   **Quick Menu Icons**: Promo, Berita, Layanan, Feedback. ✅
*   **Rekomendasi Layanan**: Daftar layanan terpopuler/terlaris. ✅

### 3.3 Promo & Penawaran (Feature Code: C-02B) ✅
*   **Flash Sale**: Promo dengan timer.
*   **Detail Promo**: Syarat & ketentuan, kode promo, masa berlaku.
*   **Integrasi**: Klik promo langsung arahkan ke booking.

### 3.4 Berita Naqupos (Feature Code: C-02C) ✅
*   **Berita**: Info terbaru, tips kecantikan, event.
*   **Grid Layout**: Tampilan card berita yang rapi.

### 3.5 Booking Engine (Feature Code: C-03)
Flow booking yang intuitif untuk mobile dengan dukungan **Multi-Tamu & Multi-Layanan**:

#### Langkah Booking (Sesuai Implementasi):
1.  **Select Branch & Date**: Pilih Tanggal & Jumlah Tamu (1-5 orang) di awal.
2.  **Service Builder (Per Tamu)**:
    - **Tab Navigasi Tamu**: Pindah antar tamu dengan mudah.
    - **Pilih Layanan Dulu**: Filter layanan berdasarkan kategori.
    - **Pilih Terapis & Waktu**: Sistem hanya menampilkan terapis yang available.
    - **Multi-Service**: Tombol "+ Tambah Layanan Lain" untuk satu tamu.
3.  **Room Selection**: Pilih tipe ruangan (Standard/VIP/VVIP) yang dihitung berdasarkan pax dan ketersediaan waktu.
4.  **Summary**: Review pesanan lengkap semua tamu.
5.  **Payment**: Pilih metode pembayaran.

### 3.6 Pembayaran (Feature Code: C-04)
*   **Metode**: QRIS (QR Code Generator mockup), Virtual Account (Copy to Clipboard). ✅
*   **Opsi Bayar**: DP 50k atau Full Payment. ✅
*   **Success Screen**: Konfirmasi pembayaran berhasil. ✅

### 3.7 Riwayat & Notifikasi (Feature Code: C-05)
*   **History**: List riwayat treatment. ✅
*   **Notifikasi In-App**: Modal notifikasi (Booking Info, Promo, System Msg). ✅

### 3.8 Engagement (Feature Code: C-06)
*   **Kritik & Saran**: Form feedback dengan rating & emoji. ✅
*   **Info Layanan**: Modul daftar layanan lengkap. ✅

## 4. Status Implementasi (Frontend)

| Fitur | Status | Keterangan |
|:------|:------:|:-----------|
| C-01 Registrasi & Auth | ✅ | UI Login/Register Ready |
| C-01 Payment Methods | ✅ | CRUD Functional |
| C-02 Dashboard | ✅ | Complete UI & Interactions |
| C-03 Booking Engine | ✅ | Full Flow (Multi-guest/service Logic) |
| C-04 Pembayaran | ✅ | Mock QRIS & VA Copy Functional |
| C-05 Riwayat | ✅ | UI History List Ready |
| C-05 Notifikasi | ✅ | In-App Modal Ready (Native Push pending) |
| C-06 Kritik & Saran | ✅ | Functional with localStorage |

## 5. Alur Booking (Mobile Flow)
1.  Buka App -> Home -> Klik "Booking Hemat" atau Icon Booking.
2.  **Step 1**: Pilih Lokasi Cabang -> Pilih Tanggal Kalender -> Set Jumlah Tamu.
3.  **Step 2**: 
    - Tamu 1: Klik "+ Pilih Layanan" -> Pilih Item -> Klik "+ Pilih Terapis & Waktu".
    - (Jika 2 Tamu): Klik Tab "Tamu 2" -> Ulangi proses.
4.  **Step 3**: Pilih Ruangan (Sistem otomatis cek bentrok jadwal).
5.  **Step 4**: Review Total Harga.
6.  **Step 5**: Pilih Bayar (DP/Full) -> Pilih Bank/QRIS -> Bayar.
7.  **Selesai**: Redirect ke Success Page / History.

---

## 6. Integrasi dengan Web Admin

### 6.1 Sinkronisasi Data Customer
Customer App terintegrasi dengan Web Admin untuk sinkronisasi data pelanggan:

| Data | App -> Admin | Admin -> App |
|:-----|:------------:|:------------:|
| Profil Customer | ✅ | ✅ |
| Riwayat Booking | ✅ | ✅ |
| Poin Loyalty | ✅ | ✅ |
| Status Akun | ✅ | ✅ |

### 6.2 Invite to App (dari Admin)
Walk-in customer yang didaftarkan via Web Admin dapat diundang untuk download app:
1. **Admin** menambahkan pelanggan Walk-in di Web Admin
2. **Admin** klik tombol "Invite to App" → Kirim pesan WhatsApp
3. **Customer** menerima link download app + kode undangan
4. **Customer** install app dan registrasi menggunakan nomor WA yang sama
5. **Sistem** otomatis menggabungkan data dan poin loyalty

### 6.3 Tracking Sumber Registrasi
Web Admin dapat melihat asal registrasi setiap pelanggan:
- 🟣 **App**: Customer registrasi mandiri via Customer App
- 🟠 **Walk-in**: Customer didaftarkan oleh admin/kasir
