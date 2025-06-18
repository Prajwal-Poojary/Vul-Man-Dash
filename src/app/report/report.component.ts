import { Component, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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

// Add helper function for table drawing
function drawTable(pdf: jsPDF, headers: string[], rows: any[][], startY: number, margin: number): number {
  // Table configuration
  const cellPadding = 3;
  const colWidths = [15, 60, 50, 30, 25]; // Widths for each column
  const rowHeight = 12;
  const startX = margin;
  let currentY = startY;

  // Helper function to draw a cell
  function drawCell(text: string, x: number, y: number, width: number, height: number, isHeader: boolean = false) {
    // Draw cell background for header
    if (isHeader) {
      pdf.setFillColor(41, 128, 185);
      pdf.rect(x, y, width, height, 'F');
    }

    // Draw cell border
    pdf.setDrawColor(0);
    pdf.rect(x, y, width, height);

    // Set text color and font
    if (isHeader) {
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
    } else {
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");
    }

    // Add text with padding
    const textWidth = pdf.getTextWidth(text);
    let textX = x + cellPadding;

    // Center text for specific columns or headers
    if (isHeader || x === startX || width === 30 || width === 25) {
      textX = x + (width - textWidth) / 2;
    }

    pdf.text(text, textX, y + height - cellPadding);
  }

  // Draw header row
  let currentX = startX;
  headers.forEach((header, index) => {
    drawCell(header, currentX, currentY, colWidths[index], rowHeight, true);
    currentX += colWidths[index];
  });
  currentY += rowHeight;

  // Draw data rows
  rows.forEach(row => {
    // Check if we need a new page
    if (currentY + rowHeight > 287 - margin) {
      pdf.addPage();
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.5);
      pdf.rect(5, 5, 200, 287);
      currentY = margin + 10;
    }

    currentX = startX;
    row.forEach((cell, index) => {
      drawCell(cell.toString(), currentX, currentY, colWidths[index], rowHeight);
      currentX += colWidths[index];
    });
    currentY += rowHeight;
  });

  return currentY; // Return the final Y position
}

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
  private readonly apiUrl = 'http://localhost:5002/api/report';
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
    pocDataURL: string[];
    retestingPocDataURL: string[];
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
        console.log('Loaded existing report ID:', this.reportId);
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
            this.findings[index].pocDataURL.push(reader.result as string);
          } else if (type === 'retesting') {
            this.findings[index].retestingPocDataURL.push(reader.result as string);
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

    // 4. Risk Matrix [selected manifest]
    this.contentTable.push({
      title: `Risk Matrix ${manifest}`,
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
      findings: this.findings,
      chartImageURLs: this.chartImageURLs,
      timestamp: new Date()
    };

    // Save report data
    if (this.reportId) {
      this.reportService.updateReportData(this.reportId, reportData).subscribe({
        next: (response) => {
          console.log('Report data updated successfully:', response);
          this.reportVisible = true;
        },
        error: (error) => {
          console.error('Error updating report data:', error);
        }
      });
    } else {
      this.reportService.saveReportData(this.reportId || '', reportData).subscribe({
        next: (response) => {
          console.log('Report data saved successfully:', response);
          this.reportId = response.report._id;
          this.reportVisible = true;
        },
        error: (error) => {
          console.error('Error saving report data:', error);
        }
      });
    }

    // Create charts after a short delay
    setTimeout(() => this.createReportCharts(), 100);
  }

  editReport() {
    this.reportVisible = false;
    this.dropdownOpen = false;
    console.log('Editing report:', this.reportId);
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  private createReportCharts() {
    if (!this.dashboardData?.dashboardData) {
      console.warn('Dashboard data is not available');
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
      console.warn('Severity chart data is not available');
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
      console.warn('Remediation chart data is not available');
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

      const reportSections = Array.from(
        document.querySelectorAll('.final-report .report-section:not(.detailed-vuln-section)')
      );
      const header = document.querySelector('.final-report .report-header');
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

      // Update progress
      this.updateProgress(20, 100);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10;
      const pageWidth = 210;
      const pageHeight = 297;
      const pdfWidth = pageWidth - 2 * margin;
      const pdfHeight = pageHeight - 2 * margin;

      let isFirstPage = true;
      const totalSteps = allRenderTargets.length;
      let currentStep = 0;

      // Process each section
      for (const element of allRenderTargets) {
        if (!element) continue;

        // Update progress
        currentStep++;
        this.updateProgress(20 + (currentStep / totalSteps * 60), 100);

        if (element.classList.contains('content-table-section')) {
          const table = element.querySelector('.content-table');
          if (table) {
            pdf.addPage();
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.5);
            pdf.rect(5, 5, 200, 287);

            const rows = Array.from(table.querySelectorAll('tbody tr'));
            const headerRow = table.querySelector('thead tr');
            const headerCells = headerRow?.querySelectorAll('th');
            const tableHeaders = headerCells 
              ? Array.from(headerCells).map((th: Element) => th.textContent?.trim() || '')
              : ['Section', 'Page'];

            const rowHeight = 12;
            const headerHeight = 20;
            const availableHeight = pdfHeight - headerHeight - 40;
            const rowsPerPage = Math.floor(availableHeight / rowHeight);

            // Table column widths (2 columns)
            const colCount = tableHeaders.length;
            const colWidth = pdfWidth / colCount;
            const colWidths = Array(colCount).fill(colWidth);

            pdf.setFontSize(16);
            pdf.text('Table of Contents', margin + pdfWidth / 2, margin + 20, { align: 'center' });
            pdf.setFontSize(12);

            // Draw table header background and border
            pdf.setFillColor(240, 240, 240);
            pdf.rect(margin, margin + 30, pdfWidth, headerHeight, 'F');
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.5);
            pdf.rect(margin, margin + 30, pdfWidth, headerHeight);
            // Draw vertical lines for columns in header
            for (let c = 1; c < colCount; c++) {
              pdf.line(margin + c * colWidth, margin + 30, margin + c * colWidth, margin + 30 + headerHeight);
            }

            // Center header text
            pdf.setFont('helvetica', 'bold');
            tableHeaders.forEach((header: string, index: number) => {
              const x = margin + (index + 0.5) * colWidth;
              pdf.text(header, x, margin + 42, { align: 'center' });
            });
            pdf.setFont('helvetica', 'normal');

            // Draw rows for this page with vertical lines and centered text
            const pageRows = rows.slice(0, rowsPerPage);
            pageRows.forEach((row: Element, rowIndex: number) => {
              const cells = Array.from(row.querySelectorAll('td'));
              const y = margin + headerHeight + 35 + (rowIndex * rowHeight);
              // Draw row border
              pdf.rect(margin, y - 5, pdfWidth, rowHeight);
              // Draw vertical lines for columns
              for (let c = 1; c < colCount; c++) {
                pdf.line(margin + c * colWidth, y - 5, margin + c * colWidth, y - 5 + rowHeight);
              }
              // Center cell text vertically and horizontally
              const textY = y - 5 + rowHeight / 2 + 2; // 2 is a tweak for font size 12
              cells.forEach((cell: Element, cellIndex: number) => {
                const x = margin + (cellIndex + 0.5) * colWidth;
                const cellText = String(cell.textContent || '').trim();
                pdf.text(cellText, x, textY, { align: 'center', baseline: 'middle' });
              });
            });

            // If there are more rows, add them to new pages
            if (rows.length > rowsPerPage) {
              for (let i = rowsPerPage; i < rows.length; i += rowsPerPage) {
                pdf.addPage();
                pdf.setDrawColor(0);
                pdf.setLineWidth(0.5);
                pdf.rect(5, 5, 200, 287);
                const pageRows = rows.slice(i, i + rowsPerPage);
                pageRows.forEach((row: Element, rowIndex: number) => {
                  const cells = Array.from(row.querySelectorAll('td'));
                  const y = margin + 15 + (rowIndex * rowHeight);
                  pdf.rect(margin, y - 5, pdfWidth, rowHeight);
                  for (let c = 1; c < colCount; c++) {
                    pdf.line(margin + c * colWidth, y - 5, margin + c * colWidth, y - 5 + rowHeight);
                  }
                  const textY = y - 5 + rowHeight / 2 + 2;
                  cells.forEach((cell: Element, cellIndex: number) => {
                    const x = margin + (cellIndex + 0.5) * colWidth;
                    const cellText = String(cell.textContent || '').trim();
                    pdf.text(cellText, x, textY, { align: 'center', baseline: 'middle' });
                  });
                });
              }
            }
            continue;
          }
        }

        // Handle findings table
        const findingsTableContainer = element.querySelector('.findings-table-container');
        console.log('Checking for findings table in element:', element.className, element.tagName);
        console.log('Findings table container found:', !!findingsTableContainer);
        
        if (findingsTableContainer) {
          console.log('Processing findings table with custom drawing logic...');
          const rows: any[] = [];
          const tableHeading = element.querySelector('h2')?.textContent || 'Findings';
          console.log('Table heading:', tableHeading);
          
          // Get headers from the findings-header div
          const headerRow = findingsTableContainer.querySelector('.findings-header');
          console.log('Header row found:', !!headerRow);
          
          const headerCells = headerRow?.querySelectorAll('.findings-cell');
          console.log('Header cells found:', headerCells?.length);
          
          // Extract header texts
          const tableHeaders = headerCells 
            ? Array.from(headerCells).map(th => th.textContent?.trim() || '')
            : ['ID', 'Vulnerability', 'Severity', 'Status'];

          console.log('Table headers:', tableHeaders);

          // Get table body rows (all findings-row except the header)
          const bodyRows = findingsTableContainer.querySelectorAll('.findings-row:not(.findings-header)');
          console.log('Number of body rows:', bodyRows.length);
          
          bodyRows.forEach((row) => {
            const cells = Array.from(row.querySelectorAll('.findings-cell')).map(td => td.textContent?.trim() || '');
            rows.push(cells);
          });

          console.log('Processed rows:', rows);

          if (!isFirstPage) {
            pdf.addPage();
            console.log('Added new page for findings table');
          }
          
          // Table configuration
          const colCount = tableHeaders.length;
          const colWidth = pdfWidth / colCount;
          const colWidths = Array(colCount).fill(colWidth);
          const rowHeight = 12; // Increased row height for better spacing
          const headerHeight = 15;
          const titleHeight = 20;
          const availableHeight = pdfHeight - titleHeight - headerHeight - 40; // Space for title, header, and margins
          const rowsPerPage = Math.floor(availableHeight / rowHeight);

          console.log('Available height:', availableHeight, 'Rows per page:', rowsPerPage);

          // Calculate total pages needed
          const totalPages = Math.ceil(rows.length / rowsPerPage);
          console.log('Total pages needed:', totalPages);

          for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            if (pageIndex > 0) {
              pdf.addPage();
              console.log('Added page', pageIndex + 1);
            }
            
            // Always draw the border for the current page
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.5);
            pdf.rect(5, 5, 200, 287);
            
            let startY = margin + 10;

            // Draw table heading (h2) only on first page
            if (pageIndex === 0) {
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(14);
              pdf.setTextColor(0, 0, 0);
              pdf.text(tableHeading, margin, startY);
              startY += titleHeight;
              console.log('Drew table heading:', tableHeading);
            }

            // Draw header row - ALWAYS draw header on every page
            console.log('Drawing header row on page', pageIndex + 1, 'with white background and black text');
            // Set up header row styles
            pdf.setFillColor(255, 255, 255); // White background
            pdf.setDrawColor(0); // Black border
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12); // Font size for header

            let currentX = margin;

            // Draw all header cells
            tableHeaders.forEach((header, index) => {
              // Draw filled rectangle for dark blue background
              pdf.setFillColor(44, 62, 80); // Dark blue
              pdf.rect(currentX, startY, colWidths[index], headerHeight, 'F');
              // Draw border around cell
              pdf.setDrawColor(0);
              pdf.rect(currentX, startY, colWidths[index], headerHeight, 'D');
              // Set text color to white, bold, centered
              pdf.setTextColor(255, 255, 255);
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(12);
              const headerText = (header || '').trim() || `Header${index+1}`;
              const textWidth = pdf.getTextWidth(headerText);
              const x = currentX + (colWidths[index] - textWidth) / 2;
              const y = startY + headerHeight / 2 + 4;
              pdf.text(headerText, x, y, { baseline: 'middle' });
              currentX += colWidths[index];
            });

            console.log('Drew header row');
            
            // Reset styles for data rows
            pdf.setTextColor(0, 0, 0);
            pdf.setFont("helvetica", "normal");
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.1);
            startY += headerHeight;

            // Get rows for this page
            const startRowIndex = pageIndex * rowsPerPage;
            const endRowIndex = Math.min(startRowIndex + rowsPerPage, rows.length);
            const pageRows = rows.slice(startRowIndex, endRowIndex);

            console.log(`Page ${pageIndex + 1}: Drawing ${pageRows.length} rows (${startRowIndex} to ${endRowIndex - 1})`);

            // Draw data rows for this page
            pageRows.forEach((row, rowIndex) => {
              currentX = margin;
              // Ensure row has the same number of columns as headers
              while (row.length < colWidths.length) {
                row.push('');
              }
              row.forEach((cell: string, colIndex: number) => {
                pdf.rect(currentX, startY, colWidths[colIndex], rowHeight);
                pdf.setTextColor(0, 0, 0);
                pdf.setFont('times', 'normal');
                pdf.setFontSize(11);
                const text = (cell || '').trim();
                const textWidth = pdf.getTextWidth(text);
                let x = currentX + (colWidths[colIndex] - textWidth) / 2;
                let y = startY + rowHeight / 2 + 3;
                // Center text for all columns
                pdf.text(text, x, y, { baseline: 'middle' });
                currentX += colWidths[colIndex];
              });
              startY += rowHeight;
            });

            // Add page number if there are multiple pages
            if (totalPages > 1) {
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(8);
              pdf.setTextColor(100, 100, 100);
              pdf.text(`Page ${pageIndex + 1} of ${totalPages}`, margin + pdfWidth - 30, pdfHeight - 10);
            }
          }
          
          isFirstPage = false;
          console.log('Finished processing findings table with custom drawing logic');
          continue;
        } else {
          console.log('No findings table found, element:', element.className, element.tagName);
        }

        // Handle other content
        const canvases = Array.from(element.querySelectorAll('canvas'));
        const canvasImages: HTMLImageElement[] = [];

        // Replace canvases with images
        for (const canvas of canvases) {
          try {
            const img = new Image();
            img.src = canvas.toDataURL('image/png');
            img.style.width = canvas.style.width;
            img.style.height = canvas.style.height;
            canvas.parentElement?.insertBefore(img, canvas);
            canvas.style.display = 'none';
            canvasImages.push(img);
          } catch (error) {
            console.error('Error converting canvas to image:', error);
          }
        }

        // Temporarily hide findings table from html2canvas processing
        const findingsTableElement = element.querySelector('.findings-table-container');
        const findingsTable = findingsTableElement as HTMLElement | null;
        const originalDisplay = findingsTable?.style.display;
        if (findingsTable) {
          findingsTable.style.display = 'none';
        }

        // Wait for images to load
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
          console.log('Processing element with html2canvas:', element.className, element.tagName);
          const canvas = await html2canvas(element as HTMLElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true
          });

          // Restore original canvas
          canvases.forEach((canvas, i) => {
            canvas.style.display = 'block';
            canvasImages[i]?.remove();
          });

          // Restore findings table display
          if (findingsTable) {
            findingsTable.style.display = originalDisplay || '';
          }

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (!isFirstPage) pdf.addPage();
          
          // Add border to the page
          pdf.setDrawColor(0);
          pdf.setLineWidth(0.5);
          pdf.rect(5, 5, 200, 287);
          isFirstPage = false;

          let position = margin;
          let heightLeft = imgHeight;

          pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;

          while (heightLeft > 0) {
            pdf.addPage();
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.5);
            pdf.rect(5, 5, 200, 287);
            position = heightLeft - imgHeight + margin;
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
          }
        } catch (error) {
          console.error('Error processing section:', error);
        }
      }

      // Update progress
      this.updateProgress(90, 100);

      // Generate PDF blob
      const pdfBlob = pdf.output('blob');
      const formData = new FormData();
      const pdfFile = new File([pdfBlob], 'report.pdf', { type: 'application/pdf' });
      formData.append('file', pdfFile);
      formData.append('password', password);
      formData.append('confirm_password', password);

      // Send to backend for encryption
      const response = await fetch('http://localhost:5002/api/report/protect-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to encrypt PDF');
      }

      const encryptedBlob = await response.blob();
      const url = window.URL.createObjectURL(encryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Final_Report.pdf';
      a.click();
      window.URL.revokeObjectURL(url);

      // Update progress
      this.updateProgress(100, 100);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.');
    } finally {
      this.showDownloadProgress = false;
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
      ].filter(Boolean); // remove any nulls


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
          const response = await fetch(logoImg.src);
          const logoBuffer = await response.arrayBuffer();

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
            finding.pocDataURL.forEach((pocUrl, i) => {
              children.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: pocUrl,
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
            });
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
      console.error('DOCX download failed:', error);
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
  }
  removeRetestingPoc(finding: any, i: number) {
    finding.retestingPocDataURL.splice(i, 1);
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
            this.form = {
              logoName: data.logoName || '',
              logoDataURL: data.logoDataURL || '',
              client: data.client || '',
              reportDate: data.reportDate ? new Date(data.reportDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              auditType: data.auditType || '',
              reportType: data.reportType || '',
              scopes: data.scopes || [''],
              periodStart: data.periodStart ? new Date(data.periodStart).toISOString().split('T')[0] : '',
              periodEnd: data.periodEnd ? new Date(data.periodEnd).toISOString().split('T')[0] : '',
              summary: data.summary || '',
              manifest: {
                appName: data.manifest?.appName || '',
                testerName: data.manifest?.testerName || '',
                docVersion: data.manifest?.docVersion || '',
                initDate: data.manifest?.initDate ? new Date(data.manifest.initDate).toISOString().split('T')[0] : '',
                reDate: data.manifest?.reDate ? new Date(data.manifest.reDate).toISOString().split('T')[0] : '',
                toolsUsed: data.manifest?.toolsUsed || '',
                scopes: data.manifest?.scopes || [''],
                description: data.manifest?.description || '',
                manifestType: data.manifest?.manifestType || ''
              }
            };
            this.findings = data.findings || [];
            this.chartImageURLs = data.chartImageURLs || [];
            this.logoDataURL = data.logoDataURL || '';
          }
        },
        error: (error) => {
          console.error('Error loading report data:', error);
        }
      });
    }
  }
}

