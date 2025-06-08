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
    @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap');

    * {
      font-family: 'Lato', sans-serif;
    }

    a {
      text-decoration: none;
      font-size: 13px;
    }

    .two-div {
      display: flex;
      gap: 20px;
      justify-content: flex-end;
    }

    .container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 3rem 1rem;
      background-color: #f9fafb;
    }

    .card {
      width: 100%;
      max-width: 400px;
      background: #fff;
      padding: 2rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-radius: 0.5rem;
    }

    .header h2 {
      font-size: 1.875rem;
      font-weight: 800;
      color: #111827;
      margin-bottom: 0.5rem;
      text-align: center;
      font-family: 'Pacifico', cursive;
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
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1rem;
      background-color: #2563eb;
      color: white;
      font-weight: 600;
      font-size: 1rem;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .btn-submit:hover:not(:disabled) {
      background-color: #1d4ed8;
    }

    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-icon {
      position: absolute;
      left: 1rem;
      height: 1.25rem;
      width: 1.25rem;
      color: #3b82f6;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-submit:hover .btn-icon {
      color: #60a5fa;
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
      background: #1f2937;
      padding: 2rem;
      border-radius: 10px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
      text-align: center;
      max-width: 400px;
    }

    .popup-content h3 {
      margin-bottom: 0.5rem;
      color: white;
    }

    .popup-content p {
      margin-bottom: 1rem;
      color: red;
    }

    .popup-close {
      padding: 0.5rem 1rem;
      background-color: rgb(46, 59, 78);
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
    }

    .popup-close:hover {
      background-color: rgb(59, 75, 97);
    }

    /* Responsive Styles */
    @media (max-width: 600px) {
      .card {
        padding: 1.5rem 1rem;
        margin: 0 1rem;
        max-width: 100%;
        box-shadow: none;
        border-radius: 0;
      }

      .header h2 {
        font-size: 1.5rem;
      }

      .two-div {
        flex-direction: column;
        gap: 10px;
        justify-content: center;
        text-align: center;
      }

      .btn-submit {
        font-size: 0.9rem;
        padding: 0.5rem;
      }

      .btn-icon {
        left: 0.75rem;
        height: 1rem;
        width: 1rem;
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
