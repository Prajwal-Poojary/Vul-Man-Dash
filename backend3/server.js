require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Report = require('./models/report.model');
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://Raghavendra:nkraghu2005@projecteye.6hfflmb.mongodb.net/dashbordinput?retryWrites=true&w=majority&appName=projecteye';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1); // Exit if cannot connect to database
});

// Routes
app.get('/', (req, res) => {
  res.send('Vulnerability Dashboard API is running');
});

// Save dashboard data
app.post('/api/reports/dashboard', async (req, res) => {
  try {
    const dashboardData = req.body;
    console.log('Received dashboard data:', dashboardData); // Debug log
    
    // Generate a new reportId if not provided
    const reportId = dashboardData._id || new mongoose.Types.ObjectId().toString();
    
    // Create new report with dashboard data
    const report = new Report({
      reportId: reportId,
      ...dashboardData
    });
    
    const savedReport = await report.save();
    console.log('Saved report:', savedReport); // Debug log
    
    // Return both the report and its ID
    res.status(201).json({ 
      message: 'Dashboard data saved', 
      report: savedReport,
      reportId: savedReport.reportId // Use reportId instead of _id
    });
  } catch (err) {
    console.error('Error saving dashboard data:', err);
    res.status(500).json({ error: 'Failed to save dashboard data', details: err.message });
  }
});

// Get all dashboard reports
app.get('/api/reports/dashboard', async (req, res) => {
  try {
    const reports = await Report.find().sort({ timestamp: -1 });
    res.json(reports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports', details: err.message });
  }
});

// Get dashboard data by ID
app.get('/api/reports/dashboard/:id', async (req, res) => {
  try {
    const id = req.params.id;
    console.log('Fetching dashboard data for ID:', id); // Debug log
    
    // Try to find by _id first
    let report = await Report.findById(id);
    console.log('Search by _id result:', report ? 'Found' : 'Not found');
    
    // If not found, try to find by reportId
    if (!report) {
      report = await Report.findOne({ reportId: id });
      console.log('Search by reportId result:', report ? 'Found' : 'Not found');
    }
    
    if (!report) {
      console.log('Report not found for ID:', id); // Debug log
      return res.status(404).json({ error: 'Report not found' });
    }
    
    console.log('Found report:', report); // Debug log
    res.json(report);
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: err.message });
  }
});

// Update dashboard data
app.put('/api/reports/dashboard/:id', async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Dashboard data updated', report });
  } catch (err) {
    console.error('Error updating dashboard data:', err);
    res.status(500).json({ error: 'Failed to update dashboard data', details: err.message });
  }
});

// Delete dashboard data
app.delete('/api/reports/dashboard/:id', async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Dashboard data deleted' });
  } catch (err) {
    console.error('Error deleting dashboard data:', err);
    res.status(500).json({ error: 'Failed to delete dashboard data', details: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server listening on http://localhost:${port}`);
});
