import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  
  // Auth Pages - Direct load for fast initial access
  { 
    path: 'login', 
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  { 
    path: 'forgot-password', 
    loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  { 
    path: 'register', 
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },
  { 
    path: 'reset-password', 
    loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },

  // Protected Routes - Lazy loaded for performance
  { 
    path: 'myreport', 
    loadComponent: () => import('./myreport/myreport.component').then(m => m.MyreportComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'create-report', 
    loadComponent: () => import('./create-report/create-report.component').then(m => m.CreateReportComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'password-verify', 
    loadComponent: () => import('./password-verify/password-verify.component').then(m => m.PasswordVerifyComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./dash/dash.component').then(m => m.DashComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'report', 
    loadComponent: () => import('./report/report.component').then(m => m.ReportComponent),
    canActivate: [authGuard]
  },

  { path: '**', redirectTo: 'login' },
];