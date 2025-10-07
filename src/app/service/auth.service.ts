import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MenuService, RawOption } from './menu.service';
import { environment } from '../config/environment';

export interface BackendLoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;          // segundos
  username: string;
  roles: string[];
  opcionesDetalle: RawOption[];
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
  constructor(private http: HttpClient, private menu: MenuService) {}

  private api(path: string) { return `${environment.apiBase}${path}`; }
  private absolute(path: string) { return `${environment.backendHost}${path}`; }

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
    const proxyUrl = this.api('/auth/login');
    const fallbackUrl = this.absolute('/api/auth/login');

    return new Observable<BackendLoginResponse>(subscriber => {
      const attempt = (url: string, isFallback = false) => {
        this.http.post<BackendLoginResponse>(url, data).subscribe({
          next: resp => {
            if (!resp?.token) {
              subscriber.error({ status: 400, message: 'Respuesta sin token' });
              return;
            }
            // Persistir sesión mínima
            localStorage.setItem('token', resp.token);
            localStorage.setItem('username', resp.username || data.username);
            localStorage.setItem('roles', JSON.stringify(resp.roles || []));
            const expiresAt = Date.now() + (resp.expiresIn * 1000);
            localStorage.setItem('expiresAt', String(expiresAt));
            // Menú
            this.menu.setFromLogin(resp.opcionesDetalle);
            subscriber.next(resp);
            subscriber.complete();
          },
          error: err => {
            const status = err?.status;
            if (!isFallback && (status === 0 || status === 404)) {
              // Reintentar directo
              attempt(fallbackUrl, true);
            } else {
              subscriber.error(err);
            }
          }
        });
      };
      attempt(proxyUrl);
    });
  }

  /** Registro de usuario (si backend lo expone). Mantiene contrato ApiResponse<T>. */
  register(data: RegisterPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.api('/auth/register'), data);
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
    this.menu.clear();
  }
}
