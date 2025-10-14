import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../config/environment';

export interface ApiResponse<T> { success?: boolean; message?: string; data?: T; }

export interface VehicleEntity {
  id: string;
  placa: string;
  activo: boolean;
  seccionAsignadaId?: string | null;
  orgId?: string | null;
  propietarioUsuarioId?: string | null; // opcional si backend lo provee
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  // Campos adicionales
  marca?: string | null;
  modelo?: string | null;
  linea?: string | null;
  anio?: number | null;
  color?: string | null;
}

export interface CreateVehicleRequest {
  placa: string;
  seccionAsignadaId?: string | null;
  // Campos adicionales (opcionales)
  marca?: string | null;
  modelo?: string | null;
  linea?: string | null;
  anio?: number | null;
  color?: string | null;
}

export interface UpdateVehicleRequest {
  placa?: string;
  seccionAsignadaId?: string | null;
  // Campos adicionales (opcionales)
  marca?: string | null;
  modelo?: string | null;
  linea?: string | null;
  anio?: number | null;
  color?: string | null;
}

@Injectable({ providedIn: 'root' })
export class VehiculosService {
  private base = environment.apiBase;
  private json = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
  private accept = new HttpHeaders({ Accept: 'application/json' });

  constructor(private http: HttpClient) {}

  private unwrap<T = any>(payload: any): T {
    return (payload && typeof payload === 'object' && 'data' in payload) ? (payload as any).data as T : (payload as T);
  }

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
      } catch { return { success: true, data: undefined } as ApiResponse<any>; }
    }
    if (typeof payload === 'object') { if ('success' in payload) return payload as ApiResponse<any>; return { success: true, data: payload } as ApiResponse<any>; }
    return { success: true, data: payload } as ApiResponse<any>;
  }

  private ensureVehicle(d: any): VehicleEntity {
    return {
      id: String(d?.id ?? d?._id ?? ''),
      placa: String(d?.placa ?? d?.plate ?? ''),
      activo: d?.activo != null ? !!d?.activo : (d?.active != null ? !!d?.active : false),
      seccionAsignadaId: d?.seccionAsignadaId != null ? String(d?.seccionAsignadaId) : (d?.idSeccionAsignada != null ? String(d?.idSeccionAsignada) : null),
      orgId: d?.orgId != null ? String(d?.orgId) : (d?.organizacionId != null ? String(d?.organizacionId) : null),
      propietarioUsuarioId: d?.usuarioId != null ? String(d?.usuarioId) : (d?.propietarioUsuarioId != null ? String(d?.propietarioUsuarioId) : null),
      fechaCreacion: d?.fechaCreacion ? String(d?.fechaCreacion) : null,
      fechaActualizacion: d?.fechaActualizacion ? String(d?.fechaActualizacion) : null,
      // Campos adicionales
      marca: d?.marca != null ? String(d?.marca) : null,
      modelo: d?.modelo != null ? String(d?.modelo) : null,
      linea: d?.linea != null ? String(d?.linea) : null,
      anio: d?.anio != null ? Number(d?.anio) : null,
      color: d?.color != null ? String(d?.color) : null
    } as VehicleEntity;
  }

  list(orgId: string, params?: { seccionId?: string | null; soloInactivos?: boolean; soloMios?: boolean }): Observable<VehicleEntity[]> {
    const path = `/orgs/${orgId}/vehiculos`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;
    const httpParams: any = {};
    if (params?.seccionId) httpParams.seccionId = params.seccionId;
    if (params?.soloInactivos != null) httpParams.soloInactivos = params.soloInactivos;
    if (params?.soloMios != null) httpParams.soloMios = params.soloMios;

    const mapResp = (resp: ApiResponse<any>) => {
      if (resp && resp.success === false) throw { error: { message: resp?.message || 'No se pudieron listar vehículos' }, status: 400 };
      const data = resp?.data as any;
      const arr = Array.isArray(data) ? data : (Array.isArray((data as any)?.items) ? (data as any).items : (Array.isArray((resp as any)) ? (resp as any) : []));
      return arr.map((d: any) => this.ensureVehicle(d));
    };

    return this.http.get<any>(url, { headers: this.accept, params: httpParams, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map(mapResp),
      catchError((_e1) => this.http.get<any>(urlFallback, { headers: this.accept, params: httpParams, responseType: 'text' as 'json' }).pipe(
        map((payload: any) => this.toApiResponse(payload)),
        map(mapResp),
        catchError((e2) => throwError(() => ({ error: { message: e2?.error?.message || e2?.message || 'No se pudieron listar vehículos' }, status: e2?.status })))
      ))
    );
  }

  get(orgId: string, vehiculoId: string): Observable<VehicleEntity> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/${vehiculoId}`;
    return this.http.get<any>(url, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        if (resp && resp.success === false) throw { error: { message: resp?.message || 'No se pudo obtener el vehículo' }, status: 400 };
        return this.ensureVehicle(this.unwrap<any>(resp));
      })
    );
  }

  create(orgId: string, body: CreateVehicleRequest): Observable<{ vehicle: VehicleEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/vehiculos`;
    return this.http.post<ApiResponse<any>>(url, body, { headers: this.json }).pipe(
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const v = this.ensureVehicle(d);
        // Si backend no fija 'activo', por regla de negocio lo tratamos como false al crear
        v.activo = false;
        return { vehicle: v, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo crear el vehículo' }, status: err?.status })))
    );
  }

  update(orgId: string, vehiculoId: string, body: UpdateVehicleRequest): Observable<{ vehicle: VehicleEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/${vehiculoId}`;
    return this.http.patch<ApiResponse<any>>(url, body, { headers: this.json }).pipe(
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const v = this.ensureVehicle(d);
        return { vehicle: v, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo actualizar el vehículo' }, status: err?.status })))
    );
  }

  setActive(orgId: string, vehiculoId: string, value: boolean): Observable<{ vehicle: VehicleEntity | undefined; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/${vehiculoId}/activo`;
    return this.http.patch<ApiResponse<any>>(url, null, { headers: this.accept, params: { value } as any }).pipe(
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const v = d ? this.ensureVehicle(d) : undefined;
        return { vehicle: v, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo cambiar el estado del vehículo' }, status: err?.status })))
    );
  }

  assignSection(orgId: string, vehiculoId: string, seccionId: string | null): Observable<{ vehicle: VehicleEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/${vehiculoId}/seccion-asignada`;
    const params: any = {};
    if (seccionId != null) params.seccionId = seccionId;
    return this.http.patch<ApiResponse<any>>(url, null, { headers: this.accept, params }).pipe(
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const v = this.ensureVehicle(d);
        return { vehicle: v, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo asignar la sección del vehículo' }, status: err?.status })))
    );
  }
}
