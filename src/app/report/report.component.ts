import { Component, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { TextBasedPDFGenerator } from './report-text-pdf.service';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  AlignmentType,
} from 'docx';
import { Chart, registerables } from 'chart.js';
import { DownloadProgressComponent } from '../shared/download-progress/download-progress.component';
import { ReportService } from '../services/report.service';
import { authFetch } from '../core/services/auth-fetch';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DownloadProgressComponent],
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})
export class ReportComponent implements AfterViewInit {
  reAssessmentOption: 'date' | 'na' = 'date';
  logoDataURL = '';
  reportVisible = false;
  dropdownOpen = false;
  dashboardData: any;
  private readonly apiUrl = `${environment.apiUrlFlask}/report`;
  chartImageURLs: string[] = [];
  findingsToAdd: number = 1;
  scopesToAdd: number = 1;
  manifestScopesToAdd: number = 1;

  // Chart instances for report
  private reportSeverityChart?: Chart;
  private reportRemediationChart?: Chart;
  private reportCVSSScoreChart?: Chart;

  manifestTypes = [
    'Web Application',
    'API',
    'Network',
    'iOS Application',
    'Android Application',
    'Cloud Infrastructure'
  ];

  selectedManifestType = '';

  findings: Array<{
    slno: number;
    vuln: string;
    vulnUrl: string;
    threat: string;
    threatDetails: string;
    impact: string;
    stepsToReproduce: string;
    pocDataURL: { url: string; caption: string }[];
    retestingPocDataURL: { url: string; caption: string }[];
    pocType: string;
    mitigation: string;
    references: string;
    severity: string;
    status: string;
  }> = [
    { slno: 1, vuln: 'SQL Injection', vulnUrl: '', threat: '', threatDetails: '', impact: '', stepsToReproduce: '', pocDataURL: [], retestingPocDataURL: [], pocType: 'poc', mitigation: '', references: '', severity: 'High', status: 'Fixed' }
  ];

  form = {
    logoName: '',
    logoDataURL: '',
    client: '',
    reportDate: new Date().toISOString().split('T')[0],
    auditType: '',
    reportType: '',
    scopes: [''],
    periodStart: '',
    periodEnd: '',
    summary: '',
    manifest: {
      appName: '',
      testerName: '',
      docVersion: '',
      initDate: '',
      reDate: '',
      toolsUsed: '',
      scopes: [''],
      description: '',
      manifestType: ''
    },
    auditee: {
      name: '',
      email: '',
      phone: ''
    },
    signature: {
      name: 'Mr. Mohammed Sheik Nihal',
      title: 'CEO & VP, EyeQ Dot Net Pvt Ltd.',
      place: 'Mangalore, Karnataka.'
    }
  };
  onReAssessmentChange() {
    if (this.reAssessmentOption === 'na') {
      // Clear the date value or set it to null/empty
      this.form.manifest.reDate = '';

    }
  }

  saveSuccess = false;
  saveError = false;
  errorMessage = '';
  reportId: string | null = null;

  contentTable: Array<{title: string, page: number}> = [];
  currentPage = 1;

  constructor(
    private router: Router, 
    private http: HttpClient,
    private reportService: ReportService
  ) {
    Chart.register(...registerables);
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.dashboardData = navigation.extras.state['reportData'];
      if (this.dashboardData?.dashboardData?.findings) {
        this.findings = this.dashboardData.dashboardData.findings;
      }
      if (this.dashboardData?.reportId) {
        this.reportId = this.dashboardData.reportId;
        // Load report data if we have a report ID
        this.loadReportData();
      }
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
    // Initialize manifest scopes if not already initialized
    if (!this.form.manifest.scopes || this.form.manifest.scopes.length === 0) {
      this.form.manifest.scopes = [''];
    }
    // Update the manifest type in the form
    this.form.manifest.manifestType = this.selectedManifestType;
  }

  addFinding() {
    const newSlno = this.findings.length + 1;
    this.findings.push({
      slno: newSlno,
      vuln: '',
      vulnUrl: '',
      threat: '',
      threatDetails: '',
      impact: '',
      stepsToReproduce: '',
      pocDataURL: [],
      retestingPocDataURL: [],
      pocType: 'poc',
      mitigation: '',
      references: '',
      severity: 'Medium',
      status: 'Not Fixed'
    });
  }

