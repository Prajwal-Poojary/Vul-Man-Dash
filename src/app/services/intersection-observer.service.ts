import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';

interface IntersectionObserverEntry {
  target: Element;
  isIntersecting: boolean;
  intersectionRatio: number;
  boundingClientRect: DOMRectReadOnly;
}

@Injectable({
  providedIn: 'root'
})
export class IntersectionObserverService implements OnDestroy {
  private observers: Map<string, IntersectionObserver> = new Map();
  private subjects: Map<string, Subject<IntersectionObserverEntry[]>> = new Map();

  constructor() {}

  createObserver(
    options: IntersectionObserverInit = {},
    observerId = 'default'
  ): Observable<IntersectionObserverEntry[]> {
    if (this.observers.has(observerId)) {
      return this.subjects.get(observerId)!.asObservable();
    }

    const subject = new Subject<IntersectionObserverEntry[]>();
    this.subjects.set(observerId, subject);

    const observer = new IntersectionObserver(
      (entries) => {
        subject.next(entries);
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...options
      }
    );

    this.observers.set(observerId, observer);
    return subject.asObservable();
  }

  observe(element: Element, observerId = 'default'): void {
    const observer = this.observers.get(observerId);
    if (observer) {
      observer.observe(element);
    }
  }

  unobserve(element: Element, observerId = 'default'): void {
    const observer = this.observers.get(observerId);
    if (observer) {
      observer.unobserve(element);
    }
  }

  disconnect(observerId = 'default'): void {
    const observer = this.observers.get(observerId);
    const subject = this.subjects.get(observerId);
    
    if (observer) {
      observer.disconnect();
      this.observers.delete(observerId);
    }
    
    if (subject) {
      subject.complete();
      this.subjects.delete(observerId);
    }
  }

  ngOnDestroy(): void {
    this.observers.forEach((observer, id) => {
      this.disconnect(id);
    });
  }

  // Lazy loading utility for charts
  lazyLoadChart(
    chartContainer: Element,
    loadCallback: () => void,
    observerId = 'chart-loader'
  ): void {
    this.createObserver({
      rootMargin: '100px',
      threshold: 0.1
    }, observerId).subscribe(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.target === chartContainer) {
          loadCallback();
          this.unobserve(chartContainer, observerId);
        }
      });
    });

    this.observe(chartContainer, observerId);
  }

  // Progressive image loading
  lazyLoadImages(
    imageElements: Element[],
    observerId = 'image-loader'
  ): void {
    this.createObserver({
      rootMargin: '200px',
      threshold: 0.1
    }, observerId).subscribe(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.getAttribute('data-src');
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
          }
          this.unobserve(img, observerId);
        }
      });
    });

    imageElements.forEach(img => this.observe(img, observerId));
  }
}