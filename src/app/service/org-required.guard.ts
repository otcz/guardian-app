import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { OrgContextService } from './org-context.service';

// Guard que exige contexto organizacional: redirige a login si no está autenticado,
// a listar-organizaciones si falta orgId o scope, y a listar-secciones si el alcance es SECCION y falta seccionPrincipalId
export const OrgRequiredGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const ctx = inject(OrgContextService);

  if (!auth.isAuthenticated()) { router.navigate(['/login']); return false; }

  const currentUrl = (state?.url || '').split('?')[0];

  // Permitir explícitamente rutas sin contexto: login/register/listar-organizaciones y gestión de opciones de menú
  const path = route.routeConfig?.path || '';
  const isOptionsMenuByUrl = currentUrl.startsWith('/gestion-de-opciones-menu');
  const allowNoContext = ['listar-organizaciones', 'login', 'register', ''].includes(path) || isOptionsMenuByUrl;

  // Si la ruta es permitida sin contexto, no forzar validaciones para evitar bucles
  if (allowNoContext) return true;

  const orgId = ctx.value || localStorage.getItem('currentOrgId');
  const scope = ctx.scope || (localStorage.getItem('scopeNivel') as any);
  const seccionId = ctx.seccion || localStorage.getItem('seccionPrincipalId');

  if (!orgId || !scope) {
    router.navigate(['/listar-organizaciones']);
    return false;
  }

  const scopeStr = String(scope).toUpperCase();
  if (scopeStr === 'SECCION' && !seccionId) {
    // Permitir navegar a listar-secciones para que el usuario seleccione una sección
    if (path === 'listar-secciones') return true;
    router.navigate(['/listar-secciones']);
    return false;
  }
  return true;
};
