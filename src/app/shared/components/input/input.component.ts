import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="form-group">
      <label [for]="id" class="form-label">
        {{ label }}
      </label>
      <div class="input-wrapper">
        <input
          [type]="type === 'password' ? (showPassword ? 'text' : 'password') : type"
          [id]="id"
          [formControl]="$any(formGroup.get(controlName))"
          class="form-input"
          [class.input-error]="formGroup.get(controlName)?.invalid && formGroup.get(controlName)?.touched"
          [class.has-value]="formGroup.get(controlName)?.value"
        />
        <button 
          *ngIf="type === 'password'"
          type="button"
          class="toggle-password"
          (click)="togglePasswordVisibility()"
          [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"
          [class.active]="showPassword"
        >
          <div class="icon-wrapper">
            <svg 
              *ngIf="!showPassword" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              class="eye-icon"
            >
              <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
              <path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
            </svg>
            <svg 
              *ngIf="showPassword" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              class="eye-icon"
            >
              <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
            </svg>
          </div>
        </button>
      </div>
      <div 
        *ngIf="formGroup.get(controlName)?.invalid && formGroup.get(controlName)?.touched"
        class="error-message"
      >
        <div *ngIf="formGroup.get(controlName)?.errors?.['required']">
          {{ label }} is required
        </div>
        <div *ngIf="formGroup.get(controlName)?.errors?.['email']">
          Please enter a valid email
        </div>
        <div *ngIf="formGroup.get(controlName)?.errors?.['minlength']">
          {{ label }} must be at least {{ formGroup.get(controlName)?.errors?.['minlength'].requiredLength }} characters
        </div>
        <div *ngIf="formGroup.get(controlName)?.errors?.['mismatch']">
          Passwords do not match
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-group {
      margin-bottom: 1.5rem;
      position: relative;
    }
    
    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      color: #e2e8f0;
      font-weight: 500;
      font-size: 0.95rem;
      font-family: 'Inter', sans-serif;
      transition: all 0.2s ease;
    }
    
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .form-input {
      width: 100%;
      padding: 0.875rem 1rem;
      padding-right: 2.75rem;
      background-color: rgba(255, 255, 255, 0.05);
      border: 1px solid #2d3748;
      border-radius: 10px;
      color: #e2e8f0;
      font-size: 1rem;
      font-family: 'Inter', sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      
      &::placeholder {
        color: #a0aec0;
        opacity: 1;
      }
      
      &:hover {
        background-color: rgba(255, 255, 255, 0.08);
        border-color: #4a5568;
      }
      
      &:focus {
        outline: none;
        border-color: #4361ee;
        box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.2);
        background-color: rgba(255, 255, 255, 0.08);
      }
      
      &.input-error {
        border-color: #f44336;
        background-color: rgba(244, 67, 54, 0.05);
        
        &:focus {
          box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2);
        }
      }

      &.has-value {
        border-color: #4a5568;
      }
    }

    .toggle-password {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      padding: 0.375rem;
      color: #64748b;
      cursor: pointer;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 2;

      .icon-wrapper {
        position: relative;
        width: 1.25rem;
        height: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;

        &::after {
          content: '';
          position: absolute;
          width: 1.5rem;
          height: 1.5px;
          background-color: #64748b;
          transform: rotate(45deg) scale(0);
          transition: transform 0.2s ease, opacity 0.2s ease;
          opacity: 0;
          top: 50%;
          left: 50%;
          margin-left: -0.75rem;
          margin-top: -0.75px;
        }
      }

      &:hover {
        color: #94a3b8;
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-50%) scale(1.05);

        &:not(.active) .icon-wrapper::after {
          transform: rotate(45deg) scale(1);
          opacity: 1;
        }
      }

      &:active {
        transform: translateY(-50%) scale(0.95);
      }

      &:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(100, 116, 139, 0.2);
      }

      &.active {
        color: #94a3b8;
        
        .icon-wrapper {
          transform: scale(1.1);

          &::after {
            transform: rotate(45deg) scale(0);
            opacity: 0;
          }
        }
      }
    }

    .eye-icon {
      width: 1.25rem;
      height: 1.25rem;
      transition: all 0.2s ease;
      opacity: 0.9;
    }
    
    .error-message {
      margin-top: 0.5rem;
      color: #f44336;
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      animation: slideDown 0.2s ease;

      &::before {
        content: '!';
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1rem;
        height: 1rem;
        background-color: #f44336;
        color: white;
        border-radius: 50%;
        font-size: 0.75rem;
        font-weight: 600;
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class InputComponent {
  @Input() label = '';
  @Input() type = 'text';
  @Input() id = '';
  @Input() controlName = '';
  @Input() formGroup!: FormGroup;
  showPassword = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
} 