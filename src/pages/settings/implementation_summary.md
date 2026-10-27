
You have successfully implemented the requested settings features in `web-admin/src/pages/settings/SettingsPageNew.tsx`.

## Features Implemented:

1.  **Branch List in Payment Accounts**:
    - The "Rekening Bank Pembayaran" tab now initially shows a list of all branches.
    - Each branch card displays its linked bank account information (or "Tidak Ada Rekening Bank") and a "Pending Settlement" summary (currently mocked to Rp 0).

2.  **Settlement Detail View**:
    - Clicking on a branch card opens the detailed Settlement View for that branch.
    - This view includes:
        - **Add Bank Account**: A button to open the modal for adding a bank account.
        - **Bank Account Card**: Displays the linked bank account details.
        - **Status Tabs**: Switches between "Belum" (Pending) and "Sudah" (Completed) settlements.
        - **Date Filter**: A button to open the `DateFilterModal` to filter settlement history.
        - **Settlement Table**: A table listing invoices with details (ID, No, Customer, Date, Location, Gross Total).

3.  **Enhanced Bank Account Modal**:
    - Updated to include the `branchName` field ("Nama Cabang") as requested.

4.  **Reusable Date Filter**:
    - The existing `DateFilterModal` from `web-admin/src/components/common/DateFilterModal.tsx` is successfully integrated into the Settlement View.

## File Modified:
- `web-admin/src/pages/settings/SettingsPageNew.tsx`
