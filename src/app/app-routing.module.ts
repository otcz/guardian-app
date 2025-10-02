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
import { DashboardHomeComponent } from './dashboard/dashboard-home.component';

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: DashboardHomeComponent },
      { path: 'listar-organizaciones', component: OrganizationListComponent },
      { path: 'crear-organizacion', component: OrganizationFormComponent },
      { path: 'gestionar-organizacion', component: OrganizationFormComponent },
      { path: 'cambiar-estrategia-de-gobernanza', component: OrganizationStrategyComponent },
      { path: 'configurar-parametros-globales', component: OrganizationParamsComponent },
      { path: 'ver-auditoria-de-organizacion', component: OrganizationAuditComponent }
    ]
  },
  // Redirecciones legacy para que rutas antiguas sigan funcionando
  { path: 'listar-organizaciones', redirectTo: 'dashboard/listar-organizaciones', pathMatch: 'full' },
  { path: 'crear-organizacion', redirectTo: 'dashboard/crear-organizacion', pathMatch: 'full' },
  { path: 'gestionar-organizacion', redirectTo: 'dashboard/gestionar-organizacion', pathMatch: 'full' },
  { path: 'cambiar-estrategia-de-gobernanza', redirectTo: 'dashboard/cambiar-estrategia-de-gobernanza', pathMatch: 'full' },
  { path: 'configurar-parametros-globales', redirectTo: 'dashboard/configurar-parametros-globales', pathMatch: 'full' },
  { path: 'ver-auditoria-de-organizacion', redirectTo: 'dashboard/ver-auditoria-de-organizacion', pathMatch: 'full' },
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
