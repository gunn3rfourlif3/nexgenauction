const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
// Load environment variables without overriding those provided at runtime
require('dotenv').config({ override: false });

// Import passport configuration after dotenv is loaded
const passport = require('./config/passport');

// Import database connection
const connectDB = require('./config/database');

const app = express();
const server = http.createServer(app);
const isDevEnv = (process.env.NODE_ENV || 'development') !== 'production';
const escapeRegex = (str) => str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
const allowedOriginRegexes = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  process.env.FRONTEND_URL ? new RegExp('^' + escapeRegex(process.env.FRONTEND_URL) + '$') : null,
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // allow non-browser requests
  // In development, allow any localhost/127.0.0.1 origin
  if (isDevEnv && allowedOriginRegexes.some((re) => re.test(origin))) return true;
  // In production, only allow exact FRONTEND_URL if provided
  if (!isDevEnv && process.env.FRONTEND_URL) {
    return origin === process.env.FRONTEND_URL;
  }
  return false;
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isDevEnv) {
        return callback(null, true); // allow all origins in development
      }
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by Socket.IO CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

// Align default backend port with frontend proxy (5006)
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5006;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = isDevEnv
  ? {
      origin: true, // reflect request origin in dev
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  : {
      origin: process.env.FRONTEND_URL || false,
      credentials: true
    };

app.use(cors(corsOptions));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET || 'nexgenauction_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Import routes
const apiRoutes = require('./routes');

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api', apiRoutes);

// Serve frontend build assets if available
const buildDir = path.join(__dirname, '../frontend/build');
if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));
  // Fallback to index.html for client-side routes (non-API)
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
  });
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join auction room
  socket.on('join-auction', (auctionId) => {
    socket.join(`auction-${auctionId}`);
    console.log(`User ${socket.id} joined auction ${auctionId}`);
  });

  // Leave auction room
  socket.on('leave-auction', (auctionId) => {
    socket.leave(`auction-${auctionId}`);
    console.log(`User ${socket.id} left auction ${auctionId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// 404 handler for non-API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    suggestion: 'API endpoints are available at /api/*'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});