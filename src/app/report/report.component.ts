import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DownloadProgressComponent],
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})
export class ReportComponent {
  reAssessmentOption: 'date' | 'na' = 'date';
  logoDataURL = '';
  reportVisible = false;
  dropdownOpen = false;
  dashboardData: any;
  private readonly apiUrl = 'http://localhost:5002/api/report';
  chartImageURLs: string[] = [];

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
    { slno: 1, vuln: 'SQL Injection', scope: 'Login Page', severity: 'High', status: 'Fixed', vulnUrl: '', pocDataURL: '', threatDetails: '' },
    { slno: 2, vuln: 'XSS', scope: 'Dashboard', severity: 'Medium', status: 'Not Fixed', vulnUrl: '', pocDataURL: '', threatDetails: '' }
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
      // Initialize findings from dashboard data if available
      if (this.dashboardData?.dashboardData?.findings) {
        this.findings = this.dashboardData.dashboardData.findings;
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
      status: 'Not Fixed',
      vulnUrl: '',
      pocDataURL: '',
      threatDetails: ''
    });
  }

  handlePocUpload(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.findings[index].pocDataURL = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
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
    if (!this.dashboardData?.dashboardData) {
      console.warn('Dashboard data is not available');
      return;
    }

    this.createReportSeverityChart();
    this.createReportTrendChart();
    this.createReportRemediationChart();
  }

  private createReportSeverityChart() {
    const ctx = document.getElementById('reportSeverityChart') as HTMLCanvasElement;
    if (!ctx || !this.dashboardData?.dashboardData?.severityDistribution) {
      console.warn('Severity chart data is not available');
      return;
    }

    const data = this.dashboardData.dashboardData;
    this.reportSeverityChart = new Chart(ctx, {
      type: 'doughnut',
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
            'rgba(220, 53, 69, 0.8)',    // Critical
            'rgba(253, 126, 20, 0.8)',    // High
            'rgba(255, 193, 7, 0.8)',     // Medium
            'rgba(25, 135, 84, 0.8)',     // Low
            'rgba(13, 202, 240, 0.8)'     // Informative
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          title: {
            display: true,
            text: 'Vulnerability Severity Distribution',
            color: '#e0e0e0',
            font: {
              size: 16,
              family: "'Inter', sans-serif",
              weight: 500 as const
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
              color: '#e0e0e0',
              font: {
                size: 12,
                family: "'Inter', sans-serif"
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.raw as number;
                return `${label}: ${value}`;
              }
            }
          }
        }
      },
      plugins: [{
        id: 'centerText',
        afterDraw: (chart) => {
          const { ctx, width, height } = chart;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Draw CVSS Score exactly in the middle
          ctx.font = 'bold 24px Inter';
          ctx.fillStyle = '#e0e0e0';
          ctx.fillText(
            (data.cvssScore?.baseScore || 0).toString(),
            width / 2.28,
            height / 1.7
          );

          ctx.restore();
        }
      }]
    });
  }

  private createReportTrendChart() {
    const ctx = document.getElementById('reportTrendChart') as HTMLCanvasElement;
    if (!ctx || !this.dashboardData?.dashboardData?.trendData || !this.dashboardData?.dashboardData?.cvssMetrics?.trendMonths) {
      console.warn('Trend chart data is not available');
      return;
    }

    const data = this.dashboardData.dashboardData;
    const trendData = data.trendData.split(',').map(Number);
    const months = data.cvssMetrics.trendMonths.split(',').map((month: string) => {
      const date = new Date(month + '-01');
      return date.toLocaleString('default', { month: 'short', year: '2-digit' });
    });

    this.reportTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Vulnerabilities',
          data: trendData,
          borderColor: 'rgba(67, 97, 238, 0.8)',
          backgroundColor: 'rgba(67, 97, 238, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Monthly Vulnerability Trend',
            color: '#e0e0e0',
            font: {
              size: 16,
              family: "'Inter', sans-serif",
              weight: 500 as const
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          legend: {
            position: 'top',
            labels: {
              color: '#e0e0e0',
              font: {
                family: "'Inter', sans-serif"
              }
            }
          },
          tooltip: {
            callbacks: {
              title: function (tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function (context) {
                return `Vulnerabilities: ${context.raw}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a0a0'
            },
            title: {
              display: true,
              text: 'Number of Vulnerabilities',
              color: '#e0e0e0',
              font: {
                family: "'Inter', sans-serif"
              }
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a0a0'
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
          title: {
            display: true,
            text: 'Vulnerability Findings by Area',
            color: '#e0e0e0',
            font: {
              size: 16,
              family: "'Inter', sans-serif",
              weight: 500 as const
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          legend: {
            position: 'top',
            labels: {
              color: '#e0e0e0',
              font: {
                family: "'Inter', sans-serif"
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.dataset.label || '';
                const value = context.raw as number;
                return `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a0a0'
            },
            title: {
              display: true,
              text: 'Number of Vulnerabilities',
              color: '#e0e0e0',
              font: {
                family: "'Inter', sans-serif"
              }
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a0a0'
            }
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

    const password = prompt('Enter a password to encrypt the PDF:');
    if (!password) {
      this.showDownloadProgress = false;
      return;
    }
    const confirmPassword = prompt('Confirm your password:');
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      this.showDownloadProgress = false;
      return;
    }

    const reportSections = Array.from(document.querySelectorAll('.final-report .report-section'));
    const header = document.querySelector('.final-report .report-header');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    const pageWidth = 210;
    const pageHeight = 297;
    const pdfWidth = pageWidth - 2 * margin;
    const pdfHeight = pageHeight - 2 * margin;

    const allRenderTargets = [header, ...reportSections];
    const totalSteps = allRenderTargets.length;
    let currentStep = 0;

    let isFirstPage = true;

    for (const element of allRenderTargets) {
      if (!element) continue;

      // Update progress for each section
      currentStep++;
      this.updateProgress(currentStep, totalSteps);

      // ✅ Replace canvas in this section with image
      const canvases = Array.from(element.querySelectorAll('canvas'));
      const canvasImages: HTMLImageElement[] = [];

      canvases.forEach((canvas) => {
        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        img.style.width = canvas.style.width;
        img.style.height = canvas.style.height;
        canvas.parentElement?.insertBefore(img, canvas);
        canvas.style.display = 'none';
        canvasImages.push(img);
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true
      });

      // Restore original canvas
      canvases.forEach((canvas, i) => {
        canvas.style.display = 'block';
        canvasImages[i].remove();
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = margin;
      let heightLeft = imgHeight;

      if (!isFirstPage) pdf.addPage();
      // ✳️ Add border to the page
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.5);
      pdf.rect(5, 5, 200, 287);
      isFirstPage = false;

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
    }

    const pdfBlob = pdf.output('blob');
    const formData = new FormData();
    const pdfFile = new File([pdfBlob], 'report.pdf', { type: 'application/pdf' });
    formData.append('file', pdfFile);
    formData.append('password', password);
    formData.append('confirm_password', password);

    try {
      const response = await fetch('http://localhost:5002/api/report/protect-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to encrypt PDF');

      const encryptedBlob = await response.blob();
      const url = window.URL.createObjectURL(encryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Final_Report.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Encryption failed:', error);
      alert('Error encrypting PDF.');
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
              text: `Details: ${finding.threatDetails || 'N/A'}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Vulnerability: ${finding.vuln || 'N/A'}`,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `URL: ${finding.vulnUrl || 'N/A'}`,
              spacing: { after: 100 }
            })
          );

          if (finding.pocDataURL) {
            const imageBuffer = await fetch(finding.pocDataURL).then(res => res.arrayBuffer());
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
}
