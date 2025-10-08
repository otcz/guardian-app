import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { OrgContextService } from './org-context.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const ctx = inject(OrgContextService);
  const orgId = ctx.value || localStorage.getItem('currentOrgId') || undefined as any;
  const scope = ctx.scope || (localStorage.getItem('scopeNivel') as any) || undefined;
  const seccionId = ctx.seccion || localStorage.getItem('seccionPrincipalId') || undefined as any;

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (orgId) headers['X-Org-Id'] = String(orgId);
  if (scope) headers['X-Scope-Nivel'] = String(scope);
  if (seccionId) headers['X-Seccion-Id'] = String(seccionId);

  if (Object.keys(headers).length) {
    req = req.clone({ setHeaders: headers });
  }

  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err) => {
      const status = err?.status;
      if (status === 401) {
        // Sesión inválida o expirada: limpiar y enviar a login
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
