const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
    },
    status: {
      type: String,
    enum: ['pending', 'in_progress', 'resolved'],
    default: 'pending'
    },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', ReportSchema); 