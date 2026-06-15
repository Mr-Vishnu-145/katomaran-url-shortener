# LinkSphere - Real-Time Link Intelligence Platform

LinkSphere is a production-grade URL management and analytics platform built using React, Express, PostgreSQL, and Socket.IO. It enables users to create short links, custom aliases, and expiry dates, download campaign QR codes, and view real-time traffic statistics (device types, browsers, referrers, and countries) via a responsive Linear/Vercel style dashboard.

This project is a part of a hackathon run by https://katomaran.com

---

## 🏗️ Architecture Diagram

```mermaid
graph TD
    Client[Browser: React + Zustand + React Query]
    API_Gateway[Express Router / API Gateway]
    Auth[Auth Service: JWT + Refresh Cookie]
    URL[URL Service: Create / List / Delete]
    Analytics[Analytics & Aggregate Stats]
    Redirect_Gateway[Smart Redirect Gateway]
    Cache[Node Cache: stdTTL 60s]
    DB[(PostgreSQL)]
    Sockets[Socket.IO Server]

    Client -->|REST Requests| API_Gateway
    API_Gateway --> Auth
    API_Gateway --> URL
    API_Gateway --> Analytics
    
    Client -->|GET /:shortCode| Redirect_Gateway
    Redirect_Gateway -->|1. Check Cache| Cache
    Redirect_Gateway -->|2. Check DB on Cache Miss| DB
    Redirect_Gateway -->|3. 301 Redirect| Client
    Redirect_Gateway -->|4. Async click increment & visit log| DB
    Redirect_Gateway -->|5. Real-Time Broadcast| Sockets
    Sockets -->|Live updates| Client
    
    Auth --> DB
    URL --> DB
    Analytics --> DB
```

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TailwindCSS v3, Lucide React, Recharts, Framer Motion, react-hot-toast, Zustand, TanStack React Query, react-hook-form, Zod, qrcode.react, socket.io-client.
- **Backend**: Node.js, Express, Socket.IO, PostgreSQL (pg pool, max 20), JWT, bcrypt (12 salt rounds), Helmet, CORS, express-rate-limit, node-cache, ua-parser-js, compression.

---

## 📂 Project Structure

```text
katomaran-url-shortener/
├── backend/
│   ├── src/
│   │   ├── config/          # db connection & migrations
│   │   ├── controllers/     # business logic handlers
│   │   ├── middleware/      # auth, error handling & rate limiters
│   │   ├── routes/          # API gateways & routing
│   │   └── utils/           # helper validations
│   ├── server.js            # entry file
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/             # axios instance with auto-refresh token logic
    │   ├── components/      # layout & url custom cards
    │   ├── pages/           # views (Dashboard, Admin, Detail, Login, Register)
    │   ├── store/           # Zustand auth store
    │   ├── App.jsx          # route mappings & auth checks
    │   └── main.jsx         # QueryClient & Toaster wrapper
    ├── index.html
    └── package.json
```

---

## 🚀 Setup & Local Running Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v12+) running on localhost:5432

### 1. Database Setup
Create database in pgAdmin or psql:
```sql
CREATE DATABASE linksphere_ai;
```

### 2. Backend Setup
1. `cd backend`
2. Create a `.env` file using `.env.example`:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:root@localhost:5432/linksphere_ai
   JWT_SECRET=super_secret_jwt_access_token_key_123!
   JWT_REFRESH_SECRET=super_secret_jwt_refresh_token_key_456!
   FRONTEND_URL=http://localhost:5173
   ```
3. Run migrations and database seeds:
   ```bash
   npm run migrate
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. `cd frontend`
2. Create a `.env` file using `.env.example`:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
   VITE_API_URL=http://localhost:5000
   ```
3. Start Dev:
   ```bash
   npm run dev
   ```
4. Visit http://localhost:5173.

---

## ☁️ Production Deployment (100% Free & Always-Active)

This project is optimized for deployment on free cloud hosting platforms. Here is the recommended configuration to keep your app running 24/7 without cost:

### 1. Database: Neon.tech (Serverless PostgreSQL)
1. Sign up on [Neon.tech](https://neon.tech/) and create a new PostgreSQL database.
2. Copy the Connection URI.
3. To initialize the tables on the live database, run this command locally:
   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="YOUR_NEON_CONNECTION_STRING"; node src/config/migrate.js

   # macOS / Linux / Git Bash
   DATABASE_URL="YOUR_NEON_CONNECTION_STRING" node src/config/migrate.js
   ```

### 2. Backend API: Render.com (Web Service)
1. Link your GitHub repository to [Render.com](https://render.com/).
2. Select **New +** -> **Web Service** and configure:
   * **Root Directory**: `backend`
   * **Instance Type**: `Free`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
3. In the **Environment** tab, set the following variables:
   * `DATABASE_URL` = *[Your Neon Database Connection String]*
   * `JWT_SECRET` = *[Your Secure JWT Token]*
   * `JWT_REFRESH_SECRET` = *[Your Secure JWT Refresh Token]*
   * `FRONTEND_URL` = *[Your Vercel Production URL]*
   * `PORT` = `5000`

### 3. Frontend React App: Vercel.com
1. Link your GitHub repository to [Vercel.com](https://vercel.com/).
2. Select **Add New** -> **Project**, select the repo, and configure:
   * **Root Directory**: `frontend`
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
3. Add the following **Environment Variable**:
   * `VITE_API_URL` = *[Your Render Backend URL]* (e.g. `https://katomaran-url-shortener.onrender.com`)
4. Vercel routes all SPA paths using the [vercel.json](frontend/vercel.json) file included in the repository.

---

## 💡 Key Architectural Assumptions
1. **Zero-Latency Redirect Gateway**: Decoupled GET /:shortCode mapping from direct DB writes. Checks node-cache first, performs 302 redirect instantly, and writes analytics logs asynchronously in the background.
2. **Session Storage**: Access token stored in memory (Zustand state), while refresh token is set in secure, httpOnly cookies to prevent XSS.
3. **Database Performance**: Configured partial indexes for active URLs and aggregates JOIN queries for platform/link stats.

---

## 🎥 Demo Video & Outputs
- **Loom/YouTube Demo Video**: [Watch Demo Video](https://youtu.be/n43yz7pbvkM)
- **Default Credentials**:
  - **Admin User**: admin@gmail.com / AdminPass123!
  - **Standard User**: Self-register via `/register`
