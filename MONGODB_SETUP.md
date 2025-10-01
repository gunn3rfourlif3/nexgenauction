# MongoDB Setup Instructions

## Current Status
The application is currently configured to run in **development mode without MongoDB** to allow for testing and development without requiring a database installation.

## To Enable Database Storage

### Option 1: Install MongoDB Locally

1. **Download MongoDB Community Server**
   - Visit: https://www.mongodb.com/try/download/community
   - Download the Windows installer
   - Run the installer and follow the setup wizard

2. **Start MongoDB Service**
   ```powershell
   # After installation, start MongoDB service
   net start MongoDB
   ```

3. **Enable Database Connection**
   - In `backend/.env`, change:
   ```
   FORCE_DB_CONNECTION=true
   ```

4. **Restart the Backend Server**
   ```bash
   cd backend
   node server.js
   ```

### Option 2: Use MongoDB Atlas (Cloud)

1. **Create MongoDB Atlas Account**
   - Visit: https://www.mongodb.com/atlas
   - Create a free account and cluster

2. **Get Connection String**
   - Copy your MongoDB Atlas connection string
   - Update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nexgenauction
   FORCE_DB_CONNECTION=true
   ```

3. **Restart the Backend Server**

### Option 3: Use Docker

1. **Install Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop

2. **Run MongoDB Container**
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

3. **Enable Database Connection**
   - In `backend/.env`, change:
   ```
   FORCE_DB_CONNECTION=true
   ```

## Current Development Mode

When `FORCE_DB_CONNECTION=false`, the application uses:
- Mock user data for authentication
- In-memory storage (data doesn't persist)
- All features work but data is temporary

## Benefits of Database Storage

When MongoDB is connected:
- ✅ User data persists across server restarts
- ✅ Real user registration and authentication
- ✅ Auction data storage
- ✅ User profiles and preferences
- ✅ Email verification system
- ✅ Password reset functionality

## Verification

After enabling database connection, you can verify it's working by:
1. Registering a new user
2. Restarting the server
3. Logging in with the same credentials
4. Data should persist across restarts