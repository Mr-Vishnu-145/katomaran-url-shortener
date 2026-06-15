# LinkSphere - Real-Time Link Intelligence Platform

LinkSphere is a production-grade URL management and analytics platform built using React, Express, PostgreSQL, and Socket.IO. It enables users to create short links, custom aliases, and expiry dates, download campaign QR codes, and view real-time traffic statistics (device types, browsers, referrers, and countries) via a responsive Linear/Vercel style dashboard.

This project is a part of a hackathon run by https://katomaran.com

---

## 🏗️ Architecture Diagram

\\\mermaid
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
\\\

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TailwindCSS v3, Lucide React, Recharts, Framer Motion, react-hot-toast, Zustand, TanStack React Query, react-hook-form, Zod, qrcode.react, socket.io-client.
- **Backend**: Node.js, Express, Socket.IO, PostgreSQL (pg pool, max 20), JWT, bcrypt (12 salt rounds), Helmet, CORS, express-rate-limit, node-cache, ua-parser-js, compression.

---

## 📂 Project Structure

\\\
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
\\\

---

## 🚀 Setup & Local Running Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v12+) running on localhost:5432

### 1. Database Setup
Create database in pgAdmin or psql:
\\\sql
CREATE DATABASE linksphere_ai;
\\\

### 2. Backend Setup
1. cd backend
2. Configure .env file:
   \\\env
   PORT=5000
   DATABASE_URL=postgresql://postgres:root@localhost:5432/linksphere_ai
   JWT_SECRET=super_secret_jwt_access_token_key_123!
   JWT_REFRESH_SECRET=super_secret_jwt_refresh_token_key_456!
   FRONTEND_URL=http://localhost:5173
   \\\
3. Run migrations and database seeds:
   \\\ash
   npm run migrate
   \\\
4. Start dev server:
   \\\ash
   npm run dev
   \\\

### 3. Frontend Setup
1. cd frontend
2. Start Dev:
   \\\ash
   npm run dev
   \\\
3. Visit http://localhost:5173.

---

## 💡 Key Architectural Assumptions
1. **Zero-Latency Redirect Gateway**: Decoupled GET /:shortCode mapping from direct DB writes. Checks node-cache first, performs 301 redirect instantly, and writes analytics logs asynchronously in the background.
2. **Session Storage**: Access token stored in memory (Zustand state), while refresh token is set in secure, httpOnly cookies to prevent XSS.
3. **Database Performance**: Configured partial indexes for active URLs and aggregates JOIN queries for platform/link stats.

---

## 🎥 Demo Video & Outputs
- **Loom/YouTube Demo Video**: [Watch Demo Video](https://youtu.be/n43yz7pbvkM)
- **Default Credentials**:
  - **Admin User**: admin@gmail.com / AdminPass123!
  - **Standard User**: Self-register via /register

---
This project is a part of a hackathon run by https://katomaran.com
