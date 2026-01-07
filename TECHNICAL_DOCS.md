# Technical Documentation: Remainders

## 1. Architecture Overview

**Remainders** is a full-stack web application designed to track and manage recurring subscriptions. It follows a **Monolithic Repository (Monorepo)** structure but separates concerns into a distinct Client (Frontend) and Server (Backend).

*   **Frontend**: Single Page Application (SPA) built with React and TypeScript.
*   **Backend**: RESTful API built with Node.js and Express.
*   **Database**: JSON-based flat-file storage (`subscriptions.json`), ensuring portability and simplicity without the overhead of a SQL database.
*   **Deployment**: Containerized using Docker, serving both the API and the static frontend assets from a single container.

## 2. Tech Stack

### Frontend (`/client`)
*   **Framework**: React 18
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Bootstrap 5 (React-Bootstrap) + Custom CSS
*   **Icons**: Lucide-React
*   **HTTP Client**: Axios
*   **Date Handling**: date-fns

### Backend (`/server`)
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Language**: JavaScript (ES Modules)
*   **Data Access**: Native `fs/promises` for JSON manipulation.
*   **Currency Math**: Custom logic for symbol parsing and INR normalization.

## 3. Data Flow

1.  **Read**: The React Client requests `GET /api/subscriptions`.
2.  **Process**:
    *   The Express Server reads `data/subscriptions.json`.
    *   It iterates through records, parsing `Price` strings (e.g., "$10", "₹500").
    *   It applies a conversion rate (defined in `currency.js`) to normalize all values to **INR**.
    *   It calculates KPIs (Monthly Total, Yearly Total, Active Count).
    *   It identifies "Upcoming Payments" based on the `Next Payment` date.
3.  **Response**: The server returns an enriched JSON object containing both the raw list and the calculated statistics.
4.  **Render**: The Client receives the data and renders the Dashboard and Subscription Table.

## 4. Directory Structure

```text
Remainders/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── App.tsx         # Main Component (Dashboard Logic)
│   │   ├── main.tsx        # Entry Point
│   │   └── ...
│   └── vite.config.ts      # Build Configuration
├── server/                 # Node.js Backend
│   ├── index.js            # Entry Point & API Routes
│   ├── db.js               # File System Operations (CRUD)
│   ├── currency.js         # Currency Conversion Logic
│   └── public/             # Static assets (populated during Docker build)
├── data/                   # Data Storage
│   └── subscriptions.json  # The "Database"
├── Dockerfile              # Multi-stage build definition
├── docker-compose.yml      # Container orchestration
└── README.md               # User Guide
```

## 5. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/subscriptions` | Returns all subscriptions and calculated Dashboard Stats. |
| `POST` | `/api/subscriptions` | Creates or Updates a subscription (Upsert). |
| `DELETE` | `/api/subscriptions/:id` | Deletes a subscription by ID. |
| `GET` | `/*` | Serves the React Client (SPA Fallback) for non-API requests. |

## 6. Logic Highlights

### Currency Normalization (`server/currency.js`)
The app uses a simplistic but effective heuristic to parse prices:
1.  Detects symbols (`$`, `₹`, `€`, `£`) or codes (`USD`, `INR`).
2.  Strips non-numeric characters (commas, spaces).
3.  Converts the value to **INR** using a hardcoded exchange rate table (e.g., $1 = ₹85.5).

### Logo Fetching (`client/src/App.tsx`)
The frontend component `<Logo />` attempts to resolve a brand logo dynamically:
1.  **Clearbit API**: `https://logo.clearbit.com/{domain}`.
2.  **Fallback**: If the image fails to load, it generates a text-based avatar using `ui-avatars.com`.

## 7. Deployment (Docker)

The `Dockerfile` utilizes a **Multi-Stage Build** to minimize image size:

1.  **Stage 1 (client-build)**:
    *   Installs client dependencies.
    *   Runs `vite build` to generate optimized static files (`dist/`).
2.  **Stage 2 (Production)**:
    *   Installs server dependencies (production only).
    *   Copies server code.
    *   Copies the `dist/` folder from Stage 1 into `server/public`.
    *   Exposes Port 5000.

**Volume Mapping**:
The `docker-compose.yml` maps the host's `./data` folder to `/data` inside the container. This ensures that `subscriptions.json` persists even if the container is destroyed.

## 8. Future Roadmap

1.  **Gemini AI Integration**:
    *   Implement an endpoint `/api/analyze` that sends the subscription JSON to Google's Gemini Flash model.
    *   Prompt: "Analyze these expenses and suggest 3 ways to save money."

2.  **Notifications**:
    *   Integrate `node-cron` in `server/index.js` to run a daily check at 09:00 AM.
    *   Send HTTP POST requests to a Gotify instance for due payments.
    *   Use `nodemailer` to send summary emails.

3.  **Live Currency Rates**:
    *   Replace fixed rates in `currency.js` with a daily fetch from an external Exchange Rate API.
