import { AbstractControl, ValidationErrors } from '@angular/forms';

export interface PasswordStrength {
  score: number;
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumeric: boolean;
  hasSpecialChar: boolean;
  message: string;
  color: string;
}

export function getPasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumeric = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUpperCase) score++;
  if (hasLowerCase) score++;
  if (hasNumeric) score++;
  if (hasSpecialChar) score++;

  let message: string;
  let color: string;

  switch (score) {
    case 0:
      message = 'Very Weak';
      color = '#dc2626'; // Professional red
      break;
    case 1:
      message = 'Weak';
      color = '#ea580c'; // Professional orange
      break;
    case 2:
      message = 'Fair';
      color = '#d97706'; // Professional amber
      break;
    case 3:
      message = 'Good';
      color = '#16a34a'; // Professional green
      break;
    case 4:
      message = 'Strong';
      color = '#0284c7'; // Professional blue
      break;
    case 5:
      message = 'Very Strong';
      color = '#0f766e'; // Professional teal
      break;
    default:
      message = 'Very Weak';
      color = '#dc2626';
  }

  return {
    score,
    hasMinLength,
    hasUpperCase,
    hasLowerCase,
    hasNumeric,
    hasSpecialChar,
    message,
    color
  };
}

export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value;

  if (!value) {
    return null;
  }

  const strength = getPasswordStrength(value);
  const errors: ValidationErrors = {};

  if (!strength.hasMinLength) {
    errors['minlength'] = { requiredLength: 8, actualLength: value.length };
  }
  if (!strength.hasUpperCase) {
    errors['noUpperCase'] = true;
  }
  if (!strength.hasLowerCase) {
    errors['noLowerCase'] = true;
  }
  if (!strength.hasNumeric) {
    errors['noNumeric'] = true;
  }
  if (!strength.hasSpecialChar) {
    errors['noSpecialChar'] = true;
  }

  if (strength.score < 3) {
    errors['weakPassword'] = {
      message: strength.message,
      score: strength.score,
      color: strength.color
    };
  }

  return Object.keys(errors).length ? errors : null;
} 