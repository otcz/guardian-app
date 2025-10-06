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
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}/estado`;
    const body = { estado } as any;
    return this.http.patch<ApiResponse<any>>(url, body, { headers: this.json }).pipe(
      map((resp) => {
        if (!resp || resp.success === false) {
          throw { error: { message: resp?.message || 'No se pudo actualizar el estado de la sección' }, status: 400 };
        }
        const d = (resp.data || {}) as any;
        const nombre = d?.nombre != null ? String(d.nombre) : undefined;
        const seccion: any = { id: String(d.id ?? seccionId) };
        if (nombre != null) seccion.nombre = nombre;
        seccion.estado = (d.estado || estado);
        if (d.descripcion !== undefined) seccion.descripcion = d.descripcion || undefined;
        if (d.autonomiaConfigurada !== undefined) seccion.autonomiaConfigurada = !!d.autonomiaConfigurada;
        if (d.seccionPadreId !== undefined || d.idSeccionPadre !== undefined) seccion.seccionPadreId = d.seccionPadreId ?? d.idSeccionPadre ?? null;
        return { seccion: seccion as SeccionEntity, message: resp.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo cambiar el estado de la sección' }, status: err?.status })))
    );
  }
}
