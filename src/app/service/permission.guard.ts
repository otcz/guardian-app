// Implementación del guard de permisos (antes estaba vacío)
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { MenuService } from './menu.service';

export const PermissionGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const menu = inject(MenuService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const url = (state.url || '').split('?')[0];
  if (url === '/') return true;

  // Validar acceso por path directo
  if (menu.canAccessPath(url)) return true;

  // Validar por código si la ruta declara data.code
  const code = route.data && route.data['code'];
  if (code && menu.canAccessCode(String(code))) return true;

  router.navigate(['/']);
  return false;
};
