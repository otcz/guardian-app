import { Routes } from '@angular/router';
import { AuthGuard } from './service/auth.guard';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { PermissionGuard } from './service/permission.guard';
import { PagePlaceholderComponent } from './page-placeholder.component';
import { OrganizationListComponent } from './admin/organizacion-list-component/organization-list.component';
import { OrganizationFormComponent } from './admin/organizacion-form-component/organization-form.component';
import { OrganizationParamsComponent } from './admin/organizacion-params-component/organization-params.component';
import { OrganizationAuditComponent } from './admin/organizacion-autit-component/organization-audit.component';
import { DashboardHomeComponent } from './dashboard/dashboard-home.component';
import { CrearStrategyComponent } from './admin/crear-strategy-component/crear-strategy.component';
import { OrganizationConfigComponent } from './admin/organizacion-config-component/organization-config.component';

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: '', component: DashboardHomeComponent },
      { path: 'listar-organizaciones', component: OrganizationListComponent },
      { path: 'crear-organizacion', component: OrganizationFormComponent },
      { path: 'gestionar-organizacion', component: OrganizationConfigComponent },
      { path: 'configurar-parametros-globales', component: OrganizationParamsComponent },
      { path: 'ver-auditoria-de-organizacion', component: OrganizationAuditComponent },
      { path: 'crear-estrategia-de-gobernanza', component: CrearStrategyComponent },
      {
        path: 'admin',
        children: [
          { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] }
        ]
      }
    ]
  },
  // Redirecciones legacy desde prefijo /dashboard
  { path: 'dashboard', redirectTo: '', pathMatch: 'full' },
  { path: 'dashboard/listar-organizaciones', redirectTo: 'listar-organizaciones', pathMatch: 'full' },
  { path: 'dashboard/crear-organizacion', redirectTo: 'crear-organizacion', pathMatch: 'full' },
  { path: 'dashboard/gestionar-organizacion', redirectTo: 'gestionar-organizacion', pathMatch: 'full' },
  { path: 'dashboard/cambiar-estrategia-de-gobernanza', redirectTo: 'cambiar-estrategia-de-gobernanza', pathMatch: 'full' },
  { path: 'dashboard/configurar-parametros-globales', redirectTo: 'configurar-parametros-globales', pathMatch: 'full' },
  { path: 'dashboard/ver-auditoria-de-organizacion', redirectTo: 'ver-auditoria-de-organizacion', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
