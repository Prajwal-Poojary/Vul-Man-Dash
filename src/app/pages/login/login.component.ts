// login.component.ts
import { Component } from '@angular/core';
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
    <div class="container">
      <div class="card">
        <div class="header">
          <h2>Sign In</h2>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="form">
          <div class="input-group">
            <app-input
              label="Email"
              type="email"
              id="email"
              controlName="email"
              [formGroup]="loginForm"
            ></app-input>

            <app-input
              label="Password"
              type="password"
              id="password"
              controlName="password"
              [formGroup]="loginForm"
            ></app-input>
          </div>

          <div class="two-div">
            <a routerLink="/register">Create Account</a>
            <a routerLink="/forgot-password">Forgot Password?</a>
          </div>

          <div>
            <button
              type="submit"
              [disabled]="loginForm.invalid || isLoading"
              class="btn-submit"
            >
              <span class="btn-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
              {{ isLoading ? 'Signing in...' : 'Sign in' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Popup Modal -->
    <div class="popup" *ngIf="showPopup">
      <div class="popup-content">
        <h3>Login Failed</h3>
        <p>Invalid email or password. Please try again.</p>
        <button class="popup-close" (click)="closePopup()">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 3rem 1rem;
      background: linear-gradient(135deg, #18191a 0%, #1a1a2e 100%);
    }
    .card {
      max-width: 500px;
      width: 100%;
      background: rgba(35, 35, 35, 0.95);
      border: 1px solid rgba(41, 41, 41, 0.8);
      border-radius: 18px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      color: #e2e8f0;
      font-family: 'Inter', sans-serif;
      padding: 2.5rem 2rem 2rem 2rem;
      backdrop-filter: blur(10px);
    }
    .header h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 1.5rem;
      text-align: center;
      font-family: 'Inter', sans-serif;
      letter-spacing: -0.5px;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .btn-submit {
      width: 100%;
      padding: 0.875rem 1.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      position: relative;
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
        
        &::before {
          opacity: 1;
        }
      }
      
      &:active:not(:disabled) {
        transform: translateY(0);
      }
      
      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
      }
    }
    .two-div {
      display: flex;
      gap: 1.5rem;
      justify-content: space-between;
      margin-top: 0.5rem;
    }
    a {
      text-decoration: none;
      font-size: 0.95rem;
      color: #4cc9f0;
      font-weight: 500;
      transition: all 0.2s ease;
      
      &:hover {
        color: #4895ef;
        text-decoration: underline;
      }
    }
    .popup {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      backdrop-filter: blur(8px);
      background-color: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
    }
    .popup-content {
      background: rgba(35, 35, 35, 0.95);
      color: #fff;
      padding: 2.5rem;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 400px;
      border: 1px solid rgba(41, 41, 41, 0.8);
      backdrop-filter: blur(10px);
      
      h3 {
        margin-bottom: 1rem;
        color: #f44336;
        font-size: 1.5rem;
        font-weight: 600;
      }
      
      p {
        color: #e2e8f0;
        margin-bottom: 1.5rem;
        font-size: 1.1rem;
      }
    }
    .popup-close {
      background: linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%);
      color: #fff;
      border: none;
      border-radius: 12px;
      padding: 0.75rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
      }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  showPopup = false;

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
}
