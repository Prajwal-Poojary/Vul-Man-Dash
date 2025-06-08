import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="mb-4" style="font-family: Pacifico, cursive;">
      <label [for]="id" class="block" style="color:black;">
        {{ label }}
      </label><br>
      <input
        [type]="type"
        [id]="id"
        [formControl]="$any(formGroup.get(controlName))"
        class="block" style="width:100%;padding:6px; border-radius:5px; border:1px solid gray;"
        [class.border-red-500]="formGroup.get(controlName)?.invalid && formGroup.get(controlName)?.touched"
      />
      <div 
        *ngIf="formGroup.get(controlName)?.invalid && formGroup.get(controlName)?.touched"
        class="mt-1 text-sm text-red-600"
      >
        <div *ngIf="formGroup.get(controlName)?.errors?.['required']" style="color:#ff0000;">
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
  `
})
export class InputComponent {
  @Input() label = '';
  @Input() type = 'text';
  @Input() id = '';
  @Input() controlName = '';
  @Input() formGroup!: FormGroup;
} 