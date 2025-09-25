import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MenuService } from './menu.service';

// Permite proteger rutas por código (data.code) o por path actual.
export const PermissionGuard: CanActivateFn = (route, state) => {
  const menu = inject(MenuService);
  const router = inject(Router);

  const code = route.data?.['code'] as string | undefined;
  const allowed = code ? menu.canAccessCode(code) : menu.canAccessPath(state.url);

  if (allowed) return true;

  router.navigate(['/dashboard']);
  return false;
};

