// login.component.ts
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { InputComponent } from '../../shared/components/input/input.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputComponent],
  template: `
    <div class="cyber-container">
      <!-- Animated Background -->
      <div class="matrix-bg">
        <canvas #matrixCanvas class="matrix-canvas"></canvas>
        <div class="cyber-grid"></div>
        <div class="gradient-overlay"></div>
      </div>

      <!-- Floating Security Elements -->
      <div class="security-elements">
        <div class="security-icon shield" [style.animation-delay]="'0s'">
          <i class="fas fa-shield-alt"></i>
        </div>
        <div class="security-icon lock" [style.animation-delay]="'2s'">
          <i class="fas fa-lock"></i>
        </div>
        <div class="security-icon key" [style.animation-delay]="'4s'">
          <i class="fas fa-key"></i>
        </div>
        <div class="security-icon fingerprint" [style.animation-delay]="'1s'">
          <i class="fas fa-fingerprint"></i>
        </div>
      </div>

      <!-- Main Login Card -->
      <div class="cyber-card" [class.loading]="isLoading">
        <!-- Header Section -->
        <div class="card-header">
          <div class="security-badge">
            <i class="fas fa-shield-virus"></i>
            <div class="pulse-ring"></div>
          </div>
          <h1 class="terminal-title">
            <span class="typing-text">SECURE_ACCESS</span>
            <span class="cursor">|</span>
          </h1>
          <p class="subtitle">Cybersecurity Vulnerability Assessment Portal</p>
          <div class="status-line">
            <span class="status-indicator"></span>
            <span class="status-text">AUTHENTICATION_REQUIRED</span>
          </div>
        </div>

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="cyber-form">
          <div class="terminal-section">
            <div class="section-header">
              <i class="fas fa-terminal"></i>
              <span>LOGIN_CREDENTIALS</span>
            </div>
            
            <div class="input-grid">
              <div class="input-container">
                <div class="input-label">
                  <i class="fas fa-envelope"></i>
                  <span>EMAIL_ADDRESS</span>
                </div>
                <app-input
                  label=""
                  type="email"
                  id="email"
                  controlName="email"
                  [formGroup]="loginForm"
                ></app-input>
              </div>

              <div class="input-container">
                <div class="input-label">
                  <i class="fas fa-key"></i>
                  <span>SECURE_PASSWORD</span>
                </div>
                <app-input
                  label=""
                  type="password"
                  id="password"
                  controlName="password"
                  [formGroup]="loginForm"
                ></app-input>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-section">
            <button
              type="submit"
              [disabled]="loginForm.invalid || isLoading"
              class="cyber-button primary"
            >
              <div class="button-content">
                <i class="fas fa-sign-in-alt button-icon"></i>
                <span class="button-text">
                  {{ isLoading ? 'AUTHENTICATING...' : 'INITIALIZE_LOGIN' }}
                </span>
                <div class="button-scanner" *ngIf="isLoading"></div>
              </div>
              <div class="button-glow"></div>
            </button>

            <div class="secondary-actions">
              <a routerLink="/register" class="cyber-link">
                <i class="fas fa-user-plus"></i>
                <span>CREATE_ACCOUNT</span>
              </a>
              <a routerLink="/forgot-password" class="cyber-link">
                <i class="fas fa-unlock-alt"></i>
                <span>RECOVER_ACCESS</span>
              </a>
            </div>
          </div>
        </form>

        <!-- Security Footer -->
        <div class="security-footer">
          <div class="encryption-status">
            <i class="fas fa-lock"></i>
            <span>256-BIT_ENCRYPTION_ACTIVE</span>
          </div>
          <div class="threat-level">
            <span class="threat-indicator low"></span>
            <span>THREAT_LEVEL: LOW</span>
          </div>
        </div>
      </div>

      <!-- Enhanced Error Modal -->
      <div class="cyber-modal" *ngIf="showPopup" (click)="closePopup()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>AUTHENTICATION_FAILED</h3>
          </div>
          <div class="modal-body">
            <p>INVALID_CREDENTIALS_DETECTED</p>
            <div class="error-code">ERROR_CODE: AUTH_001</div>
          </div>
          <div class="modal-actions">
            <button class="cyber-button secondary" (click)="closePopup()">
              <span>ACKNOWLEDGE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  loginForm: FormGroup;
  isLoading = false;
  showPopup = false;
  
  // Matrix animation properties
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?';
  private matrix: any[] = [];
  private animationId!: number;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private alertService: AlertService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit(): void {
    this.initMatrixAnimation();
  }

  private initMatrixAnimation(): void {
    this.canvas = document.querySelector('.matrix-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    this.createMatrixDrops();
    this.animateMatrix();

    // Handle window resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.createMatrixDrops();
    });
  }

  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private createMatrixDrops(): void {
    const columns = Math.floor(this.canvas.width / 20);
    this.matrix = [];

    for (let i = 0; i < columns; i++) {
      this.matrix[i] = {
        y: Math.random() * this.canvas.height,
        speed: Math.random() * 3 + 1
      };
    }
  }

  private animateMatrix(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#0f4c75';
    this.ctx.font = '15px monospace';

    for (let i = 0; i < this.matrix.length; i++) {
      const char = this.characters.charAt(Math.floor(Math.random() * this.characters.length));
      const x = i * 20;
      const y = this.matrix[i].y;

      this.ctx.fillText(char, x, y);

      if (y > this.canvas.height && Math.random() > 0.975) {
        this.matrix[i].y = 0;
      }

      this.matrix[i].y += this.matrix[i].speed;
    }

    this.animationId = requestAnimationFrame(() => this.animateMatrix());
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.alertService.showSuccess('Successfully logged in');
        this.router.navigate(['/myreport']);
      },
      error: () => {
        this.isLoading = false;
        this.showPopup = true;
      }
    });
  }

  closePopup(): void {
    this.showPopup = false;
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', () => {});
  }
}
