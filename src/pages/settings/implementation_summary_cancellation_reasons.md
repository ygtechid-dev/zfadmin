
You have successfully implemented the "Alasan Pembatalan" (Cancellation Reasons) settings tab and fixed a syntax error.

## Features Implemented:
1.  **Syntax Fix**: Removed a duplicated `queueMode` key in the `queueSettings` object that was causing a build error.
2.  **Alasan Pembatalan Tab**:
    - **List View**: A clean list of cancellation reasons (e.g., "Appointment Made by Mistake").
    - **Drag & Drop UI**: Added a conceptual drag handle (`GripVertical`) to the list items.
    - **Delete Functionality**: Hovering over a row reveals a trash icon to delete the reason.
    - **Add New Reason**: A floating action button (FAB) `+` opens a modal.
    - **Modal**: A "Pembatalan Baru" modal with a textarea to enter a new reason and buttons to Save or Cancel.

## File Modified:
- `web-admin/src/pages/settings/SettingsPageNew.tsx`

The settings page should now build correctly and include the full suite of requested tabs.
