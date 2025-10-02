import { Routes } from '@angular/router';
import { AuthGuard } from './service/auth.guard';
import { LoginComponent } from './auth/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RegisterComponent } from './auth/register.component';
import { PermissionGuard } from './service/permission.guard';
import { PagePlaceholderComponent } from './page-placeholder.component';
import { OrganizationListComponent } from './admin/organizacion-list-component/organization-list.component';
import { OrganizationFormComponent } from './admin/organizacion-form-component/organization-form.component';
import { OrganizationStrategyComponent } from './admin/organizacion-strategy-component/organization-strategy.component';
import { OrganizationParamsComponent } from './admin/organizacion-params-component/organization-params.component';
import { OrganizationAuditComponent } from './admin/organizacion-autit-component/organization-audit.component';

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'listar-organizaciones', component: OrganizationListComponent, canActivate: [AuthGuard] },
  { path: 'crear-organizacion', component: OrganizationFormComponent, canActivate: [AuthGuard] },
  { path: 'gestionar-organizacion', component: OrganizationFormComponent, canActivate: [AuthGuard] },
  { path: 'cambiar-estrategia-de-gobernanza', component: OrganizationStrategyComponent, canActivate: [AuthGuard] },
  { path: 'configurar-parametros-globales', component: OrganizationParamsComponent, canActivate: [AuthGuard] },
  { path: 'ver-auditoria-de-organizacion', component: OrganizationAuditComponent, canActivate: [AuthGuard] },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    children: [
      { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
