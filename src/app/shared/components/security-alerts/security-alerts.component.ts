import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';
import { interval, Subject, takeUntil } from 'rxjs';

export interface SecurityAlert {
  id: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  dismissible: boolean;
  duration?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'system' | 'security' | 'threat' | 'network' | 'authentication';
  icon?: string;
}

@Component({
  selector: 'app-security-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="security-alerts-container">
      <!-- Alert Header -->
      <div class="alerts-header" *ngIf="alerts.length > 0">
        <div class="header-content">
          <div class="header-icon">
            <i class="fas fa-shield-alt"></i>
            <div class="icon-pulse"></div>
          </div>
          <h3 class="header-title">SECURITY_ALERTS</h3>
          <div class="alert-count">
            <span class="count-badge" [class]="getHighestPriority()">
              {{alerts.length}}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button class="cyber-btn-small" (click)="clearAllAlerts()">
            <i class="fas fa-times"></i>
            <span>CLEAR_ALL</span>
          </button>
        </div>
      </div>

      <!-- Alerts List -->
      <div class="alerts-list" *ngIf="alerts.length > 0">
        <div 
          *ngFor="let alert of alerts; trackBy: trackAlert"
          class="security-alert"
          [class]="'alert-' + alert.type + ' priority-' + alert.priority"
          [@slideInOut]="alert.id"
          (click)="dismissAlert(alert.id)"
        >
          <!-- Alert scanning line -->
          <div class="alert-scanner"></div>
          
          <!-- Alert content -->
          <div class="alert-content">
            <div class="alert-icon">
              <i [class]="getAlertIcon(alert)"></i>
              <div class="icon-glow"></div>
            </div>
            
            <div class="alert-body">
              <div class="alert-header">
                <h4 class="alert-title">{{ alert.title }}</h4>
                <div class="alert-meta">
                  <span class="alert-category">{{ alert.category.toUpperCase() }}</span>
                  <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
                </div>
              </div>
              <p class="alert-message">{{ alert.message }}</p>
            </div>
            
            <div class="alert-actions" *ngIf="alert.dismissible">
              <button class="dismiss-btn" (click)="dismissAlert(alert.id); $event.stopPropagation()">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          
          <!-- Priority indicator -->
          <div class="priority-indicator" [class]="alert.priority">
            <div class="indicator-bar"></div>
          </div>
        </div>
      </div>
      
      <!-- Empty state -->
      <div class="alerts-empty" *ngIf="alerts.length === 0">
        <div class="empty-content">
          <div class="empty-icon">
            <i class="fas fa-shield-check"></i>
          </div>
          <h3 class="empty-title">ALL_SYSTEMS_SECURE</h3>
          <p class="empty-message">No security alerts at this time</p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./security-alerts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class SecurityAlertsComponent implements OnInit, OnDestroy {
  alerts: SecurityAlert[] = [];
  private destroy$ = new Subject<void>();
  
  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.initializeAlerts();
    this.setupAlertUpdates();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeAlerts() {
    // Initialize with some sample alerts
    this.alerts = [
      {
        id: '1',
        type: 'info',
        title: 'SYSTEM_MONITORING',
        message: 'Continuous threat monitoring active',
        timestamp: new Date(),
        dismissible: true,
        priority: 'low',
        category: 'system',
        icon: 'fas fa-eye'
      },
      {
        id: '2',
        type: 'warning',
        title: 'SUSPICIOUS_ACTIVITY',
        message: 'Unusual login patterns detected',
        timestamp: new Date(Date.now() - 300000),
        dismissible: true,
        priority: 'medium',
        category: 'authentication',
        icon: 'fas fa-exclamation-triangle'
      }
    ];
  }

  private setupAlertUpdates() {
    // Simulate real-time alert updates
    interval(30000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.generateRandomAlert();
    });
  }

  private generateRandomAlert() {
    const alertTypes = ['info', 'warning', 'danger', 'success'] as const;
    const priorities = ['low', 'medium', 'high', 'critical'] as const;
    const categories = ['system', 'security', 'threat', 'network', 'authentication'] as const;
    
    const sampleAlerts = [
      { title: 'FIREWALL_UPDATE', message: 'Security rules updated successfully' },
      { title: 'THREAT_BLOCKED', message: 'Malicious IP address blocked' },
      { title: 'SCAN_COMPLETE', message: 'Vulnerability scan completed' },
      { title: 'BACKUP_STATUS', message: 'Security backup verified' },
      { title: 'ACCESS_GRANTED', message: 'New user authentication successful' }
    ];

    const randomAlert = sampleAlerts[Math.floor(Math.random() * sampleAlerts.length)];
    
    const newAlert: SecurityAlert = {
      id: Date.now().toString(),
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      title: randomAlert.title,
      message: randomAlert.message,
      timestamp: new Date(),
      dismissible: true,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      category: categories[Math.floor(Math.random() * categories.length)]
    };

    this.addAlert(newAlert);
  }

  addAlert(alert: SecurityAlert) {
    this.alerts.unshift(alert);
    
    // Auto-dismiss after duration if specified
    if (alert.duration) {
      setTimeout(() => {
        this.dismissAlert(alert.id);
      }, alert.duration);
    }
    
    // Keep only last 10 alerts
    if (this.alerts.length > 10) {
      this.alerts = this.alerts.slice(0, 10);
    }
    
    this.cdr.markForCheck();
  }

  dismissAlert(alertId: string) {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
    this.cdr.markForCheck();
  }

  clearAllAlerts() {
    this.alerts = [];
    this.cdr.markForCheck();
  }

  getAlertIcon(alert: SecurityAlert): string {
    if (alert.icon) return alert.icon;
    
    switch (alert.type) {
      case 'info': return 'fas fa-info-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'danger': return 'fas fa-exclamation-circle';
      case 'success': return 'fas fa-check-circle';
      default: return 'fas fa-bell';
    }
  }

  getHighestPriority(): string {
    const priorities = this.alerts.map(a => a.priority);
    if (priorities.includes('critical')) return 'critical';
    if (priorities.includes('high')) return 'high';
    if (priorities.includes('medium')) return 'medium';
    return 'low';
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'NOW';
    if (diffMins < 60) return `${diffMins}M_AGO`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}H_AGO`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}D_AGO`;
  }

  trackAlert(index: number, alert: SecurityAlert): string {
    return alert.id;
  }
}