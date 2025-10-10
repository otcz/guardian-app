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
  const isApplyStrategy = /\/orgs\/.+\/estrategias\/.+\/aplicar(\b|\?)/.test(req.url);

  // Nunca adjuntar auth/ctx en endpoints de auth
  if (isAuthCall) {
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

  // En llamadas con bypass (?bypass=true) o al endpoint de aplicar, asegurarse de NO enviar Authorization,
  // pero no tocar ni bloquear headers personalizados X-* existentes (X-User, X-User-Roles, X-Api-Sysadmin-Key, etc.)
  if (hasBypassQuery || isApplyStrategy) {
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
          const notify = inject(NotificationService);
          const msg = err?.error?.message || err?.message || 'Solicitud inválida';
          notify.warn('Solicitud inválida', msg);
        }
        return throwError(() => err);
      })
    );
  }

  // Resto de llamadas: adjuntar token y contexto organizacional si existen
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
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((err) => {
      const status = err?.status;
      if (status === 401) {
        auth.logout();
        router.navigate(['/login']);
      } else if (status === 403) {
        router.navigate(['/no-autorizado']);
      } else if (status === 400) {
        const msg = err?.error?.message || err?.message || 'Solicitud inválida';
        notify.warn('Solicitud inválida', msg);
      }
      return throwError(() => err);
    })
  );
};
