import { Routes } from '@angular/router';
import { MyreportComponent } from './myreport/myreport.component';
import { PasswordVerifyComponent } from './password-verify/password-verify.component';
import { CreateReportComponent } from './create-report/create-report.component';
import { DashComponent } from './dash/dash.component';
import { ReportComponent } from './report/report.component';
import { LoginComponent } from './pages/login/login.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { RegisterComponent } from './pages/register/register.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { authGuard } from './core/guards/auth.guard';


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  { path: 'myreport', component: MyreportComponent, canActivate: [authGuard] },
  { path: 'create-report', component: CreateReportComponent, canActivate: [authGuard] },
  { path: 'password-verify', component: PasswordVerifyComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: DashComponent, canActivate: [authGuard] },
  { path: 'report', component: ReportComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: 'login' },
];
