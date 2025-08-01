import { Component, AfterViewInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { ReportService, DashboardData } from '../services/report.service';
import { PerformanceService } from '../services/performance.service';
import { IntersectionObserverService } from '../services/intersection-observer.service';
import { Router } from '@angular/router';
import { CyberLoaderComponent } from '../shared/components/cyber-loader/cyber-loader.component';
import { SkeletonLoaderComponent } from '../shared/components/skeleton-loader/skeleton-loader.component';
import { SecurityAlertsComponent } from '../shared/components/security-alerts/security-alerts.component';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

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
  imports: [FormsModule, CommonModule, CyberLoaderComponent, SkeletonLoaderComponent, SecurityAlertsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashComponent implements AfterViewInit, OnDestroy {
  // Loading states for better UX
  isInitializing = true;
  initializationProgress = 0;
  isLoadingCharts = false;
  isSaving = false;
  isFormSubmitting = false;
  
  // Dashboard state
  showInputForm = true;
  currentDate = new Date();
  reportId: string | null = null;
  saveSuccess = false;
  saveError = false;
  errorMessage = '';
  showValidationPopup = false;
  validationMessage = '';

  // Performance: Memoized data
  private _chartDataCache = new Map<string, any>();
  private _resizeObserver?: ResizeObserver;
  private _intersectionObserver?: IntersectionObserver;
  private destroy$ = new Subject<void>();
  
  // Debounced form updates for better performance
  private formChangeSubject = new Subject<void>();

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

  // Chart instances with lazy initialization
  private severityChart?: Chart;
  private cvssScoreChart?: Chart;
  private remediationChart?: Chart;
  private chartInitialized = false;

  // Inject dependencies
  private reportService = inject(ReportService);
  private performanceService = inject(PerformanceService);
  private intersectionService = inject(IntersectionObserverService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    Chart.register(...registerables);
    
    // Setup debounced form changes
    this.formChangeSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.updateAreaVulnerabilitiesDebounced();
    });
    
    // Initialize performance monitoring
    this.performanceService.markStart('component-initialization');
    this.performanceService.logCriticalRenderingPath();
    
    // Initialize component with loading state
    this.initializeComponent();
  }

  private async initializeComponent() {
    this.isInitializing = true;
    this.initializationProgress = 0;
    this.cdr.markForCheck();
    
    try {
      // Step 1: Initialize navigation state
      this.initializationProgress = 20;
      this.cdr.markForCheck();
      
      // Check if we're in edit mode
      const navigation = this.router.getCurrentNavigation();
      const state = navigation?.extras.state as { 
        isEdit: boolean,
        reportId?: string,
        showInputForm?: boolean,
        dashboardData?: DashboardData
      };
      
      // Step 2: Process state
      this.initializationProgress = 40;
      this.cdr.markForCheck();
      
      if (state?.isEdit) {
        this.reportId = state.reportId || null;
        
        if (state.showInputForm !== undefined) {
          this.showInputForm = state.showInputForm;
        }
        
        // Step 3: Load dashboard data
        this.initializationProgress = 60;
        this.cdr.markForCheck();
        
        if (state.dashboardData) {
          await this.loadDashboardData(state.dashboardData);
          this.showInputForm = false;
        } else if (this.reportId) {
          await this.fetchDashboardDataForEdit(this.reportId);
        } else {
          this.showInputForm = true;
        }
      }
      
      // Step 4: Setup performance monitoring
      this.initializationProgress = 80;
      this.cdr.markForCheck();
      
      // Step 5: Complete initialization
      this.initializationProgress = 100;
      this.cdr.markForCheck();
      
      // Simulate completion animation
      setTimeout(() => {
        this.isInitializing = false;
        this.cdr.markForCheck();
      }, 800);
      
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      this.isInitializing = false;
      this.cdr.markForCheck();
    }
  }

  ngAfterViewInit() {
    // Setup resize observer for responsive charts
    this.setupResizeObserver();
    
    // Setup intersection observer for lazy chart loading
    this.setupIntersectionObserver();
    
    if (!this.showInputForm && !this.chartInitialized) {
      this.initializeChartsWithLoading();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
    this._resizeObserver?.disconnect();
    this._intersectionObserver?.disconnect();
    this.intersectionService.disconnect('chart-loader');
    this.performanceService.markEnd('component-initialization');
  }

  private setupIntersectionObserver() {
    // Use the new intersection observer service for better performance
    setTimeout(() => {
      const chartContainers = document.querySelectorAll('.chart-wrapper');
      chartContainers.forEach(container => {
        const canvas = container.querySelector('canvas');
        if (canvas) {
          this.intersectionService.lazyLoadChart(
            canvas,
            () => this.loadChartLazily(canvas.id),
            'chart-loader'
          );
        }
      });
    }, 100);
  }

  private loadChartLazily(chartId: string) {
    if (this.chartInitialized) return;
    
    switch (chartId) {
      case 'severityChart':
        this.createSeverityChart();
        break;
      case 'cvssScoreChart':
        this.createCVSSScoreChart();
        break;
      case 'remediationChart':
        this.createRemediationChart();
        break;
    }
  }

  private setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => {
        if (this.chartInitialized) {
          this.debounceChartResize();
        }
      });
      
      const chartContainers = document.querySelectorAll('.chart-wrapper');
      chartContainers.forEach(container => {
        this._resizeObserver?.observe(container);
      });
    }
  }

  private debounceChartResize = this.debounce(() => {
    this.resizeCharts();
  }, 250);

  private debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  private resizeCharts() {
    [this.severityChart, this.cvssScoreChart, this.remediationChart].forEach(chart => {
      if (chart) {
        chart.resize();
      }
    });
  }

  private async initializeChartsWithLoading() {
    this.isLoadingCharts = true;
    this.cdr.markForCheck();
    
    try {
      // Performance monitoring
      this.performanceService.markStart('chart-initialization');
      
      // Use requestAnimationFrame for smoother chart creation
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          this.performanceService.measureChartPerformance('all-charts', () => {
            this.createChartsOptimized();
            this.chartInitialized = true;
          });
          resolve(true);
        });
      });
      
      // Log performance metrics
      this.performanceService.markEnd('chart-initialization');
      
      // Get memory usage if available
      const memoryInfo = this.performanceService.getMemoryUsage();
      if (memoryInfo) {
        console.log('Memory Usage:', memoryInfo);
      }
      
      // Simulate chart loading for better UX with progressive reveal
      setTimeout(() => {
        this.isLoadingCharts = false;
        this.cdr.markForCheck();
        this.animateChartsIn();
      }, 500);
      
    } catch (error) {
      console.error('Error creating charts:', error);
      this.isLoadingCharts = false;
      this.cdr.markForCheck();
    }
  }

  private animateChartsIn() {
    const charts = document.querySelectorAll('.cyber-chart-container');
    charts.forEach((chart, index) => {
      setTimeout(() => {
        chart.classList.add('animate-in');
      }, index * 150);
    });
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

  calculateCVSS(): number {
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

  getRiskLevel(score: number): string {
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
    if (this.isFormSubmitting) return;
    
    // Validate form fields
    if (!this.validateForm()) {
      this.showValidationPopup = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.showValidationPopup = false;
        this.cdr.markForCheck();
      }, 3000);
      return;
    }

    this.isFormSubmitting = true;
    this.isSaving = true;
    this.cdr.markForCheck();

    try {
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
        _id: this.reportId || undefined,
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

      if (this.reportId) {
        await this.reportService.updateDashboardData(this.reportId, dashboardData).toPromise();
      } else {
        this.saveError = true;
        this.errorMessage = 'No report ID found for saving dashboard data';
        this.showErrorMessage();
        return;
      }

      this.saveSuccess = true;
      this.showSuccessMessage();

      this.showInputForm = false;
      this.cdr.markForCheck();
      
      // Initialize charts with loading state
      setTimeout(() => this.initializeChartsWithLoading(), 100);
      
    } catch (error) {
      this.saveError = true;
      this.errorMessage = 'Failed to save dashboard data';
      this.showErrorMessage();
    } finally {
      this.isFormSubmitting = false;
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private showSuccessMessage() {
    setTimeout(() => {
      this.saveSuccess = false;
      this.cdr.markForCheck();
    }, 3000);
  }

  private showErrorMessage() {
    setTimeout(() => {
      this.saveError = false;
      this.errorMessage = '';
      this.cdr.markForCheck();
    }, 3000);
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
          reportId: this.reportId
        }
      }
    });
  }

  // Optimized chart creation with caching
  private createChartsOptimized() {
    const cacheKey = this.generateChartCacheKey();
    
    if (this._chartDataCache.has(cacheKey)) {
      // Use cached data if available and data hasn't changed
      const cachedData = this._chartDataCache.get(cacheKey);
      this.createChartsFromCache(cachedData);
    } else {
      // Create new charts and cache the configuration
      this.createCharts();
      this._chartDataCache.set(cacheKey, {
        severityData: { ...this.severityDistribution },
        cvssData: { score: this.cvssBaseScore, risk: this.cvssRiskLevel },
        vulnerabilityData: [...this.areaVulnerabilities]
      });
    }
  }

  private generateChartCacheKey(): string {
    return JSON.stringify({
      severity: this.severityDistribution,
      cvss: this.cvssBaseScore,
      vulnerabilities: this.areaVulnerabilities
    });
  }

  private createChartsFromCache(cachedData: any) {
    // Implementation would use cached data to recreate charts faster
    this.createCharts();
  }

  private createCharts() {
    this.createSeverityChart();
    this.createCVSSScoreChart();
    this.createRemediationChart();
  }

  private destroyCharts() {
    [this.severityChart, this.cvssScoreChart, this.remediationChart].forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
  }

  // Optimized chart creation methods (keeping original functionality but with performance improvements)
  private createSeverityChart() {
    const canvas = document.getElementById('severityChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.severityChart) {
      this.severityChart.destroy();
    }

    this.performanceService.measureChartPerformance('severity-chart', () => {
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
              'rgba(220, 53, 69, 0.85)',
              'rgba(253, 126, 20, 0.85)',
              'rgba(255, 193, 7, 0.85)',
              'rgba(25, 135, 84, 0.85)',
              'rgba(13, 202, 240, 0.85)'
            ],
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            animateRotate: true,
            animateScale: false,
            duration: 1000,
            easing: 'easeOutQuart'
          },
          plugins: {
            title: {
              display: true,
              text: 'Vulnerability Severity',
              font: {
                size: 18,
                weight: 'bold',
                family: "'Inter', sans-serif"
              },
              padding: { top: 10, bottom: 20 }
            },
            legend: {
              position: 'right',
              labels: {
                padding: 20,
                font: { size: 12, family: "'Inter', sans-serif" },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleFont: { size: 14, family: "'Inter', sans-serif" },
              bodyFont: { size: 13, family: "'Inter', sans-serif" },
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
    });
  }

  private createCVSSScoreChart() {
    const canvas = document.getElementById('cvssScoreChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.cvssScoreChart) {
      this.cvssScoreChart.destroy();
    }

    const scoreColor = this.getSeverityColor(this.cvssBaseScore || 0);

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
        animation: {
          animateRotate: true,
          duration: 1500,
          easing: 'easeOutCubic'
        },
        plugins: {
          title: {
            display: true,
            text: 'CVSS Score Distribution',
            font: { size: 18, weight: 'bold', family: "'Inter', sans-serif" },
            padding: { top: 10, bottom: 20 }
          },
          legend: { display: false },
          tooltip: { enabled: false }
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
          
          ctx.font = 'bold 32px Inter';
          ctx.fillStyle = scoreColor;
          ctx.fillText(this.cvssBaseScore?.toFixed(1) || '0.0', width / 2, height / 2 - 10);
          
          ctx.font = '16px Inter';
          ctx.fillStyle = '#666666';
          ctx.fillText('CVSS', width / 2, height / 2 + 25);
          
          const severityLevel = this.getSeverityLevel(this.cvssBaseScore || 0);
          ctx.font = '14px Inter';
          ctx.fillStyle = scoreColor;
          ctx.fillText(severityLevel, width / 2, height / 2 + 45);
          
          ctx.restore();
        }
      }]
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
        animation: {
          duration: 1200,
          easing: 'easeOutBounce'
        },
        plugins: {
          title: {
            display: true,
            text: 'Vulnerability Findings by Area',
            color: '#e0e0e0',
            font: { size: 16, family: "'Inter', sans-serif", weight: 500 as const },
            padding: { top: 10, bottom: 20 }
          },
          legend: {
            position: 'top',
            labels: {
              color: '#e0e0e0',
              font: { family: "'Inter', sans-serif" }
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
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#a0a0a0' },
            title: {
              display: true,
              text: 'Number of Vulnerabilities',
              color: '#e0e0e0',
              font: { family: "'Inter', sans-serif" }
            }
          },
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#a0a0a0' }
          }
        }
      }
    });
  }

  // Debounced form update methods
  onFormDataChange() {
    this.formChangeSubject.next();
  }

  private updateAreaVulnerabilitiesDebounced() {
    const areas = this.formData.remediationAreas.split(',').map(area => area.trim()).filter(area => area);
    const existingCounts = new Map(this.areaVulnerabilities.map(a => [a.name, a.count]));
    
    this.areaVulnerabilities = areas.map(name => ({
      name,
      count: existingCounts.get(name) || 0
    }));
    
    this.updateTotalVulnerabilities();
    this.cdr.markForCheck();
  }

  updateAreaVulnerabilities() {
    this.onFormDataChange();
  }

  updateTotalVulnerabilities() {
    this.totalVulnerabilities = this.areaVulnerabilities.reduce((sum, area) => sum + area.count, 0);
  }

  async loadDashboardData(data: DashboardData) {
    if (data.cvssScore) {
      this.cvssBaseScore = data.cvssScore.baseScore;
      this.cvssRiskLevel = data.cvssScore.riskLevel;
    }

    if (data.severityDistribution) {
      this.severityDistribution = { ...data.severityDistribution };
      this.formData.critical = data.severityDistribution.critical;
      this.formData.high = data.severityDistribution.high;
      this.formData.medium = data.severityDistribution.medium;
      this.formData.low = data.severityDistribution.low;
      this.formData.informative = data.severityDistribution.informative;
    }

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

    if (data.vulnerabilityFindings) {
      this.formData.remediationAreas = data.vulnerabilityFindings.areas;
      this.areaVulnerabilities = [...data.vulnerabilityFindings.areaVulnerabilities];
      this.totalVulnerabilities = data.vulnerabilityFindings.totalVulnerabilities;
    }

    if (data.timestamp) {
      this.currentDate = new Date(data.timestamp);
    }

    if (!this.reportId && data._id) {
      this.reportId = data._id;
    }

    this.showInputForm = false;
    this.cdr.markForCheck();
    
    setTimeout(() => this.initializeChartsWithLoading(), 100);
  }

  async fetchDashboardDataForEdit(reportId: string) {
    try {
      const data = await this.reportService.getDashboardData(reportId).toPromise();
      if (data) {
        this.populateFormWithData(data);
        this.showInputForm = true;
      } else {
        this.showInputForm = true;
        this.reportId = null;
      }
    } catch (error) {
      this.showInputForm = true;
      this.reportId = null;
    }
    this.cdr.markForCheck();
  }

  async fetchDashboardData(reportId: string) {
    try {
      const data = await this.reportService.getDashboardData(reportId).toPromise();
      if (data) {
        await this.loadDashboardData(data);
        if (!this.reportId && data._id) {
          this.reportId = data._id;
        }
        this.showInputForm = false;
      } else {
        this.showInputForm = true;
        this.reportId = null;
      }
    } catch (error) {
      this.showInputForm = true;
      this.reportId = null;
    }
    this.cdr.markForCheck();
  }

  populateFormWithData(data: DashboardData) {
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

    if (data.vulnerabilityFindings) {
      this.formData.remediationAreas = data.vulnerabilityFindings.areas;
      this.areaVulnerabilities = [...data.vulnerabilityFindings.areaVulnerabilities];
      this.totalVulnerabilities = data.vulnerabilityFindings.totalVulnerabilities;
    }

    if (data.severityDistribution) {
      this.severityDistribution = { ...data.severityDistribution };
      this.formData.critical = data.severityDistribution.critical;
      this.formData.high = data.severityDistribution.high;
      this.formData.medium = data.severityDistribution.medium;
      this.formData.low = data.severityDistribution.low;
      this.formData.informative = data.severityDistribution.informative;
    }

    if (data.cvssScore) {
      this.cvssBaseScore = data.cvssScore.baseScore;
      this.cvssRiskLevel = data.cvssScore.riskLevel;
    }

    if (data.timestamp) {
      this.currentDate = new Date(data.timestamp);
    }
  }

  reloadDashboardData() {
    if (this.reportId) {
      if (this.showInputForm) {
        this.fetchDashboardDataForEdit(this.reportId);
      } else {
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

  getSeverityLevel(score: number): string {
    if (score === 0) return 'None';
    else if (score <= 3.9) return 'Low';
    else if (score <= 6.9) return 'Medium';
    else if (score <= 8.9) return 'High';
    else return 'Critical';
  }

  getSecurityScore(): number {
    if (!this.cvssBaseScore) return 0;
    return Math.max(0, 100 - (this.cvssBaseScore * 10));
  }

  getSecurityStatus(): string {
    const score = this.getSecurityScore();
    if (score >= 80) return 'SECURE';
    else if (score >= 60) return 'MODERATE';
    else if (score >= 40) return 'VULNERABLE';
    else return 'CRITICAL';
  }

  getPercentage(value: number): number {
    if (this.totalRiskCount === 0) return 0;
    return Math.round((value / this.totalRiskCount) * 100);
  }

  getAverageFindings(): number {
    if (this.areaVulnerabilities.length === 0) return 0;
    return Math.round(this.totalVulnerabilities / this.areaVulnerabilities.length * 10) / 10;
  }
}