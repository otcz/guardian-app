import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'user',
    loadChildren: () => import('./user-module/user.module').then(m => m.UserModule)
  },
  {
    path: 'login',
    loadComponent: () => import('./auth-module/login/login').then(m => m.Login)
  },
  // Puedes agregar aquí otras rutas principales, como home, etc.
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
