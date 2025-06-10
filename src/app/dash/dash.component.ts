import { Component, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { ReportApiService, DashboardData } from '../services/report-api.service';
import { Router } from '@angular/router';

// Define types for CVSS metrics
type AttackVector = 'Network' | 'Adjacent' | 'Local' | 'Physical';
type AttackComplexity = 'Low' | 'High';
type PrivilegesRequired = 'None' | 'Low' | 'High';
type UserInteraction = 'None' | 'Required';
type Scope = 'Unchanged' | 'Changed';
type CIA = 'None' | 'Low' | 'High';

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

  formData = {
    // CVSS metrics
    attackVector: 'Network' as AttackVector,
    attackComplexity: 'Low' as AttackComplexity,
    privilegesRequired: 'None' as PrivilegesRequired,
    userInteraction: 'None' as UserInteraction,
    scope: 'Unchanged' as Scope,
    confidentiality: 'None' as CIA,
    integrity: 'None' as CIA,
    availability: 'None' as CIA,
    // Trend data
    trendMonths: '',
    trendData: '',
    // Vulnerability findings
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
  private trendChart?: Chart;
  private remediationChart?: Chart;

  constructor(
    private reportService: ReportApiService,
    private router: Router
  ) {
    Chart.register(...registerables);
    
    // Check if we're in edit mode
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { 
      dashboardData: DashboardData, 
      isEdit: boolean,
      reportId?: string,
      showInputForm?: boolean
    };
    
    if (state?.isEdit && state?.dashboardData) {
      this.reportId = state.reportId || null;
      this.loadDashboardData(state.dashboardData);
      // Set showInputForm based on navigation state
      if (state.showInputForm !== undefined) {
        this.showInputForm = state.showInputForm;
      }
    }
  }

  ngAfterViewInit() {
    if (!this.showInputForm) {
      console.log('Creating charts in ngAfterViewInit');
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

  onSubmit() {
    this.cvssBaseScore = this.calculateCVSS();
    this.cvssRiskLevel = this.getRiskLevel(this.cvssBaseScore);
    this.updateSeverityDistribution();
    this.showInputForm = false;
    this.currentDate = new Date();
    
    // Prepare dashboard data
    const dashboardData: DashboardData = {
      cvssMetrics: {
        attackVector: this.formData.attackVector,
        attackComplexity: this.formData.attackComplexity,
        privilegesRequired: this.formData.privilegesRequired,
        userInteraction: this.formData.userInteraction,
        scope: this.formData.scope,
        confidentiality: this.formData.confidentiality,
        integrity: this.formData.integrity,
        availability: this.formData.availability
      },
      trendData: {
        months: this.formData.trendMonths,
        counts: this.formData.trendData
      },
      vulnerabilityFindings: {
        areas: this.formData.remediationAreas,
        areaVulnerabilities: this.areaVulnerabilities,
        totalVulnerabilities: this.totalVulnerabilities
      },
      severityDistribution: this.severityDistribution,
      cvssScore: {
        baseScore: this.cvssBaseScore,
        riskLevel: this.cvssRiskLevel
      },
      timestamp: this.currentDate
    };

    // Save or update dashboard data
    const saveOperation = this.reportId
      ? this.reportService.updateDashboardData(this.reportId, dashboardData)
      : this.reportService.saveDashboardData(dashboardData);

    saveOperation.subscribe({
      next: (response) => {
        console.log('Dashboard data saved successfully:', response);
        if (!this.reportId) {
          this.reportId = response._id;
        }
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
          console.log('Creating charts after form submission');
          this.createCharts();
        }, 100);
      },
      error: (error) => {
        console.error('Error saving dashboard data:', error);
        // Show error to user
        alert('Failed to save dashboard data. Please make sure the server is running and try again.');
        // Reset form state
        this.showInputForm = true;
      }
    });
  }

  navigateToReport() {
    // Prepare dashboard data for the report
    const reportData = {
      dashboardData: {
        cvssMetrics: this.formData,
        trendData: this.formData.trendData,
        severityDistribution: this.severityDistribution,
        cvssScore: {
          baseScore: this.cvssBaseScore,
          riskLevel: this.cvssRiskLevel
        },
        vulnerabilityFindings: {
          areas: this.formData.remediationAreas,
          areaVulnerabilities: this.areaVulnerabilities,
          totalVulnerabilities: this.totalVulnerabilities
        },
        timestamp: this.currentDate,
        findings: [
          {
            slno: 1,
            vuln: 'SQL Injection',
            scope: 'Login Page',
            severity: this.cvssRiskLevel || 'High',
            status: 'Not Fixed',
            vulnUrl: '',
            pocDataURL: '',
            threatDetails: `CVSS Score: ${this.cvssBaseScore}\nAttack Vector: ${this.formData.attackVector}\nAttack Complexity: ${this.formData.attackComplexity}\nPrivileges Required: ${this.formData.privilegesRequired}\nUser Interaction: ${this.formData.userInteraction}\nScope: ${this.formData.scope}\nConfidentiality Impact: ${this.formData.confidentiality}\nIntegrity Impact: ${this.formData.integrity}\nAvailability Impact: ${this.formData.availability}`
          }
        ]
      }
    };

    // Navigate to report component with the data
    this.router.navigate(['/report'], { 
      state: { reportData: reportData }
    });
  }

  private updateSeverityDistribution() {
    // Reset all values
    this.severityDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informative: 0
    };

    // Set the count based on CVSS risk level
    if (this.cvssRiskLevel) {
      switch (this.cvssRiskLevel) {
        case 'Critical':
          this.severityDistribution.critical = 1;
          break;
        case 'High':
          this.severityDistribution.high = 1;
          break;
        case 'Medium':
          this.severityDistribution.medium = 1;
          break;
        case 'Low':
          this.severityDistribution.low = 1;
          break;
        case 'Informative':
          this.severityDistribution.informative = 1;
          break;
      }
    }
  }

  private createCharts() {
    console.log('Starting chart creation');
    this.createSeverityChart();
    this.createTrendChart();
    this.createRemediationChart();
  }

  private createSeverityChart() {
    const ctx = document.getElementById('severityChart') as HTMLCanvasElement;
    if (!ctx) {
      console.error('Severity chart canvas not found');
      return;
    }

    if (this.severityChart) {
      this.severityChart.destroy();
    }

    const data = [
      this.severityDistribution.critical,
      this.severityDistribution.high,
      this.severityDistribution.medium,
      this.severityDistribution.low,
      this.severityDistribution.informative
    ];

    console.log('Creating severity chart with data:', data);

    this.severityChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low', 'Informative'],
        datasets: [{
          data: data,
          backgroundColor: [
            'rgba(220, 53, 69, 0.8)',    // Critical
            'rgba(253, 126, 20, 0.8)',    // High
            'rgba(255, 193, 7, 0.8)',     // Medium
            'rgba(25, 135, 84, 0.8)',     // Low
            'rgba(13, 202, 240, 0.8)'     // Informative
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%', // Make the center hole larger
        plugins: {
          title: {
            display: true,
            text: 'Vulnerability Severity Distribution',
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
            position: 'right',
            labels: {
              padding: 20,
              color: '#e0e0e0',
              font: {
                size: 12,
                family: "'Inter', sans-serif"
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw as number;
                return `${label}: ${value}`;
              }
            }
          }
        }
      },
      plugins: [{
        id: 'centerText',
        afterDraw: (chart) => {
          const { ctx, width, height } = chart;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw CVSS Score exactly in the middle
          ctx.font = 'bold 24px Inter';
          ctx.fillStyle = '#e0e0e0';
          ctx.fillText(
            this.cvssBaseScore?.toString() || '0',
            width / 2.28,
            height / 1.7
          );
          
         
          
          ctx.restore();
        }
      }]
    });
  }

  private createTrendChart() {
    const ctx = document.getElementById('trendChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.trendChart) {
      this.trendChart.destroy();
    }

    const trendData = this.formData.trendData.split(',').map(Number);
    const months = this.formData.trendMonths.split(',').map(month => {
      const date = new Date(month + '-01');
      return date.toLocaleString('default', { month: 'short', year: '2-digit' });
    });

    console.log('Selected months:', this.formData.trendMonths);
    console.log('Generated month labels:', months);
    console.log('Trend data:', trendData);

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Vulnerabilities',
          data: trendData,
          borderColor: 'rgba(67, 97, 238, 0.8)',
          backgroundColor: 'rgba(67, 97, 238, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Monthly Vulnerability Trend',
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
              title: function(tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function(context) {
                return `Vulnerabilities: ${context.raw}`;
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

  // Add method to load saved dashboard data
  private loadDashboardData(data: DashboardData) {
    // Restore form data
    this.formData = {
      attackVector: data.cvssMetrics.attackVector as AttackVector,
      attackComplexity: data.cvssMetrics.attackComplexity as AttackComplexity,
      privilegesRequired: data.cvssMetrics.privilegesRequired as PrivilegesRequired,
      userInteraction: data.cvssMetrics.userInteraction as UserInteraction,
      scope: data.cvssMetrics.scope as Scope,
      confidentiality: data.cvssMetrics.confidentiality as CIA,
      integrity: data.cvssMetrics.integrity as CIA,
      availability: data.cvssMetrics.availability as CIA,
      trendMonths: data.trendData.months,
      trendData: data.trendData.counts,
      remediationAreas: data.vulnerabilityFindings.areas
    };

    // Restore other data
    this.areaVulnerabilities = data.vulnerabilityFindings.areaVulnerabilities;
    this.totalVulnerabilities = data.vulnerabilityFindings.totalVulnerabilities;
    this.severityDistribution = data.severityDistribution;
    this.cvssBaseScore = data.cvssScore.baseScore;
    this.cvssRiskLevel = data.cvssScore.riskLevel;
    this.currentDate = new Date(data.timestamp);

    // Show dashboard view and create charts
    this.showInputForm = false;
    setTimeout(() => {
      this.createCharts();
    }, 100);
  }
}