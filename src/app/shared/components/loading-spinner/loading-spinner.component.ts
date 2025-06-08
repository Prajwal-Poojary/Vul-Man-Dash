import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex justify-center items-center">
      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
    </div>
  `
})
export class LoadingSpinnerComponent {} 