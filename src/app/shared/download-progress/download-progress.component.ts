import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-download-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="show" class="download-progress-overlay">
      <div class="download-progress-container">
        <div class="download-progress-content">
          <div class="file-icon">
            <i [class]="getFileIcon()"></i>
          </div>
          <h3>Preparing {{ fileType }} Report</h3>
          <div class="progress-wrapper">
            <div class="progress-bar">
              <div class="progress" [style.width.%]="progress">
                <div class="progress-shine"></div>
              </div>
            </div>
            <div class="progress-details">
              <span class="progress-text">{{ progress }}%</span>
              <span class="status-text">{{ getStatusText() }}</span>
            </div>
          </div>
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .download-progress-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      backdrop-filter: blur(5px);
    }

    .download-progress-container {
      background: linear-gradient(145deg, #ffffff, #f5f5f5);
      padding: 30px;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      width: 350px;
      transform: translateY(0);
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .download-progress-content {
      text-align: center;
    }

    .file-icon {
      font-size: 48px;
      margin-bottom: 20px;
      color: #2196F3;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
      }
    }

    h3 {
      margin: 0 0 25px 0;
      color: #333;
      font-size: 20px;
      font-weight: 600;
    }

    .progress-wrapper {
      margin-bottom: 20px;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background-color: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 10px;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .progress {
      height: 100%;
      background: linear-gradient(90deg, #2196F3, #4CAF50);
      border-radius: 4px;
      transition: width 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .progress-shine {
      position: absolute;
      top: 0;
      left: -100%;
      width: 50%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.4),
        transparent
      );
      animation: shine 1.5s infinite;
    }

    @keyframes shine {
      0% {
        left: -100%;
      }
      100% {
        left: 200%;
      }
    }

    .progress-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }

    .progress-text {
      font-size: 16px;
      font-weight: 600;
      color: #2196F3;
    }

    .status-text {
      font-size: 14px;
      color: #666;
    }

    .loading-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
    }

    .loading-dots span {
      width: 8px;
      height: 8px;
      background-color: #2196F3;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
    }

    .loading-dots span:nth-child(1) {
      animation-delay: -0.32s;
    }

    .loading-dots span:nth-child(2) {
      animation-delay: -0.16s;
    }

    @keyframes bounce {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }
  `]
})
export class DownloadProgressComponent {
  @Input() show = false;
  @Input() progress = 0;
  @Input() fileType = '';

  getFileIcon(): string {
    return this.fileType === 'PDF' 
      ? 'fas fa-file-pdf' 
      : 'fas fa-file-word';
  }

  getStatusText(): string {
    if (this.progress === 0) return 'Initializing...';
    if (this.progress < 25) return 'Processing content...';
    if (this.progress < 50) return 'Generating document...';
    if (this.progress < 75) return 'Finalizing...';
    if (this.progress < 100) return 'Almost done...';
    return 'Complete!';
  }
} 