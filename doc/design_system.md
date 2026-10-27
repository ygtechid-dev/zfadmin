# Naqupos Beauty & Spa - Design System

## 1. Brand Identity
**Naqupos** merepresentasikan keanggunan, ketenangan, dan kemewahan alami. Desain aplikasi harus mencerminkan suasana spa yang rileks namun tetap profesional dan modern.

### Logo
*   **File**: `/public/logo-naqupos.png`
*   **Usage**: Gunakan logo penuh pada splash screen dan halaman login. Gunakan ikon/logogram pada header navigasi jika ruang terbatas.

---

## 2. Color Palette
Tema warna diambil dari nuansa alam, emas, dan rempah premium (saffron/naqupos).

### Primary Colors
*   **Gold / Bronze** (`#C58940`): Warna utama untuk tombol aksi (CTA), highlight, dan elemen penting. Menandakan kemewahan.
*   **Cream / Pale Yellow** (`#FAEAB1`): Warna pendukung untuk background card atau section highlight yang lembut.
*   **Light Gold** (`#E5BA73`): Variasi warna emas untuk hover state atau border.

### Secondary & Neutral
*   **Deep Purple / Slate** (`#453C67`): Warna kontras untuk teks heading dan footer. Memberikan kesan kedalaman dan elegan.
*   **Cream White** (`#FAF8F1`): Warna background utama aplikasi. Bukan putih bersih, tapi agak hangat untuk kenyamanan mata.
*   **Sage Green** (`#9EB29C`): Warna aksen untuk status "Available" atau elemen yang menenangkan.

### Semantic Colors
*   **Success**: `#10B981` (Green) - Pembayaran sukses, Slot tersedia.
*   **Error**: `#EF4444` (Red) - Pembayaran gagal, Slot penuh.
*   **Warning**: `#F59E0B` (Amber) - Menunggu pembayaran.

---

## 3. Typography
Menggunakan kombinasi font Serif dan Sans-Serif untuk menyeimbangkan kesan klasik (spa) dan modern (app).

### Headings (Display)
*   **Font Family**: `Playfair Display`
*   **Usage**: Judul halaman, Hero section, Nama Brand.
*   **Weight**: Bold (700), SemiBold (600).
*   **Example**: "Relax & Rejuvenate", "Our Services".

### Body Text (Content)
*   **Font Family**: `Lato`
*   **Usage**: Deskripsi layanan, label form, teks tombol, paragraf.
*   **Weight**: Regular (400), Light (300).
*   **Reason**: Mudah dibaca (legible) di layar kecil/mobile.

---

## 4. Components & UI Elements

### Buttons
*   **Primary Button**: Background Gold (`#C58940`), Text White. Rounded full (Pill shape) atau Rounded corners (8px).
    *   *Hover*: Darker Gold (`#B07835`).
*   **Secondary Button**: Border Gold (`#C58940`), Text Gold, Background Transparent.
    *   *Hover*: Background Cream (`#FAEAB1`).

### Cards (Layanan/Terapis)
*   **Background**: White (`#FFFFFF`) dengan shadow halus (`shadow-sm` atau `shadow-md`).
*   **Border Radius**: 12px - 16px (Soft rounded).
*   **Content**: Gambar di atas/kiri, Judul (Playfair), Deskripsi singkat (Lato), Harga (Bold Gold).

### Form Inputs
*   **Style**: Minimalis dengan border bawah (underlined) atau border penuh tipis.
*   **Focus State**: Border color berubah menjadi Gold (`#C58940`).
*   **Label**: Floating label atau Top alignment.

### Navigation (Mobile)
*   **Bottom Bar**: Background White, Fixed.
*   **Icons**: Outline style (minimalist), Active state berwarna Gold.

---

## 5. Implementation Guide (Tailwind CSS)

Gunakan konfigurasi berikut pada `tailwind.config.js`:

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        naqupos: {
          primary: '#C58940',
          secondary: '#FAEAB1',
          accent: '#E5BA73',
          dark: '#453C67',
          cream: '#FAF8F1',
          sage: '#9EB29C',
        }
      },
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      }
    },
  },
  // ...
}
```

### Contoh Penggunaan Class
*   **H1 Title**: `text-4xl font-serif font-bold text-naqupos-dark`
*   **Primary Button**: `bg-naqupos-primary text-white py-2 px-4 rounded-full hover:bg-naqupos-accent transition`
*   **Page Background**: `bg-naqupos-cream min-h-screen`
