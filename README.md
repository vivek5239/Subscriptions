# Subscriptions

A modern subscription management dashboard to track your recurring expenses, analyze costs, and never miss a payment. Built with a responsive glassmorphism UI, Google Gemini AI integration, Gotify push notifications, and daily cron scheduling.

## Features

- **Modern Glassmorphic UI**: Inspired by OmniremindersV2 and HomerserverMaint with dark/light mode and 6 accent color themes.
- **No-Auth Simplicity**: Direct single-dashboard access without login barriers or external OAuth dependencies.
- **Google Gemini AI Integration**:
  - Configured with `gemini-2.5-pro` as primary model and automatic fallback cascade (`gemini-flash-lite-latest`, `gemini-3.1-flash-lite`).
  - **Fast Assistant**: Quick natural language prompt bar to parse and auto-create subscriptions (e.g. *"Subscribed to Netflix Premium for ₹649/month via HDFC Card renews monthly"*).
  - **Financial Advisor**: AI-generated cost reduction insights, category optimization, and annual savings strategies.
- **Notifications & Daily Scheduler**:
  - Configurable daily check (default 09:00 AM IST) checking overdue, due today, and upcoming bills.
  - Push notifications via **Gotify** with standard `X-Gotify-Key` header authentication.
  - Email digests via **SMTP / Nodemailer**.
  - On-demand "Run Daily Check Now" button with live status feedback.
- **Lifecycle & Payment Tracking**:
  - One-click "Paid" button that automatically rolls the subscription's `nextPayment` forward to its next cycle.
  - "Sync Overdue Cycles" tool to auto-advance all overdue recurring bills into the current calendar window.
  - Duplicate / Clone subscription support.
- **Visual Analytics**: Interactive category spend breakdown donut chart and monthly projected run rate bar chart.
- **Monthly Calendar**: Interactive visual grid with day drawer and inline settlement.
- **Docker Ready**: Dual compose setup for local development and homelab server deployment.

## Getting Started

### Prerequisites

- Node.js (v20+)
- npm

### Local Development

1. **Setup Data**
   The application persists data in the `data/` directory (`subscriptions.json` and `settings.json`).

2. **Start Server**
   ```bash
   cd server
   npm install
   npm run dev
   ```
   Server runs on `http://localhost:5000`.

3. **Start Client**
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Client runs on `http://localhost:5173`.

### Docker Deployment

#### Local Development / Testing
```bash
docker-compose up --build
```
The application will be accessible at `http://localhost:5005` (mapped to container port 5000).

#### Server Deployment (UDMS / Homelab)
Use the production deployment compose file:
```bash
docker-compose -f docker-compose.deploy.yml up -d
```
Image: `vivek5239/subscriptions-app:latest`
Persistent Volume: `$DOCKERDIR/appdata/subscriptions:/data`

### Building for Docker Hub

```bash
# Build and tag
docker build -t vivek5239/subscriptions-app:latest .

# Push to Docker Hub
docker push vivek5239/subscriptions-app:latest
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS / Vanilla CSS glassmorphic tokens, Lucide Icons, Recharts.
- **Backend**: Node.js, Express, `@google/generative-ai`, `node-cron`, `axios`, `nodemailer`.
- **Container**: Docker (multi-stage Alpine build).
