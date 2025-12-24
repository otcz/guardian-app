import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { OrgContextService } from './org-context.service';
import { NotificationService } from './notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isAuthCall = /\/(auth)\/(login|register|password)/.test(req.url);
  const hasBypassQuery = /[?&]bypass=true(?![^#])/i.test(req.url);
  const quietHeader = req.headers.get('X-Quiet-Errors') === '1';
  const isVehiculosMis = /\/vehiculos\/mis(\?|$)/.test(req.url);

  if (isAuthCall) {
    return next(req);
  }

  if (hasBypassQuery) {
    if (req.headers.has('Authorization')) {
      req = req.clone({ headers: req.headers.delete('Authorization') });
    }
    return next(req).pipe(
      catchError((err) => {
        const status = err?.status;
        if (status === 401) {
          const router = inject(Router);
          const auth = inject(AuthService);
          auth.logout();
          router.navigate(['/login']);
        } else if (status === 403) {
          inject(Router).navigate(['/no-autorizado']);
        } else if (status === 400) {
          if (!quietHeader && !isVehiculosMis) {
            const notify = inject(NotificationService);
            const msg = err?.error?.message || err?.message || 'Solicitud inválida';
            notify.warn('Solicitud inválida', msg);
          }
        }
        return throwError(() => err);
      })
    );
  }

  const token = localStorage.getItem('token');
  const ctx = inject(OrgContextService);
  const router = inject(Router);
  const auth = inject(AuthService);

  // Normalizar path sin origen (para URLs absolutas)
  const urlPath = req.url.replace(/^https?:\/\/[^/]+/i, '');
  const isRolesEndpoint = /^\/?api\/roles(\/|$)/i.test(urlPath);
  const orgMatch = urlPath.match(/\/orgs\/([^/]+)/i);
  const urlOrgId = orgMatch ? String(orgMatch[1]) : null;

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Política de headers por endpoint
  if (!isRolesEndpoint) {
    // Si la URL indica una organización, forzar ese valor
    const effectiveOrgId = urlOrgId || ctx.value || localStorage.getItem('currentOrgId') || undefined as any;
    const scope = ctx.scope || (localStorage.getItem('scopeNivel') as any) || undefined;
    const seccionId = ctx.seccion || localStorage.getItem('seccionPrincipalId') || undefined as any;
    if (effectiveOrgId) headers['X-Org-Id'] = String(effectiveOrgId);
    if (scope) headers['X-Scope-Nivel'] = String(scope);
    if (seccionId) headers['X-Seccion-Id'] = String(seccionId);
  }

  if (Object.keys(headers).length) {
    req = req.clone({ setHeaders: headers });
  }

  return next(req).pipe(
    catchError((err) => {
      const status = err?.status;
      if (status === 401) {
        auth.logout();
        router.navigate(['/login']);
      } else if (status === 403) {
        router.navigate(['/no-autorizado']);
      }
      return throwError(() => err);
    })
  );
};
