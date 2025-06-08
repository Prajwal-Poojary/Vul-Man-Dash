import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../services/report.service';

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
  report: any = null;

  constructor(private router: Router, private reportService: ReportService) {
    const navigation = this.router.getCurrentNavigation();
    this.reportTitle = navigation?.extras.state?.['reportTitle'] ?? null;

    if (!this.reportTitle) {
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

        setTimeout(() => {
          this.router.navigate(['/dashboard'], {
            state: {
              reportData: {
                ...this.report,
                exposureLevel: 'Medium',
                exposureCurrent: 65,
              }
            }
          });
        }, 1500);
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
