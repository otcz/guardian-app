// Servicio de Gestión de Usuarios basado en los endpoints provistos
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../config/environment';

export interface ApiResponse<T> { success?: boolean; message?: string; data?: T; }

export type ScopeNivel = 'ORGANIZACION' | 'SECCION';

export interface UserEntity {
  id: string;
  username: string;
  nombreCompleto?: string | null;
  email?: string | null;
  activo: boolean;
  scopeNivel?: ScopeNivel | null;
  seccionPrincipalId?: string | null;
  orgId?: string | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
}

export interface CreateUserRequest {
  username: string;
  nombreCompleto?: string | null;
  email?: string | null;
  scopeNivel?: ScopeNivel;
  seccionPrincipalId?: string | null;
}

export interface UpdateUserRequest {
  username?: string; // opcional en PATCH
  nombreCompleto?: string | null;
  email?: string | null;
  scopeNivel?: ScopeNivel;
  seccionPrincipalId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private base = environment.apiBase;
  private json = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
  private accept = new HttpHeaders({ Accept: 'application/json' });

  constructor(private http: HttpClient) {}

  private unwrap<T = any>(payload: any): T {
    return (payload && typeof payload === 'object' && 'data' in payload) ? (payload as any).data as T : (payload as T);
  }

  private ensureUser(d: any): UserEntity {
    return {
      id: String(d?.id ?? d?._id ?? ''),
      username: String(d?.username ?? d?.userName ?? ''),
      nombreCompleto: d?.nombreCompleto ?? d?.fullName ?? null,
      email: d?.email ?? null,
      activo: d?.activo != null ? !!d?.activo : (d?.active != null ? !!d?.active : true),
      scopeNivel: (d?.scopeNivel ?? d?.nivel ?? null) as ScopeNivel | null,
      seccionPrincipalId: d?.seccionPrincipalId != null ? String(d?.seccionPrincipalId) : null,
      orgId: d?.orgId != null ? String(d?.orgId) : (d?.organizacionId != null ? String(d?.organizacionId) : null),
      fechaCreacion: d?.fechaCreacion ? String(d?.fechaCreacion) : null,
      fechaActualizacion: d?.fechaActualizacion ? String(d?.fechaActualizacion) : null
    } as UserEntity;
  }

  // Parser seguro para respuestas que puedan venir como texto/HTML o vacías
  private toApiResponse(payload: any): ApiResponse<any> {
    if (payload == null) return { success: true, data: undefined };
    if (typeof payload === 'string') {
      const text = payload.trim();
      if (!text) return { success: true, data: undefined };
      try {
        const obj = JSON.parse(text);
        if (obj && typeof obj === 'object' && 'success' in obj) return obj as ApiResponse<any>;
        if (obj && typeof obj === 'object' && ('data' in obj || 'message' in obj)) return { success: true, ...(obj as any) } as ApiResponse<any>;
        return { success: true, data: obj } as ApiResponse<any>;
      } catch {
        // Cuando el backend devuelve texto plano/HTML, evitar romper
        return { success: true, data: undefined } as ApiResponse<any>;
      }
    }
    if (typeof payload === 'object') {
      if ('success' in payload) return payload as ApiResponse<any>;
      return { success: true, data: payload } as ApiResponse<any>;
    }
    return { success: true, data: payload } as ApiResponse<any>;
  }

  create(orgId: string, body: CreateUserRequest): Observable<{ user: UserEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/usuarios`;
    return this.http.post<ApiResponse<any>>(url, body, { headers: this.json }).pipe(
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const user = this.ensureUser(d);
        return { user, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo crear el usuario' }, status: err?.status })))
    );
  }

  update(orgId: string, usuarioId: string, body: UpdateUserRequest): Observable<{ user: UserEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/usuarios/${usuarioId}`;
    return this.http.patch<ApiResponse<any>>(url, body, { headers: this.json }).pipe(
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const user = this.ensureUser(d);
        return { user, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo actualizar el usuario' }, status: err?.status })))
    );
  }

  setActive(orgId: string, usuarioId: string, value: boolean): Observable<{ user: UserEntity | undefined; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/usuarios/${usuarioId}/activo`;
    return this.http.patch<ApiResponse<any>>(url, null, { headers: this.accept, params: { value } as any }).pipe(
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const user = d ? this.ensureUser(d) : undefined;
        return { user, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo cambiar el estado del usuario' }, status: err?.status })))
    );
  }

  assignMainSection(orgId: string, usuarioId: string, seccionId: string): Observable<{ user: UserEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/usuarios/${usuarioId}/seccion-principal`;
    return this.http.patch<ApiResponse<any>>(url, null, { headers: this.accept, params: { seccionId } as any }).pipe(
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const user = this.ensureUser(d);
        return { user, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo asignar la sección principal' }, status: err?.status })))
    );
  }

  removeMainSection(orgId: string, usuarioId: string): Observable<{ user: UserEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/usuarios/${usuarioId}/seccion-principal`;
    return this.http.patch<ApiResponse<any>>(url, null, { headers: this.accept }).pipe(
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const user = this.ensureUser(d);
        return { user, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo quitar la sección principal' }, status: err?.status })))
    );
  }

  list(orgId: string): Observable<UserEntity[]> {
    const path = `/orgs/${orgId}/usuarios`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;

    const mapResp = (resp: ApiResponse<any>) => {
      if (resp && resp.success === false) {
        throw { error: { message: resp?.message || 'No se pudieron listar usuarios' }, status: 400 };
      }
      const data = resp?.data as any;
      const arr = Array.isArray(data) ? data : (Array.isArray((data as any)?.items) ? (data as any).items : (Array.isArray((resp as any)) ? (resp as any) : []));
      return arr.map((d: any) => this.ensureUser(d));
    };

    return this.http.get<any>(url, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map(mapResp),
      catchError((_e1) => this.http.get<any>(urlFallback, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
        map((payload: any) => this.toApiResponse(payload)),
        map(mapResp),
        catchError((e2) => throwError(() => ({ error: { message: e2?.error?.message || e2?.message || 'No se pudieron listar usuarios' }, status: e2?.status })))
      ))
    );
  }

  get(orgId: string, usuarioId: string): Observable<UserEntity> {
    const url = `${this.base}/orgs/${orgId}/usuarios/${usuarioId}`;
    return this.http.get<any>(url, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        if (resp && resp.success === false) throw { error: { message: resp?.message || 'No se pudo obtener el usuario' }, status: 400 };
        return this.ensureUser(this.unwrap<any>(resp));
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo obtener el usuario' }, status: err?.status })))
    );
  }
}
