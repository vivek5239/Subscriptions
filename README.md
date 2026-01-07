# Remainders

A modern subscription management dashboard to track your recurring expenses, analyze costs, and never miss a payment.

## Features

- **Dashboard**: Visual overview of Monthly/Yearly costs, Active Subscriptions, and Approaching Deadlines.
- **Currency Normalization**: Automatically converts various currencies (USD, EUR, GBP) to INR for unified statistics.
- **Smart Logos**: Automatically fetches logos for your subscriptions.
- **Upcoming Payments**: Highlights payments due in the next 5 days.
- **Docker Ready**: Easy deployment with Docker and Docker Compose.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Local Development

1.  **Setup Data**
    Ensure your `subscriptions.json` is in the `data/` directory.

2.  **Start Server**
    ```bash
    cd server
    npm install
    npm run dev
    ```
    Server runs on `http://localhost:5000`.

3.  **Start Client**
    ```bash
    cd client
    npm install
    npm run dev
    ```
    Client runs on `http://localhost:5173`.

### Docker Deployment

To build and run the application as a single container (serving both frontend and backend):

```bash
docker-compose up --build
```

The application will be available at `http://localhost:5000`.

### Building for Docker Hub

To push this image to Docker Hub (e.g., for your server):

```bash
# Build the image
docker build -t your-username/remainders:latest .

# Push to Docker Hub
docker push your-username/remainders:latest
```

## Configuration

- **Data Source**: The app reads from `data/subscriptions.json`. This file is persisted via a Docker volume.
- **Currency**: Default base currency is INR. Rates are currently fixed in `server/currency.js`.

## Tech Stack

- **Frontend**: React, TypeScript, Bootstrap 5, Lucide Icons.
- **Backend**: Node.js, Express.
- **Container**: Docker.
