import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../services/report.service';
import { DashboardData } from '../services/report-api.service';

@Component({
  selector: 'app-password-verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './password-verify.component.html',
  styleUrls: ['./password-verify.component.scss']
})
export class PasswordVerifyComponent {
  password = '';
  errorMsg = '';
  successMsg = '';
  isLoading = false;

  reportTitle: string | null = null;
  reportId: string | null = null;
  report: any = null;

  constructor(private router: Router, private reportService: ReportService) {
    const navigation = this.router.getCurrentNavigation();
    this.reportTitle = navigation?.extras.state?.['reportTitle'] ?? null;
    this.reportId = navigation?.extras.state?.['reportId'] ?? null;

    if (!this.reportTitle || !this.reportId) {
      this.errorMsg = 'No report specified for editing';
      setTimeout(() => this.router.navigate(['/myreport']), 2000);
      return;
    }

    this.reportService.getReportByTitle(this.reportTitle).subscribe(report => {
      if (!report) {
        this.errorMsg = 'Report not found';
        setTimeout(() => this.router.navigate(['/myreport']), 2000);
      } else {
        this.report = report;
      }
    }, error => {
      this.errorMsg = 'Error loading report';
      setTimeout(() => this.router.navigate(['/myreport']), 2000);
    });
  }

  verifyPassword() {
    if (!this.password.trim()) {
      this.errorMsg = 'Please enter a password';
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';
    this.successMsg = '';

    setTimeout(() => {
      if (this.password === this.report?.password) {
        this.successMsg = 'Password verified! Redirecting to dashboard...';

        // Check if dashboard data exists
        this.reportService.getDashboardData(this.reportId!).subscribe({
          next: (dashboardData: DashboardData) => {
            console.log('Found existing dashboard data:', dashboardData);
            // Navigate to dashboard with existing data
            this.router.navigate(['/dashboard'], {
              state: {
                isEdit: true,
                reportId: this.reportId,
                showInputForm: false,
                dashboardData: dashboardData
              }
            });
          },
          error: (error: any) => {
            console.log('No dashboard data found, showing input form');
            // If error (like 404), show input form
            this.router.navigate(['/dashboard'], {
              state: {
                isEdit: true,
                reportId: this.reportId,
                showInputForm: true
              }
            });
          }
        });
      } else {
        this.errorMsg = 'Incorrect password. Please try again.';
      }
      this.isLoading = false;
    }, 800);
  }

  cancelVerification() {
    this.router.navigate(['/myreport']);
  }
}
