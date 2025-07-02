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
import { authFetch } from '../core/services/auth-fetch';

// Add helper function for table drawing
function drawTable(pdf: jsPDF, headers: string[], rows: any[][], startY: number, margin: number): number {
  // Table configuration
  const cellPadding = 3;
  const colWidths = [20, 100, 30, 30]; // Widths for each column
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

  private async processTextBlock(
    pdf: jsPDF,
    title: string,
    content: string,
    margin: number,
    pdfWidth: number,
    pdfHeight: number,
    currentY: number,
    findingIndex?: number
  ): Promise<number> {
    if (!content) return currentY;

    const titleHeight = 10;
    const textHeight = 5;
    const bottomMargin = 20;
    const lines = pdf.splitTextToSize(content, pdfWidth);
    const estimatedBlockHeight = titleHeight + (lines.length * textHeight) + 5;
    if (currentY + estimatedBlockHeight > pdfHeight - bottomMargin) {
      pdf.addPage();
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.5);
      pdf.rect(5, 5, 200, 287);
      currentY = margin;
    }

    // Special rendering for Mitigation and References using html2canvas (to match the main box style)
    if (title === 'Mitigation:' && findingIndex !== undefined) {
      // Combine mitigation and references for this finding
      const allVulnSections = Array.from(document.querySelectorAll('.detailed-vuln-section'));
      let mitigationElem: HTMLElement | null = null;
      let referencesElem: HTMLElement | null = null;
      if (allVulnSections[findingIndex]) {
        mitigationElem = allVulnSections[findingIndex].querySelector('.mitigation-section') as HTMLElement;
        referencesElem = allVulnSections[findingIndex].querySelector('.references-section') as HTMLElement;
      }
      if (mitigationElem && referencesElem) {
        // Create a temporary container to combine both
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'block';
        tempDiv.style.background = '#fff';
        tempDiv.style.padding = '0';
        tempDiv.style.margin = '0';
        tempDiv.style.borderRadius = '18px';
        tempDiv.style.fontFamily = 'inherit';
        tempDiv.appendChild(mitigationElem.cloneNode(true));
        tempDiv.appendChild(referencesElem.cloneNode(true));
        // Force all text in tempDiv to black
        Array.from(tempDiv.querySelectorAll('*')).forEach((el: any) => {
          el.style.color = '#000';
          el.style.fontSize = '30px';
        });
        document.body.appendChild(tempDiv);
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
        });
        document.body.removeChild(tempDiv);
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        if (currentY + imgHeight > pdfHeight - margin) {
          pdf.addPage();
          pdf.setDrawColor(0);
          pdf.setLineWidth(0.5);
          pdf.rect(5, 5, 200, 287);
          currentY = margin;
        }
        pdf.setDrawColor(189, 189, 189); // #bdbdbd
        pdf.setLineWidth(0.3); // thinner border
        pdf.rect(margin - 2, currentY - 2, imgWidth + 4, imgHeight + 4, 'S');
        pdf.setTextColor(0, 0, 0); // ensure text is black
        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 5;
        return currentY;
      }
    }
    // ... keep the references block from being rendered separately
    if (title === 'References:') {
      return currentY;
    }

    // Default block rendering for other sections
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(title, margin, currentY);
    currentY += titleHeight;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    for (const line of lines) {
      if (currentY + textHeight > pdfHeight - bottomMargin) {
        pdf.addPage();
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.5);
        pdf.rect(5, 5, 200, 287);
        currentY = margin;
      }
      pdf.text(line, margin, currentY);
      currentY += textHeight;
    }

    return currentY + 5;
  }

  // Add helper function for processing POC images with page breaks
  private async processPocBlock(
    pdf: jsPDF,
    title: string,
    images: { url: string; caption: string }[],
    margin: number,
    pdfWidth: number,
    pdfHeight: number,
    currentY: number
  ): Promise<number> {
    const titleHeight = 10;
    // Set fixed image box size (in mm)
    const fixedImgWidth = 100; // mm
    const fixedImgHeight = 65; // mm
    const imageSpacing = 5;
    const captionHeight = 10; // Estimated height per line of caption
    const bottomMargin = 20;

    // Check if there's enough space for the block title. If not, add a new page.
    if (currentY + titleHeight > pdfHeight - margin) {
      pdf.addPage();
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.5);
      pdf.rect(5, 5, 200, 287);
      currentY = margin;
    }

    // Draw the block title (e.g., "POC:")
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(title, margin, currentY);
    currentY += titleHeight;

    // Center the image box horizontally on the page
    const pageCenterX = pdf.internal.pageSize.getWidth() / 2;
    const boxX = pageCenterX - fixedImgWidth / 2;

    for (const imgWithCaption of images) {
      if (!imgWithCaption.url) continue;
      const img = new Image();
      await new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
        img.src = imgWithCaption.url;
      });
      if (img.width === 0 || img.height === 0) continue;
      const imgAspectRatio = img.width / img.height;
      const boxAspectRatio = fixedImgWidth / fixedImgHeight;
      let imgPdfWidth = fixedImgWidth;
      let imgPdfHeight = fixedImgHeight;
      if (imgAspectRatio > boxAspectRatio) {
        imgPdfWidth = fixedImgWidth;
        imgPdfHeight = fixedImgWidth / imgAspectRatio;
      } else {
        imgPdfHeight = fixedImgHeight;
        imgPdfWidth = fixedImgHeight * imgAspectRatio;
      }
      // Center the image in the box
      const imgX = boxX + (fixedImgWidth - imgPdfWidth) / 2;
      const neededHeight = fixedImgHeight + (imgWithCaption.caption ? captionHeight : 0) + imageSpacing;
      if (currentY + neededHeight > pdfHeight - bottomMargin) {
        pdf.addPage();
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.5);
        pdf.rect(5, 5, 200, 287);
        currentY = margin;
      }
      // Draw a border tightly around the image itself, centered in the box
      pdf.setDrawColor(0, 0, 0); // Black border
      pdf.setLineWidth(0.5);
      pdf.addImage(imgWithCaption.url, 'PNG', imgX, currentY, imgPdfWidth, imgPdfHeight);
      pdf.rect(imgX, currentY, imgPdfWidth, imgPdfHeight);
      currentY += fixedImgHeight + imageSpacing;
      // Add caption to the PDF, containerized to the image width, closer to the image
      if (imgWithCaption.caption) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(10);
        pdf.setTextColor(85, 85, 85);
        // Split caption to fit within the image width
        const captionLines = pdf.splitTextToSize(imgWithCaption.caption, imgPdfWidth - 4); // 2mm padding on each side
        // Start caption just 2mm below the image
        let captionY = currentY - fixedImgHeight + imgPdfHeight + 2;
        for (const line of captionLines) {
          pdf.text(line, imgX + imgPdfWidth / 2, captionY, { align: 'center' });
          captionY += captionHeight;
        }
        currentY += captionLines.length * captionHeight;
      }
    }
    return currentY;
  }

  // Add helper function to process detailed vulnerability sections
  private async processDetailedVulnSection(pdf: jsPDF, element: HTMLElement, margin: number, pdfWidth: number, pdfHeight: number, currentY: number): Promise<number> {
    // Get the index of the current threat section
    const allVulnSections = Array.from(document.querySelectorAll('.detailed-vuln-section'));
    const findingIndex = allVulnSections.indexOf(element);

    // Only add a new page for threats after the first one
    if (findingIndex > 0) {
      pdf.addPage();
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.5);
      pdf.rect(5, 5, 200, 287);
      currentY = margin;
    }

    // Hide POC, mitigation, and references before rendering the main text content
    const pocContainer = element.querySelector('.poc-container') as HTMLElement | null;
    const retestingPocContainer = element.querySelector('.retesting-poc-container') as HTMLElement | null;
    const mitigationSection = element.querySelector('.mitigation-section') as HTMLElement | null;
    const referencesSection = element.querySelector('.references-section') as HTMLElement | null;

    const originalDisplays = {
      poc: pocContainer?.style.display,
      retestingPoc: retestingPocContainer?.style.display,
      mitigation: mitigationSection?.style.display,
      references: referencesSection?.style.display,
    };

    if (pocContainer) pocContainer.style.display = 'none';
    if (retestingPocContainer) retestingPocContainer.style.display = 'none';
    if (mitigationSection) mitigationSection.style.display = 'none';
    if (referencesSection) referencesSection.style.display = 'none';

    await new Promise(resolve => setTimeout(resolve, 50));

    // Render the text part as an image
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    // Restore hidden elements
    if (pocContainer) pocContainer.style.display = originalDisplays.poc || '';
    if (retestingPocContainer) retestingPocContainer.style.display = originalDisplays.retestingPoc || '';
    if (mitigationSection) mitigationSection.style.display = originalDisplays.mitigation || '';
    if (referencesSection) referencesSection.style.display = originalDisplays.references || '';

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if the rendered text part fits on the current page
    if (currentY + imgHeight > pdfHeight - margin) {
      pdf.addPage();
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.5);
      pdf.rect(5, 5, 200, 287);
      currentY = margin;
    }
    pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
    currentY += imgHeight + 5;

    // Get the corresponding finding to access POC, mitigation, and references data
    const finding = this.findings[findingIndex];

    if (finding) {
      // Only process the correct POC type for this finding
      if (finding.pocType === 'poc' && finding.pocDataURL?.length > 0) {
        currentY = await this.processPocBlock(pdf, 'POC:', finding.pocDataURL, margin, pdfWidth, pdfHeight, currentY);
      }
      if (finding.pocType === 'retesting' && finding.retestingPocDataURL?.length > 0) {
        currentY = await this.processPocBlock(pdf, 'Retesting POC:', finding.retestingPocDataURL, margin, pdfWidth, pdfHeight, currentY);
      }
      // Process mitigation and references text, passing findingIndex
      currentY = await this.processTextBlock(pdf, 'Mitigation:', finding.mitigation, margin, pdfWidth, pdfHeight, currentY, findingIndex);
      currentY = await this.processTextBlock(pdf, 'References:', finding.references, margin, pdfWidth, pdfHeight, currentY, findingIndex);
    }

    return currentY;
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
      let currentY = margin; // Track current Y position for proper page breaks
      let tocStarted = false; // Track if Table of Contents has been rendered

      // Map section titles to contentTable entries for quick lookup
      const tocTitleToIndex: Record<string, number> = {};
      this.contentTable.forEach((entry, idx) => {
        tocTitleToIndex[entry.title] = idx;
      });
      let tocSectionIdx = 0;
      let logicalPage = 3; // Start logical page numbering from 3

      const bottomMargin = 20; // mm reserved for page number

      // Process each section
      let isFirstSection = true;
      for (const element of allRenderTargets) {
        if (!element) continue;

        // Handle the cover page (first section)
        if (isFirstSection && element.classList.contains('report-header')) {
          // ... existing cover page logic ...
          // After rendering the cover page, always add a new page for the next section
          pdf.addPage();
          currentY = margin;
          isFirstPage = false;
          isFirstSection = false;
          continue;
        }
        isFirstSection = false;

        // If this is the Scan Manifest section, check for the signature block
        if (element.querySelector('.signature-block')) {
          // Estimate the height of the signature block (in mm)
          const signatureBlockHeight = 50; // Adjust as needed for your layout
          if (currentY + signatureBlockHeight > pdfHeight - bottomMargin) {
            pdf.addPage();
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.5);
            pdf.rect(5, 5, 200, 287);
            currentY = margin;
          }
        }

        // Try to match the section to a contentTable entry by title
        let sectionTitle = '';
        if (element.classList.contains('content-table-section')) {
          sectionTitle = 'Table of Contents';
        } else {
          // Try to get the section title from h2 or h3
          const h2 = element.querySelector('h2');
          if (h2 && h2.textContent) {
            sectionTitle = h2.textContent.trim();
          }
        }
        // Only update contentTable for report sections (not cover or TOC)
        if (sectionTitle && tocTitleToIndex[sectionTitle] !== undefined && sectionTitle !== 'Table of Contents' && sectionTitle !== 'Report Details') {
          this.contentTable[tocTitleToIndex[sectionTitle]].page = logicalPage;
          logicalPage++;
        } else if (this.contentTable[tocSectionIdx] && sectionTitle !== 'Table of Contents' && sectionTitle !== '' && sectionTitle !== 'Report Details') {
          // Fallback: update in order if no title match, but skip TOC and cover
          this.contentTable[tocSectionIdx].page = logicalPage;
          logicalPage++;
        }
        tocSectionIdx++;

        // Update progress
        currentStep++;
        this.updateProgress(20 + (currentStep / totalSteps * 60), 100);

        // Handle detailed vulnerability sections separately
        if (element.classList.contains('detailed-vuln-section')) {
          currentY = await this.processDetailedVulnSection(pdf, element as HTMLElement, margin, pdfWidth, pdfHeight, currentY);
          isFirstPage = false;
          continue;
        }

        // Force a new page with border before Table of Contents
        if (element.classList.contains('content-table-section') && !tocStarted) {
          if (!isFirstPage) {
            pdf.addPage();
          }
          pdf.setDrawColor(0);
          pdf.setLineWidth(0.5);
          pdf.rect(5, 5, 200, 287);
          currentY = margin;
          isFirstPage = false;
          tocStarted = true;
        }

        if (element.classList.contains('content-table-section')) {
          // Always add a page break before rendering the ToC, unless it's the first page
          if (!isFirstPage) {
            pdf.addPage();
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.5);
            pdf.rect(5, 5, 200, 287);
            currentY = margin;
          }
          const table = element.querySelector('.content-table');
          if (table) {
            // Custom ToC styling for PDF
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            // No header row for ToC
            const rowHeight = 10;
            const tocTitleFontSize = 18;
            const tocFontSize = 12;
            const tocTitle = 'Tables of Contents:';
            const sectionColWidth = pdfWidth * 0.82;
            const pageColWidth = pdfWidth * 0.18;
            let y = currentY + 10;

            // Draw ToC title
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(tocTitleFontSize);
            pdf.setTextColor(34, 34, 34);
            pdf.text(tocTitle, margin, y);
            y += tocTitleFontSize + 4;
            // Draw a line under the title
            pdf.setDrawColor(180, 180, 180);
            pdf.setLineWidth(0.5);
            pdf.line(margin, y, margin + pdfWidth, y);
            y += 4;

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(tocFontSize);
            pdf.setTextColor(34, 34, 34);

            for (const row of rows) {
              const cells = Array.from(row.querySelectorAll('td'));
              const sectionText = String(cells[0]?.textContent || '').trim();
              // Wrap section title if too long
              const sectionLines = pdf.splitTextToSize(sectionText, sectionColWidth - 10);
              const thisRowHeight = sectionLines.length * rowHeight;

              // Check if the row fits on the current page
              if (y + thisRowHeight > pdfHeight - bottomMargin) {
                pdf.addPage();
                pdf.setDrawColor(0);
                pdf.setLineWidth(0.5);
                pdf.rect(5, 5, 200, 287);
                y = margin + 10;
                // Redraw ToC title and line
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(tocTitleFontSize);
                pdf.setTextColor(34, 34, 34);
                pdf.text(tocTitle, margin, y);
                y += tocTitleFontSize + 4;
                pdf.setDrawColor(180, 180, 180);
                pdf.setLineWidth(0.5);
                pdf.line(margin, y, margin + pdfWidth, y);
                y += 4;
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(tocFontSize);
                pdf.setTextColor(34, 34, 34);
              }

              // Draw each line of the section title (with dotted bullet point)
              for (let i = 0; i < sectionLines.length; i++) {
                const line = sectionLines[i];
                const lineY = y + i * rowHeight;
                // Section title (left) with bullet
                pdf.text(`• ${line}`, margin, lineY + rowHeight - 3, { align: 'left' });
              }
              y += thisRowHeight;
            }
            currentY = y + 10;

            // Continue to next section (no page break here)
            continue;
          }
        }

        // Handle findings table
        const findingsTableContainer = element.querySelector('.findings-table-container');
        // console.log('Checking for findings table in element:', element.className, element.tagName);
        // console.log('Findings table container found:', !!findingsTableContainer);
        
        if (findingsTableContainer) {
          // console.log('Processing findings table with custom drawing logic...');
          const rows: any[] = [];
          const tableHeading = element.querySelector('h2')?.textContent || 'Findings';
          // console.log('Table heading:', tableHeading);
          
          // Get headers from the findings-header div
          const headerRow = findingsTableContainer.querySelector('.findings-header');
          // console.log('Header row found:', !!headerRow);
          
          const headerCells = headerRow?.querySelectorAll('.findings-cell');
          // console.log('Header cells found:', headerCells?.length);
          
          // Extract header texts
          const tableHeaders = headerCells 
            ? Array.from(headerCells).map(th => th.textContent?.trim() || '')
            : ['ID', 'Vulnerability', 'Severity', 'Status'];

          // console.log('Table headers:', tableHeaders);

          // Get table body rows (all findings-row except the header)
          const bodyRows = findingsTableContainer.querySelectorAll('.findings-row:not(.findings-header)');
          // console.log('Number of body rows:', bodyRows.length);
          
          bodyRows.forEach((row) => {
            const cells = Array.from(row.querySelectorAll('.findings-cell')).map(td => td.textContent?.trim() || '');
            rows.push(cells);
          });

          // console.log('Processed rows:', rows);

          // Check if we need a new page
          if (currentY + 100 > pdfHeight - margin) {
            pdf.addPage();
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.5);
            pdf.rect(5, 5, 200, 287);
            currentY = margin;
            isFirstPage = false;
          } else if (!isFirstPage) {
            pdf.addPage();
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.5);
            pdf.rect(5, 5, 200, 287);
            currentY = margin;
            isFirstPage = false;
          }
          
          // Table configuration
          const colWidths = [20, 100, 30, 30];
          const colCount = colWidths.length;
          const rowHeight = 12; // Increased row height for better spacing
          const headerHeight = 15;
          const titleHeight = 20;
          
          let startY = currentY + 10;

          // Draw table heading (h2)
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(14);
          pdf.setTextColor(0, 0, 0);
          pdf.text(tableHeading, margin, startY);
          startY += titleHeight;

          // Helper function to draw the table header
          const drawHeader = (yPos: number) => {
            let currentX = margin;
            tableHeaders.forEach((header, index) => {
              pdf.setFillColor(44, 62, 80); // Dark blue
              pdf.rect(currentX, yPos, colWidths[index], headerHeight, 'F');
              pdf.setDrawColor(0);
              pdf.rect(currentX, yPos, colWidths[index], headerHeight, 'D');
              pdf.setTextColor(255, 255, 255);
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(12);
              const headerText = (header || '').trim() || `Header${index+1}`;
              const textWidth = pdf.getTextWidth(headerText);
              const x = currentX + (colWidths[index] - textWidth) / 2;
              const y = yPos + headerHeight / 2 + 4;
              pdf.text(headerText, x, y, { baseline: 'middle' });
              currentX += colWidths[index];
            });
            return yPos + headerHeight;
          };
          
          // Draw header for the first time
          startY = drawHeader(startY);

          // Loop through all rows and draw them, paginating as needed
          for (const row of rows) {
            // Calculate the number of lines for each cell for the current row
            const cellLines = row.map((cell: string, colIndex: number) => {
              const text = (cell || '').trim();
              return pdf.splitTextToSize(text, colWidths[colIndex] - 6); // 6px padding
            });
            const maxLines = Math.max(...cellLines.map((lines: string[]) => lines.length));
            const thisRowHeight = maxLines * rowHeight;

            // Check if the row fits on the current page. If not, create new page and redraw header.
            if (startY + thisRowHeight > pdfHeight - bottomMargin) {
              pdf.addPage();
              pdf.setDrawColor(0);
              pdf.setLineWidth(0.5);
              pdf.rect(5, 5, 200, 287);
              startY = margin + 10; // Reset Y for new page
              startY = drawHeader(startY); // Redraw header
            }

            // Draw the row's cells
            let currentX = margin;
            row.forEach((cell: string, colIndex: number) => {
              pdf.setDrawColor(0);
              pdf.setLineWidth(0.1);
              pdf.rect(currentX, startY, colWidths[colIndex], thisRowHeight);

              // Set text color based on Severity or Status
              if (colIndex === 2) { // Severity column
                const severity = (cell || '').toLowerCase();
                if (severity === 'critical') pdf.setTextColor(153, 0, 0);
                else if (severity === 'high') pdf.setTextColor(255, 0, 0);
                else if (severity === 'medium') pdf.setTextColor(255, 165, 0);
                else if (severity === 'low') pdf.setTextColor(0, 128, 0);
                else if (severity === 'informational') pdf.setTextColor(0, 0, 255);
                else pdf.setTextColor(0, 0, 0);
              } else if (colIndex === 3) { // Status column
                const status = (cell || '').toLowerCase();
                if (status.includes('fixed')) pdf.setTextColor(0, 128, 0);
                else pdf.setTextColor(255, 0, 0);
              } else {
                pdf.setTextColor(0, 0, 0); // Default black for other columns
              }

              pdf.setFont('times', 'normal');
              pdf.setFontSize(11);
              const lines = cellLines[colIndex];
              lines.forEach((line: string, idx: number) => {
                const textWidth = pdf.getTextWidth(line);
                const x = currentX + (colWidths[colIndex] - textWidth) / 2;
                const y = startY + rowHeight / 2 + 3 + idx * rowHeight;
                pdf.text(line, x, y, { baseline: 'middle' });
              });
              currentX += colWidths[colIndex];
            });
            
            // Reset text color to black after the row
            pdf.setTextColor(0, 0, 0);

            startY += thisRowHeight;
          }
          
          // Update currentY for next content
          currentY = startY + 20;

          isFirstPage = false;
          // console.log('Finished processing findings table with custom drawing logic');
          continue;
        } else {
          // console.log('No findings table found, element:', element.className, element.tagName);
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
            // console.error('Error converting canvas to image:', error);
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
          // console.log('Processing element with html2canvas:', element.className, element.tagName);
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

          // Check if we need a new page
          if (currentY + imgHeight > pdfHeight - margin) {
            pdf.addPage();
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.5);
            pdf.rect(5, 5, 200, 287);
            currentY = margin;
            isFirstPage = false;
          } else if (!isFirstPage) {
            pdf.addPage();
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.5);
            pdf.rect(5, 5, 200, 287);
            currentY = margin;
            isFirstPage = false;
          }

          // Add image to current page
          pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 10; // Add some spacing after the image

          // If image is too tall for one page, add additional pages
          let heightLeft = imgHeight - (pdfHeight - margin - currentY + imgHeight);
          while (heightLeft > 0) {
            pdf.addPage();
            pdf.setDrawColor(0);
            pdf.setLineWidth(0.5);
            pdf.rect(5, 5, 200, 287);
            const position = heightLeft - imgHeight + margin;
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
            currentY = margin; // Reset currentY for next content
          }
        } catch (error) {
          // console.error('Error processing section:', error);
        }
      }

      // Update progress
      this.updateProgress(90, 100);

      // After all content is rendered, add page numbers to each page
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        // Find the logical page number from contentTable if possible, else use i
        let logicalPage = i;
        if (this.contentTable && this.contentTable.length > 0) {
          // Try to find a contentTable entry with page === i
          const entry = this.contentTable.find(e => e.page === i);
          if (entry) {
            logicalPage = entry.page;
          }
        }
        pdf.text(`Page ${logicalPage}`, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

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
      const response = await authFetch('http://localhost:5002/api/report/protect-pdf', {
        method: 'POST',
        body: formData,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (response.status === 401 || response.status === 403) {
        // Handle unauthorized: logout and redirect
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
        return;
      }

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
      // console.error('PDF generation failed:', error);
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

