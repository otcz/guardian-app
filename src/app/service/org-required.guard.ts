import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OrgContextService } from './org-context.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

// Evita acceder a rutas que requieren una organización activa
export const OrgRequiredGuard: CanActivateFn = (route, state) => {
  const orgCtx = inject(OrgContextService);
  const router = inject(Router);
  const notify = inject(NotificationService);
  const _auth = inject(AuthService); // reservado por si se requiere futura lógica de rol

  // Permitir desactivar el requerimiento desde data
  const requireOrg = route.data && route.data['requireOrg'] === false ? false : true;
  if (!requireOrg) return true;

  // Permitir bypass explícito (no usado ahora, pero mantenido para flexibilidad)
  const allowSuperAdminBypass = route.data && route.data['allowSuperAdminBypass'] === true;
  if (allowSuperAdminBypass && _auth.hasRole('SYS_SUPER_ADMIN')) return true;

  // Buscar id en params o query, o usar el almacenado
  const fromParams = route.paramMap.get('id');
  const fromQuery = route.queryParamMap.get('id');
  const ensured = orgCtx.ensureFromQuery(fromParams || fromQuery);

  if (ensured) return true;

  // Sin organización activa: informar y redirigir a listado, preservando returnUrl
  notify.warn('Selecciona una organización', 'Esta opción requiere una organización activa. Elige una y volveremos a esta pantalla.');
  router.navigate(['/listar-organizaciones'], { state: { returnUrl: state.url } });
  return false;
};
