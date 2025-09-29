import { Routes } from '@angular/router';
import { AuthGuard } from './service/auth.guard';
import { LoginComponent } from './auth/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RegisterComponent } from './auth/register.component';
import { PermissionGuard } from './service/permission.guard';
import { PagePlaceholderComponent } from './page-placeholder.component';
import { ParametrosComponent } from './admin/parametros/parametros.component';
import { ParamConfigComponent } from './admin/parametros/param-config.component';
import { UsersListComponent } from './admin/users/users-list.component';
import { UserFormComponent } from './admin/users/user-form.component';
import { RolesListComponent } from './admin/roles/roles-list.component';
import { RoleFormComponent } from './admin/roles/role-form.component';
import { UserAuditComponent } from './admin/users/user-audit.component';

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
      { path: 'parameters/configure/:name', component: ParamConfigComponent, canActivate: [PermissionGuard], data: { code: 'PRM_DEF' } },
      { path: 'parametros', redirectTo: 'parameters', pathMatch: 'full' },

      // Configuración del sistema
      { path: 'system', component: PagePlaceholderComponent, canActivate: [PermissionGuard], data: { code: 'SYS_CFG' } },

      // Usuarios
      { path: 'users', component: UsersListComponent, canActivate: [PermissionGuard], data: { code: 'USR_MNG' } },
      { path: 'users/new', component: UserFormComponent, canActivate: [PermissionGuard], data: { code: 'USR_NEW' } },
      { path: 'users/:id', component: UserFormComponent, canActivate: [PermissionGuard], data: { code: 'USR_EDIT' } },
      { path: 'users/:id/audit', component: UserAuditComponent, canActivate: [PermissionGuard], data: { code: 'USR_MNG' } },

      // Roles
      { path: 'roles', component: RolesListComponent, canActivate: [PermissionGuard], data: { code: 'ROL_MNG' } },
      { path: 'roles/new', component: RoleFormComponent, canActivate: [PermissionGuard], data: { code: 'ROL_NEW' } },
      { path: 'roles/:id', component: RoleFormComponent, canActivate: [PermissionGuard], data: { code: 'ROL_EDIT' } },

      // Catch-all bajo admin respetando guard
      { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
