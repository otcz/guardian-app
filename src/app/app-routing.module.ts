import { Routes } from '@angular/router';
import { AuthGuard } from './service/auth.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth-module/login/login').then(m => m.Login)
  },
  { path: '', redirectTo: 'dashboard/perfil', pathMatch: 'full' },
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
          { path: 'ver', loadComponent: () => import('./dashboard/usuarios-component/ver-usuarios/ver-usuarios.component').then(m => m.VerUsuariosComponent) },
          { path: 'editar/:correo', loadComponent: () => import('./dashboard/usuarios-component/editar-usuario/editar-usuario-form.component').then(m => m.EditarUsuarioFormComponent) },
          { path: 'editar', loadComponent: () => import('./dashboard/usuarios-component/editar-usuario/editar-usuario-form.component').then(m => m.EditarUsuarioFormComponent) },
          { path: 'eliminar', loadComponent: () => import('./dashboard/usuarios-component/eliminar-usuario/eliminar-usuario.component').then(m => m.EliminarUsuarioComponent) }
        ]
      },
      {
        path: 'vehiculos',
        loadChildren: () => import('./dashboard/vehiculos/vehiculos.module').then(m => m.VehiculosModule)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./dashboard/perfil/perfil.component').then(m => m.PerfilComponent)
      },
      {
        path: 'inicio',
        loadComponent: () => import('./dashboard/inicio/inicio.component').then(m => m.InicioComponent)
      },
      {
        path: '',
        redirectTo: 'perfil',
        pathMatch: 'full'
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
