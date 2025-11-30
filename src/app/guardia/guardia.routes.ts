import { Routes } from '@angular/router';
import { AuthGuard } from '../service/auth.guard';

export const GUARDIA_ROUTES: Routes = [
  // Control de Ingreso y Salida (Principal)
  {
    path: 'control-de-ingreso-y-salida',
    loadComponent: () =>
      import('./validacion-ingreso/control-ingreso-salida/control-ingreso-salida.component').then(
        m => m.ControlIngresoSalidaComponent
      ),
    canActivate: [AuthGuard],
    data: {
      roles: ['GUARDIA', 'ADMIN', 'ORGADMIN'],
      permission: 'ITEM_CONTROL_DE_INGRESO_Y_SALIDA'
    }
  },

  // Validar Usuarios (Solo lectura)
  {
    path: 'validar-usuarios',
    loadComponent: () =>
      import('./validacion-ingreso/validar-usuario/validar-usuario.component').then(
        m => m.ValidarUsuarioComponent
      ),
    canActivate: [AuthGuard],
    data: {
      roles: ['GUARDIA', 'ADMIN', 'ORGADMIN'],
      permission: 'ITEM_VALIDAR_USUARIOS'
    }
  },

  // Validar Vehículos (Solo lectura)
  {
    path: 'validar-vehiculos',
    loadComponent: () =>
      import('./validacion-ingreso/validar-vehiculo/validar-vehiculo.component').then(
        m => m.ValidarVehiculoComponent
      ),
    canActivate: [AuthGuard],
    data: {
      roles: ['GUARDIA', 'ADMIN', 'ORGADMIN'],
      permission: 'ITEM_VALIDAR_VEHICULOS'
    }
  },

  // Ver Movimientos Guardia
  {
    path: 'ver-movimientos-guardia',
    loadComponent: () =>
      import('./reportes-guardia/movimientos-list/movimientos-list.component').then(
        m => m.MovimientosListComponent
      ),
    canActivate: [AuthGuard],
    data: {
      roles: ['GUARDIA', 'ADMIN', 'ORGADMIN'],
      permission: 'ITEM_VER_MOVIMIENTOS_GUARDIA'
    }
  },

  // Ver Entradas Abiertas (Admin)
  {
    path: 'ver-entradas-abiertas',
    loadComponent: () =>
      import('./reportes-guardia/entradas-abiertas/entradas-abiertas.component').then(
        m => m.EntradasAbiertasComponent
      ),
    canActivate: [AuthGuard],
    data: {
      roles: ['ADMIN', 'ORGADMIN'],
      permission: 'ITEM_VER_ENTRADAS_ABIERTAS'
    }
  },

  // Gestión de Guardias (CRUD)
  {
    path: 'gestion',
    canActivate: [AuthGuard],
    data: {
      roles: ['ADMIN', 'ORGADMIN']
    },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./gestion-guardias/guardia-list/guardia-list.component').then(
            m => m.GuardiaListComponent
          ),
        data: { permission: 'ITEM_LISTAR_GUARDIAS' }
      },
      {
        path: 'nuevo',
        loadComponent: () =>
          import('./gestion-guardias/guardia-form/guardia-form.component').then(
            m => m.GuardiaFormComponent
          ),
        data: { permission: 'ITEM_CREAR_GUARDIA' }
      },
      {
        path: ':id/editar',
        loadComponent: () =>
          import('./gestion-guardias/guardia-form/guardia-form.component').then(
            m => m.GuardiaFormComponent
          ),
        data: { permission: 'ITEM_GESTIONAR_GUARDIA' }
      }
    ]
  },

  // Administrar Guardias por Usuario
  {
    path: 'administrar-usuarios',
    loadComponent: () =>
      import(
        './gestion-restricciones/administrar-guardias-usuario/administrar-guardias-usuario.component'
      ).then(m => m.AdministrarGuardiasUsuarioComponent),
    canActivate: [AuthGuard],
    data: {
      roles: ['ADMIN', 'ORGADMIN'],
      permission: 'ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO'
    }
  },

  // Redirect por defecto
  {
    path: '',
    redirectTo: 'control-de-ingreso-y-salida',
    pathMatch: 'full'
  }
];

