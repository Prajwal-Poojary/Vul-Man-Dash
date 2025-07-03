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
  errorMsg = '';
  successMsg = '';

  showPassword = false;
  showConfirmPassword = false;

  constructor(private reportService: ReportService, private router: Router) {}

  checkStrength() {
    const pwd = this.report.password;
    if (pwd.length < 5) {
      this.passwordStrength = 'weak';
    } else if (
      pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[0-9]/.test(pwd) &&
      /[^A-Za-z0-9]/.test(pwd)
    ) {
      this.passwordStrength = 'strong';
    } else {
      this.passwordStrength = 'medium';
    }
  }

  saveReport() {
    const { title, password, confirmPassword } = this.report;

    if (!title.trim()) {
      this.errorMsg = 'Title is required!';
      setTimeout(() => this.errorMsg = '', 3000);
      return;
    }
    if (!password.trim()) {
      this.errorMsg = 'Password is required!';
      setTimeout(() => this.errorMsg = '', 3000);
      return;
    }
    if (password.length < 5) {
      this.errorMsg = ' Password must be at least 5 characters!';
      setTimeout(() => this.errorMsg = '', 3000);
      return;
    }
    if (password !== confirmPassword) {
      this.errorMsg = ' Password does not match!';
      setTimeout(() => this.errorMsg = '', 3000);
      return;
    }

    // Call addReport and wait for success
    this.reportService.addReport(this.report).subscribe({
      next: () => {
        this.errorMsg = '';
        this.successMsg = ' Report saved successfully!';
        setTimeout(() => this.successMsg = '', 3000);
        this.router.navigate(['/myreport']);
      },
      error: (err) => {
        // console.error('Save failed', err);
        this.errorMsg = 'Failed to save Report!';
        setTimeout(() => this.errorMsg = '', 3000);
      }
    });
  }

  ngOnInit() {
    const editData = localStorage.getItem('editReport');
    if (editData) {
      this.report = JSON.parse(editData);
      // Remove sensitive fields if present
      if ('password' in this.report) this.report.password = '';
      if ('confirmPassword' in this.report) this.report.confirmPassword = '';
      localStorage.removeItem('editReport');
    }
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  toggleShowConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
