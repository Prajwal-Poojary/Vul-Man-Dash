const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
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

// Error handling middleware
app.use((err, req, res, next) => {
  // console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app; 