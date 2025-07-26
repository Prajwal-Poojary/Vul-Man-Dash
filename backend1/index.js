const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { securityMiddleware, xssProtection, noSQLInjectionProtection } = require('./middleware/security');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(securityMiddleware);
app.use(xssProtection);
app.use(noSQLInjectionProtection);

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Middleware
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
app.use(express.json());

// Security headers to prevent iframe embedding
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/report'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

module.exports = app; 