import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private apiUrl = 'http://localhost:3000/api/reports';

  constructor(private http: HttpClient) {}

  saveReport(data: any) {
    return this.http.post(this.apiUrl, data);
  }

  getReportById(id: string) {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
}
