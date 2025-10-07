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

  // Normalizar URL (sin query) y sin slash final
  let url = (state.url || '').split('?')[0];
  if (url.length > 1 && url.endsWith('/')) url = url.replace(/\/$/, '');
  if (url === '/') return true;

  // Validar acceso por path directo exacto
  if (menu.canAccessPath(url)) return true;

  // Soporte para rutas con parámetros (e.g., /ruta/:id) usando la definición del routeConfig
  const cfgPath = route.routeConfig?.path || '';
  if (cfgPath && cfgPath.includes(':')) {
    const base = '/' + cfgPath.split('/').filter(seg => seg && !seg.startsWith(':')).join('/');
    if (base && menu.canAccessPath(base)) return true;
  }

  // Validar por código si la ruta declara data.code
  const code = route.data && route.data['code'];
  if (code && menu.canAccessCode(String(code))) return true;

  router.navigate(['/']);
  return false;
};
