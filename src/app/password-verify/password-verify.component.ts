import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../services/report.service';
import { DashboardData } from '../services/report.service';

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
  deleteIntent: boolean = false;

  showPassword = false;

  constructor(private router: Router, private reportService: ReportService) {
    const navigation = this.router.getCurrentNavigation();
    this.reportTitle = navigation?.extras.state?.['reportTitle'] ?? null;
    this.reportId = navigation?.extras.state?.['reportId'] ?? null;
    this.deleteIntent = navigation?.extras.state?.['deleteIntent'] ?? false;

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
      setTimeout(() => this.errorMsg = '', 3000);
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';
    this.successMsg = '';

    // Use backend API for password verification
    this.reportService.verifyReportPassword({
      id: this.reportId!,
      password: this.password
    }).subscribe({
      next: (result) => {
        if (result.success) {
          if (this.deleteIntent) {
            // Delete the report after password verification
            this.reportService.deleteReport(this.reportId!).subscribe({
              next: () => {
                this.successMsg = 'Report deleted! Redirecting...';
                setTimeout(() => this.router.navigate(['/myreport']), 1200);
              },
              error: () => {
                this.errorMsg = 'Failed to delete report';
                setTimeout(() => this.errorMsg = '', 3000);
              }
            });
            this.isLoading = false;
            return;
          }
          this.successMsg = 'Password verified! Redirecting to dashboard...';
          setTimeout(() => this.successMsg = '', 3000);

          // Check if dashboard data exists
          this.reportService.getDashboardData(this.reportId!).subscribe({
            next: (report: any) => {
              if (report.dashboardData && Object.keys(report.dashboardData).length > 0) {
                this.report = report;
              } else {
                this.router.navigate(['/dashboard'], {
                  state: {
                    isEdit: true,
                    reportId: this.reportId,
                    showInputForm: true
                  }
                });
              }
            },
            error: (error: any) => {
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
          setTimeout(() => this.errorMsg = '', 3000);
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'Verification failed. Please try again.';
        setTimeout(() => this.errorMsg = '', 3000);
        this.isLoading = false;
      }
    });
  }

  cancelVerification() {
    this.router.navigate(['/myreport']);
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }
}
