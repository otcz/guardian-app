import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../config/environment';
import { OrganizationService, Organization } from './organization.service';

export interface ApiResponse<T> { success?: boolean; message?: string; data?: T; }

// DTOs actualizados según requerimiento backend 2025-11-22
export interface VehiculoDto {
  id: string;
  placa: string;
  tipo?: string | null; // ✅ NUEVO: Tipo de vehículo (máx 100 caracteres)
  marca?: string | null;
  modelo?: string | null;
  linea?: string | null; // ✅ AMPLIADO: hasta 200 caracteres
  anio?: number | null;
  color?: string | null;
  activo: boolean;
  bloqueado?: boolean | null;

  // ✅ Información de sección (actualizado)
  seccionId?: string | null;
  seccionNombre?: string | null; // ✅ NUEVO: Nombre de la sección
  seccionAsignadaId?: string | null; // compatibilidad con vistas legacy

  // ✅ Información de organización
  orgId?: string | null;
  organizacionId?: string | null; // ✅ NUEVO: Alias para orgId
  organizacionNombre?: string | null; // ✅ NUEVO: Nombre de la organización

  // ✅ Usuarios asignados (NUEVO)
  usuariosAsignados?: string[]; // ✅ NUEVO: Array de usernames
  cantidadUsuarios?: number; // ✅ NUEVO: Cantidad de usuarios asignados

  // Auditoría
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  createdAt?: string | null; // ✅ NUEVO: Alias ISO
  updatedAt?: string | null; // ✅ NUEVO: Alias ISO

  propietarioUsuarioId?: string | null;
}
export type VehicleEntity = VehiculoDto; // alias para compatibilidad

export interface VehiculoCreateReq {
  placa: string; // Requerido
  tipo?: string | null; // ✅ NUEVO: Tipo de vehículo (máx 100 caracteres)
  marca?: string | null;
  modelo?: string | null;
  linea?: string | null; // ✅ AMPLIADO: hasta 200 caracteres
  anio?: number | null;
  color?: string | null;
  seccionId: string; // ✅ NUEVO: Requerido - UUID de la sección
  usuarioIds: string[]; // ✅ Requerido: al menos 1 usuario asociado
  asociarSiExiste?: boolean; // ✅ NUEVO: Opcional - asociar si ya existe
}
export type CreateVehicleRequest = VehiculoCreateReq; // alias compatibilidad

export interface UpdateVehicleRequest {
  placa?: string;
  tipo?: string | null; // ✅ NUEVO: Tipo de vehículo (máx 100 caracteres)
  seccionAsignadaId?: string | null; // se gestiona por endpoint dedicado, pero lo mantenemos aquí para compatibilidad de llamadas previas
  marca?: string | null;
  modelo?: string | null;
  linea?: string | null; // ✅ AMPLIADO: hasta 200 caracteres
  anio?: number | null;
  color?: string | null;
  activo?: boolean;
}

// Contratos del checklist (alias explícitos)
export interface VehiculoUpdateReq {
  placa?: string;
  tipo?: string | null; // ✅ NUEVO: Tipo de vehículo (máx 100 caracteres)
  marca?: string | null;
  modelo?: string | null;
  linea?: string | null; // ✅ AMPLIADO: hasta 200 caracteres
  anio?: number | null;
  color?: string | null;
  activo?: boolean;
}
export interface VehiculoUserAssignReq { usuarioIds: string[]; }

export interface VehiculoCapabilities { canUpdateBloqueado: boolean; message?: string; }

@Injectable({ providedIn: 'root' })
export class VehiculosService {
  private base = environment.apiBase;
  private json = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
  private accept = new HttpHeaders({ Accept: 'application/json' });

  constructor(private http: HttpClient, private orgs: OrganizationService) {}

  private unwrap<T = any>(payload: any): T {
    return (payload && typeof payload === 'object' && 'data' in payload) ? (payload as any).data as T : (payload as T);
  }