  handlePocUpload(event: Event, index: number, type: 'poc' | 'retesting' = 'poc') {
    const input = event.target as HTMLInputElement;
    const files = input?.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          if (type === 'poc') {
            this.findings[index].pocDataURL.push({ url: reader.result as string, caption: '' });
          } else if (type === 'retesting') {
            this.findings[index].retestingPocDataURL.push({ url: reader.result as string, caption: '' });
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }

  async generateReport() {
    this.reportVisible = true;
    this.dropdownOpen = false;

    const manifest = this.selectedManifestType;
    const findingsCount = this.findings.length;
    let page = 1;
    this.contentTable = [];

    // 1. Scan Manifest [selected manifest]
    this.contentTable.push({
      title: `Scan Manifest ${manifest}`,
      page: page++
    });

    // 2. Executive Summary (2 pages)
    this.contentTable.push({
      title: 'Executive Summary',
      page: page++
    });
    this.contentTable.push({
      title: 'Executive Summary (continued)',
      page: page++
    });

    // 3. Findings [selected manifest] (1 page per 25 findings)
    const findingsPerPage = 25;
    const findingsPages = Math.ceil(findingsCount / findingsPerPage);
    for (let i = 0; i < findingsPages; i++) {
      const start = i * findingsPerPage + 1;
      const end = Math.min((i + 1) * findingsPerPage, findingsCount);
      this.contentTable.push({
        title: `Findings ${manifest} (${start}-${end} of ${findingsCount})`,
        page: page++
      });
    }

    // 4. Vulnerability Rating Table
    this.contentTable.push({
      title: 'Vulnerability Rating Table',
      page: page++
    });

    // 5. [selected manifest] vulnerabilities reports
    this.contentTable.push({
      title: `${manifest} vulnerabilities reports`,
      page: page
    });

    //    - Each threat (first threat shares the same page, others increment)
    this.findings.forEach((finding, idx) => {
      this.contentTable.push({
        title: `${finding.threat || 'Threat'}: (${finding.severity || 'N/A'})`,
        page: page + (idx === 0 ? 0 : idx)
      });
    });
    // 6. Threats
    // Add Conclusion on a new page after the last threat
    const conclusionPage = page + Math.max(1, this.findings.length);
    this.contentTable.push({
      title: 'Conclusion',
      page: conclusionPage
    });
    page += Math.max(1, this.findings.length); // increment page for next section if needed

    // Prepare report data
    const reportData = {
      logoName: this.form.logoName,
      logoDataURL: this.logoDataURL,
      client: this.form.client,
      reportDate: new Date(this.form.reportDate),
      auditType: this.form.auditType,
      reportType: this.form.reportType,
      scopes: this.form.scopes,
      periodStart: new Date(this.form.periodStart || new Date().toISOString()),
      periodEnd: new Date(this.form.periodEnd || new Date().toISOString()),
      summary: this.form.summary,
      manifest: {
        appName: this.form.manifest.appName,
        testerName: this.form.manifest.testerName,
        docVersion: this.form.manifest.docVersion,
        initDate: new Date(this.form.manifest.initDate || new Date().toISOString()),
        reDate: new Date(this.form.manifest.reDate || new Date().toISOString()),
        toolsUsed: this.form.manifest.toolsUsed,
        scopes: this.form.manifest.scopes,
        description: this.form.manifest.description,
        manifestType: this.selectedManifestType
      },
      findings: this.findings.map(f => ({
        ...f,
        pocDataURL: f.pocDataURL.map((p: any) => ({ url: p.url, caption: p.caption })),
        retestingPocDataURL: f.retestingPocDataURL.map((p: any) => ({ url: p.url, caption: p.caption }))
      })),
      chartImageURLs: this.chartImageURLs,
      timestamp: new Date()
    };

    // Save report data
    if (this.reportId) {
      this.reportService.updateReportData(this.reportId, reportData).subscribe({
        next: (response) => {
          // console.log('Report data updated successfully:', response);
        },
        error: (error) => {
          // console.error('Error updating report data:', error);
        }
      });
    } else {
      this.reportService.saveReportData(this.reportId || '', reportData).subscribe({
        next: (response) => {
          // console.log('Report data saved successfully:', response);
          this.reportId = response.report._id;
          this.reportVisible = true;
        },
        error: (error) => {
          // console.error('Error saving report data:', error);
        }
      });
    }

    // Create charts after a short delay
    setTimeout(() => this.createReportCharts(), 100);
  }

  editReport() {
    this.reportVisible = false;
    this.dropdownOpen = false;
    // console.log('Editing report:', this.reportId);
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  private createReportCharts() {
    if (!this.dashboardData?.dashboardData) {
      // console.warn('Dashboard data is not available');
      return;
    }

    // Destroy existing charts if they exist
    if (this.reportSeverityChart) {
      this.reportSeverityChart.destroy();
    }
    if (this.reportRemediationChart) {
      this.reportRemediationChart.destroy();
    }
    if (this.reportCVSSScoreChart) {
      this.reportCVSSScoreChart.destroy();
    }

    // Create new charts
    setTimeout(() => {
      this.createReportSeverityChart();
      this.createReportCVSSScoreChart();
      this.createReportRemediationChart();
    }, 100);
  }

  private createReportSeverityChart() {
    const canvas = document.getElementById('reportSeverityChart') as HTMLCanvasElement;
    if (!canvas || !this.dashboardData?.dashboardData?.severityDistribution) {
      // console.warn('Severity chart data is not available');
      return;
    }

    const data = this.dashboardData.dashboardData;
    this.reportSeverityChart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low', 'Informative'],
        datasets: [{
          data: [
            data.severityDistribution.critical || 0,
            data.severityDistribution.high || 0,
            data.severityDistribution.medium || 0,
            data.severityDistribution.low || 0,
            data.severityDistribution.informative || 0
          ],
          backgroundColor: [
            'rgba(220, 53, 69, 0.85)',    // Critical
            'rgba(253, 126, 20, 0.85)',   // High
            'rgba(255, 193, 7, 0.85)',    // Medium
            'rgba(25, 135, 84, 0.85)',    // Low
            'rgba(13, 202, 240, 0.85)'    // Informative
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Vulnerability Severity',
            font: {
              size: 18,
              weight: 'bold',
              family: "'Inter', sans-serif"
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          legend: {
            position: 'right',
            labels: {
              padding: 20,
              font: {
                size: 12,
                family: "'Inter', sans-serif"
              },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
              size: 14,
              family: "'Inter', sans-serif"
            },
            bodyFont: {
              size: 13,
              family: "'Inter', sans-serif"
            },
            padding: 12,
            cornerRadius: 4,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  private createReportRemediationChart() {
    const ctx = document.getElementById('reportRemediationChart') as HTMLCanvasElement;
    if (!ctx || !this.dashboardData?.dashboardData?.vulnerabilityFindings?.areaVulnerabilities) {
      // console.warn('Remediation chart data is not available');
      return;
    }

    const data = this.dashboardData.dashboardData;
    const areas = data.vulnerabilityFindings.areaVulnerabilities.map((area: any) => area.name);
    const countData = data.vulnerabilityFindings.areaVulnerabilities.map((area: any) => area.count);

    this.reportRemediationChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: areas,
        datasets: [{
          label: 'Vulnerabilities Found',
          data: countData,
          backgroundColor: 'rgba(67, 97, 238, 0.8)',
          borderColor: 'rgba(67, 97, 238, 1)',
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
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  private getSeverityColor(score: number): string {
    if (score === 0) return '#000000';
    else if (score <= 3.9) return '#198754';
    else if (score <= 6.9) return '#ffc107';
    else if (score <= 8.9) return '#fd7e14';
    else return '#dc3545';
  }

  private getSeverityLevel(score: number): string {
    if (score === 0) return 'None';
    else if (score <= 3.9) return 'Low';
    else if (score <= 6.9) return 'Medium';
    else if (score <= 8.9) return 'High';
    else return 'Critical';
  }

  private createReportCVSSScoreChart() {
    const canvas = document.getElementById('reportCVSSScoreChart') as HTMLCanvasElement;
    if (!canvas || !this.dashboardData?.dashboardData?.cvssScore?.baseScore) {
      console.warn('CVSS Score chart data is not available');
      return;
    }

    const score = this.dashboardData.dashboardData.cvssScore.baseScore;
    const scoreColor = this.getSeverityColor(score);

    this.reportCVSSScoreChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['CVSS Score'],
        datasets: [{
          data: [100],
          backgroundColor: [scoreColor],
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'CVSS Score Distribution',
            font: {
              size: 18,
              weight: 'bold',
              family: "'Inter', sans-serif"
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        },
        cutout: '75%'
      },
      plugins: [{
        id: 'centerText',
        afterDraw: (chart) => {
          const { ctx, width, height } = chart;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw CVSS score in center
          ctx.font = 'bold 32px Inter';
          ctx.fillStyle = scoreColor;
          ctx.fillText(score.toFixed(1), width / 2, height / 2 - 10);
          
          // Draw "CVSS" label below score
          ctx.font = '16px Inter';
          ctx.fillStyle = '#666666';
          ctx.fillText('CVSS', width / 2, height / 2 + 25);
          
          // Draw severity level
          const severityLevel = this.getSeverityLevel(score);
          ctx.font = '14px Inter';
          ctx.fillStyle = scoreColor;
          ctx.fillText(severityLevel, width / 2, height / 2 + 45);
          
          ctx.restore();
        }
      }]
    });
  }

  showDownloadProgress = false;
  downloadProgress = 0;
  downloadFileType = '';

  private updateProgress(current: number, total: number) {
    // Calculate base progress
    const baseProgress = (current / total) * 100;

    // Apply a non-linear scaling to make progress slower in later stages
    let scaledProgress;
    if (baseProgress < 80) {
      // First 80% progresses normally
      scaledProgress = baseProgress;
    } else {
      // Last 20% is stretched out
      const remainingProgress = baseProgress - 80;
      scaledProgress = 80 + (remainingProgress * 0.5); // Slow down the last 20%
    }

    this.downloadProgress = Math.round(scaledProgress);
  }

  async downloadAsPDF(): Promise<void> {
    this.showDownloadProgress = true;
    this.downloadFileType = 'PDF';
    this.downloadProgress = 0;

    try {
      let password = prompt('Enter a password to encrypt the PDF (minimum 12 characters):');
      if (!password) {
        this.showDownloadProgress = false;
        return;
      }
      if (password.length < 12) {
        alert('Password must be at least 12 characters long!');
        this.showDownloadProgress = false;
        return;
      }
      const confirmPassword = prompt('Confirm your password:');
      if (password !== confirmPassword) {
        alert('Passwords do not match!');
        this.showDownloadProgress = false;
        return;
      }

      // Update progress
      this.updateProgress(10, 100);

      // Use the new text-based PDF generator
      const pdfGenerator = new TextBasedPDFGenerator();
      const pdf = pdfGenerator.generateReport(
        this.form,
        this.findings,
        this.dashboardData,
        this.logoDataURL,
        this.selectedManifestType,
        this.updateProgress.bind(this)
      );

      // Generate PDF blob
      const pdfBlob = pdf.output('blob');
      const formData = new FormData();
      const pdfFile = new File([pdfBlob], 'report.pdf', { type: 'application/pdf' });
      formData.append('file', pdfFile);
      formData.append('password', password);
      formData.append('confirm_password', password);

      // PDF protection endpoint
      const token = localStorage.getItem('currentUser')
        ? JSON.parse(localStorage.getItem('currentUser')!).token
        : null;

      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Update progress
      this.updateProgress(95, 100);

      const response = await fetch('http://localhost:5002/api/report/protect-pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const protectedBlob = await response.blob();
      const url = window.URL.createObjectURL(protectedBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Security_Assessment_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Complete progress
      this.updateProgress(100, 100);

    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setTimeout(() => {
        this.showDownloadProgress = false;
        this.downloadProgress = 0;
      }, 1000);
    }
  }

  async downloadAsDOCX(): Promise<void> {
    this.showDownloadProgress = true;
    this.downloadFileType = 'DOCX';
    this.downloadProgress = 0;

    try {
      const reportSections = Array.from(
        document.querySelectorAll('.final-report .report-section:not(.detailed-vuln-section)')
      );
      const header = document.querySelector('.final-report .report-header');
      // Separate normal sections and detailed vuln sections
      const allSections = Array.from(document.querySelectorAll('.final-report .report-section'));
      const vulnSections = Array.from(document.querySelectorAll('.detailed-vuln-section'));

      // Find the conclusion section
      const conclusionSection = allSections.find(section =>
        section.querySelector('h2')?.textContent?.trim().includes('Conclusion')
      );

      // Everything except conclusion
      const nonConclusionSections = allSections.filter(section => section !== conclusionSection);

      // Combine in correct order: header → normal sections → findings → conclusion
      const allRenderTargets = [
        header,
        ...nonConclusionSections,
        ...vulnSections,
        conclusionSection
      ].filter(Boolean);


      const sections = [];
      const totalSteps = allRenderTargets.length;
      let currentStep = 0;

      for (const element of allRenderTargets) {
        if (!element) continue;

        // Update progress for each section
        currentStep++;
        this.updateProgress(currentStep, totalSteps);

        const children: (Paragraph | Table)[] = [];

        // Add title
        const title = element.querySelector('h1,h2,h3,h4,h5,h6');
        if (title) {
          children.push(
            new Paragraph({
              text: title.textContent?.trim() || '',
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 }
            })
          );
        }


        const logoImg = element.querySelector('img');
        if (logoImg && logoImg.src) {
          // Use authFetch for remote URLs to ensure token tampering is handled
          const isRemote = /^https?:\/\//.test(logoImg.src);
          let logoBuffer;
          if (isRemote) {
            const response = await authFetch(logoImg.src);
            logoBuffer = await response.arrayBuffer();
          } else {
            const response = await fetch(logoImg.src);
            logoBuffer = await response.arrayBuffer();
          }

          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: logoBuffer,
                  transformation: {
                    width: 150,
                    height: 60
                  },
                  type: 'png' // ✅ REQUIRED
                })
              ],
              alignment: AlignmentType.CENTER, // ✅ USES THE IMPORTED ENUM
              spacing: { after: 200 }
            })
          );
        }


        // Add paragraph text
        const paragraphs = Array.from(element.querySelectorAll('p'));
        for (const p of paragraphs) {
          children.push(
            new Paragraph({
              children: [new TextRun(p.textContent?.trim() || '')],
              spacing: { after: 100 }
            })
          );
        }

        // Add HTML tables
        const tables = Array.from(element.querySelectorAll('table'));
        for (const table of tables) {
          const rows = Array.from(table.querySelectorAll('tr')).map(rowEl => {
            const cells = Array.from(rowEl.querySelectorAll('td,th')).map(cellEl => {
              return new TableCell({
                children: [new Paragraph(cellEl.textContent?.trim() || '')],
                width: { size: 33, type: WidthType.PERCENTAGE }
              });
            });
            return new TableRow({ children: cells });
          });

          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows
            })
          );
        }

        // Add canvas charts as images
        const canvases = Array.from(element.querySelectorAll('canvas'));
        for (const canvas of canvases) {
          const imgDataUrl = canvas.toDataURL('image/png');
          // Data URLs are local, so use fetch
          const imageBuffer = await fetch(imgDataUrl).then(res => res.arrayBuffer());

          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: {
                    width: 500,
                    height: 300
                  },
                  type: 'png'
                })
              ],
              spacing: { after: 200 }
            })
          );
        }

        // If this is the Vulnerability Details section, render findings
        if (element.classList.contains('detailed-vuln-section')) {
          const index = Array.from(document.querySelectorAll('.detailed-vuln-section')).indexOf(element);
          const finding = this.findings[index];

          children.push(
            new Paragraph({
              text: `${index + 1}. Threat: (${finding.severity})`,
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Threat: ${finding.threat || 'N/A'}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Threat Details: ${finding.threatDetails || 'N/A'}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Vulnerability: ${finding.vuln || 'N/A'}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Vulnerable URL: ${finding.vulnUrl || 'N/A'}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Impact: ${finding.impact || 'N/A'}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Steps to Reproduce: ${finding.stepsToReproduce || 'N/A'}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Proof Of Concept: ${finding.pocDataURL.length > 0 ? 'Available' : 'N/A'}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Mitigation: ${finding.mitigation || 'N/A'}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `References: ${finding.references || 'N/A'}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Severity: ${finding.severity}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Status: ${finding.status}`,
              spacing: { after: 100 }
            })
          );

          if (finding.pocDataURL.length > 0) {
            for (const poc of finding.pocDataURL) {
              // Use authFetch for remote URLs to ensure token tampering is handled
              const isRemote = /^https?:\/\//.test(poc.url);
              let imageBuffer;
              if (isRemote) {
                const response = await authFetch(poc.url);
                imageBuffer = await response.arrayBuffer();
              } else {
                const response = await fetch(poc.url);
                imageBuffer = await response.arrayBuffer();
              }
              children.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imageBuffer,
                      transformation: {
                        width: 500,
                        height: 300
                      },
                      type: 'png'
                    })
                  ],
                  spacing: { after: 200 }
                }),
                new Paragraph({
                  text: poc.caption || '',
                  style: 'Caption',
                  alignment: AlignmentType.CENTER
                })
              );
            }
          }
        }

        // Push this report section as a new page/section
        sections.push({
          properties: {
            page: {
              size: {
                width: 11906,
                height: 16838
              },
              margin: {
                top: 720,
                bottom: 720,
                left: 720,
                right: 720
              },
              borders: {
                pageBorderTop: {
                  style: BorderStyle.SINGLE,
                  size: 6,
                  color: '000000'
                },
                pageBorderBottom: {
                  style: BorderStyle.SINGLE,
                  size: 6,
                  color: '000000'
                },
                pageBorderLeft: {
                  style: BorderStyle.SINGLE,
                  size: 6,
                  color: '000000'
                },
                pageBorderRight: {
                  style: BorderStyle.SINGLE,
                  size: 6,
                  color: '000000'
                }
              }
            }
          },
          children
        });
      }

      // Create the document with one section per report part
      const doc = new Document({
        sections
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Final_Report.docx';
      a.click();
      window.URL.revokeObjectURL(url);
      this.dropdownOpen = false;
    } catch (error) {
      // console.error('DOCX download failed:', error);
      alert('Failed to generate document. Please try again.');
    } finally {
      this.showDownloadProgress = false;
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

  removePoc(finding: any, i: number) {
    finding.pocDataURL.splice(i, 1);
    finding.pocDataURL = finding.pocDataURL.filter((img: any) => !!img && !!img.url);
  }
  removeRetestingPoc(finding: any, i: number) {
    finding.retestingPocDataURL.splice(i, 1);
    finding.retestingPocDataURL = finding.retestingPocDataURL.filter((img: any) => !!img && !!img.url);
  }
  removeLogo(input: HTMLInputElement) {
    this.logoDataURL = '';
    input.value = '';
  }

  // Add methods for managing scope fields
  addScope(type: 'main' | 'manifest') {
    if (type === 'manifest') {
      this.form.manifest.scopes.push('');
    }
  }

  removeScope(index: number, type: 'main' | 'manifest') {
    if (type === 'main') {
      if (this.form.scopes.length > 1) {
        this.form.scopes.splice(index, 1);
        this.scopesToAdd = this.form.scopes.length;
      }
    } else {
      if (this.form.manifest.scopes.length > 1) {
        this.form.manifest.scopes.splice(index, 1);
        this.manifestScopesToAdd = this.form.manifest.scopes.length;
      }
    }
  }

  addMultipleFindings() {
    if (this.findingsToAdd < 1 || this.findingsToAdd > 50) {
      return;
    }

    // Add new findings to existing ones
    const currentLength = this.findings.length;
    for (let i = 0; i < this.findingsToAdd; i++) {
      this.findings.push({
        slno: currentLength + i + 1,
        vuln: '',
        vulnUrl: '',
        threat: '',
        threatDetails: '',
        impact: '',
        stepsToReproduce: '',
        pocDataURL: [],
        retestingPocDataURL: [],
        pocType: 'poc',
        mitigation: '',
        references: '',
        severity: 'Medium',
        status: 'Not Fixed'
      });
    }
    this.findingsToAdd = 1; // Reset the input after adding findings
  }

  addMultipleScopes(type: 'main' | 'manifest') {
    if (type === 'main') {
      const count = this.scopesToAdd;
      if (count < 1 || count > 50) {
        return;
      }
      // Set total number of scopes instead of adding
      this.form.scopes = Array(count).fill('');
      this.scopesToAdd = this.form.scopes.length;
    } else if (type === 'manifest') {
      const count = this.manifestScopesToAdd;
      if (count < 1 || count > 50) {
        return;
      }
      // Set total number of scopes instead of adding
      this.form.manifest.scopes = Array(count).fill('');
      this.manifestScopesToAdd = this.form.manifest.scopes.length;
    }
  }

  trackByScope(index: number, item: string): number {
    return index;
  }

  ngAfterViewInit() {
    if (this.dashboardData) {
      this.createReportCharts();
    }
  }

  removeFinding(index: number) {
    this.findings.splice(index, 1);
    // Update slno for remaining findings
    this.findings.forEach((finding, i) => {
      finding.slno = i + 1;
    });
  }

  // Add method to load report data
  loadReportData() {
    if (this.reportId) {
      this.reportService.getReportData(this.reportId).subscribe({
        next: (data) => {
          if (data) {
            // Populate form with report data
            const safeData = data as any;
            this.form = {
              logoName: safeData.logoName || '',
              logoDataURL: safeData.logoDataURL || '',
              client: safeData.client || '',
              reportDate: safeData.reportDate ? new Date(safeData.reportDate).toISOString().split('T')[0] : '',
              auditType: safeData.auditType || '',
              reportType: safeData.reportType || '',
              scopes: safeData.scopes || [],
              periodStart: safeData.periodStart ? new Date(safeData.periodStart).toISOString().split('T')[0] : '',
              periodEnd: safeData.periodEnd ? new Date(safeData.periodEnd).toISOString().split('T')[0] : '',
              summary: safeData.summary || '',
              manifest: {
                appName: safeData.manifest?.appName || '',
                testerName: safeData.manifest?.testerName || '',
                docVersion: safeData.manifest?.docVersion || '',
                initDate: safeData.manifest?.initDate ? new Date(safeData.manifest.initDate).toISOString().split('T')[0] : '',
                reDate: safeData.manifest?.reDate ? new Date(safeData.manifest.reDate).toISOString().split('T')[0] : '',
                toolsUsed: safeData.manifest?.toolsUsed || '',
                scopes: safeData.manifest?.scopes || [],
                description: safeData.manifest?.description || '',
                manifestType: safeData.manifest?.manifestType || ''
              },
              auditee: safeData.auditee ?? { name: '', email: '', phone: '' },
              signature: safeData.signature ?? {
                name: 'Mr. Mohammed Sheik Nihal',
                title: 'CEO & VP, EyeQ Dot Net Pvt Ltd.',
                place: 'Mangalore, Karnataka.'
              }
            };
            // Ensure findings' pocDataURL and retestingPocDataURL are always arrays of objects with url and caption
            this.findings = (safeData.findings || []).map((finding: any) => ({
              ...finding,
              pocDataURL: (finding.pocDataURL || []).map((img: any) => typeof img === 'string' ? { url: img, caption: '' } : img),
              retestingPocDataURL: (finding.retestingPocDataURL || []).map((img: any) => typeof img === 'string' ? { url: img, caption: '' } : img)
            }));
            this.contentTable = safeData.contentTable ?? [];
            //this.reportVisible = true;
            this.chartImageURLs = safeData.chartImageURLs || [];
            this.logoDataURL = safeData.logoDataURL || '';
          }
        },
        error: (error) => {
          // console.error('Error loading report data:', error);
        }
      });
    }
  }

  trackByFindingIndex(index: number, finding: any): number {
    return index;
  }
  trackByImgIndex(index: number, img: any): number {
    return index;
  }
}

