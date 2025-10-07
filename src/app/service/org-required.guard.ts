import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Guard simplificado: si la sesión está activa, permite el acceso sin exigir organización; si no, redirige a login
export const OrgRequiredGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  inject(Router).navigate(['/login']);
  return false;
};
