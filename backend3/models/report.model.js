const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  cvssMetrics: {
    attackVector: String,
    attackComplexity: String,
    privilegesRequired: String,
    userInteraction: String,
    scope: String,
    confidentiality: String,
    integrity: String,
    availability: String
  },
  trendData: {
    months: String,
    counts: String
  },
  vulnerabilityFindings: {
    areas: String,
    areaVulnerabilities: [{
      name: String,
      count: Number
    }],
    totalVulnerabilities: Number
  },
  severityDistribution: {
    critical: Number,
    high: Number,
    medium: Number,
    low: Number,
    informative: Number
  },
  cvssScore: {
    baseScore: Number,
    riskLevel: String
  },
  dashboardInput: {
    type: Object,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', reportSchema);
