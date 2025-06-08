// src/app/services/report.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Report {
  _id?: string;
  title: string;
  content?: string;
  password?: string;
  createdTime?: Date;
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
}
