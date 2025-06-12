const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:4200', // Angular default port
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://Raghavendra:nkraghu2005@projecteye.6hfflmb.mongodb.net/reportpage?retryWrites=true&w=majority&appName=projecteye';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if cannot connect to database
  });

// Report Schema
const reportSchema = new mongoose.Schema({
  title: String,
  description: String,
  date: { type: Date, default: Date.now },
  status: String,
  data: mongoose.Schema.Types.Mixed
});

const Report = mongoose.model('Report', reportSchema);

// API Routes
app.post('/api/reports', async (req, res) => {
  console.log('\n=== New Report Save Request ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request received with data:', JSON.stringify(req.body, null, 2));
  
  try {
    console.log('Creating new report document...');
    const report = new Report(req.body);
    console.log('Saving report to MongoDB...');
    const savedReport = await report.save();
    console.log('Report saved successfully!');
    console.log('Saved report ID:', savedReport._id);
    console.log('=== End of Save Request ===\n');
    res.status(201).json(savedReport);
  } catch (error) {
    console.error('Error saving report:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    console.log('=== End of Save Request (Error) ===\n');
    res.status(400).json({ 
      message: 'Error saving report',
      error: error.message 
    });
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find();
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ 
      message: 'Error fetching reports',
      error: error.message 
    });
  }
});

app.get('/api/reports/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ 
      message: 'Error fetching report',
      error: error.message 
    });
  }
});

app.put('/api/reports/:id', async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(400).json({ 
      message: 'Error updating report',
      error: error.message 
    });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ message: 'Report deleted' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ 
      message: 'Error deleting report',
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: err.message 
  });
});

const PORT = 5004;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/reports`);
}); 