import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import reportRoutes from './routes/reports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

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

mongoose.connect(process.env.MONGO_URI)
  .then(() => {/* console.log('MongoDB connected') */})
  .catch((err) => {/* console.error('MongoDB connection error:', err) */});

app.use('/api/reports', reportRoutes);

app.listen(PORT, () => {/* console.log(`Server running on port ${PORT}`) */});
