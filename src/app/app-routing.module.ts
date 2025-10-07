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
import { StrategyChangePageComponent } from './admin/organizacion-strategy-change-page/strategy-change-page.component';
import { SeccionFormComponent } from './admin/seccion-form-component/seccion-form.component';
import { OrgRequiredGuard } from './service/org-required.guard';
import { SeccionListComponent } from './admin/seccion-list-component/seccion-list.component';
import { RolesListComponent } from './admin/roles-list-component/roles-list.component';
import { RolesCreatePageComponent } from './admin/roles-create-page/roles-create-page.component';

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: '', component: DashboardHomeComponent },
      { path: 'listar-organizaciones', component: OrganizationListComponent },
      { path: 'crear-organizacion', component: OrganizationFormComponent, canActivate: [PermissionGuard], data: { code: 'ORG_CREATE' } },
      { path: 'gestionar-organizacion', component: OrganizationConfigComponent, canActivate: [OrgRequiredGuard, PermissionGuard], data: { code: 'ORG_MANAGE' } },
      { path: 'configurar-parametros-globales', component: OrganizationParamsComponent, canActivate: [OrgRequiredGuard, PermissionGuard], data: { code: 'PARAM_GLOBAL_MANAGE' } },
      { path: 'configurar-parametros-globales/:id', component: OrganizationParamsComponent, canActivate: [OrgRequiredGuard, PermissionGuard], data: { code: 'PARAM_GLOBAL_MANAGE' } },
      { path: 'ver-auditoria-de-organizacion', component: OrganizationAuditComponent, canActivate: [OrgRequiredGuard, PermissionGuard], data: { code: 'AUDIT_ORG_VIEW' } },
      { path: 'crear-estrategia-de-gobernanza', component: CrearStrategyComponent, canActivate: [OrgRequiredGuard, PermissionGuard], data: { code: 'STRATEGY_CREATE' } },
      { path: 'cambiar-estrategia-de-gobernanza', component: StrategyChangePageComponent, canActivate: [OrgRequiredGuard, PermissionGuard], data: { code: 'STRATEGY_CONFIGURE' } },
      { path: 'crear-seccion', component: SeccionFormComponent, canActivate: [OrgRequiredGuard, PermissionGuard], data: { code: 'SECTION_CREATE' } },
      { path: 'listar-secciones', component: SeccionListComponent, canActivate: [OrgRequiredGuard, PermissionGuard], data: { code: 'SECTION_REPORT_VIEW' } },
      { path: 'crear-rol', component: RolesCreatePageComponent, canActivate: [OrgRequiredGuard, PermissionGuard], data: { code: 'ROLE_CREATE' } },
      { path: 'gestionar-rol', component: RolesListComponent, canActivate: [OrgRequiredGuard, PermissionGuard], data: { code: 'ROLE_MANAGE' } },
      { path: 'listar-roles', component: RolesListComponent, canActivate: [OrgRequiredGuard, PermissionGuard], data: { code: 'ROLE_LIST' } },

      // --- Redirects from literal backend routes to canonical app routes ---
      // Gestión de Organización
      { path: 'gestion-de-organizacion/listar-organizaciones', redirectTo: 'listar-organizaciones', pathMatch: 'full' },
      { path: 'gestion-de-organizacion/crear-organizacion', redirectTo: 'crear-organizacion', pathMatch: 'full' },
      { path: 'gestion-de-organizacion/gestionar-organizacion', redirectTo: 'gestionar-organizacion', pathMatch: 'full' },
      { path: 'gestion-de-organizacion/cambiar-estrategia-de-gobernanza', redirectTo: 'cambiar-estrategia-de-gobernanza', pathMatch: 'full' },
      { path: 'gestion-de-organizacion/configurar-parametros-globales', redirectTo: 'configurar-parametros-globales', pathMatch: 'full' },
      { path: 'gestion-de-organizacion/ver-auditoria-de-organizacion', redirectTo: 'ver-auditoria-de-organizacion', pathMatch: 'full' },

      // Gestión de Secciones
      { path: 'gestion-de-secciones/crear-seccion', redirectTo: 'crear-seccion', pathMatch: 'full' },
      { path: 'gestion-de-secciones/listar-secciones', redirectTo: 'listar-secciones', pathMatch: 'full' },

      // Gestión de Roles
      { path: 'gestion-de-roles/crear-rol', redirectTo: 'crear-rol', pathMatch: 'full' },
      { path: 'gestion-de-roles/listar-roles', redirectTo: 'listar-roles', pathMatch: 'full' },
      { path: 'gestion-de-roles/gestionar-rol', redirectTo: 'gestionar-rol', pathMatch: 'full' },

      // Gestión de Estrategias de Gobernanza
      { path: 'gestion-de-estrategias-de-gobernanza/crear-estrategia', redirectTo: 'crear-estrategia-de-gobernanza', pathMatch: 'full' },
      { path: 'gestion-de-estrategias-de-gobernanza/cambiar-estrategia', redirectTo: 'cambiar-estrategia-de-gobernanza', pathMatch: 'full' },

      // --- Prefix placeholders keep catching everything else ---
      { path: 'gestion-de-organizacion', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-organizacion', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-secciones', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-secciones', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-roles', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-roles', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-usuarios', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-usuarios', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-opciones-menu', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-opciones-menu', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-vehiculos', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-vehiculos', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-permisos', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-permisos', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-parametros-locales', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-parametros-locales', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-estrategias-de-gobernanza', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-estrategias-de-gobernanza', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-ingresos', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-ingresos', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'reportes-y-metricas', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'reportes-y-metricas', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
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
  { path: 'dashboard/listar-secciones', redirectTo: 'listar-secciones', pathMatch: 'full' },
  { path: 'dashboard/listar-roles', redirectTo: 'listar-roles', pathMatch: 'full' },
  { path: 'dashboard/crear-rol', redirectTo: 'crear-rol', pathMatch: 'full' },
  { path: 'dashboard/gestionar-rol', redirectTo: 'gestionar-rol', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
