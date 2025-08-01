import { Component, Input, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { Subject, fromEvent, debounceTime } from 'rxjs';

export interface ChartData {
  type: ChartType;
  data: any;
  options?: any;
  title?: string;
  subtitle?: string;
  interactive?: boolean;
  realTime?: boolean;
  height?: number;
}

@Component({
  selector: 'app-advanced-charts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="advanced-charts-container">
      <div class="chart-header" *ngIf="chartData.title">
        <div class="header-content">
          <div class="chart-status">
            <div class="status-indicator" [class.active]="isActive" [class.updating]="isUpdating"></div>
            <span class="status-text">{{ getStatusText() }}</span>
          </div>
          <h3 class="chart-title">{{ chartData.title }}</h3>
          <p class="chart-subtitle" *ngIf="chartData.subtitle">{{ chartData.subtitle }}</p>
        </div>
        <div class="chart-controls">
          <button 
            class="control-btn" 
            [class.active]="isFullscreen"
            (click)="toggleFullscreen()"
            title="Toggle Fullscreen"
          >
            <i class="fas fa-expand" *ngIf="!isFullscreen"></i>
            <i class="fas fa-compress" *ngIf="isFullscreen"></i>
          </button>
          <button 
            class="control-btn" 
            [class.active]="chartData.realTime"
            (click)="toggleRealTime()"
            title="Toggle Real-time Updates"
          >
            <i class="fas fa-sync-alt"></i>
          </button>
          <button 
            class="control-btn" 
            (click)="exportChart()"
            title="Export Chart"
          >
            <i class="fas fa-download"></i>
          </button>
        </div>
      </div>
      
      <div class="chart-wrapper" [class.fullscreen]="isFullscreen" #chartWrapper>
        <div class="chart-loading" *ngIf="isLoading">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-text">LOADING_CHART_DATA</div>
          </div>
        </div>
        
        <canvas 
          #chartCanvas 
          [style.height.px]="chartData.height || 300"
          [class.interactive]="chartData.interactive"
        ></canvas>
        
        <div class="chart-overlay" *ngIf="isUpdating">
          <div class="update-indicator">
            <i class="fas fa-sync-alt"></i>
            <span>UPDATING...</span>
          </div>
        </div>
      </div>
      
      <div class="chart-footer" *ngIf="showFooter">
        <div class="chart-stats">
          <div class="stat-item">
            <span class="stat-label">DATA_POINTS</span>
            <span class="stat-value">{{ getDataPointsCount() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">LAST_UPDATE</span>
            <span class="stat-value">{{ getLastUpdateTime() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">REFRESH_RATE</span>
            <span class="stat-value">{{ getRefreshRate() }}</span>
          </div>
        </div>
        
        <div class="chart-actions">
          <button class="action-btn" (click)="resetZoom()">
            <i class="fas fa-search-minus"></i>
            <span>RESET_ZOOM</span>
          </button>
          <button class="action-btn" (click)="refreshData()">
            <i class="fas fa-refresh"></i>
            <span>REFRESH</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./advanced-charts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdvancedChartsComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() chartData!: ChartData;
  @Input() showFooter: boolean = true;
  @Input() enableInteractions: boolean = true;
  @Input() updateInterval: number = 5000; // 5 seconds
  
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartWrapper', { static: true }) chartWrapper!: ElementRef<HTMLDivElement>;
  
  chart?: Chart;
  isActive = true;
  isUpdating = false;
  isLoading = false;
  isFullscreen = false;
  lastUpdateTime = new Date();
  
  private destroy$ = new Subject<void>();
  private updateTimer?: any;
  private resizeObserver?: ResizeObserver;
  
  constructor(private cdr: ChangeDetectorRef) {
    Chart.register(...registerables);
  }

  ngOnInit() {
    this.setupChart();
    this.setupRealTimeUpdates();
    this.setupResizeObserver();
  }

  ngAfterViewInit() {
    this.createChart();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private setupChart() {
    if (!this.chartData) {
      console.error('Chart data is required');
      return;
    }
    
    // Set default options if not provided
    if (!this.chartData.options) {
      this.chartData.options = this.getDefaultOptions();
    }
    
    // Enable interactions if specified
    if (this.chartData.interactive && this.enableInteractions) {
      this.setupInteractions();
    }
  }

  private setupRealTimeUpdates() {
    if (this.chartData.realTime) {
      this.updateTimer = setInterval(() => {
        this.updateChartData();
      }, this.updateInterval);
    }
  }

  private setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.chart) {
          this.chart.resize();
        }
      });
      
      this.resizeObserver.observe(this.chartWrapper.nativeElement);
    }
  }

  private createChart() {
    if (!this.chartCanvas) return;
    
    this.isLoading = true;
    this.cdr.markForCheck();
    
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    // Simulate loading time for better UX
    setTimeout(() => {
      const config: ChartConfiguration = {
        type: this.chartData.type,
        data: this.chartData.data,
        options: {
          ...this.chartData.options,
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            ...this.chartData.options?.plugins,
            legend: {
              ...this.chartData.options?.plugins?.legend,
              labels: {
                ...this.chartData.options?.plugins?.legend?.labels,
                color: '#e0e0e0',
                font: {
                  family: "'Orbitron', monospace",
                  size: 12
                }
              }
            },
            tooltip: {
              ...this.chartData.options?.plugins?.tooltip,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#00d4ff',
              bodyColor: '#e0e0e0',
              borderColor: '#00d4ff',
              borderWidth: 1,
              titleFont: {
                family: "'Orbitron', monospace",
                size: 14
              },
              bodyFont: {
                family: "'Inter', sans-serif",
                size: 12
              }
            }
          },
          scales: this.getEnhancedScales()
        }
      };
      
      this.chart = new Chart(ctx, config);
      this.isLoading = false;
      this.cdr.markForCheck();
    }, 1000);
  }

  private getDefaultOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false
        }
      }
    };
  }

  private getEnhancedScales(): any {
    if (this.chartData.type === 'pie' || this.chartData.type === 'doughnut') {
      return {};
    }
    
    return {
      x: {
        grid: {
          color: 'rgba(0, 212, 255, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#a0a0a0',
          font: {
            family: "'Orbitron', monospace",
            size: 10
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 212, 255, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#a0a0a0',
          font: {
            family: "'Orbitron', monospace",
            size: 10
          }
        }
      }
    };
  }

  private setupInteractions() {
    // Add custom event listeners for chart interactions
    fromEvent(this.chartCanvas.nativeElement, 'click')
      .pipe(debounceTime(300))
      .subscribe((event: any) => {
        if (this.chart) {
          const elements = this.chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
          if (elements.length > 0) {
            this.onChartClick(elements[0]);
          }
        }
      });
  }

  private onChartClick(element: any) {
    console.log('Chart element clicked:', element);
    // Implement custom click behavior
  }

  private updateChartData() {
    if (!this.chart || !this.chartData.realTime) return;
    
    this.isUpdating = true;
    this.cdr.markForCheck();
    
    // Simulate real-time data updates
    setTimeout(() => {
      if (this.chart) {
        // Update chart data based on type
        this.generateNewData();
        this.chart.update('active');
        this.lastUpdateTime = new Date();
      }
      
      this.isUpdating = false;
      this.cdr.markForCheck();
    }, 1000);
  }

  private generateNewData() {
    if (!this.chart) return;
    
    // Generate new data based on chart type
    switch (this.chartData.type) {
      case 'line':
        this.updateLineChartData();
        break;
      case 'bar':
        this.updateBarChartData();
        break;
      case 'pie':
      case 'doughnut':
        this.updatePieChartData();
        break;
    }
  }

  private updateLineChartData() {
    if (!this.chart || !this.chart.data.datasets[0]) return;
    
    const dataset = this.chart.data.datasets[0];
    const newValue = Math.floor(Math.random() * 100);
    
    if (dataset.data.length >= 20) {
      dataset.data.shift();
    }
    dataset.data.push(newValue);
    
    if (this.chart.data.labels && this.chart.data.labels.length >= 20) {
      this.chart.data.labels.shift();
    }
    this.chart.data.labels?.push(new Date().toLocaleTimeString());
  }

  private updateBarChartData() {
    if (!this.chart || !this.chart.data.datasets[0]) return;
    
    const dataset = this.chart.data.datasets[0];
    (dataset.data as number[]).forEach((_, index) => {
      const variation = Math.random() * 20 - 10; // -10 to +10
      (dataset.data as number[])[index] = Math.max(0, (dataset.data as number[])[index] + variation);
    });
  }

  private updatePieChartData() {
    if (!this.chart || !this.chart.data.datasets[0]) return;
    
    const dataset = this.chart.data.datasets[0];
    (dataset.data as number[]).forEach((_, index) => {
      const variation = Math.random() * 10 - 5; // -5 to +5
      (dataset.data as number[])[index] = Math.max(1, (dataset.data as number[])[index] + variation);
    });
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    this.cdr.markForCheck();
    
    // Resize chart after fullscreen toggle
    setTimeout(() => {
      if (this.chart) {
        this.chart.resize();
      }
    }, 300);
  }

  toggleRealTime() {
    this.chartData.realTime = !this.chartData.realTime;
    
    if (this.chartData.realTime) {
      this.setupRealTimeUpdates();
    } else if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
    
    this.cdr.markForCheck();
  }

  exportChart() {
    if (!this.chart) return;
    
    const url = this.chart.toBase64Image();
    const link = document.createElement('a');
    link.download = `chart-${Date.now()}.png`;
    link.href = url;
    link.click();
  }

  resetZoom() {
    if (this.chart) {
      this.chart.resetZoom();
    }
  }

  refreshData() {
    this.updateChartData();
  }

  getStatusText(): string {
    if (this.isUpdating) return 'UPDATING';
    if (this.chartData.realTime) return 'LIVE';
    return 'ACTIVE';
  }

  getDataPointsCount(): number {
    if (!this.chart || !this.chart.data.datasets[0]) return 0;
    return (this.chart.data.datasets[0].data as any[]).length;
  }

  getLastUpdateTime(): string {
    const now = new Date();
    const diffMs = now.getTime() - this.lastUpdateTime.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs}S_AGO`;
    
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}M_AGO`;
    
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}H_AGO`;
  }

  getRefreshRate(): string {
    if (!this.chartData.realTime) return 'MANUAL';
    return `${this.updateInterval / 1000}S`;
  }
}