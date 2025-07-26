import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PerformanceService, PerformanceMetric } from '../../services/performance.service';
import { NotificationService } from '../../services/notification.service';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-performance-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="performance-dashboard">
      <div class="dashboard-header">
        <h3>🚀 Performance Monitoring</h3>
        <div class="connection-status" [class.connected]="isConnected">
          <span class="status-indicator"></span>
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card" *ngFor="let metric of displayMetrics">
          <div class="metric-header">
            <span class="metric-name">{{ formatMetricName(metric.name) }}</span>
            <span class="metric-type" [class]="metric.type">{{ metric.type }}</span>
          </div>
          <div class="metric-value" [class.warning]="isWarning(metric)" [class.critical]="isCritical(metric)">
            {{ formatMetricValue(metric) }}
          </div>
          <div class="metric-timestamp">{{ formatTimestamp(metric.timestamp) }}</div>
        </div>
      </div>

      <div class="alerts-section" *ngIf="alerts.length > 0">
        <h4>⚠️ Performance Alerts</h4>
        <div class="alerts-list">
          <div class="alert-item" *ngFor="let alert of alerts" [class]="alert.level">
            <div class="alert-header">
              <span class="alert-level">{{ alert.level }}</span>
              <span class="alert-metric">{{ alert.metric }}</span>
            </div>
            <div class="alert-message">{{ alert.message }}</div>
            <div class="alert-timestamp">{{ formatTimestamp(alert.timestamp) }}</div>
          </div>
        </div>
      </div>

      <div class="summary-section">
        <h4>📊 Summary</h4>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Total Metrics</span>
            <span class="summary-value">{{ performanceReport?.summary?.totalMetrics || 0 }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Active Alerts</span>
            <span class="summary-value">{{ performanceReport?.summary?.totalAlerts || 0 }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Avg Response Time</span>
            <span class="summary-value">{{ formatResponseTime(performanceReport?.summary?.avgResponseTime) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Memory Usage</span>
            <span class="summary-value">{{ formatMemoryUsage(performanceReport?.summary?.memoryUsagePercent) }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .performance-dashboard {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #ffffff;
      padding: 24px;
      border-radius: 12px;
      margin: 16px 0;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .dashboard-header h3 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ff4444;
      animation: pulse 2s infinite;
    }

    .connection-status.connected .status-indicator {
      background: #44ff44;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 16px;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .metric-name {
      font-weight: 600;
      color: #ffffff;
    }

    .metric-type {
      font-size: 0.75rem;
      padding: 4px 8px;
      border-radius: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .metric-type.timing { background: #4CAF50; color: white; }
    .metric-type.memory { background: #FF9800; color: white; }
    .metric-type.network { background: #2196F3; color: white; }
    .metric-type.custom { background: #9C27B0; color: white; }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #44ff44;
      margin-bottom: 4px;
    }

    .metric-value.warning {
      color: #ffaa00;
    }

    .metric-value.critical {
      color: #ff4444;
    }

    .metric-timestamp {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .alerts-section {
      margin-bottom: 24px;
    }

    .alerts-section h4 {
      margin: 0 0 16px 0;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .alert-item {
      background: rgba(255, 68, 68, 0.1);
      border: 1px solid rgba(255, 68, 68, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
    }

    .alert-item.warning {
      background: rgba(255, 170, 0, 0.1);
      border-color: rgba(255, 170, 0, 0.3);
    }

    .alert-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .alert-level {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.2);
    }

    .alert-message {
      font-size: 0.9rem;
      margin-bottom: 4px;
    }

    .alert-timestamp {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .summary-section h4 {
      margin: 0 0 16px 0;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .summary-item {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .summary-label {
      display: block;
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 8px;
    }

    .summary-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: #44ff44;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
  `]
})
export class PerformanceDashboardComponent implements OnInit, OnDestroy {
  metrics: PerformanceMetric[] = [];
  alerts: any[] = [];
  isConnected = false;
  performanceReport: any = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private performanceService: PerformanceService,
    private notificationService: NotificationService,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.performanceService.getMetrics().subscribe(metrics => {
        this.metrics = metrics;
        this.updatePerformanceReport();
      }),

      this.performanceService.getAlerts().subscribe(alerts => {
        this.alerts = alerts.slice(0, 5); // Show only last 5 alerts
      }),

      this.webSocketService.getConnectionStatus().subscribe(status => {
        this.isConnected = status;
      })
    );

    // Update performance report every 30 seconds
    setInterval(() => {
      this.updatePerformanceReport();
    }, 30000);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private updatePerformanceReport(): void {
    this.performanceReport = this.performanceService.getPerformanceReport();
  }

  get displayMetrics(): PerformanceMetric[] {
    return this.metrics.slice(-8); // Show last 8 metrics
  }

  formatMetricName(name: string): string {
    return name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatMetricValue(metric: PerformanceMetric): string {
    if (metric.type === 'memory') {
      return `${metric.value.toFixed(1)}%`;
    }
    if (metric.type === 'timing' || metric.type === 'network') {
      return `${metric.value.toFixed(1)}ms`;
    }
    return metric.value.toString();
  }

  formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  formatResponseTime(time: number): string {
    if (!time) return 'N/A';
    return `${time.toFixed(1)}ms`;
  }

  formatMemoryUsage(percent: number): string {
    if (!percent) return 'N/A';
    return `${percent.toFixed(1)}%`;
  }

  isWarning(metric: PerformanceMetric): boolean {
    if (metric.type === 'timing' && metric.value > 2000) return true;
    if (metric.type === 'memory' && metric.value > 50) return true;
    return false;
  }

  isCritical(metric: PerformanceMetric): boolean {
    if (metric.type === 'timing' && metric.value > 4000) return true;
    if (metric.type === 'memory' && metric.value > 80) return true;
    return false;
  }
}