import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { MenuService } from './menu.service';

export const PermissionGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const menu = inject(MenuService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);

  const url = state.url || '';
  return menu.canAccessPath(url) ? true : router.createUrlTree(['/dashboard']);
};

