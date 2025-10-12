import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../config/environment';

export interface SeccionEntity {
  id: string;
  nombre: string;
  descripcion?: string;
  estado?: string;
  autonomiaConfigurada?: boolean;
  seccionPadreId?: string | null;
}

export interface CreateSeccionRequest {
  nombre: string;
  descripcion?: string;
  seccionPadreId?: string | null;
  autonomiaConfigurada?: boolean;
}

export interface UpdateSeccionRequest {
  nombre?: string;
  descripcion?: string | null;
  idSeccionPadre?: string | null;
  administradorPrincipal?: string | null;
  autonomiaConfigurada?: boolean;
}

export interface UsuarioSeccionEntity {
  id: string;
  activo: boolean;
  usuarioEntity?: {
    id: string;
    username: string;
    nombreCompleto?: string | null;
    scopeNivel?: string;
  } | null;
  seccionEntity?: {
    id: string;
    nombre?: string | null;
  } | null;
  rolEntityContextual?: {
    id: string;
    nombre?: string | null;
  } | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

@Injectable({ providedIn: 'root' })
export class SeccionService {
  private base = environment.apiBase;
  private json = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
  private accept = new HttpHeaders({ Accept: 'application/json' });

  constructor(private http: HttpClient) {}

  create(orgId: string, body: CreateSeccionRequest): Observable<{ seccion: SeccionEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/secciones`;
    return this.http.post<ApiResponse<any>>(url, body, { headers: this.json }).pipe(
      map((resp) => {
        if (!resp || resp.success === false) {
          throw { error: { message: resp?.message || 'No se pudo crear la sección' }, status: 400 };
        }
        const d = (resp.data || {}) as any;
        const nombre = d?.nombre != null ? String(d.nombre) : body?.nombre;
        const seccion: any = { id: String(d.id), nombre };
        if (d.descripcion !== undefined) seccion.descripcion = d.descripcion || undefined;
        if (d.estado !== undefined) seccion.estado = d.estado || undefined;
        if (d.autonomiaConfigurada !== undefined) seccion.autonomiaConfigurada = !!d.autonomiaConfigurada;
        if (d.seccionPadreId !== undefined || d.idSeccionPadre !== undefined) seccion.seccionPadreId = d.seccionPadreId ?? d.idSeccionPadre ?? null;
        return { seccion: seccion as SeccionEntity, message: resp.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo crear la sección' }, status: err?.status })))
    );
  }

  list(orgId: string): Observable<SeccionEntity[]> {
    const path = `/orgs/${orgId}/secciones`;
    const urlPrimary = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;

    const mapResponse = (resp: ApiResponse<any>): SeccionEntity[] => {
      if (!resp || resp.success === false) {
        throw { error: { message: resp?.message || 'No se pudieron obtener las secciones' }, status: 400 };
      }
      const arr = Array.isArray(resp.data) ? resp.data : [];
      return arr.map((d: any) => ({
        id: String(d.id),
        nombre: String(d.nombre),
        descripcion: d.descripcion || undefined,
        estado: d.estado || undefined,
        autonomiaConfigurada: !!(d.autonomiaConfigurada ?? d.autonomiaConfigurada === true),
        seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null
      })) as SeccionEntity[];
    };

    return this.http.get<ApiResponse<any>>(urlPrimary, { headers: this.accept }).pipe(
      map(mapResponse),
      catchError((err) => {
        const status = err?.status;
        if (status === 0 || status === 404 || status === 502 || status === 503) {
          return this.http.get<ApiResponse<any>>(urlFallback, { headers: this.accept }).pipe(
            map(mapResponse),
            catchError((e2) =>
              throwError(() => ({ error: { message: e2?.error?.message || e2?.message || 'No se pudieron obtener las secciones' }, status: e2?.status }))
            )
          );
        }
        return throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudieron obtener las secciones' }, status }));
      })
    );
  }

  update(orgId: string, seccionId: string, body: UpdateSeccionRequest): Observable<{ seccion: SeccionEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}`;
    return this.http.patch<ApiResponse<any>>(url, body, { headers: this.json }).pipe(
      map((resp) => {
        if (!resp || resp.success === false) {
          throw { error: { message: resp?.message || 'No se pudo actualizar la sección' }, status: 400 };
        }
        const d = (resp.data || {}) as any;
        const nombre = d?.nombre != null ? String(d.nombre) : (body?.nombre ?? '');
        const seccion: any = { id: String(d.id ?? seccionId), nombre };
        if (d.descripcion !== undefined) seccion.descripcion = d.descripcion || undefined;
        if (d.estado !== undefined) seccion.estado = d.estado || undefined;
        if (d.autonomiaConfigurada !== undefined) seccion.autonomiaConfigurada = !!d.autonomiaConfigurada;
        if (d.seccionPadreId !== undefined || d.idSeccionPadre !== undefined) seccion.seccionPadreId = d.seccionPadreId ?? d.idSeccionPadre ?? null;
        return { seccion: seccion as SeccionEntity, message: resp.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo actualizar la sección' }, status: err?.status })))
    );
  }

  changeState(orgId: string, seccionId: string, estado: 'ACTIVA' | 'INACTIVA'): Observable<{ seccion: SeccionEntity; message?: string }> {
    const path = `/orgs/${orgId}/secciones/${seccionId}/estado`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;

    const mapResp = (resp: ApiResponse<any>) => {
      if (!resp || resp.success === false) {
        throw { error: { message: resp?.message || 'NO SE PUDO ACTUALIZAR EL ESTADO DE LA SECCIÓN' }, status: 400 };
      }
      const d = (resp.data || {}) as any;
      const seccion: SeccionEntity = {
        id: String(d.id ?? seccionId),
        nombre: (d?.nombre != null ? String(d.nombre) : undefined) as any,
        descripcion: d.descripcion || undefined,
        estado: (d.estado || estado) as string,
        autonomiaConfigurada: d.autonomiaConfigurada != null ? !!d.autonomiaConfigurada : undefined,
        seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null
      } as SeccionEntity;
      return { seccion, message: resp.message };
    };

    const options = { headers: this.accept, params: { estado } as any } as const;

    return this.http.patch<ApiResponse<any>>(url, null, options).pipe(
      map(mapResp),
      catchError((e1) => this.http.patch<ApiResponse<any>>(urlFallback, null, options).pipe(
        map(mapResp),
        catchError((e2) => throwError(() => ({ error: { message: e1?.error?.message || e2?.error?.message || 'NO SE PUDO CAMBIAR EL ESTADO DE LA SECCIÓN' }, status: e2?.status ?? e1?.status })))
      ))
    );
  }

  setAutonomia(orgId: string, seccionId: string, autonomia: boolean): Observable<{ seccion: SeccionEntity; message?: string }> {
    const path = `/orgs/${orgId}/secciones/${seccionId}/autonomia`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;

    const mapResp = (resp: ApiResponse<any>) => {
      if (!resp || resp.success === false) {
        throw { error: { message: resp?.message || 'NO SE PUDO ACTUALIZAR LA AUTONOMÍA' }, status: 400 };
      }
      const d = (resp.data || {}) as any;
      const seccion: SeccionEntity = {
        id: String(d.id ?? seccionId),
        nombre: (d?.nombre != null ? String(d.nombre) : undefined) as any,
        descripcion: d.descripcion || undefined,
        estado: d.estado || undefined,
        autonomiaConfigurada: d.autonomiaConfigurada != null ? !!d.autonomiaConfigurada : autonomia,
        seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null
      } as SeccionEntity;
      return { seccion, message: resp.message };
    };

    const options = { headers: this.accept, params: { autonomia } as any } as const;

    return this.http.patch<ApiResponse<any>>(url, null, options).pipe(
      map(mapResp),
      catchError((e1) => this.http.patch<ApiResponse<any>>(urlFallback, null, options).pipe(
        map(mapResp),
        catchError((e2) => throwError(() => ({ error: { message: e1?.error?.message || e2?.error?.message || 'NO SE PUDO ACTUALIZAR LA AUTONOMÍA' }, status: e2?.status ?? e1?.status })))
      ))
    );
  }

  delete(orgId: string, seccionId: string): Observable<{ message?: string; seccion?: SeccionEntity; soft?: boolean }> {
    const basePath = `/orgs/${orgId}/secciones/${seccionId}`;
    const url = `${this.base}${basePath}`;
    const urlFallback = `${environment.backendHost}${this.base}${basePath}`;

    const toResult = (payload: any) => {
      const resp = (payload && typeof payload === 'object' && 'success' in payload) ? payload as ApiResponse<any> : ({ success: true, message: undefined, data: payload } as any);
      if (resp.success === false) {
        throw { error: { message: resp.message || 'No se pudo eliminar la sección' }, status: 400 };
      }
      const d = (resp.data || {}) as any;
      const seccion: SeccionEntity | undefined = d && typeof d === 'object' ? {
        id: String(d.id ?? seccionId),
        nombre: String(d.nombre ?? ''),
        descripcion: d.descripcion || undefined,
        estado: d.estado || 'INACTIVA',
        autonomiaConfigurada: d.autonomiaConfigurada != null ? !!d.autonomiaConfigurada : undefined,
        seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null
      } as SeccionEntity : undefined;
      return { seccion, message: resp.message, soft: true } as { message?: string; seccion?: SeccionEntity; soft?: boolean };
    };

    return this.http.delete<any>(url, { headers: this.accept }).pipe(
      map(toResult),
      catchError((_e1) => this.http.delete<any>(urlFallback, { headers: this.accept }).pipe(
        map(toResult),
        catchError((e2) => throwError(() => ({ error: { message: e2?.error?.message || 'No se pudo eliminar la sección' }, status: e2?.status })))
      ))
    );
  }

  assignAdministrador(orgId: string, seccionId: string, usuarioId: string): Observable<{ seccion: SeccionEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}/administrador`;
    return this.http.post<any>(url, { usuarioId }, { headers: this.json }).pipe(
      map((payload) => {
        // Respuesta esperada: entidad plana SeccionEntity
        const d = (payload || {}) as any;
        const seccion: SeccionEntity = {
          id: String(d.id ?? seccionId),
          nombre: String(d.nombre ?? ''),
          descripcion: d.descripcion || undefined,
          estado: d.estado || undefined,
          autonomiaConfigurada: d.autonomiaConfigurada != null ? !!d.autonomiaConfigurada : undefined,
          seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null
        } as SeccionEntity;
        return { seccion, message: (payload as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo asignar el administrador' }, status: err?.status })))
    );
  }

  /**
   * Lista usuarios asignados a una sección. Respuesta: JSON array directo (no envuelto en ApiResponse).
   * En estrategia CENTRALIZADA puede responder 400 con mensaje de estrategia; se propaga para manejo en UI.
   */
  getUsuariosPorSeccion(orgId: string, seccionId: string) {
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}/usuarios`;
    return this.http.get<UsuarioSeccionEntity[]>(url, { headers: this.accept }).pipe(
      map(arr => Array.isArray(arr) ? arr : []),
      catchError(err => throwError(() => ({ status: err?.status, error: { message: err?.error?.message || err?.message } })))
    );
  }
}
