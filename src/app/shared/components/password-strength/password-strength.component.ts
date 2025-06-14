import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getPasswordStrength, PasswordStrength } from '../../validators';

@Component({
  selector: 'app-password-strength',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="password-strength">
      <div class="strength-bar">
        <div class="strength-segments">
          <div class="segment" [class.active]="strength.score >= 1" [style.background-color]="getSegmentColor(0)"></div>
          <div class="segment" [class.active]="strength.score >= 2" [style.background-color]="getSegmentColor(1)"></div>
          <div class="segment" [class.active]="strength.score >= 3" [style.background-color]="getSegmentColor(2)"></div>
          <div class="segment" [class.active]="strength.score >= 4" [style.background-color]="getSegmentColor(3)"></div>
          <div class="segment" [class.active]="strength.score >= 5" [style.background-color]="getSegmentColor(4)"></div>
        </div>
        <div class="strength-label" [style.color]="strength.color">
          {{ strength.message }}
        </div>
      </div>
      
      <div class="requirements">
        <div class="requirement" [class.met]="strength.hasMinLength" [style.--requirement-color]="strength.hasMinLength ? '#16a34a' : '#94a3b8'">
          <span class="requirement-icon">{{ strength.hasMinLength ? '✓' : '○' }}</span>
          <span class="requirement-text">At least 8 characters</span>
        </div>
        <div class="requirement" [class.met]="strength.hasUpperCase" [style.--requirement-color]="strength.hasUpperCase ? '#0284c7' : '#94a3b8'">
          <span class="requirement-icon">{{ strength.hasUpperCase ? '✓' : '○' }}</span>
          <span class="requirement-text">One uppercase letter</span>
        </div>
        <div class="requirement" [class.met]="strength.hasLowerCase" [style.--requirement-color]="strength.hasLowerCase ? '#0f766e' : '#94a3b8'">
          <span class="requirement-icon">{{ strength.hasLowerCase ? '✓' : '○' }}</span>
          <span class="requirement-text">One lowercase letter</span>
        </div>
        <div class="requirement" [class.met]="strength.hasNumeric" [style.--requirement-color]="strength.hasNumeric ? '#16a34a' : '#94a3b8'">
          <span class="requirement-icon">{{ strength.hasNumeric ? '✓' : '○' }}</span>
          <span class="requirement-text">One number</span>
        </div>
        <div class="requirement" [class.met]="strength.hasSpecialChar" [style.--requirement-color]="strength.hasSpecialChar ? '#0284c7' : '#94a3b8'">
          <span class="requirement-icon">{{ strength.hasSpecialChar ? '✓' : '○' }}</span>
          <span class="requirement-text">One special character</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .password-strength {
      margin-top: 0.75rem;
      font-family: 'Inter', sans-serif;
    }

    .strength-bar {
      margin-bottom: 1.25rem;
    }

    .strength-segments {
      display: flex;
      gap: 6px;
      margin-bottom: 0.75rem;
      padding: 2px;
      background: rgba(45, 55, 72, 0.2);
      border-radius: 6px;
    }

    .segment {
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background-color: rgba(45, 55, 72, 0.5);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      
      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      &.active {
        transform: scaleY(1.2);
        box-shadow: 0 0 8px rgba(255,255,255,0.1);
        
        &::after {
          opacity: 1;
        }
      }
    }

    .strength-label {
      font-size: 0.875rem;
      font-weight: 600;
      text-align: right;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .requirements {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      padding: 1rem;
      background: rgba(45, 55, 72, 0.2);
      border-radius: 10px;
      font-size: 0.875rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(8px);
    }

    .requirement {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--requirement-color, #94a3b8);
      transition: all 0.3s ease;
      padding: 0.25rem 0;

      &.met {
        color: var(--requirement-color);
      }
    }

    .requirement-icon {
      font-size: 1.125rem;
      line-height: 1;
      width: 1.25rem;
      height: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(45, 55, 72, 0.3);
      transition: all 0.3s ease;
      color: var(--requirement-color, #94a3b8);

      .met & {
        background: color-mix(in srgb, var(--requirement-color) 20%, transparent);
      }
    }

    .requirement-text {
      font-weight: 500;
      letter-spacing: 0.3px;
    }
  `]
})
export class PasswordStrengthComponent implements OnChanges {
  @Input() password: string = '';
  strength: PasswordStrength = getPasswordStrength('');

  ngOnChanges(): void {
    this.strength = getPasswordStrength(this.password);
  }

  getSegmentColor(index: number): string {
    if (index < this.strength.score) {
      return this.strength.color;
    }
    return '#2d3748';
  }
} 