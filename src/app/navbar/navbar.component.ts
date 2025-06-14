// src/app/components/navbar/navbar.component.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../services/search.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  searchQuery: string = '';

  constructor(
    private router: Router,
    private location: Location,
    private searchService: SearchService,
    private authService: AuthService
  ) {}

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

  get isMyReportPage(): boolean {
    return this.router.url === '/myreport';
  }
}
