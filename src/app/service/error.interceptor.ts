import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from './notification.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notify = inject(NotificationService);
  return next(req).pipe(
    catchError((err) => {
      if (err?.status === 401) {
        notify.warn('Sesión expirada o no autenticado.');
        router.navigate(['/login']);
      } else if (err?.status === 403) {
        notify.warn('No tienes permisos para esta acción.');
      }
      return throwError(() => err);
    })
  );
};

