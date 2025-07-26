import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WebSocketService } from './websocket.service';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  type: 'timing' | 'memory' | 'network' | 'custom';
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private performanceMetrics: Map<string, PerformanceMetric> = new Map();
  private metricsSubject = new BehaviorSubject<PerformanceMetric[]>([]);
  private alertsSubject = new BehaviorSubject<any[]>([]);
  
  private thresholds: PerformanceThreshold[] = [
    { metric: 'page-load', warning: 3000, critical: 5000 },
    { metric: 'api-response', warning: 2000, critical: 4000 },
    { metric: 'chart-render', warning: 1000, critical: 2000 },
    { metric: 'memory-usage', warning: 50, critical: 80 }
  ];

  constructor(private webSocketService: WebSocketService) {
    this.initializePerformanceObserver();
    this.startPerformanceMonitoring();
  }

  private initializePerformanceObserver() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.logPerformanceEntry(entry);
        }
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation', 'resource', 'paint'] });
    }
  }

  private startPerformanceMonitoring(): void {
    // Monitor every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
      this.checkPerformanceThresholds();
    }, 30000);
    
    // Initial collection
    setTimeout(() => {
      this.collectSystemMetrics();
    }, 5000);
  }

  private collectSystemMetrics(): void {
    // Memory usage
    const memoryInfo = this.getMemoryUsage();
    if (memoryInfo) {
      const memoryUsagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100;
      this.addMetric('memory-usage', memoryUsagePercent, 'memory');
    }

    // Network information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.addMetric('network-downlink', connection.downlink || 0, 'network');
        this.addMetric('network-rtt', connection.rtt || 0, 'network');
      }
    }

    // FPS monitoring
    this.measureFPS();
  }

  private measureFPS(): void {
    let fps = 0;
    let lastTime = performance.now();
    
    const countFPS = () => {
      const currentTime = performance.now();
      fps++;
      
      if (currentTime >= lastTime + 1000) {
        this.addMetric('fps', fps, 'custom');
        fps = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(countFPS);
    };
    
    requestAnimationFrame(countFPS);
  }

  private checkPerformanceThresholds(): void {
    for (const threshold of this.thresholds) {
      const metric = this.performanceMetrics.get(threshold.metric);
      if (metric) {
        let alertLevel = null;
        
        if (metric.value >= threshold.critical) {
          alertLevel = 'critical';
        } else if (metric.value >= threshold.warning) {
          alertLevel = 'warning';
        }
        
        if (alertLevel) {
          this.triggerPerformanceAlert(metric, alertLevel, threshold);
        }
      }
    }
  }

  private triggerPerformanceAlert(metric: PerformanceMetric, level: string, threshold: PerformanceThreshold): void {
    const alert = {
      type: 'performance-alert',
      level,
      metric: metric.name,
      value: metric.value,
      threshold: level === 'critical' ? threshold.critical : threshold.warning,
      timestamp: new Date(),
      message: `Performance ${level}: ${metric.name} is ${metric.value}ms (threshold: ${level === 'critical' ? threshold.critical : threshold.warning}ms)`
    };
    
    const currentAlerts = this.alertsSubject.value;
    this.alertsSubject.next([alert, ...currentAlerts]);
    
    // Send via WebSocket if connected
    if (this.webSocketService.isConnected()) {
      // This would typically be sent from backend, but for demo purposes
      console.warn('Performance Alert:', alert);
    }
  }

  private logPerformanceEntry(entry: PerformanceEntry) {
    console.log(`Performance: ${entry.name} - ${entry.duration}ms`);
    this.addMetric(entry.name, entry.duration, 'timing');
  }

  private addMetric(name: string, value: number, type: 'timing' | 'memory' | 'network' | 'custom'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      type
    };
    
    this.performanceMetrics.set(name, metric);
    
    // Update observable
    const allMetrics = Array.from(this.performanceMetrics.values());
    this.metricsSubject.next(allMetrics);
  }

  // Public methods
  markStart(name: string): void {
    performance.mark(`${name}-start`);
  }

  markEnd(name: string): void {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  }

  getMetrics(): Observable<PerformanceMetric[]> {
    return this.metricsSubject.asObservable();
  }

  getAlerts(): Observable<any[]> {
    return this.alertsSubject.asObservable();
  }

  measureChartPerformance(chartName: string, operation: () => void): void {
    const startTime = performance.now();
    operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Chart ${chartName} rendered in ${duration}ms`);
    this.addMetric(`chart-${chartName}`, duration, 'timing');
  }

  measureApiCall(apiName: string, promise: Promise<any>): Promise<any> {
    const startTime = performance.now();
    
    return promise.then(result => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.addMetric(`api-${apiName}`, duration, 'network');
      return result;
    }).catch(error => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.addMetric(`api-${apiName}-error`, duration, 'network');
      throw error;
    });
  }

  getMemoryUsage(): any | null {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  }

  logCriticalRenderingPath(): void {
    if ('getEntriesByType' in performance) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming;
        const metrics = {
          DNS: nav.domainLookupEnd - nav.domainLookupStart,
          TCP: nav.connectEnd - nav.connectStart,
          Request: nav.responseStart - nav.requestStart,
          Response: nav.responseEnd - nav.responseStart,
          DOM: nav.domContentLoadedEventEnd - nav.responseEnd,
          Load: nav.loadEventEnd - nav.loadEventStart
        };
        
        console.log('Critical Rendering Path Metrics:', metrics);
        
        // Add each metric
        Object.entries(metrics).forEach(([name, value]) => {
          this.addMetric(`crp-${name.toLowerCase()}`, value, 'timing');
        });
      }
    }
  }

  getPerformanceReport(): any {
    const metrics = Array.from(this.performanceMetrics.values());
    const alerts = this.alertsSubject.value;
    
    return {
      timestamp: new Date(),
      metrics: metrics.slice(-20), // Last 20 metrics
      alerts: alerts.slice(0, 10), // Last 10 alerts
      memoryUsage: this.getMemoryUsage(),
      summary: {
        totalMetrics: metrics.length,
        totalAlerts: alerts.length,
        avgResponseTime: this.calculateAverageResponseTime(metrics),
        memoryUsagePercent: this.calculateMemoryUsagePercent()
      }
    };
  }

  private calculateAverageResponseTime(metrics: PerformanceMetric[]): number {
    const networkMetrics = metrics.filter(m => m.type === 'network');
    if (networkMetrics.length === 0) return 0;
    
    const sum = networkMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / networkMetrics.length;
  }

  private calculateMemoryUsagePercent(): number {
    const memoryInfo = this.getMemoryUsage();
    if (!memoryInfo) return 0;
    
    return (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100;
  }
}