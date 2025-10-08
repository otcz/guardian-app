import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { OrgContextService } from './org-context.service';

// Guard que exige contexto organizacional: redirige a login si no está autenticado,
// a listar-organizaciones si falta orgId o scope, y a listar-secciones si el alcance es SECCION y falta seccionPrincipalId
export const OrgRequiredGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const ctx = inject(OrgContextService);

  if (!auth.isAuthenticated()) { router.navigate(['/login']); return false; }

  // Permitir explícitamente rutas de selección/listado sin contexto
  const path = route.routeConfig?.path || '';
  const allowNoContext = ['listar-organizaciones', 'login', 'register', ''].includes(path);
  if (allowNoContext) return true;

  const orgId = ctx.value || localStorage.getItem('currentOrgId');
  const scope = ctx.scope || (localStorage.getItem('scopeNivel') as any);
  const seccionId = ctx.seccion || localStorage.getItem('seccionPrincipalId');

  if (!orgId || !scope) {
    router.navigate(['/listar-organizaciones']);
    return false;
  }
  if (String(scope).toUpperCase() === 'SECCION' && !seccionId) {
    router.navigate(['/listar-secciones']);
    return false;
  }
  return true;
};
