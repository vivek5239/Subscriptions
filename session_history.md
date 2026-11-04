# Session History - Subscriptions App

## 2026-11-04
- Rebuilt entire frontend application with modern glassmorphism UI inspired by OmniremindersV2 and HomerserverMaint:
  - Inter typography, backdrop blur panels, color accents, and responsive layout.
  - Dashboard: KPI cards (Monthly, Yearly, Due this Month, Overdue bills with pulse badge), Gemini AI Fast Assistant natural language bar with quick prompt chips, AI Financial Insights modal, overdue list with 1-click "Paid" button, upcoming schedule list, active subscriptions table.
  - Subscriptions: Real-time search, category filter chips, cycle pills, status filters (All, Active, Overdue, Inactive), view switcher (Table vs Card Grid), 1-click Pay, Clone, Edit, Delete, and "Sync Overdue Cycles" button.
  - Stats / Analytics: Category spend breakdown (interactive donut chart), projected annual run rate monthly bar chart, top 5 commitments.
  - Calendar: Interactive monthly grid with payment badges, selected date drawer with 1-click settlement.
  - Settings: Multi-tab layout (Gemini AI with model discovery, Gotify Push with test, SMTP Email with test, Daily Scheduler with "Run Daily Check Now" & last execution status log, Data & Cycles sync, Appearance themes).
- Removed Authentication System completely:
  - Deleted `Auth.tsx`, `AuthContext.tsx`, Google OAuth provider, and JWT token handling.
  - Deleted server middleware `middleware/auth.js` and routes `routes/auth.js`.
  - Reconfigured `server/db.js` to serve global subscriptions and settings directly without user partitioning.
- Upgraded AI Integration to Google Gemini:
  - Integrated `@google/generative-ai` with user-specified default model `gemini-2.5-pro`.
  - Built resilient fallback cascade (`gemini-2.5-pro` -> `gemini-flash-lite-latest` -> `gemini-3.1-flash-lite` -> `gemini-flash-latest`) handling 404/429 quota limits gracefully.
  - Added natural language quick-add parser (`/api/ai/create-subscription`) and comprehensive financial strategy analysis (`/api/ai/analyze`).
  - Added dynamic model discovery endpoint (`/api/gemini/models`).
- Diagnosed & Fixed Daily Schedule and Gotify Notifications:
  - Root Cause 1: Due date calculation only checked `diffDays >= 0 && diffDays <= 3`. All existing subscriptions had payment dates in Jan/Feb 2026 (`diffDays < 0`), resulting in 0 alerts and skipping Gotify delivery entirely. Fixed to monitor overdue bills (`diffDays < 0`), due today (`diffDays === 0`), and upcoming bills (`0 < diffDays <= alertDaysAhead`).
  - Root Cause 2: Fragile query-parameter token delivery was replaced with standard `X-Gotify-Key` header authentication.
  - Root Cause 3: Removed Groq dependency; daily digest is now generated with Gemini AI or clean Markdown summary.
  - Added manual "Run Daily Check Now" in Settings to instantly verify notification dispatch and view live status logs.
  - Successfully verified live Gotify push to `https://gotify.rvitservices.uk/message` and SMTP email notification.
- Docker & Deployment Configurations:
  - Upgraded Dockerfile to `node:20-alpine` multi-stage build.
  - Verified local dev configuration (`docker-compose.yml`).
  - Updated production server configuration (`docker-compose.deploy.yml`) using `vivek5239/subscriptions-app:latest`, persistent volume `$DOCKERDIR/appdata/subscriptions:/data`, `PUID`/`PGID`/`TZ`, `restart: unless-stopped`, and reverse proxy networks (`t3_proxy`, `socket_proxy`).
  - Built Docker image `subscriptions-app:latest` and tagged `vivek5239/subscriptions-app:latest`.

## 2026-01-08
- Added Authentication system (Sign In, Sign Up, Google Sign-In).
- Implemented `AuthContext` for managing user state and JWT tokens.
- Protected all main application routes (Dashboard, Subscriptions, etc.).
- Updated `server/db.js` to support User management and per-user subscription data.
- Added theme color customization option in Settings, allowing users to choose from 6 accent colors (Purple, Blue, Green, Orange, Red, Slate).
- Implemented `ThemeContext` for global theme and color management.
- Rebuilt Docker image to include new frontend changes.
- Added Google AI (Gemini) integration with 'gemini-1.5-pro' support.
- Refined Notifications settings with a master toggle and clearer test buttons.
- Updated Settings page UI to include Gemini API key configuration.
- Improved Dashboard AI insights to support both Groq and Gemini.
- Added 'NotificationsEnabled' persistence in settings.
