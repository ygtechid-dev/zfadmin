# Dokumen Validasi Layanan

## Aturan Validasi

### 1. Nama Layanan
*   **Wajib diisi**: Ya
*   **Minimal**: 3 karakter
*   **Maksimal**: 100 karakter
*   **Format**: Tidak boleh string kosong atau hanya spasi.
*   **Pesan Error**:
    *   "Nama layanan wajib diisi."
    *   "Nama layanan minimal 3 karakter."
    *   "Nama layanan maksimal 100 karakter."

### 2. Kategori
*   **Wajib dipilih**: Ya
*   **Format**: String (sesuai Data Master Kategori).
*   **Pesan Error**:
    *   "Kategori layanan wajib dipilih."

### 3. Durasi
*   **Wajib diisi**: Ya
*   **Tipe**: Integer (Menit)
*   **Range**: 5 - 480 menit
*   **Pesan Error**:
    *   "Durasi wajib diisi."
    *   "Durasi harus antara 5–480 menit."

### 4. Harga
*   **Wajib diisi**: Ya
*   **Tipe**: Numeric (Rupiah)
*   **Minimal**: 0
*   **Pesan Error**:
    *   "Harga layanan wajib diisi."
    *   "Harga tidak boleh kurang dari 0."

### 5. Komisi Terapis
*   **Wajib**: Tidak (Nullable/Optional)
*   **Minimal**: 0
*   **Logika Bisnis**: Tidak boleh lebih besar dari Harga Layanan.
*   **Pesan Error**:
    *   "Komisi tidak boleh kurang dari 0."
    *   "Komisi tidak boleh melebihi harga layanan."

### 6. Ketersediaan Cabang
*   **Wajib**: Minimal 1 cabang dipilih (jika tidak global).
*   **Pesan Error**:
    *   "Pilih minimal satu cabang."

### 7. Status
*   **Wajib**: Ya
*   **Nilai**: `active` (Aktif) atau `inactive` (Nonaktif).
*   **Pesan Error**:
    *   "Status layanan wajib dipilih."

### 8. Deskripsi
*   **Wajib**: Tidak (Optional)
*   **Maksimal**: 500 karakter.
*   **Pesan Error**:
    *   "Deskripsi maksimal 500 karakter."

## Contoh Payload JSON

### Sukses
```json
{
    "code": "SVC-BM01",
    "name": "Balinese Massage 60'",
    "category": "Massage",
    "duration": 60,
    "price": 150000,
    "commission": 15000,
    "is_active": true,
    "description": "Pijat tradisional Bali untuk relaksasi total.",
    "branch_ids": [1, 2],
    "is_global": false
}
```

### Gagal (Validasi Error)
```json
// Input
{
    "name": "Ab", // Too short
    "price": -5000, // Negative
    "duration": 600, // Too long
    "commission": 10000 // Commission > price (if price was 5000)
}

// Response (422 Unprocessable Entity)
{
    "errors": {
        "name": ["Nama layanan minimal 3 karakter."],
        "price": ["Harga tidak boleh kurang dari 0."],
        "duration": ["Durasi harus antara 5–480 menit."],
        "commission": ["Komisi tidak boleh melebihi harga layanan."]
    }
}
```
