import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  showNavbar = true;

  constructor(private router: Router, private authService: AuthService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects || event.url;
        this.showNavbar = !(
          url.startsWith('/login') ||
          url.startsWith('/register') ||
          url.startsWith('/forgot-password') ||
          url.startsWith('/reset-password')
        );
      }
    });
    this.authService.initializeAutoLogout();
  }
}
