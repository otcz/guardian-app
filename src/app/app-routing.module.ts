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
import { OrganizationConfigComponent } from './admin/organizacion-config-component/organization-config.component';
import { SeccionFormComponent } from './admin/seccion-form-component/seccion-form.component';
import { SeccionListComponent } from './admin/seccion-list-component/seccion-list.component';
import { RolesListComponent } from './admin/roles-list-component/roles-list.component';
import { RolesCreatePageComponent } from './admin/roles-create-page/roles-create-page.component';
import { UsuariosCrearComponent } from './admin/usuarios-crear-component/usuarios-crear.component';
import { UsuariosListarComponent } from './admin/usuarios-listar-component/usuarios-listar.component';
import { UsuarioGestionarComponent } from './admin/usuario-gestionar-component/usuario-gestionar.component';
import { UsuarioAsignarSeccionComponent } from './admin/usuario-asignar-seccion-component/usuario-asignar-seccion.component';
import { UsuarioAsignarRolesComponent } from './admin/usuario-asignar-roles-component/usuario-asignar-roles.component';
import { OrgRequiredGuard } from './service/org-required.guard';
import { SeccionAsignarAdminComponent } from './admin/seccion-asignar-admin-component/seccion-asignar-admin.component';
import { CrearOpcionComponent } from './admin/opciones-menu/crear-opcion/crear-opcion.component';
import { GestionarOpcionComponent } from './admin/opciones-menu/gestionar-opcion/gestionar-opcion.component';
import { AsignarMenuARolComponent } from './admin/opciones-menu/asignar-menu-a-rol/asignar-menu-a-rol.component';
import { NoAutorizadoComponent } from './shared/no-autorizado/no-autorizado.component';
import { AsignarMenuAUsuarioComponent } from './admin/opciones-menu/asignar-menu-a-usuario/asignar-menu-a-usuario.component';
import { LugarFormComponent } from './admin/lugar-form-component/lugar-form.component';
import { LugaresListComponent } from './admin/lugares-list-component/lugares-list.component';
import { SeccionGestionarComponent } from './admin/seccion-gestionar-component/seccion-gestionar.component';
import {PuntoControlCrearComponent} from './admin/punto-control-crear-component/punto-control-crear.component';

