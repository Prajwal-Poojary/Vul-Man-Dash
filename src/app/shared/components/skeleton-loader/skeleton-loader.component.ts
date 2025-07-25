import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-container" [ngClass]="type">
      <!-- Dashboard Skeleton -->
      <div *ngIf="type === 'dashboard'" class="dashboard-skeleton">
        <div class="skeleton-header">
          <div class="skeleton-line w-60"></div>
          <div class="skeleton-line w-40"></div>
        </div>
        <div class="skeleton-stats">
          <div class="skeleton-card" *ngFor="let card of [1,2,3,4]">
            <div class="skeleton-circle"></div>
            <div class="skeleton-line w-70"></div>
            <div class="skeleton-line w-50"></div>
          </div>
        </div>
        <div class="skeleton-charts">
          <div class="skeleton-chart">
            <div class="skeleton-chart-circle"></div>
          </div>
          <div class="skeleton-chart">
            <div class="skeleton-chart-bars">
              <div class="skeleton-bar" *ngFor="let bar of [1,2,3,4,5]" [style.height.%]="getRandomHeight()"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Report List Skeleton -->
      <div *ngIf="type === 'report-list'" class="report-list-skeleton">
        <div class="skeleton-item" *ngFor="let item of [1,2,3,4,5]">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton-line w-80"></div>
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-40"></div>
          </div>
        </div>
      </div>
      
      <!-- Chart Skeleton -->
      <div *ngIf="type === 'chart'" class="chart-skeleton">
        <div class="skeleton-chart-header">
          <div class="skeleton-line w-50"></div>
          <div class="skeleton-line w-30"></div>
        </div>
        <div class="skeleton-chart-area">
          <div class="skeleton-chart-placeholder"></div>
        </div>
      </div>
      
      <!-- Form Skeleton -->
      <div *ngIf="type === 'form'" class="form-skeleton">
        <div class="skeleton-form-group" *ngFor="let group of [1,2,3,4]">
          <div class="skeleton-line w-30"></div>
          <div class="skeleton-input"></div>
        </div>
        <div class="skeleton-button"></div>
      </div>
    </div>
  `,
  styleUrls: ['./skeleton-loader.component.scss']
})
export class SkeletonLoaderComponent {
  @Input() type: 'dashboard' | 'report-list' | 'chart' | 'form' = 'dashboard';
  @Input() count: number = 1;
  
  getRandomHeight(): number {
    return Math.random() * 60 + 20; // Random height between 20% and 80%
  }
}