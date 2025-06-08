import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getPasswordStrength, PasswordStrength } from '../../validators';

@Component({
  selector: 'app-password-strength',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-1">
      <div class="flex mb-1">
        <div class="w-1/5 h-1 rounded-l-full" [style.background-color]="getSegmentColor(0)"></div>
        <div class="w-1/5 h-1" [style.background-color]="getSegmentColor(1)"></div>
        <div class="w-1/5 h-1" [style.background-color]="getSegmentColor(2)"></div>
        <div class="w-1/5 h-1" [style.background-color]="getSegmentColor(3)"></div>
        <div class="w-1/5 h-1 rounded-r-full" [style.background-color]="getSegmentColor(4)"></div>
      </div>
      <div class="text-sm" style="border-radius:30px; width:15px; height:15px;" [style.background-color]="strength.color" >
        
      </div>
     
    </div>
  `
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
    return '#e2e8f0'; // gray-200
  }
} 