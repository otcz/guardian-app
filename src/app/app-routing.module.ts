import { Routes } from '@angular/router';
import { AuthGuard } from './service/auth.guard';
import { LoginComponent } from './auth/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RegisterComponent } from './auth/register.component';
import { PermissionGuard } from './service/permission.guard';
import { PagePlaceholderComponent } from './page-placeholder.component';
import { ParametrosComponent } from './admin/parametros/parametros.component';

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    children: [
      // Parámetros (path del backend) + alias en español
      { path: 'parameters', component: ParametrosComponent, canActivate: [PermissionGuard], data: { code: 'PRM_DEF' } },
      { path: 'parametros', redirectTo: 'parameters', pathMatch: 'full' },

      // Configuración del sistema
      { path: 'system', component: PagePlaceholderComponent, canActivate: [PermissionGuard], data: { code: 'SYS_CFG' } },

      // Usuarios
      { path: 'users', component: PagePlaceholderComponent, canActivate: [PermissionGuard], data: { code: 'USR_MNG' } },
      { path: 'users/new', component: PagePlaceholderComponent, canActivate: [PermissionGuard], data: { code: 'USR_NEW' } },

      // Roles
      { path: 'roles', component: PagePlaceholderComponent, canActivate: [PermissionGuard], data: { code: 'ROL_MNG' } },
      { path: 'roles/new', component: PagePlaceholderComponent, canActivate: [PermissionGuard], data: { code: 'ROL_NEW' } },

      // Catch-all bajo admin respetando guard
      { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
