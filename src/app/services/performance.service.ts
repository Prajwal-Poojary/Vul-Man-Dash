import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private performanceMetrics: Map<string, number> = new Map();

  constructor() {
    this.initializePerformanceObserver();
  }

  private initializePerformanceObserver() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.logPerformanceEntry(entry);
        }
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }
  }

  private logPerformanceEntry(entry: PerformanceEntry) {
    console.log(`Performance: ${entry.name} - ${entry.duration}ms`);
    this.performanceMetrics.set(entry.name, entry.duration);
  }

  markStart(name: string) {
    performance.mark(`${name}-start`);
  }

  markEnd(name: string) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  }

  getMetrics(): Map<string, number> {
    return this.performanceMetrics;
  }

  measureChartPerformance(chartName: string, operation: () => void) {
    const startTime = performance.now();
    operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Chart ${chartName} rendered in ${duration}ms`);
    this.performanceMetrics.set(`chart-${chartName}`, duration);
  }

  getMemoryUsage(): any | null {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  }

  logCriticalRenderingPath() {
    if ('getEntriesByType' in performance) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming;
        console.log('Critical Rendering Path Metrics:', {
          DNS: nav.domainLookupEnd - nav.domainLookupStart,
          TCP: nav.connectEnd - nav.connectStart,
          Request: nav.responseStart - nav.requestStart,
          Response: nav.responseEnd - nav.responseStart,
          DOM: nav.domContentLoadedEventEnd - nav.responseEnd,
          Load: nav.loadEventEnd - nav.loadEventStart
        });
      }
    }
  }
}