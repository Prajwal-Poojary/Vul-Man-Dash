import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Alert {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertSubject = new BehaviorSubject<Alert | null>(null);
  alert$: Observable<Alert | null> = this.alertSubject.asObservable();

  showSuccess(message: string): void {
    this.show('success', message);
  }

  showError(message: string): void {
    this.show('error', message);
  }

  showInfo(message: string): void {
    this.show('info', message);
  }

  showWarning(message: string): void {
    this.show('warning', message);
  }

  private show(type: Alert['type'], message: string): void {
    this.alertSubject.next({ type, message });
    setTimeout(() => {
      this.alertSubject.next(null);
    }, 5000);
  }
} 