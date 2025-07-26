import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { WebSocketService, Notification } from '../../services/websocket.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-container">
      <div class="notifications-header">
        <h3>🔔 Real-time Notifications</h3>
        <div class="notification-controls">
          <button class="btn-clear" (click)="clearAll()" *ngIf="notifications.length > 0">
            Clear All
          </button>
          <div class="unread-badge" *ngIf="unreadCount > 0">
            {{ unreadCount }}
          </div>
        </div>
      </div>

      <div class="notifications-list" *ngIf="notifications.length > 0; else noNotifications">
        <div 
          class="notification-item" 
          *ngFor="let notification of notifications; trackBy: trackByTimestamp"
          [class]="getNotificationClass(notification)"
          [class.new]="isNewNotification(notification)"
        >
          <div class="notification-icon">
            {{ getNotificationIcon(notification.type) }}
          </div>
          <div class="notification-content">
            <div class="notification-header">
              <span class="notification-title">{{ notification.title || getDefaultTitle(notification.type) }}</span>
              <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
            </div>
            <div class="notification-message">{{ notification.message }}</div>
            <div class="notification-meta" *ngIf="notification.severity">
              <span class="severity-badge" [class]="'severity-' + notification.severity">
                {{ notification.severity }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ng-template #noNotifications>
        <div class="no-notifications">
          <div class="no-notifications-icon">🔕</div>
          <div class="no-notifications-text">No notifications yet</div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .notifications-container {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #ffffff;
      border-radius: 12px;
      padding: 20px;
      margin: 16px 0;
      max-height: 600px;
      overflow-y: auto;
    }

    .notifications-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .notifications-header h3 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 600;
    }

    .notification-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-clear {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.3s ease;
    }

    .btn-clear:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .unread-badge {
      background: #ff4444;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      min-width: 24px;
      text-align: center;
    }

    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .notification-item {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      transition: all 0.3s ease;
      position: relative;
    }

    .notification-item:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateX(4px);
    }

    .notification-item.new {
      animation: slideIn 0.5s ease;
      border-color: #44ff44;
    }

    .notification-item.security-alert {
      border-color: #ff4444;
      background: rgba(255, 68, 68, 0.1);
    }

    .notification-item.performance-alert {
      border-color: #ffaa00;
      background: rgba(255, 170, 0, 0.1);
    }

    .notification-item.report-update {
      border-color: #4CAF50;
      background: rgba(76, 175, 80, 0.1);
    }

    .notification-item.dashboard-update {
      border-color: #2196F3;
      background: rgba(33, 150, 243, 0.1);
    }

    .notification-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .notification-content {
      flex: 1;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .notification-title {
      font-weight: 600;
      color: #ffffff;
      font-size: 1rem;
    }

    .notification-time {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .notification-message {
      font-size: 0.9rem;
      line-height: 1.4;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 8px;
    }

    .notification-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .severity-badge {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .severity-low { background: #4CAF50; color: white; }
    .severity-medium { background: #FF9800; color: white; }
    .severity-high { background: #ff4444; color: white; }
    .severity-critical { 
      background: #ff0000; 
      color: white; 
      animation: pulse 2s infinite;
    }

    .no-notifications {
      text-align: center;
      padding: 40px 20px;
      color: rgba(255, 255, 255, 0.6);
    }

    .no-notifications-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }

    .no-notifications-text {
      font-size: 1.1rem;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.8; }
      100% { opacity: 1; }
    }

    .notifications-container::-webkit-scrollbar {
      width: 6px;
    }

    .notifications-container::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    .notifications-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }

    .notifications-container::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  `]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  private subscriptions: Subscription[] = [];
  private recentNotifications = new Set<string>();

  constructor(
    private notificationService: NotificationService,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.notificationService.getNotifications().subscribe(notifications => {
        this.notifications = notifications;
        this.updateRecentNotifications();
      }),

      this.notificationService.getUnreadCount().subscribe(count => {
        this.unreadCount = count;
      })
    );

    // Request notification permission
    this.notificationService.requestNotificationPermission();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private updateRecentNotifications(): void {
    // Mark notifications as recent for 5 seconds
    const recentThreshold = 5000;
    const now = Date.now();
    
    this.notifications.forEach(notification => {
      const notificationTime = new Date(notification.timestamp).getTime();
      if (now - notificationTime < recentThreshold) {
        this.recentNotifications.add(notification.timestamp);
        setTimeout(() => {
          this.recentNotifications.delete(notification.timestamp);
        }, recentThreshold);
      }
    });
  }

  trackByTimestamp(index: number, notification: Notification): string {
    return notification.timestamp;
  }

  getNotificationClass(notification: Notification): string {
    return notification.type.replace('-', '');
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'security-alert':
        return '🚨';
      case 'performance-alert':
        return '⚡';
      case 'report-update':
        return '📊';
      case 'dashboard-update':
        return '📈';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  }

  getDefaultTitle(type: string): string {
    switch (type) {
      case 'security-alert':
        return 'Security Alert';
      case 'performance-alert':
        return 'Performance Alert';
      case 'report-update':
        return 'Report Update';
      case 'dashboard-update':
        return 'Dashboard Update';
      case 'system':
        return 'System Notification';
      default:
        return 'Notification';
    }
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  isNewNotification(notification: Notification): boolean {
    return this.recentNotifications.has(notification.timestamp);
  }

  clearAll(): void {
    this.notificationService.clearNotifications();
  }
}