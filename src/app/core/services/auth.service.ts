import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
    // Listen for token changes in other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'currentUser') {
        const newValue = event.newValue;
        const oldValue = event.oldValue;
        // If token is removed or changed, logout and redirect
        if (!newValue || newValue !== oldValue) {
          this.logout();
          window.location.href = '/login';
        }
      }
    });
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<{ user: User, token: string }>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        map(res => {
          const decoded: any = jwtDecode(res.token);
          const user: User = {
            ...res.user,
            token: res.token,
            exp: decoded.exp
          };
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
          this.setAutoLogout(user.exp!);
          return user;
        })
      );
  }

  register(name: string, email: string, password: string): Observable<User> {
    return this.http.post<{ user: User, token: string }>(`${environment.apiUrl}/auth/register`, { name, email, password })
      .pipe(
        map(res => {
          const decoded: any = jwtDecode(res.token);
          const user: User = {
            ...res.user,
            token: res.token,
            exp: decoded.exp
          };
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
          this.setAutoLogout(user.exp!);
          return user;
        })
      );
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, { token, password });
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    const user = this.getCurrentUser();
    return user?.token || null;
  }

  isTokenExpired(): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.token || !user.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return user.exp < now;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser() && !this.isTokenExpired();
  }

  private logoutTimer: any;
  setAutoLogout(exp: number) {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }
    const now = Math.floor(Date.now() / 1000);
    const timeout = (exp - now) * 1000;
    if (timeout > 0) {
      this.logoutTimer = setTimeout(() => {
        this.logout();
        window.location.href = '/login';
      }, timeout);
    } else {
      this.logout();
      window.location.href = '/login';
    }
  }

  initializeAutoLogout() {
    const user = this.getCurrentUser();
    if (user && user.exp) {
      this.setAutoLogout(user.exp);
    }
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
} 