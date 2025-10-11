import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MenuService, RawOption } from './menu.service';
import { environment } from '../config/environment';
import { OrgContextService, ScopeNivel } from './org-context.service';

export interface BackendLoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;          // segundos
  username: string;
  roles: string[];
  opcionesDetalle: RawOption[];
  // Opcionales: distintos backends pueden incluir estos campos
  orgId?: string | number;
  organizacionId?: string | number;
  organizationId?: string | number;
  organization?: { id?: string | number; nombre?: string; name?: string } | null;
  organizacion?: { id?: string | number; nombre?: string; name?: string } | null;
  orgName?: string;
  scopeNivel?: ScopeNivel | string | null;
  seccionPrincipalId?: string | number | null;
}

// Interfaces reintroducidas para compatibilidad con register.component
export interface RegisterPayload {
  orgCode?: string;
  username: string;
  password: string;
  nombres: string;
  apellidos: string;
  documentoIdentidad: string;
  tipoDocumento: string;
  email?: string;
  telefono?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data: T;
  timestamp?: string;
  path?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient, private menu: MenuService, private orgCtx: OrgContextService) {}

  private api(path: string) { return `${environment.apiBase}${path}`; }
  private absolute(path: string) { return `${environment.backendHost}${path}`; }
  private authAbsolute(path: string) { return `${environment.authHost}${environment.authBase}${path}`; }

  // --- Helpers de sesión/expiración ---
  private getExpiresAt(): number | null {
    try { const v = localStorage.getItem('expiresAt'); return v ? Number(v) : null; } catch { return null; }
  }
  tokenRemainingMillis(): number {
    const exp = this.getExpiresAt();
    if (!exp) return 0;
    return Math.max(0, exp - Date.now());
  }
  isTokenExpired(): boolean {
    const exp = this.getExpiresAt();
    return !!exp && Date.now() >= exp;
  }

  /** Devuelve los roles actuales almacenados (normalizados en mayúsculas) */
  getRoles(): string[] {
    try {
      const raw = localStorage.getItem('roles');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map((r: any) => String(r).toUpperCase()) : [];
    } catch { return []; }
  }
  /** True si el usuario posee el rol indicado (case-insensitive) */
  hasRole(role: string): boolean { return this.getRoles().includes(String(role || '').toUpperCase()); }
  /** True si el usuario posee alguno de los roles indicados */
  hasAnyRole(...roles: string[]): boolean {
    const set = new Set(this.getRoles());
    return roles.some(r => set.has(String(r || '').toUpperCase()));
  }

  /** Login basado en formato real devuelto por backend (sin envoltorio) */
  login(data: { username: string; password: string; orgCode?: string }): Observable<BackendLoginResponse> {
    const primaryUrl = this.authAbsolute('/login');
    const proxyAuthUrl = `${environment.apiFallbackBases[0] || ''}/auth/login`;
    const apiAuthUrl = this.api('/auth/login');
    const absoluteApiAuthUrl = this.absolute('/api/auth/login');

    return new Observable<BackendLoginResponse>(subscriber => {
      const tryQueue: string[] = [proxyAuthUrl, apiAuthUrl, absoluteApiAuthUrl];
      if (environment.preferAuthDedicated) tryQueue.push(primaryUrl);
      const attemptNext = (idx: number) => {
        if (idx >= tryQueue.length) { subscriber.error({ status: 0, message: 'No fue posible contactar el servicio de autenticación.' }); return; }
        const url = tryQueue[idx];
        this.http.post<BackendLoginResponse>(url, data).subscribe({
          next: resp => {
            if (!resp?.token) { subscriber.error({ status: 400, message: 'Respuesta sin token' }); return; }
            // Persistir sesión mínima
            localStorage.setItem('token', resp.token);
            localStorage.setItem('username', resp.username || data.username);
            localStorage.setItem('roles', JSON.stringify(resp.roles || []));
            const expiresAt = Date.now() + (resp.expiresIn * 1000);
            localStorage.setItem('expiresAt', String(expiresAt));

            // Contexto de organización
            try {
              const orgId = (resp.orgId ?? resp.organizacionId ?? resp.organizationId ?? resp.organization?.id ?? resp.organizacion?.id);
              const orgName = (resp.orgName ?? resp.organization?.nombre ?? resp.organization?.name ?? resp.organizacion?.nombre ?? resp.organizacion?.name);
              if (orgId != null) localStorage.setItem('currentOrgId', String(orgId));
              if (orgName != null) localStorage.setItem('currentOrgName', String(orgName));
              const scope = resp.scopeNivel != null ? String(resp.scopeNivel).toUpperCase() : null;
              const seccionId = resp.seccionPrincipalId != null ? String(resp.seccionPrincipalId) : null;
              if (scope) localStorage.setItem('scopeNivel', scope); else localStorage.removeItem('scopeNivel');
              if (seccionId) localStorage.setItem('seccionPrincipalId', seccionId); else localStorage.removeItem('seccionPrincipalId');
              this.orgCtx.setContext({ orgId: orgId != null ? String(orgId) : null, scopeNivel: (scope as any), seccionPrincipalId: seccionId });
            } catch {}

            // Menú
            this.menu.setFromLogin(resp.opcionesDetalle);
            subscriber.next(resp);
            subscriber.complete();
          },
          error: (err) => {
            const status = err?.status;
            // Propagar inmediatamente errores "lógicos" del login para que el componente maneje 428, 401, 400
            if (status === 428 || status === 401 || status === 400) {
              subscriber.error(err);
              return;
            }
            // Reintentar sólo en fallas de red/404/etc.
            attemptNext(idx + 1);
          }
        });
      };
      attemptNext(0);
    });
  }

  /** Registro de usuario (si backend lo expone). Mantiene contrato ApiResponse<T>. */
  register(data: RegisterPayload): Observable<ApiResponse<any>> {
    const primary = this.authAbsolute('/register');
    const fallback = this.api('/auth/register');

    if (!environment.preferAuthDedicated) {
      return this.http.post<ApiResponse<any>>(fallback, data);
    }

    // Intentar primero /api y si falla, usar host dedicado
    return new Observable<ApiResponse<any>>(subscriber => {
      this.http.post<ApiResponse<any>>(fallback, data).subscribe({
        next: r => { subscriber.next(r); subscriber.complete(); },
        error: () => {
          this.http.post<ApiResponse<any>>(primary, data).subscribe({
            next: r => { subscriber.next(r); subscriber.complete(); },
            error: e => subscriber.error(e)
          });
        }
      });
    });
  }

  /** Establecer primera contraseña usando un setupToken de un solo propósito */
  firstSetPassword(data: { setupToken: string; newPassword: string; confirmPassword: string }): Observable<any> {
    const primaryUrl = this.authAbsolute('/password/first-set');
    const fallbackUrl = this.absolute('/api/auth/password/first-set');

    if (!environment.preferAuthDedicated) {
      return this.http.post<any>(fallbackUrl, data);
    }

    // Intentar primero /api y luego el host dedicado si falla
    return new Observable<any>(subscriber => {
      this.http.post<any>(fallbackUrl, data).subscribe({
        next: resp => { subscriber.next(resp); subscriber.complete(); },
        error: () => {
          this.http.post<any>(primaryUrl, data).subscribe({
            next: resp => { subscriber.next(resp); subscriber.complete(); },
            error: err => subscriber.error(err)
          });
        }
      });
    });
  }

  isAuthenticated(): boolean {
    const hasToken = !!localStorage.getItem('token');
    if (!hasToken) return false;
    if (this.isTokenExpired()) {
      // Limpiar si expiró
      this.logout();
      return false;
    }
    return true;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('username');
    localStorage.removeItem('roles');
    try { localStorage.removeItem('currentOrgId'); } catch {}
    try { localStorage.removeItem('currentOrgName'); } catch {}
    try { localStorage.removeItem('scopeNivel'); } catch {}
    try { localStorage.removeItem('seccionPrincipalId'); } catch {}
    this.orgCtx.clear();
    this.menu.clear();
  }
}
