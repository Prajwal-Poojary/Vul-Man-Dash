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

export default router;
