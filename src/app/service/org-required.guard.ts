import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OrgContextService } from './org-context.service';

// Evita acceder a rutas que requieren una organización activa
export const OrgRequiredGuard: CanActivateFn = (route, state) => {
  const orgCtx = inject(OrgContextService);
  const router = inject(Router);

  // Buscar id en params o query, y sincronizar con el contexto
  const fromParams = route.paramMap.get('id');
  const fromQuery = route.queryParamMap.get('id');
  const ensured = orgCtx.ensureFromQuery(fromParams || fromQuery);

  if (ensured) return true;

  // Si no hay organización, redirigir a listado y conservar returnUrl
  router.navigate(['/listar-organizaciones'], { queryParams: { returnUrl: state.url } });
  return false;
};

