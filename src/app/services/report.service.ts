// src/app/services/report.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardData {
  _id?: string;
  cvssScore: {
    baseScore: number;
    riskLevel: string;
  };
  severityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informative: number;
  };
  trendData: {
    months: string;
    counts: string;
  };
  cvssMetrics: {
    attackVector: string;
    attackComplexity: string;
    privilegesRequired: string;
    userInteraction: string;
    scope: string;
    confidentiality: string;
    integrity: string;
    availability: string;
    trendMonths: string;
  };
  vulnerabilityFindings: {
    areas: string;
    areaVulnerabilities: Array<{
      name: string;
      count: number;
    }>;
    totalVulnerabilities: number;
  };
  timestamp: Date;
}

export interface Report {
  _id?: string;
  title: string;
  content?: string;
  password?: string;
  createdTime?: Date;
  dashboardData?: DashboardData;
  reportData?: {
    logoName: string;
    logoDataURL: string;
    client: string;
    reportDate: Date;
    auditType: string;
    reportType: string;
    scopes: string[];
    periodStart: Date;
    periodEnd: Date;
    summary: string;
    manifest: {
      appName: string;
      testerName: string;
      docVersion: string;
      initDate: Date;
      reDate: Date;
      toolsUsed: string;
      scopes: string[];
      description: string;
      manifestType: string;
    };
    findings: Array<{
      slno: number;
      vuln: string;
      vulnUrl: string;
      threat: string;
      threatDetails: string;
      impact: string;
      stepsToReproduce: string;
      pocDataURL: (string | { url: string; caption: string })[];
      retestingPocDataURL: (string | { url: string; caption: string })[];
      pocType: string;
      mitigation: string;
      references: string;
      severity: string;
      status: string;
    }>;
    chartImageURLs: string[];
    timestamp: Date;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = 'http://localhost:5001/api/reports';

  constructor(private http: HttpClient) {}

  // Get all reports (paginated, with optional search)
  getReports(page: number = 1, limit: number = 10, search: string = ''): Observable<any> {
    let url = `${this.apiUrl}?page=${page}&limit=${limit}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return this.http.get<any>(url);
  }

  // Get report by title
  getReportByTitle(title: string): Observable<Report> {
    return this.http.get<Report>(`${this.apiUrl}/title/${title}`);
  }

  // Add new report
  addReport(report: Report): Observable<Report> {
    return this.http.post<Report>(this.apiUrl, report);
  }

  // Delete report by _id
  deleteReport(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Get dashboard data by report ID
  getDashboardData(reportId: string): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/dashboard/${reportId}`);
  }

  // Save dashboard data for a report
  saveDashboardData(reportId: string, dashboardData: DashboardData): Observable<any> {
    return this.http.post(`${this.apiUrl}/dashboard/${reportId}`, dashboardData);
  }

  // Update dashboard data for a report
  updateDashboardData(reportId: string, dashboardData: DashboardData): Observable<any> {
    return this.http.put(`${this.apiUrl}/dashboard/${reportId}`, dashboardData);
  }

  // Get report data by ID
  getReportData(reportId: string): Observable<Report['reportData']> {
    return this.http.get<Report['reportData']>(`${this.apiUrl}/report/${reportId}`);
  }

  // Save report data
  saveReportData(reportId: string, reportData: Report['reportData']): Observable<any> {
    return this.http.post(`${this.apiUrl}/report/${reportId}`, reportData);
  }

  // Update report data
  updateReportData(reportId: string, reportData: Report['reportData']): Observable<any> {
    return this.http.put(`${this.apiUrl}/report/${reportId}`, reportData);
  }

  // Verify report password
  verifyReportPassword(data: { title?: string; id?: string; password: string }): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/verify-password`, data);
  }
}
