import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})
export class ReportComponent {
   reAssessmentOption: 'date' | 'na' = 'date'; 
  logoDataURL = '';
  reportVisible = false;
  dropdownOpen = false;
  dashboardData: any;
  private readonly apiUrl = 'http://localhost:5001/api/report';

  // Chart instances for report
  private reportSeverityChart?: Chart;
  private reportTrendChart?: Chart;
  private reportRemediationChart?: Chart;

  manifestTypes = [
    'Web Application',
    'API',
    'Network',
    'Mobile Application',
    'Cloud Infrastructure'
  ];

  selectedManifestType = '';

  findings = [
    { slno: 1, vuln: 'SQL Injection', scope: 'Login Page', severity: 'High', status: 'Fixed' },
    { slno: 2, vuln: 'XSS', scope: 'Dashboard', severity: 'Medium', status: 'Not Fixed' }
  ];

  form = {
    logoName: '',
    client: '',
    reportDate: new Date().toISOString().split('T')[0],
    auditType: '',
    reportType: '',
    scope: '',
    period: '',
    summary: '',
    manifest: {
      appName: '',
      testerName: '',
      docVersion: '',
      initDate: '',
      reDate: '',
      toolsUsed: '',
      scope: '',
      description: ''
    }
  };
  onReAssessmentChange() {
    if (this.reAssessmentOption === 'na') {
      // Clear the date value or set it to null/empty
       this.form.manifest.reDate = '';

    }
  }

