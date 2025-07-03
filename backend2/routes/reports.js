import express from 'express';
import Report from '../models/report.model.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

const router = express.Router();

function tokenRequired(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token is missing!' });
  }
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is invalid or expired!' });
  }
}

// Get all reports with pagination and search
router.get('/', tokenRequired, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';
  const query = search
    ? { title: { $regex: search, $options: 'i' } }
    : {};
  const reports = await Report.find(query).skip(skip).limit(limit);
  const total = await Report.countDocuments(query);
  // Remove password from each report
  const reportsObj = reports.map(r => {
    const obj = r.toObject();
    delete obj.password;
    return obj;
  });
  res.json({ reports: reportsObj, total, page, limit });
});

// Get report by title
router.get('/title/:title', tokenRequired, async (req, res) => {
  const report = await Report.findOne({ title: req.params.title });
  if (!report) return res.status(404).send('Report not found');
  const reportObj = report.toObject();
  delete reportObj.password;
  res.json(reportObj);
});

// Add new report
router.post('/', tokenRequired, async (req, res) => {
  try {
    const newReport = new Report(req.body);
    await newReport.save();
    const reportObj = newReport.toObject();
    delete reportObj.password;
    res.status(201).json(reportObj);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Delete report by id
router.delete('/:id', tokenRequired, async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Get dashboard data by report ID
router.get('/dashboard/:id', tokenRequired, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Return the dashboard data if it exists
    if (report.dashboardData) {
      res.json(report.dashboardData);
    } else {
      res.status(404).json({ error: 'Dashboard data not found' });
    }
  } catch (err) {
    // console.error('Error fetching dashboard data:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: err.message });
  }
});

// Save dashboard data for a report
router.post('/dashboard/:id', tokenRequired, async (req, res) => {
  try {
    const reportId = req.params.id;
    const dashboardData = req.body;
    
    // console.log('Saving dashboard data for report:', reportId);
    // console.log('Dashboard data:', dashboardData);
    
    const report = await Report.findByIdAndUpdate(
      reportId,
      { dashboardData: dashboardData },
      { new: true, runValidators: true }
    );
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // console.log('Dashboard data saved successfully');
    res.status(200).json({ 
      message: 'Dashboard data saved', 
      report: report,
      dashboardData: report.dashboardData
    });
  } catch (err) {
    // console.error('Error saving dashboard data:', err);
    res.status(500).json({ error: 'Failed to save dashboard data', details: err.message });
  }
});

// Update dashboard data for a report
router.put('/dashboard/:id', tokenRequired, async (req, res) => {
  try {
    const reportId = req.params.id;
    const dashboardData = req.body;
    
    // console.log('Updating dashboard data for report:', reportId);
    
    const report = await Report.findByIdAndUpdate(
      reportId,
      { dashboardData: dashboardData },
      { new: true, runValidators: true }
    );
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // console.log('Dashboard data updated successfully');
    res.json({ 
      message: 'Dashboard data updated', 
      report: report,
      dashboardData: report.dashboardData
    });
  } catch (err) {
    // console.error('Error updating dashboard data:', err);
    res.status(500).json({ error: 'Failed to update dashboard data', details: err.message });
  }
});

// Get report data by ID
router.get('/report/:id', tokenRequired, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Return the report data if it exists
    if (report.reportData) {
      res.json(report.reportData);
    } else {
      res.status(404).json({ error: 'Report data not found' });
    }
  } catch (err) {
    // console.error('Error fetching report data:', err);
    res.status(500).json({ error: 'Failed to fetch report data', details: err.message });
  }
});

// Save report data
router.post('/report/:id', tokenRequired, async (req, res) => {
  try {
    const reportId = req.params.id;
    const reportData = req.body;
    
    // console.log('Saving report data for report:', reportId);
    
    const report = await Report.findByIdAndUpdate(
      reportId,
      { reportData: reportData },
      { new: true, runValidators: true }
    );
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // console.log('Report data saved successfully');
    res.status(200).json({ 
      message: 'Report data saved', 
      report: report,
      reportData: report.reportData
    });
  } catch (err) {
    // console.error('Error saving report data:', err);
    res.status(500).json({ error: 'Failed to save report data', details: err.message });
  }
});

// Update report data
router.put('/report/:id', tokenRequired, async (req, res) => {
  try {
    const reportId = req.params.id;
    const reportData = req.body;
    
    // console.log('Updating report data for report:', reportId);
    
    const report = await Report.findByIdAndUpdate(
      reportId,
      { reportData: reportData },
      { new: true, runValidators: true }
    );
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // console.log('Report data updated successfully');
    res.json({ 
      message: 'Report data updated', 
      report: report,
      reportData: report.reportData
    });
  } catch (err) {
    // console.error('Error updating report data:', err);
    res.status(500).json({ error: 'Failed to update report data', details: err.message });
  }
});

// Any other endpoint that returns a report
// Example for GET by ID
router.get('/:id', tokenRequired, async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).send('Report not found');
  const reportObj = report.toObject();
  delete reportObj.password;
  res.json(reportObj);
});

// Verify report password
router.post('/verify-password', tokenRequired, async (req, res) => {
  const { title, id, password } = req.body;
  if (!password || (!title && !id)) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  let report;
  if (id) {
    report = await Report.findById(id);
  } else if (title) {
    report = await Report.findOne({ title });
  }
  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }
  const isMatch = await bcrypt.compare(password, report.password || '');
  if (isMatch) {
    return res.json({ success: true });
  } else {
    return res.json({ success: false });
  }
});

// Update report by id
router.put('/:id', tokenRequired, async (req, res) => {
  try {
    // Hash password if present in update
    if (req.body.password) {
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.default.genSalt(10);
      req.body.password = await bcrypt.default.hash(req.body.password, salt);
    }
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    const reportObj = report.toObject();
    delete reportObj.password;
    res.json(reportObj);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

export default router;
