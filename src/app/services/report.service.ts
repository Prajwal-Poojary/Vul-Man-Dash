// src/app/services/report.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardData } from './report-api.service';

export type { DashboardData } from './report-api.service';

export interface Report {
  _id?: string;
  title: string;
  content?: string;
  password?: string;
  createdTime?: Date;
  dashboardData?: DashboardData;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = 'http://localhost:5001/api/reports';

  constructor(private http: HttpClient) {}

  // Get all reports
  getReports(): Observable<Report[]> {
    return this.http.get<Report[]>(this.apiUrl);
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
}
