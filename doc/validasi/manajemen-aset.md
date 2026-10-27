# Dokumentasi Validasi Manajemen Aset

Dokumen ini menjelaskan aturan validasi untuk modul pendaftaran dan pembaruan data Aset (Inventaris) pada sistem Naqupos.

## Aturan Validasi

| Nama Field | Status | Aturan | Deskripsi |
|-----------|--------|--------|-----------|
| **Nama Aset** | Wajib | `min:2`, `max:100`, `regex:/^[A-Za-z0-9\s]+$/` | Harus mengandung huruf atau angka. Tidak boleh hanya simbol. |
| **Cabang** | Wajib | `Multiple Selection` | Jika "Semua Cabang (Global)" dicentang, tidak boleh pilih cabang lain. Jika tidak, minimal 1 cabang terpilih. |
| **Kategori** | Wajib | `Enum` | Pilihan: `Elektronik`, `Furniture`. |
| **Tanggal Pembelian** | Tidak Wajib | `date`, `before_or_equal:today` | Jika diisi, tidak boleh melebihi hari ini. |
| **Harga Beli (Rp)** | Wajib | `numeric`, `min:1`, `max:1.000.000.000` | Hanya angka, minimal 1 Rupiah. |
| **Kondisi** | Wajib | `Enum` | Pilihan: `Baik`, `Perlu Perbaikan`, `Rusak`. |
| **Status** | Wajib | `Enum` | Pilihan: `Aktif`, `Nonaktif`. |
| **Maintenance Terakhir**| Tidak Wajib | `date`, `before_or_equal:today`, `after_or_equal:purchase_date` | Tidak boleh melebihi hari ini atau sebelum tanggal pembelian. |
| **Catatan** | Tidak Wajib | `max:500` | Tambahan informasi jika diperlukan. |

## Contoh Validasi Nama Aset
- ✅ `TV`
- ✅ `AC Panasonic`
- ✅ `Kursi Pijat 01`
- ❌ `@#$%` (Invalid - Hanya simbol)
- ❌ `A` (Invalid - Kurang dari 2 karakter)

## Logika Pemilihan Cabang
- **Global Aktif**: System mengabaikan pilihan ID cabang individu dan menandai aset tersedia untuk seluruh outlet.
- **Global Nonaktif**: User wajib memilih minimal satu checkbox cabang dari daftar yang tersedia.
