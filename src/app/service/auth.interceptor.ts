import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // No agregar Authorization si es la petición de login
  if (req.url.includes('/api/auth/login')) {
    return next(req);
  }
  const token = localStorage.getItem('token');
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }
  return next(req);
};
