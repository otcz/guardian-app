import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OrgContextService } from './org-context.service';
import { AuthService } from './auth.service';

// Evita acceder a rutas que requieren una organización activa
export const OrgRequiredGuard: CanActivateFn = (route, state) => {
  const orgCtx = inject(OrgContextService);
  const router = inject(Router);
  const auth = inject(AuthService);

  // SYSADMIN puede entrar sin selección previa de organización
  if (auth.hasRole('SYSADMIN')) {
    return true;
  }

  // Buscar id en params o query, y sincronizar con el contexto
  const fromParams = route.paramMap.get('id');
  const fromQuery = route.queryParamMap.get('id');
  const ensured = orgCtx.ensureFromQuery(fromParams || fromQuery);

  if (ensured) return true;

  // Si no hay organización, redirigir a listado y conservar returnUrl en navigation state (no en la URL)
  router.navigate(['/listar-organizaciones'], { state: { returnUrl: state.url } });
  return false;
};