  // Eliminar claves null/undefined/''/NaN
  private sanitizeBody<T extends Record<string, any>>(obj: T): Partial<T> {
    const out: any = {};
    if (!obj) return out;
    Object.keys(obj).forEach((k) => {
      const v = (obj as any)[k];
      if (v === null || v === undefined) return;
      if (typeof v === 'string' && v.trim() === '') return;
      if (typeof v === 'number' && Number.isNaN(v)) return;
      out[k] = v;
    });
    return out as Partial<T>;
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

  private ensureVehicle(d: any): VehiculoDto {
    const seccion = (d?.seccionId ?? d?.seccionAsignadaId ?? d?.idSeccionAsignada ?? d?.seccionEntityAsignada?.id ?? null);
    return {
      id: String(d?.id ?? d?._id ?? ''),
      placa: String(d?.placa ?? d?.plate ?? ''),
      activo: d?.activo != null ? !!d?.activo : (d?.active != null ? !!d?.active : false),

      // ✅ Información de sección
      seccionId: seccion != null ? String(seccion) : null,
      seccionAsignadaId: seccion != null ? String(seccion) : null,
      seccionNombre: (d?.seccionNombre != null ? String(d?.seccionNombre) : (d?.seccion?.nombre != null ? String(d?.seccion?.nombre) : (d?.seccionEntityAsignada?.nombre != null ? String(d?.seccionEntityAsignada?.nombre) : null))),

      // ✅ Información de organización
      orgId: d?.orgId != null ? String(d?.orgId) : (d?.organizacionId != null ? String(d?.organizacionId) : null),
      organizacionId: d?.organizacionId != null ? String(d?.organizacionId) : (d?.orgId != null ? String(d?.orgId) : null),
      organizacionNombre: d?.organizacionNombre != null ? String(d?.organizacionNombre) : (d?.organizacion?.nombre != null ? String(d?.organizacion?.nombre) : null),

      // ✅ Usuarios asignados
      usuariosAsignados: Array.isArray(d?.usuariosAsignados) ? d.usuariosAsignados.map((u: any) => String(u)) : null,
      cantidadUsuarios: d?.cantidadUsuarios != null ? Number(d?.cantidadUsuarios) : (Array.isArray(d?.usuariosAsignados) ? d.usuariosAsignados.length : null),

      propietarioUsuarioId: d?.usuarioId != null ? String(d?.usuarioId) : (d?.propietarioUsuarioId != null ? String(d?.propietarioUsuarioId) : null),

      // ✅ Auditoría (mapeo doble para compatibilidad)
      fechaCreacion: d?.fechaCreacion ? String(d?.fechaCreacion) : (d?.createdAt ? String(d?.createdAt) : null),
      fechaActualizacion: d?.fechaActualizacion ? String(d?.fechaActualizacion) : (d?.updatedAt ? String(d?.updatedAt) : null),
      createdAt: d?.createdAt ? String(d?.createdAt) : (d?.fechaCreacion ? String(d?.fechaCreacion) : null),
      updatedAt: d?.updatedAt ? String(d?.updatedAt) : (d?.fechaActualizacion ? String(d?.fechaActualizacion) : null),

      tipo: d?.tipo != null ? String(d?.tipo) : null, // ✅ NUEVO campo
      marca: d?.marca != null ? String(d?.marca) : null,
      modelo: d?.modelo != null ? String(d?.modelo) : null,
      linea: d?.linea != null ? String(d?.linea) : null,
      anio: d?.anio != null ? Number(d?.anio) : null,
      color: d?.color != null ? String(d?.color) : null,
      bloqueado: (d?.bloqueado != null ? !!d?.bloqueado : (d?.locked != null ? !!d?.locked : null))
    } as VehiculoDto;
  }

  list(orgId: string, params?: { seccionId?: string | null; soloInactivos?: boolean; soloMios?: boolean; subtree?: boolean }): Observable<VehiculoDto[]> {
    const path = `/orgs/${orgId}/vehiculos`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;
    const httpParams: any = {};
    if (params?.seccionId) httpParams.seccionId = params.seccionId;
    if (params?.soloInactivos != null) httpParams.soloInactivos = params.soloInactivos;
    if (params?.soloMios != null) httpParams.soloMios = params.soloMios;
    if (params?.subtree != null) httpParams.subtree = params.subtree;

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

  // Igual a list pero entrega también el message del backend
  listWithMessage(orgId: string, params?: { seccionId?: string | null; soloInactivos?: boolean; soloMios?: boolean }): Observable<{ items: VehiculoDto[]; message?: string }> {
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
      const items = arr.map((d: any) => this.ensureVehicle(d));
      return { items, message: (resp as any)?.message } as { items: VehiculoDto[]; message?: string };
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

  get(orgId: string, vehiculoId: string): Observable<VehiculoDto> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/${vehiculoId}`;
    return this.http.get<any>(url, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        if (resp && resp.success === false) throw { error: { message: resp?.message || 'No se pudo obtener el vehículo' }, status: 400 };
        return this.ensureVehicle(this.unwrap<any>(resp));
      })
    );
  }

  // Nuevo endpoint: Mis Vehículos (ADMIN de SECCIÓN)
  getMisVehiculos(orgId: string): Observable<VehiculoDto[]> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/mis`;
    return this.http.get<any>(url, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        if (resp && resp.success === false) throw { error: { message: resp?.message || 'No se pudieron obtener mis vehículos' }, status: 400 };
        const data = (resp as any)?.data;
        const arr = Array.isArray(data) ? data : [];
        return arr.map((d: any) => this.ensureVehicle(d));
      }),
      catchError((e1) => {
        const status = e1?.status;
        // Fallback 1: parámetro canónico soloMios=true
        if ([400,404,405,500,501,502,503].includes(status)) {
          return this.list(orgId, { soloMios: true }).pipe(
            catchError((e2) => {
              // Fallback 2: probar nombres alternativos de parámetro (mine/onlyMine/soloPropios)
              const base = `${this.base}/orgs/${orgId}/vehiculos`;
              const tryAlt = (paramName: string) => this.http.get<any>(base, { headers: this.accept, params: { [paramName]: true } as any, responseType: 'text' as 'json' }).pipe(
                map((payload: any) => this.toApiResponse(payload)),
                map((resp) => {
                  const data = (resp as any)?.data ?? resp;
                  const arr = Array.isArray(data) ? data : (Array.isArray((data as any)?.items) ? (data as any).items : []);
                  return arr.map((d: any) => this.ensureVehicle(d));
                })
              );
              return tryAlt('mine').pipe(
                catchError(() => tryAlt('onlyMine').pipe(
                  catchError(() => tryAlt('soloPropios').pipe(
                    // Fallback 3: si tenemos sección en contexto, listar por sección (subtree)
                    catchError(() => {
                      let sec: string | null = null;
                      try { sec = localStorage.getItem('seccionPrincipalId'); } catch {}
                      return this.list(orgId, { seccionId: sec ?? null, subtree: true }).pipe(
                        catchError((eFinal) => throwError(() => ({ error: { message: eFinal?.error?.message || e2?.error?.message || e1?.error?.message || 'No se pudieron obtener mis vehículos' }, status: eFinal?.status ?? e2?.status ?? status })))
                      );
                    })
                  ))
                ))
              );
            })
          );
        }
        return throwError(() => ({ error: { message: e1?.error?.message || 'No se pudieron obtener mis vehículos' }, status }));
      })
    );
  }

