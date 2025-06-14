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
    .password-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
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