  constructor(private router: Router, private http: HttpClient) {
    Chart.register(...registerables);
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.dashboardData = navigation.extras.state['reportData'];
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.download-dropdown')) {
      this.dropdownOpen = false;
    }
  }

  handleLogoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.logoDataURL = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  onManifestSelect() {
    if (!this.selectedManifestType) {
      this.form.manifest = {
        appName: '',
        testerName: '',
        docVersion: '',
        initDate: '',
        reDate: '',
        toolsUsed: '',
        scope: '',
        description: ''
      };
    }
  }

  addFinding() {
    const newSlno = this.findings.length + 1;
    this.findings.push({
      slno: newSlno,
      vuln: '',
      scope: '',
      severity: 'Medium',
      status: 'Not Fixed'
    });
  }

  generateReport() {
    this.reportVisible = true;
    this.dropdownOpen = false;
    setTimeout(() => this.createReportCharts(), 100);
  }

  editReport() {
    this.reportVisible = false;
    this.dropdownOpen = false;
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  private createReportCharts() {
    if (!this.dashboardData) return;

    this.createReportSeverityChart();
    this.createReportTrendChart();
    this.createReportRemediationChart();
  }

  private createReportSeverityChart() {
    const ctx = document.getElementById('reportSeverityChart') as HTMLCanvasElement;
    if (!ctx) return;

    const data = this.dashboardData.dashboardData;
    this.reportSeverityChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low', 'Informative'],
        datasets: [{
          data: [
            data.sevCritical,
            data.sevHigh,
            data.sevMedium,
            data.sevLow,
            data.sevInformative
          ],
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  private createReportTrendChart() {
    const ctx = document.getElementById('reportTrendChart') as HTMLCanvasElement;
    if (!ctx) return;

    const trendData = this.dashboardData.dashboardData.trendData.split(',').map(Number);
    this.reportTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trendData.map((_: number, i: number) => `Month ${i + 1}`),
        datasets: [{
          label: 'Vulnerabilities',
          data: trendData,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  private createReportRemediationChart() {
    const ctx = document.getElementById('reportRemediationChart') as HTMLCanvasElement;
    if (!ctx) return;

    const data = this.dashboardData.dashboardData;
    const areas = data.remediationAreas.split(',');
    const completed = data.remediationCompleted.split(',').map(Number);
    const pending = data.remediationPending.split(',').map(Number);

    this.reportRemediationChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: areas,
        datasets: [
          {
            label: 'Completed',
            data: completed,
            backgroundColor: 'rgba(75, 192, 192, 0.8)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Pending',
            data: pending,
            backgroundColor: 'rgba(255, 99, 132, 0.8)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          x: {
            stacked: false,
          },
          y: {
            stacked: false,
            beginAtZero: true
          }
        }
      }
    });
  }

  private validatePassword(password: string | null, confirmPassword: string | null): password is string {
    if (!password || password.length < 6) {
      alert('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return false;
    }
    return true;
  }

  private createDocxDocument() {
    const severityStyles: Record<string, { color: string, bold?: boolean }> = {
      'Critical': { color: 'd32f2f', bold: true },
      'High': { color: 'f57c00', bold: true },
      'Medium': { color: 'ffa000', bold: true },
      'Low': { color: '689f38', bold: true }
    };

    const children = [
      new Paragraph({
        children: [
          new TextRun({
            text: this.form.logoName,
            bold: true,
            size: 28,
            color: '2c3e50'
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
        alignment: 'center'
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Prepared for: ${this.form.client}`,
            size: 22
          })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Report Date: ${new Date(this.form.reportDate).toLocaleDateString()}`,
            size: 22
          })
        ],
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: "1. Report Details", bold: true })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Report Type")], width: { size: 2500, type: WidthType.DXA } }),
              new TableCell({ children: [new Paragraph(this.form.reportType)] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Audit Type")] }),
              new TableCell({ children: [new Paragraph(this.form.auditType)] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Assessment Period")] }),
              new TableCell({ children: [new Paragraph(this.form.period)] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Scope")] }),
              new TableCell({ children: [new Paragraph(this.form.scope)] })
            ]
          })
        ],
        width: { size: 100, type: WidthType.PERCENTAGE }
      }),
      new Paragraph({
        children: [new TextRun({ text: "2. Findings", bold: true })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("ID")] }),
              new TableCell({ children: [new Paragraph("Vulnerability")] }),
              new TableCell({ children: [new Paragraph("Scope")] }),
              new TableCell({ children: [new Paragraph("Severity")] }),
              new TableCell({ children: [new Paragraph("Status")] })
            ]
          }),
          ...this.findings.map(finding => {
            const severityStyle = severityStyles[finding.severity] || {};
            const statusColor = finding.status === 'Fixed' ? '388e3c' : 'd32f2f';

            return new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(finding.slno.toString())] }),
                new TableCell({ children: [new Paragraph(finding.vuln)] }),
                new TableCell({ children: [new Paragraph(finding.scope)] }),
                new TableCell({
                  children: [new Paragraph({
                    children: [
                      new TextRun({
                        text: finding.severity,
                        color: severityStyle.color,
                        bold: severityStyle.bold
                      })
                    ]
                  })]
                }),
                new TableCell({
                  children: [new Paragraph({
                    children: [
                      new TextRun({
                        text: finding.status,
                        color: statusColor
                      })
                    ]
                  })]
                })
              ]
            });
          })
        ],
        width: { size: 100, type: WidthType.PERCENTAGE }
      }),
      new Paragraph({
        children: [new TextRun({ text: "3. Executive Summary", bold: true })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun(this.form.summary)],
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: "4. Conclusion", bold: true })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun(this.getConclusionText())]
      })
    ];

    return new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });
  }

  async downloadAsPDF(): Promise<void> {
    const report = document.querySelector('.final-report');
    if (!report) return;

    // Step 1: Password prompt + confirmation
    const password = prompt('Enter a password to encrypt the PDF:');
    if (!password) return;

    const confirmPassword = prompt('Confirm your password:');
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    const contentWidth = 210 - margin * 2; // A4 width mm
    const contentHeight = 297 - margin * 2; // A4 height mm

    const sections = report.querySelectorAll('.report-section');
    let isFirstPage = true;

    for (const section of sections) {
      // Clone section and wrap it for canvas rendering
      const clonedSection = section.cloneNode(true) as HTMLElement;
      const wrapper = document.createElement('div');
      wrapper.style.justifyItems='center';
      wrapper.style.width = report.clientWidth + 'px';
      wrapper.style.padding = '20px';
      wrapper.style.background = 'transperant'; // white background for better rendering
      // wrapper.style.backgroundColor='red';
      wrapper.style.border='1px solid #000000';
      wrapper.style.color='black';
      wrapper.appendChild(clonedSection);
      document.body.appendChild(wrapper);

      // Render section to canvas
      const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (!isFirstPage) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      isFirstPage = false;

      document.body.removeChild(wrapper);
    }

    // Step 2: Convert PDF to blob
    const pdfBlob = pdf.output('blob');

    // Step 3: Send to backend for encryption
    const formData = new FormData();
    formData.append('file', pdfBlob, 'report.pdf');
    formData.append('password', password);
    formData.append('confirm_password', password);

    try {
      const response = await fetch('http://localhost:5001/api/report/protect-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to encrypt PDF');

      const encryptedBlob = await response.blob();

      // Step 4: Download encrypted PDF
      const url = window.URL.createObjectURL(encryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Final_Report.pdf';
      a.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Encryption failed:', error);
      alert('Error encrypting PDF.');
    }
  }




  async downloadAsDOCX() {
    try {
      const password = prompt('Enter password for DOCX protection (min 6 characters)');
      if (!password || password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }

      const confirmPassword = prompt('Confirm password');
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      const doc = this.createDocxDocument();
      const blob = await Packer.toBlob(doc);
      const formData = new FormData();
      formData.append('file', blob, 'report.docx');
      formData.append('password', password);

      this.http.post(`${this.apiUrl}/protect-docx`, formData, {
        responseType: 'blob'
      }).subscribe({
        next: (protectedBlob: Blob) => {
          const url = window.URL.createObjectURL(protectedBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'protected_report.zip';
          a.click();
          window.URL.revokeObjectURL(url);
          this.dropdownOpen = false;

          alert('Document saved as password-protected ZIP file. Extract the DOCX using the password.');
        },
        error: (err) => {
          console.error('DOCX protection failed:', err);
          alert(err.error?.error || 'Failed to protect document');
        }
      });
    } catch (error) {
      console.error('DOCX download failed:', error);
      alert('Failed to generate document. Please try again.');
    }
  }

  backToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  getOverallSecurityPosture(): string {
    if (!this.findings.length) return 'Excellent';

    const criticalCount = this.findings.filter(f => f.severity === 'Critical' && f.status !== 'Fixed').length;
    const highCount = this.findings.filter(f => f.severity === 'High' && f.status !== 'Fixed').length;
    const mediumCount = this.findings.filter(f => f.severity === 'Medium' && f.status !== 'Fixed').length;
    const lowCount = this.findings.filter(f => f.severity === 'Low' && f.status !== 'Fixed').length;

    if (criticalCount > 0) return 'Critical';
    if (highCount > 0) return 'High Risk';
    if (mediumCount > 0) return 'Moderate Risk';
    if (lowCount > 0) return 'Low Risk';

    return 'Secure';
  }

  getConclusionText(): string {
    const posture = this.getOverallSecurityPosture();
    const fixedCount = this.findings.filter(f => f.status === 'Fixed').length;
    const totalFindings = this.findings.length;

    return `This security assessment has identified ${totalFindings} vulnerabilities across the evaluated systems. 
            ${fixedCount} findings have been successfully remediated. Based on the remaining findings, 
            the overall security posture is assessed as ${posture}.`;
  }
}
