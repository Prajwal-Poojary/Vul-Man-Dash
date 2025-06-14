import { Component, OnInit } from '@angular/core';
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
    <div class="container">
      <div class="card">
        <div class="header">
          <h2>Set new password</h2>
          <p>Please enter your new password below.</p>
        </div>
        <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()" class="form">
          <div class="input-group">
            <div class="password-field">
              <app-input
                label="New Password"
                type="password"
                id="password"
                controlName="password"
                [formGroup]="resetPasswordForm"
              ></app-input>
              <app-password-strength [password]="resetPasswordForm.get('password')?.value || ''"></app-password-strength>
            </div>
            <app-input
              label="Confirm New Password"
              type="password"
              id="confirmPassword"
              controlName="confirmPassword"
              [formGroup]="resetPasswordForm"
            ></app-input>
          </div>

          <button type="submit" [disabled]="resetPasswordForm.invalid || isLoading" class="btn-submit">
            <span class="icon-lock" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
            </span>
            {{ isLoading ? 'Resetting...' : 'Reset password' }}
          </button>

          <div class="back-to-login">
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
    .header p {
      margin: 0 0 1.5rem;
      font-size: 0.98rem;
      color: #a0aec0;
      text-align: center;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .password-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
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
    .icon-lock {
      position: absolute;
      left: 1rem;
      height: 1.25rem;
      width: 1.25rem;
      color: #3b82f6; /* blue-500 */
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .back-to-login {
      text-align: center;
      font-size: 0.98rem;
      color: #a0aec0;
    }
    .back-to-login a {
      color: #4cc9f0;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.2s;
    }
    .back-to-login a:hover {
      color: #4895ef;
      text-decoration: underline;
    }
  `],
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  isLoading = false;
  token: string | null = null;

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
}
