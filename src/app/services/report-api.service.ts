import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

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

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private apiUrl = 'http://localhost:3001/api/reports';

  constructor(private http: HttpClient) {}

  saveDashboardData(data: DashboardData): Observable<any> {
    return this.http.post(`${this.apiUrl}/dashboard`, data).pipe(
      catchError(error => {
        console.error('Error saving dashboard data:', error);
        throw error;
      })
    );
  }

  getDashboardData(id: string): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/dashboard/${id}`);
  }

  getAllDashboardReports(): Observable<DashboardData[]> {
    return this.http.get<DashboardData[]>(`${this.apiUrl}/dashboard`);
  }

  updateDashboardData(id: string, data: DashboardData): Observable<any> {
    return this.http.put(`${this.apiUrl}/dashboard/${id}`, data).pipe(
      catchError(error => {
        console.error('Error updating dashboard data:', error);
        throw error;
      })
    );
  }

  deleteReport(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/dashboard/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting dashboard data:', error);
        throw error;
      })
    );
  }
}