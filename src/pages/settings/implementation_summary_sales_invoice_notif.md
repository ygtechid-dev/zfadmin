
You have successfully implemented the Sales, Invoice, and Customer Notification settings tabs in `web-admin/src/pages/settings/SettingsPageNew.tsx`.

## Features Implemented:

1.  **Sales Settings (`Pengaturan Penjualan`)**:
    - **Cash Register**: Toggle to enable/disable.
    - **Commissions**: Settings for calculating commission based on price before discount or including tax. Assistant commission distribution rule (e.g., "Bagi rata").
    - **Vouchers**: Option to allow unpaid voucher exchange and default expiration time setting.
    - **Payment Rounding**: Toggle to enable rounding, select mode (up/down), and set rounding amount (e.g., 100). Includes helper text explaining the logic.

2.  **Invoice & Receipt Settings (`Faktur & Penerimaan`)**:
    - **Content Toggles**: Granular control over what appears on the invoice (Customer Name, Contact, Address, Logo, Item Details, Price, Staff, Tax). Options to hide Company Name or Cashier Name.
    - **Auto-Print**: Toggle for automatic printing.
    - **Location Scope**: "Apply custom receipt to all locations" toggle.
    - **Social Media**: Inputs for Instagram, Facebook, and Twitter handles.
    - **Preview**: Dual-pane layout. Left side has controls, Right side has a "Digital / Dicetak" preview mock.

3.  **Customer Notification Settings (`Pemberitahuan Pelanggan`)**:
    - **Sub-navigation**: Tabs for "Pengingat", "Konfirmasi", "Jadwal Ulang", "Pembatalan", and "Terima Kasih".
    - **Master Toggle**: Enable/disable notifications for the selected category.
    - **Message Editor**:
        - "Judul Notifikasi" input.
        - "Pesan Notifikasi" textarea with support for variables (like `CUSTOMER_NAME`).
        - Preview and Settings buttons (visual placeholder for now).

## File Modified:
- `web-admin/src/pages/settings/SettingsPageNew.tsx`
