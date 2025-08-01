import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  content: String,
  password: String,
  createdTime: { type: Date, default: Date.now },
  // Dashboard data fields
  dashboardData: {
    cvssScore: {
      baseScore: Number,
      riskLevel: String
    },
    severityDistribution: {
      critical: Number,
      high: Number,
      medium: Number,
      low: Number,
      informative: Number
    },
    trendData: {
      months: String,
      counts: String
    },
    cvssMetrics: {
      attackVector: String,
      attackComplexity: String,
      privilegesRequired: String,
      userInteraction: String,
      scope: String,
      confidentiality: String,
      integrity: String,
      availability: String,
      trendMonths: String
    },
    vulnerabilityFindings: {
      areas: String,
      areaVulnerabilities: [{
        name: String,
        count: Number
      }],
      totalVulnerabilities: Number
    },
    timestamp: { type: Date, default: Date.now }
  },
  // Report page data fields
  reportData: {
    logoName: String,
    logoDataURL: String,
    client: String,
    reportDate: Date,
    auditType: String,
    reportType: String,
    scopes: [String],
    periodStart: Date,
    periodEnd: Date,
    summary: String,
    manifest: {
      appName: String,
      testerName: String,
      docVersion: String,
      initDate: Date,
      reDate: Date,
      toolsUsed: String,
      scopes: [String],
      description: String,
      manifestType: String
    },
    findings: [{
      slno: Number,
      vuln: String,
      vulnUrl: String,
      threat: String,
      threatDetails: String,
      impact: String,
      stepsToReproduce: String,
      pocDataURL: [
        {
          type: mongoose.Schema.Types.Mixed
        }
      ],
      retestingPocDataURL: [
        {
          type: mongoose.Schema.Types.Mixed
        }
      ],
      pocType: String,
      mitigation: String,
      references: String,
      severity: String,
      status: String
    }],
    chartImageURLs: [String],
    timestamp: { type: Date, default: Date.now }
  }
});

reportSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (!this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('Report', reportSchema);
