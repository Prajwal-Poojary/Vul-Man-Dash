const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  exposureLevel: String,
  exposureCurrent: Number,
  exposurePrevious: Number,
  exposureHighRisk: Number,
  totalAssets: Number,
  configScore: Number,
  configCompliance: Number,
  openAlerts: Number,
  sevCritical: Number,
  sevHigh: Number,
  sevMedium: Number,
  sevLow: Number,
  sevInformative: Number,
  trendData: String,
  remediationAreas: String,
  remediationCompleted: String,
  remediationPending: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', reportSchema);
