import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import reportRoutes from './routes/reports.js';
import NotificationServer from './websocket/notificationServer.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later'
  }
});

app.use('/api', limiter);

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Security headers to prevent iframe embedding
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  next();
});

// Database connection with optimizations
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false
})
  .then(() => {
    console.log('MongoDB connected with optimizations');
    // Create indexes for better performance
    createIndexes();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Create database indexes for optimization
async function createIndexes() {
  try {
    const db = mongoose.connection.db;
    
    // Create indexes for reports collection (check if they exist first)
    const existingIndexes = await db.collection('reports').indexes();
    const indexNames = existingIndexes.map(index => index.name);
    
    // Only create indexes if they don't exist
    if (!indexNames.includes('title_1')) {
      await db.collection('reports').createIndex({ 'title': 1 });
    }
    
    if (!indexNames.includes('createdTime_-1')) {
      await db.collection('reports').createIndex({ 'createdTime': -1 });
    }
    
    if (!indexNames.includes('dashboardData.timestamp_-1')) {
      await db.collection('reports').createIndex({ 'dashboardData.timestamp': -1 });
    }
    
    // Create compound text index for search (with unique name)
    if (!indexNames.includes('search_text_index')) {
      await db.collection('reports').createIndex({ 
        'title': 'text', 
        'content': 'text',
        'reportData.client': 'text'
      }, { name: 'search_text_index' });
    }
    
    console.log('Database indexes verified/created successfully');
  } catch (error) {
    console.error('Error with indexes (non-critical):', error.message);
    // Don't throw error - let the app continue running
  }
}

// Initialize WebSocket server
const notificationServer = new NotificationServer(server);

// Make notification server available to routes
app.set('notificationServer', notificationServer);

app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      websocket: 'active'
    }
  });
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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with WebSocket support`);
});

export { notificationServer };
