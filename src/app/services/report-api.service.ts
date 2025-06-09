import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface DashboardData {
  _id?: string;
  cvssMetrics: {
    attackVector: string;
    attackComplexity: string;
    privilegesRequired: string;
    userInteraction: string;
    scope: string;
    confidentiality: string;
    integrity: string;
    availability: string;
  };
  trendData: {
    months: string;
    counts: string;
  };
  vulnerabilityFindings: {
    areas: string;
    areaVulnerabilities: { name: string; count: number }[];
    totalVulnerabilities: number;
  };
  severityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informative: number;
  };
  cvssScore: {
    baseScore: number;
    riskLevel: string;
  };
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private backend3Url = 'http://localhost:3001/api/reports';
  private reportServiceUrl = 'http://localhost:3002/api/reports';

  constructor(private http: HttpClient) {}

  saveDashboardData(data: DashboardData): Observable<any> {
    const backend3Request = this.http.post(`${this.backend3Url}/dashboard`, data);
    const reportServiceRequest = this.http.post(`${this.reportServiceUrl}/dashboard`, data);

    return forkJoin([backend3Request, reportServiceRequest]).pipe(
      map(([backend3Response, reportServiceResponse]) => ({
        backend3: backend3Response,
        reportService: reportServiceResponse
      })),
      catchError(error => {
        console.error('Error saving dashboard data:', error);
        throw error;
      })
    );
  }

  getDashboardData(id: string): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.backend3Url}/dashboard/${id}`);
  }

  getAllDashboardReports(): Observable<DashboardData[]> {
    return this.http.get<DashboardData[]>(`${this.backend3Url}/dashboard`);
  }

  updateDashboardData(id: string, data: DashboardData): Observable<any> {
    const backend3Request = this.http.put(`${this.backend3Url}/dashboard/${id}`, data);
    const reportServiceRequest = this.http.put(`${this.reportServiceUrl}/dashboard/${id}`, data);

    return forkJoin([backend3Request, reportServiceRequest]).pipe(
      map(([backend3Response, reportServiceResponse]) => ({
        backend3: backend3Response,
        reportService: reportServiceResponse
      })),
      catchError(error => {
        console.error('Error updating dashboard data:', error);
        throw error;
      })
    );
  }

  deleteReport(id: string): Observable<any> {
    const backend3Request = this.http.delete(`${this.backend3Url}/dashboard/${id}`);
    const reportServiceRequest = this.http.delete(`${this.reportServiceUrl}/dashboard/${id}`);

    return forkJoin([backend3Request, reportServiceRequest]).pipe(
      map(([backend3Response, reportServiceResponse]) => ({
        backend3: backend3Response,
        reportService: reportServiceResponse
      })),
      catchError(error => {
        console.error('Error deleting dashboard data:', error);
        throw error;
      })
    );
  }
}