// src/app/pages/myreport/myreport.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../services/report.service';
import { SearchService } from '../services/search.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-myreport',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './myreport.component.html',
  styleUrls: ['./myreport.component.scss']
})
export class MyreportComponent implements OnInit, OnDestroy {
  reports: any[] = [];
  searchTerm: string = '';
  private searchSubscription!: Subscription;
  page: number = 1;
  limit: number = 10;
  total: number = 0;
  loading: boolean = false;

  constructor(
    private router: Router,
    private reportService: ReportService,
    private searchService: SearchService
  ) {}

  ngOnInit() {
    this.loadReports();
    this.searchSubscription = this.searchService.currentSearchTerm$.subscribe(term => {
      this.searchTerm = term;
      this.page = 1;
      this.loadReports();
    });
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.loadReports());
  }

  ngOnDestroy() {
    this.searchSubscription.unsubscribe();
  }

  loadReports() {
    this.loading = true;
    this.reportService.getReports(this.page, this.limit, this.searchTerm).subscribe(data => {
      this.reports = data.reports || [];
      this.total = data.total || 0;
      this.loading = false;
    }, () => {
      this.loading = false;
    });
  }

  nextPage() {
    if (this.page * this.limit < this.total) {
      this.page++;
      this.loadReports();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadReports();
    }
  }

  deleteReport(index: number) {
    const report = this.reports[index];
    this.router.navigate(['/password-verify'], {
      state: { reportTitle: report.title, reportId: report._id, deleteIntent: true }
    });
  }

  editReport(index: number) {
    const report = this.reports[index];
    this.router.navigate(['/password-verify'], {
      state: { reportTitle: report.title, reportId: report._id }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.limit) || 1;
  }

  trackByReportId(index: number, report: any): string {
    return report._id;
  }
}
