import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-floating-shape',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="absolute opacity-70 animate-float"
      [style.top]="top"
      [style.left]="left"
      [style.width]="size"
      [style.height]="size"
      [style.background]="color"
      [style.border-radius]="borderRadius"
      [style.transform]="transform"
    ></div>
  `,
  styles: [`
    @keyframes float {
      0%, 100% {
        transform: translateY(0) rotate(0deg);
      }
      50% {
        transform: translateY(-20px) rotate(10deg);
      }
    }
    .animate-float {
      animation: float 6s ease-in-out infinite;
    }
  `]
})
export class FloatingShapeComponent {
  @Input() top = '0';
  @Input() left = '0';
  @Input() size = '100px';
  @Input() color = '#4F46E5';
  @Input() borderRadius = '50%';
  @Input() transform = 'rotate(0deg)';
} 