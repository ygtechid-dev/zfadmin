# Dokumentasi Validasi Pendaftaran Cabang

Dokumen ini menjelaskan aturan validasi untuk modul pendaftaran/manajemen cabang pada sistem Naqupos.

## Aturan Validasi

| Nama Field | Status | Aturan | Deskripsi |
|-----------|--------|--------|-----------|
| **Nama Cabang** | Wajib | `min:3`, `max:100` | Tidak boleh hanya berisi angka atau simbol saja. |
| **Kode Cabang** | Wajib | `regex:/^[A-Z0-9-]{3,10}$/` | Harus berupa huruf kapital, angka, atau tanda bahubung (-). Panjang 3-10 karakter. Harus **Unik**. |
| **Alamat Lengkap** | Wajib | `min:10` | Lokasi fisik lengkap cabang. |
| **Kota** | Wajib | `Hanya huruf & spasi` | Nama kota sesuai data master. |
| **Provinsi** | Wajib | - | Pilih dari data master provinsi. |
| **Telepon** | Wajib | `regex:/^(\+62|0)[1-9][0-9]{7,15}$/` | Bisa berupa telepon rumah (021...) atau HP (08... atau +628...). Hanya angka dan simbol +. |
| **Jam Buka** | Wajib | `HH:mm` | Jam operasional mulai. |
| **Jam Tutup** | Wajib | `HH:mm`, `after:opening_time` | Harus lebih besar daripada jam buka. |
| **Latitude** | Wajib | `-90 s/d 90` | Koordinat geografis lintang. |
| **Longitude** | Wajib | `-180 s/d 180` | Koordinat geografis bujur. |

## Contoh Validasi Telepon
- ✅ `0211234567` (Rumah)
- ✅ `0812345678` (HP)
- ✅ `+6281234567` (HP Internasional)
- ❌ `12345678` (Invalid - Tanpa awalan 0 atau +62)
- ❌ `012345` (Invalid - Terlalu pendek)

## Format Kode Cabang
- ✅ `ZSP-01`
- ✅ `SBY-SOLO`
- ✅ `ADMIN-1`
- ❌ `zsp-01` (Kecil tidak boleh)
- ❌ `ZSP 01` (Spasi tidak boleh)
