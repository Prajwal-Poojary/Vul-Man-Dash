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

  constructor(
    private router: Router,
    private reportService: ReportService,
    private searchService: SearchService
  ) {}

  ngOnInit() {
    this.loadReports();

    this.searchSubscription = this.searchService.currentSearchTerm$.subscribe(term => {
      this.searchTerm = term;
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.loadReports());
  }

  ngOnDestroy() {
    this.searchSubscription.unsubscribe();
  }

  loadReports() {
    this.reportService.getReports().subscribe(data => {
      this.reports = data || [];
    });
  }

  deleteReport(index: number) {
    const id = this.reports[index]?._id;
    if (!id || !confirm('Are you sure you want to delete this report?')) return;

    this.reportService.deleteReport(id).subscribe({
      next: () => this.loadReports(),
      error: () => alert('Failed to delete report')
    });
  }

  editReport(index: number) {
    const report = this.reports[index];
    this.router.navigate(['/password-verify'], {
      state: { reportTitle: report.title }
    });
  }

  filteredReports() {
    if (!this.searchTerm) return this.reports;
    return this.reports.filter(r =>
      r.title?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
}
