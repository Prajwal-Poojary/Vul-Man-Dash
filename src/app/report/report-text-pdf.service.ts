import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface ContentItem {
  title: string;
  page: number;
}

export interface Finding {
  threat: string;
  threatDetails: string;
  vuln: string;
  vulnUrl: string;
  impact: string;
  stepsToReproduce: string;
  pocType: string;
  pocDataURL?: any[];
  retestingPocDataURL?: any[];
  mitigation: string;
  references: string;
  severity: string;
  status: string;
}

export interface ReportForm {
  logoName: string;
  client: string;
  reportDate: string;
  auditType: string;
  reportType: string;
  scopes: string[];
  periodStart: string;
  periodEnd: string;
  manifest: {
    appName: string;
    testerName: string;
    docVersion: string;
    initDate: string;
    reDate: string;
    toolsUsed: string;
    description: string;
    scopes: string[];
  };
  signature: {
    name: string;
    title: string;
    place: string;
  };
}

export class TextBasedPDFGenerator {
  private pdf: jsPDF;
  private margin = 10;
  private pageWidth = 210;
  private pageHeight = 297;
  private pdfWidth: number;
  private pdfHeight: number;
  private currentY = 10;
  private contentTable: ContentItem[] = [];
  private destinations: { [key: string]: number } = {};
  private pageNumber = 1;
  private logicalPage = 1;

  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4');
    this.pdfWidth = this.pageWidth - 2 * this.margin;
    this.pdfHeight = this.pageHeight - 2 * this.margin;
  }

  public generateReport(
    form: ReportForm,
    findings: Finding[],
    dashboardData: any,
    logoDataURL: string,
    selectedManifestType: string,
    updateProgress: (progress: number, total: number) => void
  ): jsPDF {
    updateProgress(10, 100);

    // Generate cover page
    this.generateCoverPage(form, logoDataURL);
    updateProgress(20, 100);

    // Add table of contents (placeholder pages for now)
    this.addNewPage();
    this.generateTableOfContents();
    updateProgress(30, 100);

    // Generate report sections
    this.generateScanManifest(form, selectedManifestType);
    updateProgress(40, 100);

    this.generateExecutiveSummary(dashboardData);
    updateProgress(50, 100);

    this.generateFindings(findings);
    updateProgress(60, 100);

    this.generateVulnerabilityRatingTable();
    updateProgress(70, 100);

    this.generateDetailedVulnerabilities(findings, selectedManifestType);
    updateProgress(80, 100);

    this.generateConclusion(findings);
    updateProgress(90, 100);

    // Update TOC with actual page numbers and add clickable links
    this.updateTableOfContentsWithLinks();
    
    // Add page numbers to all pages
    this.addPageNumbers();
    updateProgress(100, 100);

    return this.pdf;
  }

  private addNewPage(): void {
    this.pdf.addPage();
    this.pageNumber++;
    this.addPageBorder();
    this.currentY = this.margin;
  }

  private addPageBorder(): void {
    this.pdf.setDrawColor(0);
    this.pdf.setLineWidth(0.5);
    this.pdf.rect(5, 5, 200, 287);
  }

  private checkPageBreak(requiredHeight: number): void {
    if (this.currentY + requiredHeight > this.pdfHeight - 20) {
      this.addNewPage();
    }
  }

  private addText(text: string, fontSize: number = 12, fontStyle: string = 'normal', color: number[] = [0, 0, 0]): void {
    this.pdf.setFont('helvetica', fontStyle);
    this.pdf.setFontSize(fontSize);
    this.pdf.setTextColor(color[0], color[1], color[2]);
    
    const lines = this.pdf.splitTextToSize(text, this.pdfWidth);
    const lineHeight = fontSize * 0.4;
    
    this.checkPageBreak(lines.length * lineHeight + 5);
    
    for (let i = 0; i < lines.length; i++) {
      this.pdf.text(lines[i], this.margin, this.currentY + lineHeight);
      this.currentY += lineHeight;
    }
    this.currentY += 3; // Add spacing after text
  }

  private addHeading(text: string, level: number = 1): void {
    const fontSize = level === 1 ? 18 : level === 2 ? 16 : 14;
    const fontStyle = 'bold';
    
    this.checkPageBreak(fontSize * 0.4 + 10);
    
    // Add destination for internal links
    const destination = text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    this.destinations[destination] = this.pageNumber;
    
    this.pdf.setFont('helvetica', fontStyle);
    this.pdf.setFontSize(fontSize);
    this.pdf.setTextColor(52, 52, 52); // Dark gray
    
    this.currentY += 8; // Space before heading
    this.pdf.text(text, this.margin, this.currentY);
    this.currentY += fontSize * 0.4 + 5; // Space after heading
    
    // Add underline for main headings
    if (level <= 2) {
      this.pdf.setDrawColor(180, 180, 180);
      this.pdf.setLineWidth(0.3);
      this.pdf.line(this.margin, this.currentY - 2, this.margin + this.pdfWidth, this.currentY - 2);
      this.currentY += 3;
    }
  }

  private generateCoverPage(form: ReportForm, logoDataURL: string): void {
    this.currentY = 50;

    // Add logo if available
    if (logoDataURL) {
      try {
        this.pdf.addImage(logoDataURL, 'PNG', this.pageWidth/2 - 30, this.currentY, 60, 30);
        this.currentY += 40;
      } catch (error) {
        console.log('Could not add logo to PDF');
      }
    }

    // Title
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(52, 52, 52);
    const titleLines = this.pdf.splitTextToSize(form.logoName, this.pdfWidth);
    for (const line of titleLines) {
      this.pdf.text(line, this.pageWidth/2, this.currentY, { align: 'center' });
      this.currentY += 12;
    }

    this.currentY += 20;

    // Report metadata
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(80, 80, 80);
    
    const dateText = `Date: ${new Date(form.reportDate).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    })}`;
    this.pdf.text(dateText, this.pageWidth/2, this.currentY, { align: 'center' });
    this.currentY += 8;
    
    const clientText = `Prepared for: ${form.client}`;
    this.pdf.text(clientText, this.pageWidth/2, this.currentY, { align: 'center' });
    this.currentY += 40;

    // Report Details Table
    this.addHeading('Report Details', 2);
    this.generateReportDetailsTable(form);
  }

  private generateReportDetailsTable(form: ReportForm): void {
    const tableData = [
      ['Report Type', form.reportType],
      ['Audit Type', form.auditType],
      ['Assessment Period', `${form.periodStart} - ${form.periodEnd}`],
      ['Scope', form.scopes.join('\n')]
    ];

    this.checkPageBreak(60);

    // Draw table manually for better control
    const rowHeight = 12;
    const colWidths = [60, 130];
    let tableY = this.currentY;

    for (let i = 0; i < tableData.length; i++) {
      const row = tableData[i];
      
      // Check if content needs multiple lines
      const contentLines = this.pdf.splitTextToSize(row[1], colWidths[1] - 6);
      const actualRowHeight = Math.max(rowHeight, contentLines.length * 6 + 6);
      
      this.checkPageBreak(actualRowHeight + 5);
      if (this.currentY !== tableY + (i * rowHeight)) {
        tableY = this.currentY;
      }

      // Draw cell borders
      this.pdf.setDrawColor(180, 180, 180);
      this.pdf.setLineWidth(0.3);
      this.pdf.rect(this.margin, tableY, colWidths[0], actualRowHeight);
      this.pdf.rect(this.margin + colWidths[0], tableY, colWidths[1], actualRowHeight);

      // Add cell content
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(52, 52, 52);
      this.pdf.text(row[0], this.margin + 3, tableY + 8);

      this.pdf.setFont('helvetica', 'normal');
      for (let j = 0; j < contentLines.length; j++) {
        this.pdf.text(contentLines[j], this.margin + colWidths[0] + 3, tableY + 8 + (j * 6));
      }

      tableY += actualRowHeight;
    }

    this.currentY = tableY + 10;
  }

  private generateTableOfContents(): void {
    this.addHeading('Table of Contents', 1);
    
    // Initialize content table
    this.contentTable = [
      { title: '1. Scan Manifest', page: 3 },
      { title: '2. Executive Summary', page: 4 },
      { title: '3. Findings', page: 5 },
      { title: '4. Vulnerability Rating Table', page: 6 },
      { title: '5. Vulnerability Details', page: 7 },
      { title: '6. Conclusion', page: 8 }
    ];

    const tocStartY = this.currentY;
    const rowHeight = 8;
    const titleWidth = this.pdfWidth * 0.82;
    const pageWidth = this.pdfWidth * 0.18;

    for (let i = 0; i < this.contentTable.length; i++) {
      this.checkPageBreak(rowHeight + 5);
      
      const item = this.contentTable[i];
      const y = this.currentY;

      // Section title with dots
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(12);
      this.pdf.setTextColor(52, 52, 52);
      this.pdf.text(`• ${item.title}`, this.margin, y + 6);

      // Dots line
      this.pdf.setDrawColor(180, 180, 180);
      this.pdf.setLineWidth(0.2);
      const dotsStartX = this.margin + this.pdf.getTextWidth(`• ${item.title}`) + 5;
      const dotsEndX = this.margin + titleWidth - 5;
      
      for (let x = dotsStartX; x < dotsEndX; x += 3) {
        this.pdf.circle(x, y + 3, 0.3, 'F');
      }

      // Page number (will be updated later)
      this.pdf.text(item.page.toString(), this.margin + titleWidth + 10, y + 6);

      this.currentY += rowHeight;
    }

    this.currentY += 10;
  }

  private generateScanManifest(form: ReportForm, selectedManifestType: string): void {
    this.addNewPage();
    this.destinations['scanmanifest'] = this.pageNumber;
    this.addHeading('1. Scan Manifest', 1);

    const manifestData = [
      ['Type', selectedManifestType],
      ['Application', form.manifest.appName],
      ['Tester', form.manifest.testerName],
      ['Version', form.manifest.docVersion],
      ['Initial Assessment Date', form.manifest.initDate],
      ['Re-assessment Date', form.manifest.reDate || 'N/A'],
      ['Tools Used', form.manifest.toolsUsed],
      ['Scope', form.manifest.scopes.join('\n')],
      ['Description', form.manifest.description]
    ];

    this.generateTable(['Field', 'Value'], manifestData);

    // Add signature section
    this.currentY += 20;
    this.addText('Yours sincerely,', 12, 'normal');
    this.addText('From, EyeQ Dot Net Private Limited. (CIN: U80900KA2022PTC169528)', 12, 'normal');
    this.currentY += 40;
    this.addText(form.signature.name, 12, 'bold');
    this.addText(form.signature.title, 12, 'normal');
    this.addText(`Place: ${form.signature.place}`, 12, 'normal');
  }

  private generateExecutiveSummary(dashboardData: any): void {
    this.addNewPage();
    this.destinations['executivesummary'] = this.pageNumber;
    this.addHeading('2. Executive Summary', 1);

    if (dashboardData?.dashboardData?.severityDistribution) {
      const severity = dashboardData.dashboardData.severityDistribution;
      
      // Severity summary boxes
      this.addText('Vulnerability Distribution:', 14, 'bold');
      this.currentY += 5;

      const severityData = [
        ['Critical', severity.critical || 0, '#d32f2f'],
        ['High', severity.high || 0, '#f57c00'],
        ['Medium', severity.medium || 0, '#ffa000'],
        ['Low', severity.low || 0, '#689f38'],
        ['Informative', severity.informative || 0, '#1976d2']
      ];

      for (const [level, count, color] of severityData) {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(12);
        this.pdf.setTextColor(52, 52, 52);
        this.pdf.text(`${level}: ${count}`, this.margin, this.currentY + 6);
        this.currentY += 8;
      }

      const total = severityData.reduce((sum, [, count]) => sum + (count as number), 0);
      this.currentY += 5;
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(14);
      this.pdf.text(`Total Vulnerabilities: ${total}`, this.margin, this.currentY + 6);
      this.currentY += 15;
    }
  }

  private generateFindings(findings: Finding[]): void {
    this.addNewPage();
    this.destinations['findings'] = this.pageNumber;
    this.addHeading('3. Findings', 1);

    const headers = ['ID', 'Vulnerability', 'Severity', 'Status'];
    const rows = findings.map((finding, index) => [
      (index + 1).toString(),
      finding.vuln,
      finding.severity,
      finding.status
    ]);

    this.generateTable(headers, rows);
  }

  private generateVulnerabilityRatingTable(): void {
    this.addNewPage();
    this.destinations['vulnerabilityratingtable'] = this.pageNumber;
    this.addHeading('4. Vulnerability Rating Table', 1);

    const headers = ['Risk Level', 'Description', 'Remediation Timeline'];
    const rows = [
      ['Critical', 'Immediate threat to business operations or data security', 'Immediate remediation required (within 24 hours)'],
      ['High', 'Significant risk that could lead to system compromise', 'Remediate within 7 days'],
      ['Medium', 'Vulnerability that could be exploited under certain conditions', 'Remediate within 30 days'],
      ['Low', 'Minimal impact with limited exploit potential', 'Remediate in next maintenance window'],
      ['Informative', 'Best practice recommendations', 'Consider for future improvements']
    ];

    this.generateTable(headers, rows);
  }

  private generateDetailedVulnerabilities(findings: Finding[], selectedManifestType: string): void {
    this.addNewPage();
    this.destinations['vulnerabilitydetails'] = this.pageNumber;
    this.addHeading('5. Vulnerability Details', 1);

    for (let i = 0; i < findings.length; i++) {
      const finding = findings[i];
      
      if (i > 0) {
        this.addNewPage();
      }

      // Add confidential header for first finding
      if (i === 0) {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(16);
        this.pdf.setTextColor(26, 35, 126);
        const title = `${selectedManifestType} vulnerabilities reports`;
        this.pdf.text(title, this.pageWidth/2, this.currentY, { align: 'center' });
        this.currentY += 10;

        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(12);
        this.pdf.setTextColor(25, 118, 210);
        this.pdf.text('CONFIDENTIAL', this.margin + this.pdfWidth - 30, this.currentY);
        this.currentY += 15;

        // Add horizontal line
        this.pdf.setDrawColor(224, 224, 224);
        this.pdf.setLineWidth(0.3);
        this.pdf.line(this.margin, this.currentY, this.margin + this.pdfWidth, this.currentY);
        this.currentY += 10;
      }

      // Vulnerability header
      const severityColor = this.getSeverityColor(finding.severity);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(14);
      this.pdf.setTextColor(52, 52, 52);
      
      const headerText = `${i + 1}) ${finding.threat} Threat: `;
      this.pdf.text(headerText, this.margin, this.currentY + 6);
      
      // Severity in color
      this.pdf.setTextColor(severityColor[0], severityColor[1], severityColor[2]);
      const headerWidth = this.pdf.getTextWidth(headerText);
      this.pdf.text(`(${finding.severity})`, this.margin + headerWidth, this.currentY + 6);
      this.currentY += 12;

      // Reset color for content
      this.pdf.setTextColor(52, 52, 52);

      // Vulnerability details
      if (finding.threatDetails) {
        this.addLabeledText('Threat Details:', finding.threatDetails);
      }
      if (finding.vuln) {
        this.addLabeledText('Vulnerability:', finding.vuln);
      }
      if (finding.vulnUrl) {
        this.addLabeledText('Vulnerable URL:', finding.vulnUrl);
      }
      if (finding.impact) {
        this.addLabeledText('Impact:', finding.impact);
      }
      if (finding.stepsToReproduce) {
        this.addLabeledText('Steps to Reproduce:', finding.stepsToReproduce);
      }

      // POC Images (if any)
      if (finding.pocType === 'poc' && finding.pocDataURL?.length) {
        this.addPOCImages('POC:', finding.pocDataURL);
      }
      if (finding.pocType === 'retesting' && finding.retestingPocDataURL?.length) {
        this.addPOCImages('Retesting POC:', finding.retestingPocDataURL);
      }

      if (finding.mitigation) {
        this.addLabeledText('Mitigation:', finding.mitigation);
      }
      if (finding.references) {
        this.addLabeledText('References:', finding.references);
      }
    }
  }

  private generateConclusion(findings: Finding[]): void {
    this.addNewPage();
    this.destinations['conclusion'] = this.pageNumber;
    this.addHeading('6. Conclusion', 1);

    const totalFindings = findings.length;
    const criticalCount = findings.filter(f => f.severity === 'Critical').length;
    const highCount = findings.filter(f => f.severity === 'High').length;

    let conclusionText = `This security assessment identified ${totalFindings} vulnerabilities across the tested application. `;
    
    if (criticalCount > 0) {
      conclusionText += `${criticalCount} critical vulnerabilities require immediate attention. `;
    }
    if (highCount > 0) {
      conclusionText += `${highCount} high-severity vulnerabilities should be addressed within 7 days. `;
    }
    
    conclusionText += `It is recommended to prioritize remediation based on the severity levels outlined in this report and implement the suggested mitigation strategies to enhance the overall security posture.`;

    this.addText(conclusionText, 12, 'normal');
  }

  private addLabeledText(label: string, content: string): void {
    this.checkPageBreak(20);
    
    // Add a subtle background box for labeled text sections
    this.pdf.setFillColor(248, 249, 250); // Very light gray background
    this.pdf.setDrawColor(224, 224, 224); // Light border
    this.pdf.setLineWidth(0.2);
    
    const labelHeight = 8;
    const lines = this.pdf.splitTextToSize(content, this.pdfWidth - 15);
    const contentHeight = lines.length * 6 + 10;
    const totalHeight = labelHeight + contentHeight;
    
    // Draw background box
    this.pdf.rect(this.margin - 2, this.currentY - 2, this.pdfWidth + 4, totalHeight, 'FD');
    
    // Add label
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(12);
    this.pdf.setTextColor(52, 52, 52);
    this.pdf.text(label, this.margin, this.currentY + 6);
    this.currentY += labelHeight;

    // Add content with indentation
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    this.pdf.setTextColor(80, 80, 80);
    for (const line of lines) {
      this.checkPageBreak(8);
      this.pdf.text(line, this.margin + 5, this.currentY + 6);
      this.currentY += 6;
    }
    this.currentY += 8; // Extra spacing after labeled sections
  }

  private addPOCImages(label: string, images: any[]): void {
    this.addText(label, 12, 'bold');
    
    for (const img of images) {
      if (img?.url) {
        try {
          this.checkPageBreak(80);
          this.pdf.addImage(img.url, 'PNG', this.margin + 20, this.currentY, this.pdfWidth - 40, 60);
          this.currentY += 65;
          
          if (img.caption) {
            this.pdf.setFont('helvetica', 'italic');
            this.pdf.setFontSize(10);
            this.pdf.setTextColor(85, 85, 85);
            const captionLines = this.pdf.splitTextToSize(img.caption, this.pdfWidth - 40);
            for (const line of captionLines) {
              this.pdf.text(line, this.pageWidth/2, this.currentY, { align: 'center' });
              this.currentY += 5;
            }
            this.currentY += 5;
          }
        } catch (error) {
          console.log('Could not add POC image to PDF');
        }
      }
    }
  }

  private generateTable(headers: string[], rows: string[][]): void {
    const rowHeight = 12;
    const colWidth = this.pdfWidth / headers.length;
    
    this.checkPageBreak((rows.length + 1) * rowHeight + 10);

    // Draw headers
    this.pdf.setDrawColor(0);
    this.pdf.setLineWidth(0.3);
    this.pdf.setFillColor(41, 128, 185);
    
    for (let i = 0; i < headers.length; i++) {
      const x = this.margin + (i * colWidth);
      this.pdf.rect(x, this.currentY, colWidth, rowHeight, 'FD');
      
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(255, 255, 255);
      this.pdf.text(headers[i], x + 2, this.currentY + 8);
    }
    this.currentY += rowHeight;

    // Draw rows
    this.pdf.setTextColor(52, 52, 52);
    this.pdf.setFont('helvetica', 'normal');
    
    for (const row of rows) {
      this.checkPageBreak(rowHeight + 5);
      
      for (let i = 0; i < row.length; i++) {
        const x = this.margin + (i * colWidth);
        this.pdf.rect(x, this.currentY, colWidth, rowHeight, 'D');
        
        const cellLines = this.pdf.splitTextToSize(row[i], colWidth - 4);
        for (let j = 0; j < Math.min(cellLines.length, 1); j++) {
          this.pdf.text(cellLines[j], x + 2, this.currentY + 8 + (j * 5));
        }
      }
      this.currentY += rowHeight;
    }
    this.currentY += 10;
  }

  private getSeverityColor(severity: string): number[] {
    switch (severity.toLowerCase()) {
      case 'critical': return [211, 47, 47];
      case 'high': return [245, 124, 0];
      case 'medium': return [255, 160, 0];
      case 'low': return [104, 159, 56];
      default: return [25, 118, 210];
    }
  }

  private updateTableOfContentsWithLinks(): void {
    // Go back to TOC page (page 2)
    this.pdf.setPage(2);
    
    // Update content table with actual page numbers
    this.contentTable = [
      { title: '1. Scan Manifest', page: Object.values(this.destinations)[0] || 3 },
      { title: '2. Executive Summary', page: Object.values(this.destinations)[1] || 4 },
      { title: '3. Findings', page: Object.values(this.destinations)[2] || 5 },
      { title: '4. Vulnerability Rating Table', page: Object.values(this.destinations)[3] || 6 },
      { title: '5. Vulnerability Details', page: Object.values(this.destinations)[4] || 7 },
      { title: '6. Conclusion', page: Object.values(this.destinations)[5] || 8 }
    ];

    // Clear the TOC area and redraw
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.rect(this.margin, 40, this.pdfWidth, 100, 'F');
    
    let tocY = 50;
    const rowHeight = 8;
    const titleWidth = this.pdfWidth * 0.82;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(12);
    this.pdf.setTextColor(52, 52, 52);

    for (const item of this.contentTable) {
      // Create clickable link
      const destination = item.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      this.pdf.link(this.margin, tocY - 4, titleWidth + 20, rowHeight, {
        pageNumber: this.destinations[destination] || item.page
      });

      // Section title with dots
      this.pdf.text(`• ${item.title}`, this.margin, tocY + 6);

      // Dots line
      this.pdf.setDrawColor(180, 180, 180);
      this.pdf.setLineWidth(0.2);
      const dotsStartX = this.margin + this.pdf.getTextWidth(`• ${item.title}`) + 5;
      const dotsEndX = this.margin + titleWidth - 5;
      
      for (let x = dotsStartX; x < dotsEndX; x += 3) {
        this.pdf.circle(x, tocY + 3, 0.3, 'F');
      }

      // Page number
      const actualPage = this.destinations[destination] || item.page;
      this.pdf.text(actualPage.toString(), this.margin + titleWidth + 10, tocY + 6);

      tocY += rowHeight;
    }
  }

  private addPageNumbers(): void {
    const totalPages = this.pdf.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      this.pdf.setPage(i);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(80, 80, 80);
      this.pdf.text(`Page ${i}`, this.pageWidth/2, this.pageHeight - 5, { align: 'center' });
    }
  }
}