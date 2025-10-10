import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { OrgContextService } from './org-context.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Evitar adjuntar Authorization/X-* a endpoints de auth para no interferir con login/registro/cambios de password
  const isAuthCall = /\/(auth)\/(login|register|password)/.test(req.url);
  // Evitar adjuntar Authorization/X-* si hay bypass SYSADMIN explícito o si es el endpoint de aplicar estrategia
  const hasBypassHeader = req.headers.has('X-User') || req.headers.has('X-Api-Sysadmin-Key');
  const hasBypassQuery = /[?&]bypass=true(?![^#])/i.test(req.url);
  const isApplyStrategy = /\/orgs\/.+\/estrategias\/.+\/aplicar(\b|\?)/.test(req.url);
  const shouldSkipAuth = isAuthCall || hasBypassHeader || hasBypassQuery || isApplyStrategy;

  if (shouldSkipAuth) {
    return next(req).pipe(
      catchError((err) => {
        const status = err?.status;
        if (status === 401) {
          const router = inject(Router);
          const auth = inject(AuthService);
          auth.logout();
          router.navigate(['/login']);
        }
        return throwError(() => err);
      })
    );
  }

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
