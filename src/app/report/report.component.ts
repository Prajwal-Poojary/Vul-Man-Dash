import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})
export class ReportComponent {
  logoDataURL = '';
  reportVisible = false;

  manifestTypes: string[] = [
    'Web Application',
    'API',
    'Network',
    'Mobile Application',
    'Cloud Infrastructure'
  ];

  selectedManifestType: string = '';

  findings = [
    { slno: 1, vuln: 'SQL Injection', scope: 'Login Page', severity: 'High', status: 'Fixed' },
    { slno: 2, vuln: 'XSS', scope: 'Dashboard', severity: 'Medium', status: 'Not Fixed' }
  ];

  form = {
    logoName: 'Security Assessment Report',
    client: 'ABC Corporation',
    reportDate: new Date().toISOString().split('T')[0],
    auditType: 'Internal Security Audit',
    reportType: 'Vulnerability Assessment',
    scope: 'Internal Network and Web Applications',
    period: '2025-05-01 to 2025-05-15',
    summary: 'The assessment identified vulnerabilities mostly in outdated software versions.',
    manifest: {
      appName: 'Employee Portal',
      testerName: 'John Doe',
      docVersion: '1.0',
      initDate: '2025-05-01',
      reDate: '2025-05-15',
      toolsUsed: 'Nessus, Burp Suite, Nmap',
      scope: 'Internal web applications',
      description: 'Comprehensive security assessment of all internal web applications and network infrastructure.'
    }
  };

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
    console.log('Selected:', this.selectedManifestType);
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
    // Scroll to the report after generation
    setTimeout(() => {
      const reportElement = document.querySelector('.final-report');
      if (reportElement) {
        reportElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }
}