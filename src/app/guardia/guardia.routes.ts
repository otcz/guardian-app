import { Routes } from '@angular/router';
import { AuthGuard } from '../service/auth.guard';

export const GUARDIA_ROUTES: Routes = [
  {
    path: 'gestion',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./gestion-guardias/guardia-list/guardia-list.component').then(
            m => m.GuardiaListComponent
          ),
        data: { roles: ['ADMIN', 'ORGADMIN'] }
      },
      {
        path: 'nuevo',
        loadComponent: () =>
          import('./gestion-guardias/guardia-form/guardia-form.component').then(
            m => m.GuardiaFormComponent
          ),
        data: { roles: ['ADMIN', 'ORGADMIN'] }
      },
      {
        path: ':id/editar',
        loadComponent: () =>
          import('./gestion-guardias/guardia-form/guardia-form.component').then(
            m => m.GuardiaFormComponent
          ),
        data: { roles: ['ADMIN', 'ORGADMIN'] }
      }
    ]
  },
  {
    path: 'control',
    loadComponent: () =>
      import('./validacion-ingreso/control-ingreso-salida/control-ingreso-salida.component').then(
        m => m.ControlIngresoSalidaComponent
      ),
    canActivate: [AuthGuard],
    data: { roles: ['GUARDIA', 'ADMIN', 'ORGADMIN'] }
  },
  {
    path: 'administrar-usuarios',
    loadComponent: () =>
      import(
        './gestion-restricciones/administrar-guardias-usuario/administrar-guardias-usuario.component'
      ).then(m => m.AdministrarGuardiasUsuarioComponent),
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'ORGADMIN'] }
  },
  {
    path: 'movimientos',
    loadComponent: () =>
      import('./reportes-guardia/movimientos-list/movimientos-list.component').then(
        m => m.MovimientosListComponent
      ),
    canActivate: [AuthGuard],
    data: { roles: ['GUARDIA', 'ADMIN', 'ORGADMIN'] }
  },
  {
    path: '',
    redirectTo: 'control',
    pathMatch: 'full'
  }
];

