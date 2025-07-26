import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { WebSocketService, Notification } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private alertsSubject = new Subject<Notification>();

  constructor(private webSocketService: WebSocketService) {
    this.webSocketService.getNotifications().subscribe(notification => {
      this.handleNotification(notification);
    });
  }

  private handleNotification(notification: Notification): void {
    // Add to notifications list
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = [notification, ...currentNotifications].slice(0, 50); // Keep last 50 notifications
    this.notificationsSubject.next(updatedNotifications);

    // Update unread count
    this.unreadCountSubject.next(this.unreadCountSubject.value + 1);

    // Handle different notification types
    switch (notification.type) {
      case 'security-alert':
        this.handleSecurityAlert(notification);
        break;
      case 'performance-alert':
        this.handlePerformanceAlert(notification);
        break;
      case 'report-update':
        this.handleReportUpdate(notification);
        break;
      case 'dashboard-update':
        this.handleDashboardUpdate(notification);
        break;
      default:
        this.alertsSubject.next(notification);
    }

    // Show browser notification if permitted
    this.showBrowserNotification(notification);
  }

  private handleSecurityAlert(notification: Notification): void {
    console.warn('Security Alert:', notification);
    this.alertsSubject.next(notification);
    
    // Additional security alert handling
    if (notification.severity === 'critical') {
      this.showCriticalAlert(notification);
    }
  }

  private handlePerformanceAlert(notification: Notification): void {
    console.warn('Performance Alert:', notification);
    this.alertsSubject.next(notification);
  }

  private handleReportUpdate(notification: Notification): void {
    console.log('Report Update:', notification);
    this.alertsSubject.next(notification);
  }

  private handleDashboardUpdate(notification: Notification): void {
    console.log('Dashboard Update:', notification);
    // Emit event for dashboard components to refresh
    this.alertsSubject.next(notification);
  }

  private showBrowserNotification(notification: Notification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = notification.title || 'Cybersecurity Alert';
      const options = {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.type,
        renotify: true
      };

      const browserNotification = new Notification(title, options);
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }

  private showCriticalAlert(notification: Notification): void {
    // Create a more prominent alert for critical notifications
    const alertElement = document.createElement('div');
    alertElement.className = 'critical-alert';
    alertElement.innerHTML = `
      <div class="alert-content">
        <h3>⚠️ Critical Security Alert</h3>
        <p>${notification.message}</p>
        <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
      </div>
    `;
    
    // Add styles
    alertElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 400px;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(alertElement);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (alertElement.parentElement) {
        alertElement.remove();
      }
    }, 10000);
  }

  // Public methods
  getNotifications() {
    return this.notificationsSubject.asObservable();
  }

  getUnreadCount() {
    return this.unreadCountSubject.asObservable();
  }

  getAlerts() {
    return this.alertsSubject.asObservable();
  }

  markAsRead(): void {
    this.unreadCountSubject.next(0);
  }

  clearNotifications(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}