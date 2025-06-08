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
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
    *{
    font-family: 'Lato', sans-serif;
    }
      :host {
        display: block;
        min-height: 100vh;
        background-color: #f9fafb;
        font-family: Arial, sans-serif;
      }
        
      .container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
      }
      .card {
        max-width: 400px;
        width: 100%;
        background: white;
        padding: 2rem;
        border-radius: 0.5rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }
      h2 {
        margin: 0;
        font-size: 1.875rem;
        font-weight: 800;
        color: #111827;
        text-align: center;
        font-family: 'Pacifico', cursive;
      }
      p {
        margin: 0;
        margin-top: 0.5rem;
        font-size: 0.875rem;
        color: #6b7280;
        text-align: center;

      }
      form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .button {
        position: relative;
        display: flex;
        justify-content: center;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: white;
        background-color: #2563eb; /* blue-600 */
        cursor: pointer;
        transition: background-color 0.3s ease;
        width: 100%;
      }
      .button:hover:not(:disabled) {
        background-color: #1e40af; /* blue-700 */
      }
      .button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .footer-text {
        font-size: 0.875rem;
        text-align: center;
        color: #374151;
      }
      .footer-text a {
        color: #2563eb;
        font-weight: 600;
        text-decoration: none;
      }
      .footer-text a:hover {
        color: #1e40af;
        text-decoration: underline;
      }
    </style>

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
  `
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
