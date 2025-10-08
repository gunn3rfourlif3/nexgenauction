# Nexus Auctions

A modern auction platform built with React, Node.js, MongoDB, and Tailwind CSS.

## Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js with Express.js
- **Database**: MongoDB
- **Styling**: Tailwind CSS

## Project Structure

```
NexusAuctions/
├── frontend/          # React frontend application
├── backend/           # Node.js backend API
└── README.md         # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

## Features

- Modern auction platform
- Real-time bidding
- User authentication
- Responsive design
- RESTful API

## License

MIT License

## Development Mock Catalog & Test Scripts

To speed up local testing without relying on database contents, the backend can serve a predefined in-memory catalog when dev mock mode is enabled.

- Toggle dev mock via environment variables:
  - Set `ENABLE_DEV_MOCK=true` to always include mock catalog in `/api/auctions` responses.
  - Alternatively, when `NODE_ENV=development`, mock may be enabled depending on controller logic.
  - Example (Windows PowerShell):
    ```powershell
    $env:BACKEND_PORT=5006; $env:ENABLE_DEV_MOCK='true'; node backend/server.js
    ```

- Validate catalog search/sort:
  - Run: `node backend/scripts/catalogDevTest.js`
  - Optional: set `API_BASE_URL` (defaults to `http://localhost:5006/api`).

- Dev flows (Windows):
  - Watchlist demo: `npm run dev:watchlist:demo` (uses `dev@example.com` / `x`)
  - Notifications demo: `npm run dev:notifications:demo`
  - Bid demo: `npm run dev:bid:demo`

- Dev flows (generic):
  - Watchlist: `node backend/scripts/devWatchlistTest.js`
  - Notifications: `node backend/scripts/devNotificationsTest.js`
  - Bid flow: `node backend/scripts/devBidTest.js`

Notes:
- These scripts default to `API_BASE_URL=http://localhost:5006/api`. Override as needed.
- The scripts attempt login using `DEV_EMAIL` and `DEV_PASSWORD` env vars, falling back to `dev@example.com` / `x`.

### DB-Backed Mode vs Dev Mock

- When running against MongoDB (DB-backed mode), set in `backend/.env` or the environment:
  - `FORCE_DB_CONNECTION=true`
  - `MONGODB_URI=mongodb://localhost:27017/nexgenauction` (or your Atlas URI)
  - Start the backend on a port (e.g., `BACKEND_PORT=3000`).

- Seed sample auctions for testing:
  - Run: `node backend/scripts/createFiveActiveAuctions.js`
  - The script prints created auction IDs. Use one for `WATCH_AUCTION_ID` or `BID_AUCTION_ID`.

- Important: In dev mock mode (`ENABLE_DEV_MOCK=true`), `GET /api/auctions` serves mock items, but `GET /api/auctions/:id` and watchlist endpoints operate on the database. Use DB IDs for watchlist/bid flows when DB is enabled.

- Example runs against DB-backed server (Windows PowerShell):
  ```powershell
  $env:NODE_ENV='development'
  $env:FORCE_DB_CONNECTION='true'
  $env:MONGODB_URI='mongodb://localhost:27017/nexgenauction'
  $env:BACKEND_PORT=3000
  node backend/server.js

  # Watchlist test with a seeded auction ID
  $env:API_BASE_URL='http://localhost:3000/api'
  $env:DEV_EMAIL='dev@example.com'
  $env:DEV_PASSWORD='Password123!'
  $env:WATCH_AUCTION_ID='<paste-seeded-id-here>'
  node backend/scripts/devWatchlistTest.js
  ```
- Ensure the backend is running and dev mock is enabled for consistent local results.