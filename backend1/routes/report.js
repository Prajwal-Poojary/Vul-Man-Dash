const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Report = require('../models/report');

// Get all reports
router.get('/', auth, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user.userId }).sort({ date: -1 });
    res.json(reports);
  } catch (err) {
    // console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get report by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    if (report.user.toString() !== req.user.userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    res.json(report);
  } catch (err) {
    // console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Create report
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, severity } = req.body;

    const newReport = new Report({
      title,
      description,
      severity,
      user: req.user.userId
    });

    const report = await newReport.save();
    res.json(report);
  } catch (err) {
    // console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update report
router.put('/:id', auth, async (req, res) => {
  try {
    let report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    if (report.user.toString() !== req.user.userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    report = await Report.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(report);
  } catch (err) {
    // console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete report
router.delete('/:id', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    if (report.user.toString() !== req.user.userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await report.deleteOne();
    res.json({ message: 'Report removed' });
  } catch (err) {
    // console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 