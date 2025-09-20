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
        children: [
          { path: '', redirectTo: 'ver', pathMatch: 'full' },
          { path: 'crear', loadComponent: () => import('./dashboard/usuarios-component/crear-usuario/crear-usuario.component').then(m => m.CrearUsuarioComponent) },
          { path: 'ver', loadComponent: () => import('./dashboard/usuarios-component/buscar-suaurio/buscar-usuario-form.component').then(m => m.BuscarUsuarioFormComponent) },
          { path: 'editar/:correo', loadComponent: () => import('./dashboard/usuarios-component/editar-usuario/editar-usuario.component').then(m => m.EditarUsuarioComponent) },
          { path: 'editar', loadComponent: () => import('./dashboard/usuarios-component/editar-usuario/editar-usuario.component').then(m => m.EditarUsuarioComponent) },
          { path: 'eliminar', loadComponent: () => import('./dashboard/usuarios-component/eliminar-usuario/eliminar-usuario.component').then(m => m.EliminarUsuarioComponent) }
        ]
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
