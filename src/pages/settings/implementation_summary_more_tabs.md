
You have successfully implemented the Tax, Discount, and Barcode settings tabs in `web-admin/src/pages/settings/SettingsPageNew.tsx`.

## Features Implemented:

1.  **Tax Settings (`Pajak`)**:
    - **Global Toggle**: "Penghitungan Pajak" allows switching between inclusive and exclusive tax pricing.
    - **Tax List**: Displays a table of configured taxes with their name, percentage, and assigned location count.
    - **Create Tax Modal**:
        - Input Name and Percentage.
        - Checkbox table to assigning the tax to specific locations (branches).
        - Includes "Select All" functionality in the table header.
    - **Deletion**: Allow removing taxes from the list.

2.  **Discount Settings (`Tipe Diskon`)**:
    - **Discount List**: Displays active discount types. Shows "No Result" empty state if none exist.
    - **Create Discount Modal**:
        - Input Discount Name.
        - Input Amount with a toggle for **Rp** (Fixed) or **%** (Percentage).
        - **Applicability Checkboxes**: "Penjualan Service", "Penjualan Kelas", "Penjualan Produk", "Penjualan Voucher", "Total Penjualan".
    - **UI Cards**: Discounts are shown as cards with badges for value and applicable types.

3.  **Barcode Label Settings (`Barcode Labels`)**:
    - **Layout**: Two-column layout (Left: Product Search, Right: Configuration) matching the design.
    - **Configuration Panel**:
        - **Paper Settings**: Dropdowns for Paper Type (e.g., Tom & Jerry 107) and Barcode Type (C93, C128, etc.).
        - **Dimensions**: Inputs for Height and Width (mm).
        - **Element Visibility**: A list of elements (Barcode, Name, Code, Price) with visibility toggles (Eye/EyeOff icons) and drag handles (visual only for now).

## File Modified:
- `web-admin/src/pages/settings/SettingsPageNew.tsx`
