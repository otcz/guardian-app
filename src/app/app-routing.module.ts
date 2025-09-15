import { Routes } from '@angular/router';
import { AuthGuard } from './service/auth.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth-module/login/login').then(m => m.Login)
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard)
  },
  { path: '**', redirectTo: 'login' }
];
