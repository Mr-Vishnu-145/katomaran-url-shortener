const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { PORT, FRONTEND_URL } = require('./src/config/env');
const { errorMiddleware } = require('./src/middleware/error');

const authRoutes = require('./src/routes/auth');
const urlRoutes = require('./src/routes/urls');
const adminRoutes = require('./src/routes/admin');
const redirectRoutes = require('./src/routes/redirect');

const app = express();
app.set('trust proxy', true);
const server = http.createServer(app);

// Socket.IO configuration
const io = socketIo(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Attach Socket.IO instance to app so routers can access it
app.set('io', io);

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for easy development/redirection checks
}));
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

// Performance Middlewares
app.use(compression()); // Gzip compression middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Debug logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes);
app.use('/api/admin', adminRoutes);

// Smart Redirect Gateway Route (placed last so it doesn't conflict with REST routes)
app.use('/', redirectRoutes);

// Global Error Handler Middleware
app.use(errorMiddleware);

// Socket.IO client room connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join private room based on user id
  socket.on('join-user-room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined room user_${userId}`);
  });

  // Join admin room — verified against DB to prevent unauthorized access
  socket.on('join-admin-room', async (userId) => {
    if (!userId) {
      console.warn(`Socket ${socket.id} tried to join admin-room without userId`);
      return;
    }
    try {
      const db = require('./src/config/db');
      const result = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (result.rows.length > 0 && result.rows[0].role === 'admin') {
        socket.join('admin-room');
        console.log(`Socket ${socket.id} (user ${userId}) joined admin-room`);
      } else {
        console.warn(`Socket ${socket.id} (user ${userId}) denied admin-room access`);
      }
    } catch (err) {
      console.error('Admin room auth error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`======================================================`);
  console.log(` LinkSphere server is running on http://localhost:${PORT} `);
  console.log(` Database Target: postgresql://postgres:root@...      `);
  console.log(`======================================================`);
});
