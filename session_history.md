## 2026-01-21
- Rebuilt Docker containers for the application.
- Added a configurable 'Remind Before' option to the reminder creation/editing form in `client/src/components/ReminderModal.tsx`.
- Updated the `Reminder` interface in `client/src/types/index.ts` to include the `remindBefore` field.
- Modified the backend `runDailyReminderCheck` function in `server/index.js` to utilize the `remindBefore` setting for notification triggers.
- Implemented a conversational AI flow for reminder creation in `server/index.js` and `client/src/pages/Dashboard.tsx`, allowing the AI to ask clarifying questions if information is missing.
- Enhanced the AI reminder creation flow to navigate to the `/reminders` page and highlight the newly created reminder upon successful creation. This involved changes in `client/src/pages/Dashboard.tsx` and `client/src/pages/Reminders.tsx`, and adding a CSS highlight animation in `client/src/App.css`.
- Added a "Calendar Import" section to the settings page in `client/src/pages/SettingsView.tsx`, including placeholders for Google and Outlook calendar import, and a file input for `.ics` files, along with an explanation of required permissions.
- Ensured email and Gotify notifications are processed through Groq AI for better readability.