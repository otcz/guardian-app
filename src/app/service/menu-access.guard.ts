// Guard: permite acceso solo si la ruta existe en opcionesDetalle (MenuService)
import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { MenuService } from './menu.service';
import { AuthService } from './auth.service';

export const MenuAccessGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const menu = inject(MenuService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) { return router.parseUrl('/login'); }

  const targetUrl = (state?.url || '').split('?')[0];
  if (!targetUrl) return router.parseUrl('/no-autorizado');

  if (menu.canAccessPath(targetUrl)) return true;

  // Si la ruta padre (sin último segmento) está permitida, permitir fallback para placeholders
  try {
    const parent = targetUrl.replace(/\/?[^/]+$/, '') || '/';
    if (parent && menu.canAccessPath(parent)) return true;
  } catch {}

  return router.parseUrl('/no-autorizado');
};

