import { Routes } from '@angular/router';
import { MyreportComponent } from './myreport/myreport.component';
import { PasswordVerifyComponent } from './password-verify/password-verify.component';
import { CreateReportComponent } from './create-report/create-report.component';
import { DashComponent } from './dash/dash.component';
import { ReportComponent } from './report/report.component';
import { LoginComponent } from './pages/login/login.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { RegisterComponent } from './pages/register/register.component';


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'register', component: RegisterComponent },

  { path: 'myreport', component: MyreportComponent },
  { path: 'create-report', component: CreateReportComponent },
  { path: 'password-verify', component: PasswordVerifyComponent },
  { path: 'dashboard', component: DashComponent },
  { path: 'report', component: ReportComponent },

  { path: '**', redirectTo: 'login' },
];
