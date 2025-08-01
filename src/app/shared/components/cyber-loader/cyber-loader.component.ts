import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cyber-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cyber-loader-container" [class.full-screen]="fullScreen">
      <div class="cyber-loader">
        <!-- Main Loading Animation -->
        <div class="loader-core">
          <div class="scanning-ring"></div>
          <div class="scanning-ring ring-2"></div>
          <div class="scanning-ring ring-3"></div>
          <div class="cyber-icon">
            <i class="fas fa-shield-virus"></i>
          </div>
        </div>
        
        <!-- Loading Text -->
        <div class="loading-text">
          <span class="typing-text">{{ loadingText }}</span>
          <span class="cursor">|</span>
        </div>
        
        <!-- Progress Indicator -->
        <div class="progress-container" *ngIf="showProgress">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progress"></div>
          </div>
          <div class="progress-text">{{ progress }}% COMPLETE</div>
        </div>
        
        <!-- Security Status -->
        <div class="security-status">
          <div class="status-line">
            <div class="status-dot"></div>
            <span>SECURE_CONNECTION_ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./cyber-loader.component.scss']
})
export class CyberLoaderComponent {
  @Input() loadingText: string = 'INITIALIZING_SECURE_SYSTEM';
  @Input() fullScreen: boolean = false;
  @Input() showProgress: boolean = false;
  @Input() progress: number = 0;
}