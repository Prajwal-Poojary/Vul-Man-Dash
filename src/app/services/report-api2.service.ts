import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportApi2Service {
  private apiUrl = 'http://localhost:5004/api/reports';

  constructor(private http: HttpClient) { }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error('Error saving report:', error);
    return throwError(() => new Error(errorMessage));
  }

  // Save report data
  saveReport(reportData: any): Observable<any> {
    return this.http.post(this.apiUrl, reportData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Get all reports
  getAllReports(): Observable<any> {
    return this.http.get(this.apiUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Get report by ID
  getReportById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Update report
  updateReport(id: string, reportData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, reportData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Delete report
  deleteReport(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }
} 