import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { InputComponent } from '../../shared/components/input/input.component';
import { PasswordStrengthComponent } from '../../shared/components/password-strength/password-strength.component';
import { passwordStrengthValidator } from '../../shared/validators';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputComponent, PasswordStrengthComponent],
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
        <div class="security-icon refresh" [style.animation-delay]="'1s'">
          <i class="fas fa-sync-alt"></i>
        </div>
      </div>

      <!-- Main Reset Password Card -->
      <div class="cyber-card" [class.loading]="isLoading">
        <!-- Header Section -->
        <div class="card-header">
          <div class="security-badge">
            <i class="fas fa-unlock-alt"></i>
            <div class="pulse-ring"></div>
          </div>
          <h1 class="terminal-title">
            <span class="typing-text">RESET_ACCESS</span>
            <span class="cursor">|</span>
          </h1>
          <p class="subtitle">Password Recovery Protocol</p>
          <div class="status-line">
            <span class="status-indicator"></span>
            <span class="status-text">SECURITY_RESET_MODE</span>
          </div>
        </div>

        <!-- Reset Password Form -->
        <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()" class="cyber-form">
          <div class="terminal-section">
            <div class="section-header">
              <i class="fas fa-terminal"></i>
              <span>NEW_CREDENTIALS</span>
            </div>
            
            <div class="input-grid">
              <div class="input-container password-section">
                <div class="input-label">
                  <i class="fas fa-shield-alt"></i>
                  <span>NEW_SECURE_PASSWORD</span>
                </div>
                <app-input
                  label=""
                  type="password"
                  id="password"
                  controlName="password"
                  [formGroup]="resetPasswordForm"
                ></app-input>
                
                <!-- Password Strength Indicator -->
                <div class="password-strength-wrapper">
                  <app-password-strength
                    [password]="resetPasswordForm.get('password')?.value || ''"
                  ></app-password-strength>
                </div>
              </div>

              <div class="input-container">
                <div class="input-label">
                  <i class="fas fa-lock"></i>
                  <span>CONFIRM_PASSWORD</span>
                </div>
                <app-input
                  label=""
                  type="password"
                  id="confirmPassword"
                  controlName="confirmPassword"
                  [formGroup]="resetPasswordForm"
                ></app-input>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-section">
            <button
              type="submit"
              [disabled]="resetPasswordForm.invalid || isLoading"
              class="cyber-button primary"
            >
              <div class="button-content">
                <i class="fas fa-sync-alt button-icon"></i>
                <span class="button-text">
                  {{ isLoading ? 'PROCESSING...' : 'INITIALIZE_RESET' }}
                </span>
                <div class="button-scanner" *ngIf="isLoading"></div>
              </div>
              <div class="button-glow"></div>
            </button>

            <div class="secondary-actions">
              <a routerLink="/login" class="cyber-link">
                <i class="fas fa-arrow-left"></i>
                <span>RETURN_TO_LOGIN</span>
              </a>
            </div>
          </div>
        </form>

        <!-- Security Footer -->
        <div class="security-footer">
          <div class="encryption-status">
            <i class="fas fa-shield-virus"></i>
            <span>SECURE_RESET_PROTOCOL</span>
          </div>
          <div class="threat-level">
            <span class="threat-indicator low"></span>
            <span>THREAT_LEVEL: LOW</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit, AfterViewInit, OnDestroy {
  resetPasswordForm: FormGroup;
  isLoading = false;
  token: string | null = null;
  
  // Matrix animation properties
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?';
  private matrix: any[] = [];
  private animationId!: number;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.alertService.showError('Invalid or missing reset token');
      this.router.navigate(['/login']);
    }
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

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid && this.token) {
      this.isLoading = true;
      const { password } = this.resetPasswordForm.value;

      this.authService.resetPassword(this.token, password).subscribe({
        next: () => {
          this.alertService.showSuccess('Password has been reset successfully');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.alertService.showError(error.error.message || 'Failed to reset password');
          this.isLoading = false;
        }
      });
    } else {
      Object.keys(this.resetPasswordForm.controls).forEach(key => {
        const control = this.resetPasswordForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', () => {});
  }
}
