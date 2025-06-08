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
    @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap');

    * {
      font-family: "Lato", sans-serif;
      box-sizing: border-box;
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
      max-width: 420px;
      background: white;
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
      font-family: "Pacifico", cursive;
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

    /* Password section: column layout */
    .password-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
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

    /* Popup Styling */
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

    /* Responsive adjustments */
    @media (max-width: 480px) {
      .card {
        width: 100%;
        padding: 1.5rem;
      }

      .btn-submit {
        font-size: 0.9rem;
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
