# Session History - Reminders App

## 2026-01-08
- Added Authentication system (Sign In, Sign Up, Google Sign-In).
- Implemented `AuthContext` for managing user state and JWT tokens.
- Protected all main application routes (Dashboard, Reminders, etc.).
- Updated `server/db.js` to support User management and per-user reminder data.
- Added theme color customization option in Settings, allowing users to choose from 6 accent colors (Purple, Blue, Green, Orange, Red, Slate).
- Implemented `ThemeContext` for global theme and color management.
- Rebuilt Docker image to include new frontend changes.
- Added Google AI (Gemini) integration with 'gemini-1.5-pro' support.
- Refined Notifications settings with a master toggle and clearer test buttons.
- Updated Settings page UI to include Gemini API key configuration.
- Improved Dashboard AI insights to support both Groq and Gemini.
- Added 'NotificationsEnabled' persistence in settings.
