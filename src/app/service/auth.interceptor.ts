import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
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
