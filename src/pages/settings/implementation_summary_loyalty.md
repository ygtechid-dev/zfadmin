
You have successfully implemented the "Poin Loyalitas" (Loyalty Points) settings tab, complete with two major sub-configurations.

## Features Implemented:

1.  **Tabs & Navigation**:
    - Added "Poin Loyalitas" to the main settings sidebar.
    - Implemented nested tabs: **Opsi Penggunaan** (Redemption Options) and **Pengaturan** (Settings).

2.  **Opsi Penggunaan (Redemption Options)**:
    - **List View**: Displays configured redeemable rewards (Discounts or Free Items).
    - **Add New Options**: Floating Action Button (+) opens a selection menu (Discount or Free Item).
    - **Discount Modal**: Configure points required, discount amount, and type (Rp or %).
    - **Free Item Modal**: Configure points required, item name, and item selection (visual placeholder).

3.  **Pengaturan (Settings)**:
    - **Master Toggle**: Enable/disable the entire Loyalty Points system.
    - **Earning Type**: Switch between "Jumlah Dibeli" (Amount Spent) and "Item Dibeli" (Item Purchased).
    - **Point Rules**:
        - Points earned per transaction amount.
        - Minimum order amount.
        - Point expiration (e.g., After 1 Year).
    - **Toggles**:
        - "Berlaku Kelipatan" (Apply Multiples).
        - "Tambahan poin tetap didapat ketika menggunakan poin" (Earn points when redeeming).
    - **Earning Criteria**: Granular configuration for when points are awarded (Channel, Customer, Service, Product, etc.).

## File Modified:
- `web-admin/src/pages/settings/SettingsPageNew.tsx`
