// Implementación simplificada: si la sesión está activa, permite todo; si no, redirige a login
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const PermissionGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  inject(Router).navigate(['/login']);
  return false;
};
