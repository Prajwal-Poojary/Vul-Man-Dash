import express from 'express';
import Report from '../models/report.model.js';

const router = express.Router();

// Get all reports
router.get('/', async (req, res) => {
  const reports = await Report.find();
  res.json(reports);
});

// Get report by title
router.get('/title/:title', async (req, res) => {
  const report = await Report.findOne({ title: req.params.title });
  if (!report) return res.status(404).send('Report not found');
  res.json(report);
});

// Add new report
router.post('/', async (req, res) => {
  try {
    const newReport = new Report(req.body);
    await newReport.save();
    res.status(201).json(newReport);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Delete report by id
router.delete('/:id', async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Get dashboard data by report ID
router.get('/dashboard/:id', async (req, res) => {
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
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: err.message });
  }
});

// Save dashboard data for a report
router.post('/dashboard/:id', async (req, res) => {
  try {
    const reportId = req.params.id;
    const dashboardData = req.body;
    
    console.log('Saving dashboard data for report:', reportId);
    console.log('Dashboard data:', dashboardData);
    
    const report = await Report.findByIdAndUpdate(
      reportId,
      { dashboardData: dashboardData },
      { new: true, runValidators: true }
    );
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    console.log('Dashboard data saved successfully');
    res.status(200).json({ 
      message: 'Dashboard data saved', 
      report: report,
      dashboardData: report.dashboardData
    });
  } catch (err) {
    console.error('Error saving dashboard data:', err);
    res.status(500).json({ error: 'Failed to save dashboard data', details: err.message });
  }
});

// Update dashboard data for a report
router.put('/dashboard/:id', async (req, res) => {
  try {
    const reportId = req.params.id;
    const dashboardData = req.body;
    
    console.log('Updating dashboard data for report:', reportId);
    
    const report = await Report.findByIdAndUpdate(
      reportId,
      { dashboardData: dashboardData },
      { new: true, runValidators: true }
    );
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    console.log('Dashboard data updated successfully');
    res.json({ 
      message: 'Dashboard data updated', 
      report: report,
      dashboardData: report.dashboardData
    });
  } catch (err) {
    console.error('Error updating dashboard data:', err);
    res.status(500).json({ error: 'Failed to update dashboard data', details: err.message });
  }
});

// Get report data by ID
router.get('/report/:id', async (req, res) => {
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
    console.error('Error fetching report data:', err);
    res.status(500).json({ error: 'Failed to fetch report data', details: err.message });
  }
});

// Save report data
router.post('/report/:id', async (req, res) => {
  try {
    const reportId = req.params.id;
    const reportData = req.body;
    
    console.log('Saving report data for report:', reportId);
    
    const report = await Report.findByIdAndUpdate(
      reportId,
      { reportData: reportData },
      { new: true, runValidators: true }
    );
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    console.log('Report data saved successfully');
    res.status(200).json({ 
      message: 'Report data saved', 
      report: report,
      reportData: report.reportData
    });
  } catch (err) {
    console.error('Error saving report data:', err);
    res.status(500).json({ error: 'Failed to save report data', details: err.message });
  }
});

// Update report data
router.put('/report/:id', async (req, res) => {
  try {
    const reportId = req.params.id;
    const reportData = req.body;
    
    console.log('Updating report data for report:', reportId);
    
    const report = await Report.findByIdAndUpdate(
      reportId,
      { reportData: reportData },
      { new: true, runValidators: true }
    );
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    console.log('Report data updated successfully');
    res.json({ 
      message: 'Report data updated', 
      report: report,
      reportData: report.reportData
    });
  } catch (err) {
    console.error('Error updating report data:', err);
    res.status(500).json({ error: 'Failed to update report data', details: err.message });
  }
});

export default router;
