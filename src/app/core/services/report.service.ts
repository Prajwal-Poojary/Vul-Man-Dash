import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface DashboardStats {
  totalReports: number;
  pendingReports: number;
  completedReports: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  // All three API URLs for flexible use
  private backend1ApiUrl = environment.apiUrl;
  private backend2ApiUrl = environment.apiUrl2;
  private flaskApiUrl = environment.apiUrl3;

  // Default: use backend2 for reports (can change as needed)
  private apiUrl = this.backend2ApiUrl + '/reports';

  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  getReports(status?: string): Observable<any[]> {
    const url = status ? `${this.apiUrl}?status=${status}` : this.apiUrl;
    return this.http.get<any[]>(url);
  }

  getReport(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createReport(report: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, report);
  }

  updateReport(id: string, report: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, report);
  }

  deleteReport(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Example: Use Flask backend for a specific call
  getFlaskReports(): Observable<any[]> {
    return this.http.get<any[]>(`${this.flaskApiUrl}/reports`);
  }
} 