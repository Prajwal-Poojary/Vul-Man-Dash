// src/app/pages/create-report/create-report.component.ts

import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReportService } from '../services/report.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-report.component.html',
  styleUrls: ['./create-report.component.scss']
})
export class CreateReportComponent implements OnInit {
  report = {
    title: '',
    password: '',
    confirmPassword: '',
    createdTime: new Date()
  };

  passwordStrength = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(private reportService: ReportService, private router: Router) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  checkStrength() {
    const pwd = this.report.password;
    if (pwd.length < 5) {
      this.passwordStrength = 'weak';
    } else if (/[A-Z]/.test(pwd) && /\d/.test(pwd)) {
      this.passwordStrength = 'strong';
    } else {
      this.passwordStrength = 'medium';
    }
  }

  saveReport() {
    const { title, password, confirmPassword } = this.report;

    if (!title.trim()) return alert('Title is required!');
    if (!password.trim()) return alert('Password is required!');
    if (password.length < 5) return alert('Password must be at least 5 characters!');
    if (password !== confirmPassword) return alert('Passwords do not match!');

    // Call addReport and wait for success
    this.reportService.addReport(this.report).subscribe({
      next: () => {
        alert('Report saved!');
        this.router.navigate(['/myreport']);
      },
      error: (err) => {
        console.error('Save failed', err);
        alert('Failed to save report!');
      }
    });
  }

  ngOnInit() {
    const editData = localStorage.getItem('editReport');
    if (editData) {
      this.report = JSON.parse(editData);
      localStorage.removeItem('editReport');
    }
  }
}
