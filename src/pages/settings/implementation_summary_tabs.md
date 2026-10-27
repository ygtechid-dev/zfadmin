
You have successfully added new settings sections (tabs) to `web-admin/src/pages/settings/SettingsPageNew.tsx` based on the provided designs.

## Features Implemented:

1.  **Calendar Settings (`Kalender`)**:
    - **Configuration Options**: Added settings for Agenda Color, Time Slot Interval, Default View, Week Start Day, and Staff Order.
    - **UI**: Implemented using dropdowns (`select`) with a clean card layout.
    - **Interaction**: Settings are stored in component state (`calendarSettings`).

2.  **Notification Settings (`Pemberitahuan`)**:
    - **Agenda Notification**: Toggle switch to enable/disable agenda notifications. Use conditional rendering to show sub-options (checkboxes for "Booked Staff" and "Email") only when enabled.
    - **Inventory Notification**: Toggle switch for inventory notifications.
    - **UI**: Added a description box and used toggle switches and checkboxes consistent with the design.

3.  **Queue Mode Settings (`Mode Antrian`)**:
    - **Info Banner**: Added an informational alert about Queue Mode usage.
    - **Theme Settings**: Color pickers allow customization of "Ongoing Background Color" and "Ongoing Text Color".
    - **Kiosk Settings**: Dropdown for "Max Services" (e.g., Unlimited, 1, 2, 3) and a toggle for "Require Name & Phone".
    - **Activation Toggle**: A toggle switch to enable/disable Queue Mode for the selected branch (or generally if no branch selected).
    - **UI**: Components map to the provided screenshot structure.

## File Modified:
- `web-admin/src/pages/settings/SettingsPageNew.tsx`
