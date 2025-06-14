import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { InputComponent } from '../../shared/components/input/input.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputComponent
  ],
  template: `
    <div class="container">
      <div class="card">
        <div>
          <h2>Reset your password</h2>
          <p>Enter your email address and we'll send you a link to reset your password.</p>
        </div>
        <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()">
          <app-input
            label="Email address"
            type="email"
            id="email"
            controlName="email"
            [formGroup]="forgotPasswordForm"
          ></app-input>

          <button
            type="submit"
            [disabled]="forgotPasswordForm.invalid || isLoading"
            class="button"
          >
            {{ isLoading ? 'Sending reset link...' : 'Send reset link' }}
          </button>

          <div class="footer-text">
            <a routerLink="/login">Back to login</a>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
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
    h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 0.5rem;
      text-align: center;
      font-family: 'Inter', sans-serif;
    }
    p {
      margin: 0;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #a0aec0;
      text-align: center;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .button {
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
    .button:hover:not(:disabled) {
      background: #2746b2;
      border-radius: 24px;
      box-shadow: 0 2px 8px 0 rgba(67, 97, 238, 0.18);
      transform: translateY(-2px);
    }
    .button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .footer-text {
      font-size: 0.875rem;
      text-align: center;
      color: #a0aec0;
    }
    .footer-text a {
      color: #4cc9f0;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.2s;
    }
    .footer-text a:hover {
      color: #4895ef;
      text-decoration: underline;
    }
  `]
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      const { email } = this.forgotPasswordForm.value;

      this.authService.forgotPassword(email).subscribe({
        next: (response) => {
          this.alertService.showSuccess(response.message);
          this.isLoading = false;
        },
        error: (error) => {
          this.alertService.showError(error.error.message || 'Failed to send reset link');
          this.isLoading = false;
        }
      });
    } else {
      Object.keys(this.forgotPasswordForm.controls).forEach(key => {
        const control = this.forgotPasswordForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
    }
  }
}
