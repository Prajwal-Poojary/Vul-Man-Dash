import { Component, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { ReportService, DashboardData } from '../services/report.service';
import { Router } from '@angular/router';

// Define types for CVSS metrics
type AttackVector = 'Network' | 'Adjacent' | 'Local' | 'Physical';
type AttackComplexity = 'Low' | 'High';
type PrivilegesRequired = 'None' | 'Low' | 'High';
type UserInteraction = 'None' | 'Required';
type Scope = 'Unchanged' | 'Changed';
type CIA = 'None' | 'Low' | 'High';

interface FormData {
  attackVector: AttackVector;
  attackComplexity: AttackComplexity;
  privilegesRequired: PrivilegesRequired;
  userInteraction: UserInteraction;
  scope: Scope;
  confidentiality: CIA;
  integrity: CIA;
  availability: CIA;
  critical: number;
  high: number;
  medium: number;
  low: number;
  informative: number;
  remediationAreas: string;
}

@Component({
  selector: 'app-dash',
  templateUrl: './dash.component.html',
  styleUrls: ['./dash.component.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class DashComponent implements AfterViewInit {
  showInputForm = true;
  currentDate = new Date();
  reportId: string | null = null;
  saveSuccess = false;
  saveError = false;
  errorMessage = '';
  showValidationPopup = false;
  validationMessage = '';

  formData: FormData = {
    attackVector: 'Network' as AttackVector,
    attackComplexity: 'Low' as AttackComplexity,
    privilegesRequired: 'None' as PrivilegesRequired,
    userInteraction: 'None' as UserInteraction,
    scope: 'Unchanged' as Scope,
    confidentiality: 'None' as CIA,
    integrity: 'None' as CIA,
    availability: 'None' as CIA,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informative: 0,
    remediationAreas: ''
  };

  areaVulnerabilities: { name: string; count: number }[] = [];
  totalVulnerabilities: number = 0;

  cvssBaseScore: number | null = null;
  cvssRiskLevel: string | null = null;
  severityDistribution = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informative: 0
  };

  get totalRiskCount(): number {
    return Object.values(this.severityDistribution).reduce((sum, count) => sum + count, 0);
  }

  private severityChart?: Chart;
  private cvssScoreChart?: Chart;
  private remediationChart?: Chart;

  constructor(
    private reportService: ReportService,
    private router: Router
  ) {
    Chart.register(...registerables);
    
    // Check if we're in edit mode
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { 
      isEdit: boolean,
      reportId?: string,
      showInputForm?: boolean,
      dashboardData?: DashboardData
    };
    
    if (state?.isEdit) {
      this.reportId = state.reportId || null;
      // Set showInputForm based on navigation state
      if (state.showInputForm !== undefined) {
        this.showInputForm = state.showInputForm;
      }
      
      // If we have dashboard data passed directly, use it
      if (state.dashboardData) {
        this.loadDashboardData(state.dashboardData);
        this.showInputForm = false;
      }
      // Otherwise if we have a reportId, try to fetch the dashboard data
      else if (this.reportId) {
        this.fetchDashboardDataForEdit(this.reportId as string);
      } else {
        // If no reportId, start with empty form
        this.showInputForm = true;
      }
    }
  }

  ngAfterViewInit() {
    if (!this.showInputForm) {
      this.createCharts();
    }
  }

  // CVSS lookup values with explicit types
  private CVSS_VALUES = {
    AV: { 
      Network: 0.85, 
      Adjacent: 0.62, 
      Local: 0.55, 
      Physical: 0.2 
    } as Record<AttackVector, number>,
    AC: { 
      Low: 0.77, 
      High: 0.44 
    } as Record<AttackComplexity, number>,
    PR: {
      Unchanged: { 
        None: 0.85, 
        Low: 0.62, 
        High: 0.27 
      } as Record<PrivilegesRequired, number>,
      Changed: { 
        None: 0.85, 
        Low: 0.68, 
        High: 0.5 
      } as Record<PrivilegesRequired, number>
    } as Record<Scope, Record<PrivilegesRequired, number>>,
    UI: { 
      None: 0.85, 
      Required: 0.62 
    } as Record<UserInteraction, number>,
    C: { 
      None: 0.0, 
      Low: 0.22, 
      High: 0.56 
    } as Record<CIA, number>,
    I: { 
      None: 0.0, 
      Low: 0.22, 
      High: 0.56 
    } as Record<CIA, number>,
    A: { 
      None: 0.0, 
      Low: 0.22, 
      High: 0.56 
    } as Record<CIA, number>,
  };

  calculateCVSS() {
    const f = this.formData;
    
    const AV = this.CVSS_VALUES.AV[f.attackVector];
    const AC = this.CVSS_VALUES.AC[f.attackComplexity];
    const PR = this.CVSS_VALUES.PR[f.scope][f.privilegesRequired];
    const UI = this.CVSS_VALUES.UI[f.userInteraction];
    const C = this.CVSS_VALUES.C[f.confidentiality];
    const I = this.CVSS_VALUES.I[f.integrity];
    const A = this.CVSS_VALUES.A[f.availability];
    
    const exploitability = 8.22 * AV * AC * PR * UI;
    const ISS = 1 - (1 - C) * (1 - I) * (1 - A);

    let impact = 0;
    if (f.scope === 'Unchanged') {
      impact = 6.42 * ISS;
    } else {
      impact = 7.52 * (ISS - 0.029) - 3.25 * Math.pow(ISS - 0.02, 15);
    }

    let baseScore = 0;
    if (impact <= 0) {
      baseScore = 0;
    } else if (f.scope === 'Unchanged') {
      baseScore = Math.min(impact + exploitability, 10);
    } else {
      baseScore = Math.min(1.08 * (impact + exploitability), 10);
    }

    return Math.ceil(baseScore * 10) / 10;
  }

  getRiskLevel(score: number) {
    if (score === 0) return 'Informative';
    else if (score <= 3.9) return 'Low';
    else if (score <= 6.9) return 'Medium';
    else if (score <= 8.9) return 'High';
    else return 'Critical';
  }

  getRiskColor(level: string | null): string {
    if (!level) return '#6c757d';
    switch(level) {
      case 'Critical': return '#dc3545';
      case 'High': return '#fd7e14';
      case 'Medium': return '#ffc107';
      case 'Low': return '#198754';
      case 'Informative': return '#0dcaf0';
      default: return '#6c757d';
    }
  }

  async onSubmit() {
    // Validate form fields
    if (!this.validateForm()) {
      this.showValidationPopup = true;
      setTimeout(() => {
        this.showValidationPopup = false;
      }, 3000);
      return;
    }

    const cvssScore = this.calculateCVSS();
    this.cvssBaseScore = cvssScore;
    this.cvssRiskLevel = this.getRiskLevel(cvssScore);
    this.severityDistribution = {
      critical: this.formData.critical,
      high: this.formData.high,
      medium: this.formData.medium,
      low: this.formData.low,
      informative: this.formData.informative
    };

    const dashboardData: DashboardData = {
      _id: this.reportId || undefined, // Use the basic report ID as the dashboard ID
      cvssScore: {
        baseScore: cvssScore,
        riskLevel: this.cvssRiskLevel
      },
      severityDistribution: this.severityDistribution,
      trendData: {
        months: '',
        counts: ''
      },
      cvssMetrics: {
        attackVector: this.formData.attackVector,
        attackComplexity: this.formData.attackComplexity,
        privilegesRequired: this.formData.privilegesRequired,
        userInteraction: this.formData.userInteraction,
        scope: this.formData.scope,
        confidentiality: this.formData.confidentiality,
        integrity: this.formData.integrity,
        availability: this.formData.availability,
        trendMonths: ''
      },
      vulnerabilityFindings: {
        areas: this.formData.remediationAreas,
        areaVulnerabilities: this.areaVulnerabilities,
        totalVulnerabilities: this.totalVulnerabilities
      },
      timestamp: new Date()
    };

    try {
      if (this.reportId) {
        // Update existing report
        await this.reportService.updateDashboardData(this.reportId, dashboardData).toPromise();
      } else {
        // Create new report - this shouldn't happen in edit mode
        this.saveError = true;
        this.errorMessage = 'No report ID found for saving dashboard data';
        setTimeout(() => {
          this.saveError = false;
          this.errorMessage = '';
        }, 3000);
        return;
      }

      this.saveSuccess = true;
      setTimeout(() => {
        this.saveSuccess = false;
      }, 3000);

      this.showInputForm = false;
      setTimeout(() => this.createCharts(), 100);
    } catch (error) {
      this.saveError = true;
      this.errorMessage = 'Failed to save dashboard data';
      setTimeout(() => {
        this.saveError = false;
        this.errorMessage = '';
      }, 3000);
    }
  }

  validateForm(): boolean {
    // Check CVSS Metrics
    if (!this.formData.attackVector || !this.formData.attackComplexity || 
        !this.formData.privilegesRequired || !this.formData.userInteraction || 
        !this.formData.scope || !this.formData.confidentiality || 
        !this.formData.integrity || !this.formData.availability) {
      this.validationMessage = 'Please fill in all CVSS Metrics fields';
      return false;
    }

    // Check Severity Distribution
    if (this.formData.critical === undefined || this.formData.high === undefined || 
        this.formData.medium === undefined || this.formData.low === undefined || 
        this.formData.informative === undefined) {
      this.validationMessage = 'Please fill in all Severity Distribution fields';
      return false;
    }

    // Check Vulnerability Findings
    if (!this.formData.remediationAreas) {
      this.validationMessage = 'Please enter at least one remediation area';
      return false;
    }

    // Check if all areas have vulnerability counts
    if (this.areaVulnerabilities.some(area => area.count === undefined || area.count === null)) {
      this.validationMessage = 'Please enter vulnerability counts for all areas';
      return false;
    }

    return true;
  }

  navigateToReport() {
    const dashboardData = {
      cvssScore: {
        baseScore: this.cvssBaseScore,
        riskLevel: this.cvssRiskLevel
      },
      severityDistribution: this.severityDistribution,
      trendData: {
        months: '',
        counts: ''
      },
      cvssMetrics: {
        attackVector: this.formData.attackVector,
        attackComplexity: this.formData.attackComplexity,
        privilegesRequired: this.formData.privilegesRequired,
        userInteraction: this.formData.userInteraction,
        scope: this.formData.scope,
        confidentiality: this.formData.confidentiality,
        integrity: this.formData.integrity,
        availability: this.formData.availability,
        trendMonths: ''
      },
      vulnerabilityFindings: {
        areas: this.formData.remediationAreas,
        areaVulnerabilities: this.areaVulnerabilities,
        totalVulnerabilities: this.totalVulnerabilities
      },
      timestamp: new Date()
    };

    this.router.navigate(['/report'], {
      state: {
        reportData: {
          dashboardData,
          reportId: this.reportId // Pass the report ID
        }
      }
    });
  }

  private createCharts() {
    this.createSeverityChart();
    this.createCVSSScoreChart();
    this.createRemediationChart();
  }

  private createSeverityChart() {
    const canvas = document.getElementById('severityChart') as HTMLCanvasElement;
    if (!canvas) {
      return;
    }

    // Destroy existing chart if it exists
    if (this.severityChart) {
      this.severityChart.destroy();
    }

    // Create new chart
    this.severityChart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low', 'Informative'],
        datasets: [{
          data: [
            this.severityDistribution.critical,
            this.severityDistribution.high,
            this.severityDistribution.medium,
            this.severityDistribution.low,
            this.severityDistribution.informative
          ],
          backgroundColor: [
            'rgba(220, 53, 69, 0.85)',    // Critical
            'rgba(253, 126, 20, 0.85)',    // High
            'rgba(255, 193, 7, 0.85)',     // Medium
            'rgba(25, 135, 84, 0.85)',     // Low
            'rgba(13, 202, 240, 0.85)'     // Informative
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Vulnerability Severity',
            font: {
              size: 18,
              weight: 'bold',
              family: "'Inter', sans-serif"
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          legend: {
            position: 'right',
            labels: {
              padding: 20,
              font: {
                size: 12,
                family: "'Inter', sans-serif"
              },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
              size: 14,
              family: "'Inter', sans-serif"
            },
            bodyFont: {
              size: 13,
              family: "'Inter', sans-serif"
            },
            padding: 12,
            cornerRadius: 4,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  private calculateCVSSDistribution() {
    return {
      critical: this.severityDistribution.critical,  // 9.0-10.0
      high: this.severityDistribution.high,          // 7.0-8.9
      medium: this.severityDistribution.medium,      // 4.0-6.9
      low: this.severityDistribution.low,            // 0.1-3.9
      none: this.severityDistribution.informative    // 0.0
    };
  }

  private createCVSSScoreChart() {
    const canvas = document.getElementById('cvssScoreChart') as HTMLCanvasElement;
    if (!canvas) {
      return;
    }

    // Destroy existing chart if it exists
    if (this.cvssScoreChart) {
      this.cvssScoreChart.destroy();
    }

    // Get the color based on CVSS score
    const scoreColor = this.getSeverityColor(this.cvssBaseScore || 0);

    // Create new chart
    this.cvssScoreChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['CVSS Score'],
        datasets: [{
          data: [100],
          backgroundColor: [scoreColor],
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'CVSS Score Distribution',
            font: {
              size: 18,
              weight: 'bold',
              family: "'Inter', sans-serif"
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        },
        cutout: '75%'
      },
      plugins: [{
        id: 'centerText',
        afterDraw: (chart) => {
          const { ctx, width, height } = chart;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw CVSS score in center
          ctx.font = 'bold 32px Inter';
          ctx.fillStyle = scoreColor;
          ctx.fillText(this.cvssBaseScore?.toFixed(1) || '0.0', width / 2, height / 2 - 10);
          
          // Draw "CVSS" label below score
          ctx.font = '16px Inter';
          ctx.fillStyle = '#666666';
          ctx.fillText('CVSS', width / 2, height / 2 + 25);
          
          // Draw severity level
          const severityLevel = this.getSeverityLevel(this.cvssBaseScore || 0);
          ctx.font = '14px Inter';
          ctx.fillStyle = scoreColor;
          ctx.fillText(severityLevel, width / 2, height / 2 + 45);
          
          ctx.restore();
        }
      }]
    });
  }

  private getSeverityLevel(score: number): string {
    if (score === 0) return 'None';
    else if (score <= 3.9) return 'Low';
    else if (score <= 6.9) return 'Medium';
    else if (score <= 8.9) return 'High';
    else return 'Critical';
  }

  private createRemediationChart() {
    const ctx = document.getElementById('remediationChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.remediationChart) {
      this.remediationChart.destroy();
    }

    const areas = this.areaVulnerabilities.map(area => area.name);
    const countData = this.areaVulnerabilities.map(area => area.count);

    this.remediationChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: areas,
        datasets: [{
          label: 'Vulnerabilities Found',
          data: countData,
          backgroundColor: 'rgba(67, 97, 238, 0.8)',
          borderColor: 'rgba(67, 97, 238, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Vulnerability Findings by Area',
            color: '#e0e0e0',
            font: {
              size: 16,
              family: "'Inter', sans-serif",
              weight: 500 as const
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          legend: {
            position: 'top',
            labels: {
              color: '#e0e0e0',
              font: {
                family: "'Inter', sans-serif"
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.raw as number;
                return `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a0a0'
            },
            title: {
              display: true,
              text: 'Number of Vulnerabilities',
              color: '#e0e0e0',
              font: {
                family: "'Inter', sans-serif"
              }
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a0a0'
            }
          }
        }
      }
    });
  }

  updateAreaVulnerabilities() {
    const areas = this.formData.remediationAreas.split(',').map(area => area.trim()).filter(area => area);
    
    // Keep existing counts for areas that still exist
    const existingCounts = new Map(this.areaVulnerabilities.map(a => [a.name, a.count]));
    
    this.areaVulnerabilities = areas.map(name => ({
      name,
      count: existingCounts.get(name) || 0
    }));
    
    this.updateTotalVulnerabilities();
  }

  updateTotalVulnerabilities() {
    this.totalVulnerabilities = this.areaVulnerabilities.reduce((sum, area) => sum + area.count, 0);
  }

  loadDashboardData(data: DashboardData) {
    // Load CVSS score
    if (data.cvssScore) {
      this.cvssBaseScore = data.cvssScore.baseScore;
      this.cvssRiskLevel = data.cvssScore.riskLevel;
    }

    // Load severity distribution
    if (data.severityDistribution) {
      this.severityDistribution = { ...data.severityDistribution };
      // Also update form fields so the UI reflects the loaded values
      this.formData.critical = data.severityDistribution.critical;
      this.formData.high = data.severityDistribution.high;
      this.formData.medium = data.severityDistribution.medium;
      this.formData.low = data.severityDistribution.low;
      this.formData.informative = data.severityDistribution.informative;
    }

    // Load CVSS metrics
    if (data.cvssMetrics) {
      this.formData.attackVector = data.cvssMetrics.attackVector as AttackVector;
      this.formData.attackComplexity = data.cvssMetrics.attackComplexity as AttackComplexity;
      this.formData.privilegesRequired = data.cvssMetrics.privilegesRequired as PrivilegesRequired;
      this.formData.userInteraction = data.cvssMetrics.userInteraction as UserInteraction;
      this.formData.scope = data.cvssMetrics.scope as Scope;
      this.formData.confidentiality = data.cvssMetrics.confidentiality as CIA;
      this.formData.integrity = data.cvssMetrics.integrity as CIA;
      this.formData.availability = data.cvssMetrics.availability as CIA;
    }

    // Load vulnerability findings
    if (data.vulnerabilityFindings) {
      this.formData.remediationAreas = data.vulnerabilityFindings.areas;
      this.areaVulnerabilities = [...data.vulnerabilityFindings.areaVulnerabilities];
      this.totalVulnerabilities = data.vulnerabilityFindings.totalVulnerabilities;
    }

    // Load timestamp
    if (data.timestamp) {
      this.currentDate = new Date(data.timestamp);
    }

    // Set report ID if available
    if (!this.reportId && data._id) {
      this.reportId = data._id;
    }

    this.showInputForm = false;
    setTimeout(() => this.createCharts(), 100);
  }

  fetchDashboardDataForEdit(reportId: string) {
    this.reportService.getDashboardData(reportId).subscribe({
      next: (data) => {
        if (data) {
          // Populate the form fields with existing data
          this.populateFormWithData(data);
          // Show the input form with populated data
          this.showInputForm = true;
        } else {
          // If no data exists, start with empty form
          this.showInputForm = true;
          this.reportId = null;
        }
      },
      error: (error) => {
        // If fetch fails, start with empty form
        this.showInputForm = true;
        this.reportId = null;
      }
    });
  }

  fetchDashboardData(reportId: string) {
    this.reportService.getDashboardData(reportId).subscribe({
      next: (data) => {
        if (data) {
          this.loadDashboardData(data);
          // Update the reportId if it's not set
          if (!this.reportId && data._id) {
            this.reportId = data._id;
          }
          // Hide input form and show dashboard
          this.showInputForm = false;
        } else {
          // If no data exists, start with empty form
          this.showInputForm = true;
          this.reportId = null;
        }
      },
      error: (error) => {
        // If fetch fails, start with empty form
        this.showInputForm = true;
        this.reportId = null;
      }
    });
  }

  populateFormWithData(data: DashboardData) {
    // Populate CVSS metrics
    if (data.cvssMetrics) {
      this.formData.attackVector = data.cvssMetrics.attackVector as AttackVector;
      this.formData.attackComplexity = data.cvssMetrics.attackComplexity as AttackComplexity;
      this.formData.privilegesRequired = data.cvssMetrics.privilegesRequired as PrivilegesRequired;
      this.formData.userInteraction = data.cvssMetrics.userInteraction as UserInteraction;
      this.formData.scope = data.cvssMetrics.scope as Scope;
      this.formData.confidentiality = data.cvssMetrics.confidentiality as CIA;
      this.formData.integrity = data.cvssMetrics.integrity as CIA;
      this.formData.availability = data.cvssMetrics.availability as CIA;
    }

    // Populate vulnerability findings
    if (data.vulnerabilityFindings) {
      this.formData.remediationAreas = data.vulnerabilityFindings.areas;
      this.areaVulnerabilities = [...data.vulnerabilityFindings.areaVulnerabilities];
      this.totalVulnerabilities = data.vulnerabilityFindings.totalVulnerabilities;
    }

    // Populate severity distribution
    if (data.severityDistribution) {
      this.severityDistribution = { ...data.severityDistribution };
      // Also update form fields so the UI reflects the loaded values
      this.formData.critical = data.severityDistribution.critical;
      this.formData.high = data.severityDistribution.high;
      this.formData.medium = data.severityDistribution.medium;
      this.formData.low = data.severityDistribution.low;
      this.formData.informative = data.severityDistribution.informative;
    }

    // Populate CVSS score
    if (data.cvssScore) {
      this.cvssBaseScore = data.cvssScore.baseScore;
      this.cvssRiskLevel = data.cvssScore.riskLevel;
    }

    // Set timestamp
    if (data.timestamp) {
      this.currentDate = new Date(data.timestamp);
    }

    // console.log('Form data populated:', this.formData);
  }

  reloadDashboardData() {
    if (this.reportId) {
      if (this.showInputForm) {
        // If we're showing the input form, we're likely in edit mode
        this.fetchDashboardDataForEdit(this.reportId);
      } else {
        // If we're showing the dashboard view, fetch for display
        this.fetchDashboardData(this.reportId);
      }
    }
  }

  getSeverityColor(score: number): string {
    if (score === 0) return '#000000';
    else if (score <= 3.9) return '#198754';
    else if (score <= 6.9) return '#ffc107';
    else if (score <= 8.9) return '#fd7e14';
    else return '#dc3545';
  }
}