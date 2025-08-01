// src/app/components/navbar/navbar.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../services/search.service';
import { AuthService } from '../core/services/auth.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  searchQuery: string = '';
  searchFocused: boolean = false;
  securityLevel: number = 85;
  
  private securitySubscription?: Subscription;
  private securityUpdateInterval?: Subscription;

  constructor(
    private router: Router,
    private location: Location,
    private searchService: SearchService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Simulate dynamic security level updates
    this.securityUpdateInterval = interval(5000).subscribe(() => {
      this.updateSecurityLevel();
    });
  }

  ngOnDestroy() {
    if (this.securitySubscription) {
      this.securitySubscription.unsubscribe();
    }
    if (this.securityUpdateInterval) {
      this.securityUpdateInterval.unsubscribe();
    }
  }

  goToCreate() {
    this.router.navigate(['/create-report']);
  }

  goToReports() {
    this.router.navigate(['/myreport']);
  }

  goBack() {
    this.location.back();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onSearchChange() {
    this.searchService.updateSearchTerm(this.searchQuery);
  }

  onSearchFocus() {
    this.searchFocused = true;
  }

  onSearchBlur() {
    this.searchFocused = false;
  }

  private updateSecurityLevel() {
    // Simulate security level fluctuation
    const variation = Math.random() * 10 - 5; // -5 to +5
    this.securityLevel = Math.max(75, Math.min(95, this.securityLevel + variation));
  }

  get isMyReportPage(): boolean {
    return this.router.url === '/myreport';
  }

  get securityStatus(): string {
    if (this.securityLevel >= 90) return 'HIGH';
    if (this.securityLevel >= 80) return 'MEDIUM';
    return 'LOW';
  }
}