  // Capabilities del vehículo (para controlar el switch bloqueado)
  getCapabilities(orgId: string, vehiculoId: string): Observable<VehiculoCapabilities> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/${vehiculoId}/capabilities`;
    return this.http.get<any>(url, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        if (resp && resp.success === false) throw { error: { message: resp?.message || 'No se pudieron consultar capacidades' }, status: 400 };
        const d = this.unwrap<any>(resp) as any;
        return { canUpdateBloqueado: !!d?.canUpdateBloqueado, message: (resp as any)?.message } as VehiculoCapabilities;
      })
    );
  }

  create(orgId: string, body: VehiculoCreateReq): Observable<{ vehicle: VehiculoDto; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/vehiculos`;
    const payload = this.sanitizeBody(body);
    return this.http.post<any>(url, payload, { headers: this.json, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const v = this.ensureVehicle(d);
        return { vehicle: v, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: (err?.error?.message ?? (typeof err?.error === 'string' ? err.error : null) ?? err?.message ?? 'No se pudo crear el vehículo') }, status: err?.status })))
    );
  }

  update(orgId: string, vehiculoId: string, body: UpdateVehicleRequest): Observable<{ vehicle: VehiculoDto; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/${vehiculoId}`;
    const payload = this.sanitizeBody(body) as any;
    // No enviar bloqueado en el PATCH general
    if ('bloqueado' in payload) delete payload.bloqueado;
    return this.http.patch<any>(url, payload, { headers: this.json, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const v = this.ensureVehicle(d);
        return { vehicle: v, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: (err?.error?.message ?? (typeof err?.error === 'string' ? err.error : null) ?? err?.message ?? 'No se pudo actualizar el vehículo') }, status: err?.status })))
    );
  }

  // Endpoint dedicado para cambiar el estado de bloqueo
  setBloqueado(orgId: string, vehiculoId: string, value: boolean): Observable<{ vehicle?: VehiculoDto; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/${vehiculoId}/bloqueado`;
    return this.http.patch<any>(url, null, { headers: this.accept, params: { value } as any, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const v = d ? this.ensureVehicle(d) : undefined;
        return { vehicle: v, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: (err?.error?.message ?? (typeof err?.error === 'string' ? err.error : null) ?? err?.message ?? 'No se pudo cambiar el bloqueo del vehículo') }, status: err?.status })))
    );
  }

  setActive(orgId: string, vehiculoId: string, value: boolean): Observable<{ vehicle: VehiculoDto | undefined; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/${vehiculoId}/estado`;
    return this.http.patch<any>(url, null, { headers: this.accept, params: { value } as any, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const v = d ? this.ensureVehicle(d) : undefined;
        return { vehicle: v, message: (resp as any)?.message };
      }),
      catchError((err) => throwError((() => ({ error: { message: (err?.error?.message ?? (typeof err?.error === 'string' ? err.error : null) ?? err?.message ?? 'No se pudo cambiar el estado del vehículo') }, status: err?.status }))))
    );
  }

  assignSection(orgId: string, vehiculoId: string, seccionId: string | null): Observable<{ vehicle: VehiculoDto; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/${vehiculoId}/seccion`;
    const params: any = {};
    if (seccionId != null) params.seccionId = seccionId;
    return this.http.patch<any>(url, null, { headers: this.accept, params, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const v = this.ensureVehicle(d);
        return { vehicle: v, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: (err?.error?.message ?? (typeof err?.error === 'string' ? err.error : null) ?? err?.message ?? 'No se pudo asignar la sección del vehículo') }, status: err?.status })))
    );
  }

  // NUEVO: asignar usuarios al vehículo (idempotente)
  assignUsers(orgId: string, vehiculoId: string, usuarioIds: string[]): Observable<{ vehicle: VehiculoDto; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/${vehiculoId}/usuarios`;
    const body: VehiculoUserAssignReq = { usuarioIds: usuarioIds ?? [] };
    return this.http.post<any>(url, body, { headers: this.json, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const v = this.ensureVehicle(d);
        return { vehicle: v, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: (err?.error?.message ?? (typeof err?.error === 'string' ? err.error : null) ?? err?.message ?? 'No se pudieron asignar usuarios al vehículo') }, status: err?.status })))
    );
  }

  // NUEVO: desasignar un usuario del vehículo (idempotente)
  unassignUser(orgId: string, vehiculoId: string, usuarioId: string): Observable<{ vehicle?: VehiculoDto; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/${vehiculoId}/usuarios/${usuarioId}`;
    return this.http.delete<any>(url, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const v = d ? this.ensureVehicle(d) : undefined;
        return { vehicle: v, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: (err?.error?.message ?? (typeof err?.error === 'string' ? err.error : null) ?? err?.message ?? 'No se pudo desasignar el usuario del vehículo') }, status: err?.status })))
    );
  }

  /**
   * Buscar vehículo por placa. Devuelve null si no existe. 403 si pertenece a otra org o sin permisos.
   *
   * @param orgId - ID de la organización
   * @param placa - Placa del vehículo a buscar
   * @param seccionId - (Opcional) ID de la sección para filtrar la búsqueda
   *
   * NUEVO (2025-11-23): Soporte para filtrado por sección
   * - Si seccionId se proporciona: busca solo en esa sección
   * - Si seccionId es null/undefined: busca en toda la organización
   */
  buscarPorPlaca(orgId: string, placa: string, seccionId?: string | null): Observable<VehiculoDto | null> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/buscar`;
    const params: any = { placa: (placa || '').trim().toUpperCase() };

    // Agregar filtro de sección si se proporciona
    if (seccionId) {
      params.seccionId = seccionId;
    }

    return this.http.get<any>(url, { headers: this.accept, params, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        if (resp && resp.success === false) throw { error: { message: resp?.message || 'No se pudo buscar el vehículo' }, status: 400 };
        const d = this.unwrap<any>(resp);
        if (d == null) return null;
        return this.ensureVehicle(d);
      })
    );
  }

  /** Asignar el vehículo por placa al usuario autenticado (misma organización). */
  asignarPorPlaca(orgId: string, placa: string): Observable<{ vehicle: VehiculoDto; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/vehiculos/asignar-por-placa`;
    const params = { placa: (placa || '').trim().toUpperCase() } as any;
    return this.http.post<any>(url, null, { headers: this.accept, params, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        if (resp && resp.success === false) throw { error: { message: resp?.message || 'No se pudo asignar el vehículo' }, status: 400 };
        const d = this.unwrap<any>(resp);
        const v = this.ensureVehicle(d);
        return { vehicle: v, message: (resp as any)?.message };
      })
    );
  }

  // ===== Aliases en español para cumplir checklist (devuelven ApiResponse<T>) =====
  crear(orgId: string, body: VehiculoCreateReq): Observable<ApiResponse<VehiculoDto>> {
    return this.create(orgId, body).pipe(map(({ vehicle, message }) => ({ success: true, message, data: vehicle })));
  }

  listar(orgId: string, opts?: { seccionId?: string; subtree?: boolean }): Observable<ApiResponse<VehiculoDto[]>> {
    return this.list(orgId, { seccionId: opts?.seccionId ?? null, subtree: opts?.subtree }).pipe(
      map((items) => ({ success: true, data: items } as ApiResponse<VehiculoDto[]>))
    );
  }

  obtener(orgId: string, vehiculoId: string): Observable<ApiResponse<VehiculoDto>> {
    return this.get(orgId, vehiculoId).pipe(map((v) => ({ success: true, data: v })));
  }

  actualizar(orgId: string, vehiculoId: string, body: VehiculoUpdateReq): Observable<ApiResponse<VehiculoDto>> {
    return this.update(orgId, vehiculoId, body as UpdateVehicleRequest).pipe(map(({ vehicle, message }) => ({ success: true, message, data: vehicle })));
  }

  actualizarEstado(orgId: string, vehiculoId: string, activo: boolean): Observable<ApiResponse<VehiculoDto>> {
    return this.setActive(orgId, vehiculoId, activo).pipe(map(({ vehicle, message }) => ({ success: true, message, data: vehicle! })));
  }

  actualizarBloqueado(orgId: string, vehiculoId: string, bloqueado: boolean): Observable<ApiResponse<VehiculoDto>> {
    return this.setBloqueado(orgId, vehiculoId, bloqueado).pipe(map(({ vehicle, message }) => ({ success: true, message, data: vehicle! })));
  }

  asignarSeccion(orgId: string, vehiculoId: string, seccionId?: string): Observable<ApiResponse<VehiculoDto>> {
    return this.assignSection(orgId, vehiculoId, seccionId ?? null).pipe(map(({ vehicle, message }) => ({ success: true, message, data: vehicle })));
  }

  asignarUsuarios(orgId: string, vehiculoId: string, usuarioIds: string[]): Observable<ApiResponse<VehiculoDto>> {
    return this.assignUsers(orgId, vehiculoId, usuarioIds).pipe(map(({ vehicle, message }) => ({ success: true, message, data: vehicle })));
  }

  desasignarUsuario(orgId: string, vehiculoId: string, usuarioId: string): Observable<ApiResponse<VehiculoDto | undefined>> {
    return this.unassignUser(orgId, vehiculoId, usuarioId).pipe(map(({ vehicle, message }) => ({ success: true, message, data: vehicle })));
  }

  // ===== Default Org helpers =====
  private DEFAULT_ORG_NAME = 'DEFAULT_ORG';
  private DEFAULT_ORG_ID_KEY = 'defaultOrgId';

  /** Obtiene y cachea el id de la organización cuyo nombre es EXACTAMENTE "DEFAULT_ORG". */
  getDefaultOrgId(forceRefresh: boolean = false): Observable<string | null> {
    if (!forceRefresh) {
      try { const cached = localStorage.getItem(this.DEFAULT_ORG_ID_KEY); if (cached) return of(cached); } catch {}
    }
    return this.orgs.listAccessible().pipe(
      map((list: Organization[]) => {
        const found = (list || []).find(o => (o?.nombre || '') === this.DEFAULT_ORG_NAME);
        const id = found?.id ? String(found.id) : null;
        try { if (id) localStorage.setItem(this.DEFAULT_ORG_ID_KEY, id); } catch {}
        return id;
      }),
      catchError(() => of(null))
    );
  }

  /** Listado en modo GLOBAL: usa orgId=defaultOrgId y NO envía filtros. */
  listGlobal(): Observable<VehiculoDto[]> {
    return this.getDefaultOrgId().pipe(
      switchMap((defaultOrgId) => {
        if (!defaultOrgId) return throwError(() => ({ status: 400, error: { message: 'No se encontró DEFAULT_ORG' } }));
        return this.list(defaultOrgId, undefined);
      })
    );
  }
}
