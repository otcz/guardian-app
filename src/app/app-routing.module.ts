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
    loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard),
    children: [
      {
        path: 'usuarios',
        loadComponent: () => import('./dashboard/usuarios-component/usuarios-component').then(m => m.UsuariosComponent),
        children: [
          { path: '', redirectTo: 'crear', pathMatch: 'full' },
          { path: 'crear', loadComponent: () => import('./dashboard/usuarios-component/crear-usuario.component').then(m => m.CrearUsuarioComponent) },
          { path: 'editar/:correo', loadComponent: () => import('./dashboard/usuarios-component/editar-usuario.component').then(m => m.EditarUsuarioComponent) },
          { path: 'eliminar', loadComponent: () => import('./dashboard/usuarios-component/eliminar-usuario.component').then(m => m.EliminarUsuarioComponent) }
        ]
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