export const appRoutes: Routes = [
  // Rutas públicas para pruebas de gestión de opciones (sin guards)
  { path: 'gestion-de-opciones-menu', redirectTo: 'gestion-de-opciones-menu/gestionar-opcion', pathMatch: 'full' },
  { path: 'gestion-de-opciones-menu/crear-opcion', component: CrearOpcionComponent },
  { path: 'gestion-de-opciones-menu/gestionar-opcion', component: GestionarOpcionComponent },
  { path: 'gestion-de-opciones-menu/asignar-menu-a-rol', component: AsignarMenuARolComponent },
  { path: 'gestion-de-opciones-menu/asignar-menu-a-usuario', component: AsignarMenuAUsuarioComponent },

  // Ruta pública para mostrar mensaje de acceso restringido
  { path: 'no-autorizado', component: NoAutorizadoComponent },

  // RUTA DE PRUEBA - Crear Punto de Control (sin guard)
  { path: 'test-crear-punto-control', component: PuntoControlCrearComponent },

  { path: 'system/login', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    canActivate: [AuthGuard, OrgRequiredGuard],
    children: [
      { path: '', component: DashboardHomeComponent },
      { path: 'listar-organizaciones', component: OrganizationListComponent },
      { path: 'crear-organizacion', component: OrganizationFormComponent, canActivate: [PermissionGuard], data: { code: 'ORG_CREATE' } },
      { path: 'gestionar-organizacion', component: OrganizationConfigComponent, canActivate: [PermissionGuard], data: { code: 'ORG_MANAGE' } },
      { path: 'gestion-de-opciones-menu/asignar-menu-a-usuario', component: AsignarMenuAUsuarioComponent },
      { path: 'configurar-parametros-globales', component: OrganizationParamsComponent, canActivate: [PermissionGuard], data: { code: 'PARAM_GLOBAL_MANAGE' } },
      { path: 'configurar-parametros-globales/:id', component: OrganizationParamsComponent, canActivate: [PermissionGuard], data: { code: 'PARAM_GLOBAL_MANAGE' } },
      { path: 'ver-auditoria-de-organizacion', component: OrganizationAuditComponent, canActivate: [PermissionGuard], data: { code: 'AUDIT_ORG_VIEW' } },
      { path: 'crear-seccion', component: SeccionFormComponent, canActivate: [PermissionGuard], data: { code: 'SECTION_CREATE' } },
      { path: 'listar-secciones', component: SeccionListComponent, canActivate: [PermissionGuard], data: { code: 'SECTION_REPORT_VIEW' } },
      { path: 'asignar-administrador-de-seccion', component: SeccionAsignarAdminComponent, canActivate: [PermissionGuard], data: { code: 'SECTION_ASSIGN_ADMIN' } },
      { path: 'crear-rol', component: RolesCreatePageComponent, canActivate: [PermissionGuard], data: { code: 'ROLE_CREATE' } },
      { path: 'gestionar-rol', component: RolesListComponent, canActivate: [PermissionGuard], data: { code: 'ROLE_MANAGE' } },
      { path: 'listar-roles', component: RolesListComponent, canActivate: [PermissionGuard], data: { code: 'ROLE_LIST' } },

      // --- Gestión de lugares (rutas concretas) ---
      { path: 'crear-lugar', component: LugarFormComponent },
      { path: 'listar-lugares', component: LugaresListComponent },

      // --- Gestión de usuarios ---
      { path: 'gestion-de-usuarios/crear-usuario', component: UsuariosCrearComponent, canActivate: [PermissionGuard], data: { code: 'USER_CREATE' } },
      { path: 'gestion-de-usuarios/listar-usuarios', component: UsuariosListarComponent, canActivate: [PermissionGuard], data: { code: 'USER_LIST' } },
      { path: 'gestion-de-usuarios/gestionar-usuario', component: UsuarioGestionarComponent, canActivate: [PermissionGuard], data: { code: 'USER_MANAGE' } },
      { path: 'gestion-de-usuarios/asignar-usuario-a-seccion', component: UsuarioAsignarSeccionComponent, canActivate: [PermissionGuard], data: { code: 'USER_ASSIGN_SECTION' } },
      { path: 'gestion-de-usuarios/asignar-roles', component: UsuarioAsignarRolesComponent, canActivate: [PermissionGuard], data: { code: 'USER_ASSIGN_ROLES' } },

      // --- Gestión de opciones de menú ---
      { path: 'gestion-de-opciones-menu', redirectTo: 'gestion-de-opciones-menu/gestionar-opcion', pathMatch: 'full' },
      { path: 'gestion-de-opciones-menu/crear-opcion', component: CrearOpcionComponent },
      { path: 'gestion-de-opciones-menu/gestionar-opcion', component: GestionarOpcionComponent },
      { path: 'gestion-de-opciones-menu/asignar-menu-a-rol', component: AsignarMenuARolComponent },
      { path: 'gestion-de-opciones-menu/asignar-menu-a-usuario', component: AsignarMenuAUsuarioComponent },

      // --- Gestión de vehículos ---
      { path: 'gestion-de-vehiculos/mis-vehiculos', canActivate: [PermissionGuard], data: { code: 'VEHICLE_MY' }, loadComponent: () => import('./admin/vehiculos-mis-component/vehiculos-mis.component').then(m => m.VehiculosMisComponent) },
      { path: 'gestion-de-vehiculos/activar-vehiculos', canActivate: [PermissionGuard], data: { code: 'VEHICLE_SECTION_ACTIVATE' }, loadComponent: () => import('./admin/vehiculos-activar-component/vehiculos-activar.component').then(m => m.VehiculosActivarComponent) },
      { path: 'gestion-de-vehiculos/asignar-vehiculo-a-seccion', canActivate: [PermissionGuard], data: { code: 'SECTION_VEHICLE_ASSIGN' }, loadComponent: () => import('./admin/vehiculos-asignar-seccion-component/vehiculos-asignar-seccion.component').then(m => m.VehiculosAsignarSeccionComponent) },
      { path: 'gestion-de-vehiculos/crear-vehiculo', canActivate: [PermissionGuard], data: { code: 'VEHICLE_CREATE' }, loadComponent: () => import('./admin/vehiculos-crear-component/vehiculos-crear.component').then(m => m.VehiculosCrearComponent) },
      { path: 'gestion-de-vehiculos/gestionar-vehiculo', canActivate: [PermissionGuard], data: { code: 'VEHICLE_MANAGE' }, loadComponent: () => import('./admin/vehiculos-gestionar-component/vehiculos-gestionar.component').then(m => m.VehiculosGestionarComponent) },

      // Redirects canónicos para gestión de vehículos
      { path: 'gestion-de-vehiculos/listar-vehiculos', redirectTo: 'gestion-de-vehiculos/mis-vehiculos', pathMatch: 'full' },

      // --- Módulo Guardia (Control de Ingreso y Salida) ---
      {
        path: 'modulo-guardia',
        loadChildren: () => import('./guardia/guardia.routes').then(m => m.GUARDIA_ROUTES)
      },

      // --- Redirects from literal backend routes to canonical app routes ---
      // Gestión de Organización
      { path: 'gestion-de-organizacion/listar-organizaciones', redirectTo: 'listar-organizaciones', pathMatch: 'full' },
      { path: 'gestion-de-organizacion/crear-organizacion', redirectTo: 'crear-organizacion', pathMatch: 'full' },
      { path: 'gestion-de-organizacion/gestionar-organizacion', redirectTo: 'gestionar-organizacion', pathMatch: 'full' },
      { path: 'gestion-de-organizacion/configurar-parametros-globales', redirectTo: 'configurar-parametros-globales', pathMatch: 'full' },
      { path: 'gestion-de-organizacion/ver-auditoria-de-organizacion', redirectTo: 'ver-auditoria-de-organizacion', pathMatch: 'full' },

      // Gestión de Secciones
      { path: 'gestion-de-secciones/crear-seccion', redirectTo: 'crear-seccion', pathMatch: 'full' },
      { path: 'gestion-de-secciones/listar-secciones', redirectTo: 'listar-secciones', pathMatch: 'full' },
      { path: 'gestion-de-secciones/asignar-administrador-de-seccion', redirectTo: 'asignar-administrador-de-seccion', pathMatch: 'full' },
      { path: 'gestion-de-secciones/gestionar-seccion', component: SeccionGestionarComponent, canActivate: [PermissionGuard], data: { code: 'SECTION_REPORT_VIEW' } },
      // LEGACY: Redirects desde rutas antiguas a las nuevas rutas de PUNTOS DE CONTROL
      {
        path: 'gestion-de-secciones/crear-punto-de-control',
        redirectTo: 'puntos-de-control/crear-punto-de-control',
        pathMatch: 'full'
      },
      {
        path: 'gestion-de-secciones/administrar-guardias-por-usuario',
        redirectTo: 'puntos-de-control/administrar-guardias-por-usuario',
        pathMatch: 'full'
      },

      // --- PUNTOS DE CONTROL (nuevo menú) ---
      {
        path: 'puntos-de-control/crear-punto-de-control',
        component: PuntoControlCrearComponent,
        canActivate: [PermissionGuard],
        data: { code: 'ITEM_CREAR_PUNTO_DE_CONTROL' }
      },
      {
        path: 'puntos-de-control/administrar-guardias-por-usuario',
        loadComponent: () => import('./admin/administrar-guardias-por-usuario-component/administrar-guardias-por-usuario.component').then(m => m.AdministrarGuardiasPorUsuarioComponent),
        canActivate: [PermissionGuard],
        data: { code: 'ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO' }
      },
      // Accesos a Lugares desde el prefijo de Secciones
      { path: 'gestion-de-secciones/listar-lugares', redirectTo: 'listar-lugares', pathMatch: 'full' },
      { path: 'gestion-de-secciones/crear-lugar', redirectTo: 'crear-lugar', pathMatch: 'full' },

      // Gestión de Roles
      { path: 'gestion-de-roles/crear-rol', redirectTo: 'crear-rol', pathMatch: 'full' },
      { path: 'gestion-de-roles/listar-roles', redirectTo: 'listar-roles', pathMatch: 'full' },
      { path: 'gestion-de-roles/gestionar-rol', redirectTo: 'gestionar-rol', pathMatch: 'full' },

      // Gestión de Lugares
      { path: 'gestion-de-lugares/crear-lugar', redirectTo: 'crear-lugar', pathMatch: 'full' },
      { path: 'gestion-de-lugares/listar-lugares', redirectTo: 'listar-lugares', pathMatch: 'full' },

      // --- Prefix placeholders keep catching everything else ---
      { path: 'gestion-de-organizacion', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-organizacion', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-secciones', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-secciones', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-roles', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-roles', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-usuarios', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-usuarios', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-vehiculos', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-vehiculos', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
      { path: 'gestion-de-permisos', component: PagePlaceholderComponent, canActivate: [PermissionGuard] },
      { path: 'gestion-de-permisos', children: [ { path: '**', component: PagePlaceholderComponent, canActivate: [PermissionGuard] } ] },
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
  { path: 'dashboard/configurar-parametros-globales', redirectTo: 'configurar-parametros-globales', pathMatch: 'full' },
  { path: 'dashboard/ver-auditoria-de-organizacion', redirectTo: 'ver-auditoria-de-organizacion', pathMatch: 'full' },
  { path: 'dashboard/listar-secciones', redirectTo: 'listar-secciones', pathMatch: 'full' },
  { path: 'dashboard/listar-roles', redirectTo: 'listar-roles', pathMatch: 'full' },
  { path: 'dashboard/crear-rol', redirectTo: 'crear-rol', pathMatch: 'full' },
  { path: 'dashboard/gestionar-rol', redirectTo: 'gestionar-rol', pathMatch: 'full' },
  // Legacy redirects para Gestión de Opciones de Menú
  { path: 'dashboard/gestion-de-opciones-menu', redirectTo: 'gestion-de-opciones-menu/gestionar-opcion', pathMatch: 'full' },
  { path: 'dashboard/gestion-de-opciones-menu/crear-opcion', redirectTo: 'gestion-de-opciones-menu/crear-opcion', pathMatch: 'full' },
  { path: 'dashboard/gestion-de-opciones-menu/gestionar-opcion', redirectTo: 'gestion-de-opciones-menu/gestionar-opcion', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
