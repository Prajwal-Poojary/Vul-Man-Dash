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
      background: #18191a;
    }
    .card {
      max-width: 500px;
      width: 100%;
      background: #232323;
      border: 1.5px solid #292929;
      border-radius: 18px;
      box-shadow: 0 4px 24px 0 rgba(0,0,0,0.18);
      color: #e2e8f0;
      font-family: 'Inter', sans-serif;
      padding: 2.5rem 2rem 2rem 2rem;
    }
    .header h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 0.5rem;
      text-align: center;
      font-family: 'Inter', sans-serif;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-left: 0;
    }
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .btn-submit {
      width: 100%;
      padding: 0.875rem 1.5rem;
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
      background: #4361ee;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.3s, color 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.2s, border-radius 0.3s;
      margin-top: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn-submit:hover:not(:disabled) {
      background: #2746b2;
      border-radius: 24px;
      box-shadow: 0 2px 8px 0 rgba(67, 97, 238, 0.18);
      transform: translateY(-2px);
    }
    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .two-div {
      display: flex;
      gap: 20px;
      justify-content: flex-end;
    }
    a {
      text-decoration: none;
      font-size: 13px;
      color: #4cc9f0;
      transition: color 0.2s;
    }
    a:hover {
      color: #4895ef;
    }
    .popup {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      backdrop-filter: blur(5px);
      background-color: rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
    }
    .popup-content {
      background: #232323;
      color: #fff;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
      text-align: center;
      max-width: 400px;
    }
    .popup-content h3 {
      margin-bottom: 0.5rem;
      color: #f44336;
    }
    .popup-close {
      margin-top: 1rem;
      background: #4361ee;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 0.5rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .popup-close:hover {
      background: #2746b2;
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
