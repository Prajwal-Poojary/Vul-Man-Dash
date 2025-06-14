import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { InputComponent } from '../../shared/components/input/input.component';
import { PasswordStrengthComponent } from '../../shared/components/password-strength/password-strength.component';
import { passwordStrengthValidator } from '../../shared/validators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputComponent,
    PasswordStrengthComponent,
  ],
  template: `
    <div class="container">
      <div class="card">
        <div class="header">
          <h2>Register</h2>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="form">
          <div class="input-group">
            <app-input
              label="Full Name"
              type="text"
              id="name"
              controlName="name"
              [formGroup]="registerForm"
            ></app-input>

            <app-input
              label="Email"
              type="email"
              id="email"
              controlName="email"
              [formGroup]="registerForm"
            ></app-input>

            <div class="password-section">
              <app-input
                label="Password"
                type="password"
                id="password"
                controlName="password"
                [formGroup]="registerForm"
              ></app-input>

              <app-password-strength
                [password]="registerForm.get('password')?.value || ''"
              ></app-password-strength>
            </div>

            <app-input
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              controlName="confirmPassword"
              [formGroup]="registerForm"
            ></app-input>
          </div>

          <div class="two-div">
            <a routerLink="/login">Already have an account?</a>
          </div>

          <div>
            <button
              type="submit"
              [disabled]="registerForm.invalid || isLoading"
              class="btn-submit"
            >
              <span class="btn-icon" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"
                  />
                </svg>
              </span>
              {{ isLoading ? 'Registering...' : 'Register' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Popup Modal -->
    <div class="popup" *ngIf="showPopup">
      <div class="popup-content">
        <h3>Registration Failed</h3>
        <p>Something went wrong. Please try again.</p>
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
      justify-content: flex-end;
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
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  showPopup = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private alertService: AlertService,
    private router: Router
  ) {
    this.registerForm = this.fb.group(
      {
        name: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator]],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: this.passwordsMatchValidator,
      }
    );
  }

  passwordsMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;
      const { name, email, password } = this.registerForm.value;

      this.authService.register(name, email, password).subscribe({
        next: () => {
          this.isLoading = false;
          this.alertService.showSuccess('Successfully registered');
          this.router.navigate(['/login']);
        },
        error: () => {
          this.isLoading = false;
          this.showPopup = true;
        },
      });
    }
  }

  closePopup(): void {
    this.showPopup = false;
  }
}
