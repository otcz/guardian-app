import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../config/environment';
import type { UserEntity } from './users.service';
import type { AdminInfo } from './organization.service';

export interface SeccionEntity {
  id: string;
  nombre: string;
  descripcion?: string;
  estado?: string;
  autonomiaConfigurada?: boolean;
  seccionPadreId?: string | null;
  /** Admin principal de la sección (si el backend lo provee). */
  adminId?: string | null;
  adminNombre?: string | null;
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
  // nuevo: roles del usuario en la organización del path
  rolesUsuarioOrganizacion?: string[] | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface TransferirUsuarioRequest {
  usuarioId: string;
  seccionDestinoId: string;
  mantenerRolContextual?: boolean | null;
  nuevoRolContextualId?: string | null;
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
        seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null,
        // Nuevos campos si vienen en respuesta
        adminId: (d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id) != null ? String(d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id) : null,
        adminNombre: (d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username) != null ? String(d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username) : null
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
        // Admin si viene en respuesta
        if (d.administradorId != null || d.administradorPrincipal != null || d.adminId != null || (d.administradorEntity && d.administradorEntity.id != null)) {
          seccion.adminId = String(d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id);
        }
        const admNombre = d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username;
        if (admNombre != null) seccion.adminNombre = String(admNombre);
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
        seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null,
        adminId: (d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id) != null ? String(d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id) : null,
        adminNombre: (d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username) != null ? String(d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username) : null
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
        seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null,
        adminId: (d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id) != null ? String(d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id) : null,
        adminNombre: (d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username) != null ? String(d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username) : null
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
        seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null,
        adminId: (d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id) != null ? String(d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id) : null,
        adminNombre: (d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username) != null ? String(d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username) : null
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

  /**
   * Obtener el administrador actual de una sección.
   * Endpoint: GET /orgs/{orgId}/secciones/{seccionId}/administrador
   * Auth: SYSADMIN o ORGADMIN de la organización
   *
   * @param orgId - ID de la organización que contiene la sección
   * @param seccionId - ID de la sección
   * @returns Observable con AdminResponse que contiene el administrador o null si no hay
   */
  getSectionAdmin(orgId: string, seccionId: string): Observable<{ message: string; data: AdminInfo | null }> {
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}/administrador`;
    return this.http.get<any>(url, { headers: this.accept }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) {
          throw { error: { message: resp.message }, status: 400 };
        }
        const message = resp?.message || 'OK';
        const data = resp?.data || null;
        return { message, data };
      }),
      catchError((err) => {
        return throwError(() => ({
          error: { message: err?.error?.message || err?.message || 'Error al obtener administrador' },
          status: err?.status
        }));
      })
    );
  }

  /**
   * Asigna un usuario como administrador principal de una sección
   *
   * ⚠️ CORRECCIÓN IMPLEMENTADA (2025-11-21):
   * El backend corrigió un bug que impedía asignar administradores a secciones de
   * organizaciones diferentes a DEFAULT_ORG. Ahora funciona correctamente para todas
   * las organizaciones.
   *
   * VALIDACIONES DEL BACKEND:
   * - El usuario debe pertenecer a la MISMA organización que la sección
   * - El usuario NO debe tener scopeNivel = ORGANIZACION
   * - El usuario debe tener permisos adecuados
   *
   * RESPUESTAS DE ERROR:
   * - 400: Usuario de otra organización / Scope restringido
   * - 403: Sin permisos
   * - 404: Sección no encontrada
   *
   * @param orgId ID de la organización que contiene la sección
   * @param seccionId ID de la sección a la que se asignará el administrador
   * @param usuarioId ID del usuario que será administrador
   * @returns Observable con la sección actualizada y mensaje de confirmación
   */
  assignAdministrador(orgId: string, seccionId: string, usuarioId: string): Observable<{ seccion: SeccionEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}/administrador`;
    // Enviar orgId además de usuarioId: algunos backends requieren orgId para resolver rol por nombre cuando asigna SYSADMIN
    const body = { usuarioId, orgId } as any;

    return this.http.post<any>(url, body, { headers: this.json }).pipe(
      map((payload) => {
        // Respuesta esperada: entidad plana SeccionEntity
        const d = (payload || {}) as any;
        const seccion: SeccionEntity = {
          id: String(d.id ?? seccionId),
          nombre: String(d.nombre ?? ''),
          descripcion: d.descripcion || undefined,
          estado: d.estado || undefined,
          autonomiaConfigurada: d.autonomiaConfigurada != null ? !!d.autonomiaConfigurada : undefined,
          seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null,
          adminId: (d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id) != null ? String(d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id) : String(usuarioId),
          adminNombre: (d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username) != null ? String(d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username) : undefined
        } as SeccionEntity;

        return { seccion, message: (payload as any)?.message };
      }),
      catchError((err) => {
        return throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo asignar el administrador' }, status: err?.status }));
      })
    );
  }

  /** Asignar pertenencia de un usuario a esta sección. */
  asignarUsuario(orgId: string, seccionId: string, usuarioId: string, rolContextualId?: string | null) {
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}/usuarios`;
    const body: any = { usuarioId };
    if (rolContextualId != null) body.rolContextualId = rolContextualId;
    return this.http.post<any>(url, body, { headers: this.json }).pipe(
      map((payload) => {
        const resp: ApiResponse<any> = (payload && typeof payload === 'object' && 'success' in payload)
          ? (payload as ApiResponse<any>)
          : ({ success: true, message: (payload as any)?.message, data: (payload as any) } as any);
        if (resp.success === false) throw { status: 400, error: { message: resp.message || 'No se pudo asignar el usuario a la sección' } };
        const d = (resp.data || {}) as any;
        const asig: UsuarioSeccionEntity = {
          id: String(d?.id ?? d?._id ?? ''),
          activo: d?.activo != null ? !!d?.activo : true,
          usuarioEntity: d?.usuarioEntity ? {
            id: String(d?.usuarioEntity?.id ?? d?.usuarioEntity?._id ?? ''),
            username: String(d?.usuarioEntity?.username ?? d?.usuarioEntity?.userName ?? ''),
            nombreCompleto: d?.usuarioEntity?.nombreCompleto ?? null,
            scopeNivel: d?.usuarioEntity?.scopeNivel ?? undefined
          } : null,
          seccionEntity: d?.seccionEntity ? { id: String(d?.seccionEntity?.id ?? seccionId), nombre: d?.seccionEntity?.nombre ?? null } : { id: seccionId, nombre: null },
          rolEntityContextual: d?.rolEntityContextual ? { id: String(d?.rolEntityContextual?.id ?? ''), nombre: d?.rolEntityContextual?.nombre ?? null } : null,
          rolesUsuarioOrganizacion: Array.isArray(d?.rolesUsuarioOrganizacion) ? d.rolesUsuarioOrganizacion.map((r: any) => String(r)) : null
        } as UsuarioSeccionEntity;
        return { asignacion: asig, message: resp.message };
      }),
      catchError((err) => throwError(() => ({ status: err?.status, error: { message: err?.error?.message || err?.message || 'No se pudo asignar el usuario a la sección' } })))
    );
  }

  /** Desasignar por id de relación usuario-sección. */
  desasignarUsuario(orgId: string, seccionId: string, usuarioSeccionId: string) {
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}/usuarios/${usuarioSeccionId}`;
    return this.http.delete<any>(url, { headers: this.accept }).pipe(
      map((payload) => {
        const resp: ApiResponse<any> = (payload && typeof payload === 'object' && 'success' in payload)
          ? (payload as ApiResponse<any>)
          : ({ success: true, message: (payload as any)?.message, data: (payload as any) } as any);
        if (resp.success === false) throw { status: 400, error: { message: resp.message || 'No se pudo desasignar el usuario' } };
        return { message: resp.message };
      }),
      catchError((err) => throwError(() => ({ status: err?.status, error: { message: err?.error?.message || err?.message || 'No se pudo desasignar el usuario' } })))
    );
  }

  /**
   * Lista usuarios asignados a una sección. Respuesta: JSON array directo (no envuelto en ApiResponse).
   * Puede responder 400 con mensaje de validación; se propaga para manejo en UI.
   */
  getUsuariosPorSeccion(orgId: string, seccionId: string) {
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}/usuarios`;
    return this.http.get<UsuarioSeccionEntity[]>(url, { headers: this.accept }).pipe(
      map(arr => Array.isArray(arr) ? arr : []),
      catchError(err => throwError(() => ({ status: err?.status, error: { message: err?.error?.message || err?.message } })))
    );
  }

  /** Candidatos válidos para Administrador de Sección (scope SECCION). */
  getAdminCandidates(orgId: string, seccionId: string) {
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}/administrador/candidatos`;
    return this.http.get<any>(url, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => {
        // Aceptar plano o envuelto en { success, data } o { items }
        let inner: any = payload;
        try {
          if (typeof payload === 'string') inner = JSON.parse(payload);
        } catch { inner = undefined; }
        const data = (inner && typeof inner === 'object' && 'data' in inner) ? (inner as any).data : inner;
        const arr = Array.isArray(data) ? data : (Array.isArray((data as any)?.items) ? (data as any).items : []);
        return arr;
      }),
      map(arr => (Array.isArray(arr) ? arr : []).map(d => ({
        id: String(d?.id ?? d?._id ?? ''),
        username: String(d?.username ?? d?.userName ?? ''),
        nombreCompleto: d?.nombreCompleto ?? d?.fullName ?? null,
        email: d?.email ?? null,
        activo: d?.activo != null ? !!d?.activo : true,
        scopeNivel: (d?.scopeNivel ?? d?.nivel ?? 'SECCION') as any,
        seccionPrincipalId: d?.seccionPrincipalId != null ? String(d?.seccionPrincipalId) : null,
        orgId: d?.orgId != null ? String(d?.orgId) : (d?.organizacionId != null ? String(d?.organizacionId) : null),
        fechaCreacion: d?.fechaCreacion ? String(d?.fechaCreacion) : null,
        fechaActualizacion: d?.fechaActualizacion ? String(d?.fechaActualizacion) : null
      } as UserEntity))),
      catchError(err => throwError(() => ({ status: err?.status, error: { message: err?.error?.message || err?.message } })))
    );
  }

  /**
   * Transferir usuario de una sección origen a una sección destino dentro de la misma organización.
   * POST /orgs/{orgId}/secciones/{seccionId}/usuarios/transferir
   */
  transferirUsuario(orgId: string, seccionOrigenId: string, body: TransferirUsuarioRequest) {
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionOrigenId}/usuarios/transferir`;
    return this.http.post<any>(url, body, { headers: this.json }).pipe(
      map((payload) => {
        // El backend devuelve la asignación actualizada. Aceptar planos o envueltos.
        const resp: ApiResponse<any> = (payload && typeof payload === 'object' && 'success' in payload)
          ? (payload as ApiResponse<any>)
          : ({ success: true, message: (payload as any)?.message, data: (payload as any) } as any);
        if (resp.success === false) {
          throw { status: 400, error: { message: resp.message || 'No se pudo transferir el usuario' } };
        }
        const d = (resp.data || {}) as any;
        const asig: UsuarioSeccionEntity = {
          id: String(d?.id ?? d?._id ?? ''),
          activo: d?.activo != null ? !!d?.activo : true,
          usuarioEntity: d?.usuarioEntity ? {
            id: String(d?.usuarioEntity?.id ?? d?.usuarioEntity?._id ?? ''),
            username: String(d?.usuarioEntity?.username ?? d?.usuarioEntity?.userName ?? ''),
            nombreCompleto: d?.usuarioEntity?.nombreCompleto ?? null,
            scopeNivel: d?.usuarioEntity?.scopeNivel ?? undefined
          } : null,
          seccionEntity: d?.seccionEntity ? {
            id: String(d?.seccionEntity?.id ?? ''),
            nombre: d?.seccionEntity?.nombre ?? null
          } : null,
          rolEntityContextual: d?.rolEntityContextual ? {
            id: String(d?.rolEntityContextual?.id ?? ''),
            nombre: d?.rolEntityContextual?.nombre ?? null
          } : null
        } as UsuarioSeccionEntity;
        return { asignacion: asig, message: resp.message };
      }),
      catchError((err) => {
        // Propagar código y mensaje para mapeo en UI
        const status = err?.status;
        const payload = err?.error ?? {};
        const code = payload?.code || payload?.errorCode || undefined;
        const message = payload?.message || err?.message || 'No se pudo transferir el usuario';
        return throwError(() => ({ status, error: { code, message } }));
      })
    );
  }

  /** Obtener una sección por ID. */
  get(orgId: string, seccionId: string): Observable<SeccionEntity> {
    const path = `/orgs/${orgId}/secciones/${seccionId}`;
    const urlPrimary = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;

    const mapResp = (payload: any): SeccionEntity => {
      const d = (payload && typeof payload === 'object' && 'success' in payload)
        ? (payload as any).data
        : payload;
      if (!d) throw { error: { message: 'Sección no encontrada' }, status: 404 };
      return {
        id: String(d.id ?? seccionId),
        nombre: String(d.nombre ?? ''),
        descripcion: d.descripcion || undefined,
        estado: d.estado || undefined,
        autonomiaConfigurada: d.autonomiaConfigurada != null ? !!d.autonomiaConfigurada : undefined,
        seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null,
        adminId: (d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id) != null ? String(d.administradorId ?? d.administradorPrincipal ?? d.adminId ?? d?.administradorEntity?.id) : null,
        adminNombre: (d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username) != null ? String(d.administradorNombre ?? d.administradorUsername ?? d?.administradorEntity?.nombre ?? d?.administradorEntity?.username) : null
      } as SeccionEntity;
    };

    return this.http.get<any>(urlPrimary, { headers: this.accept }).pipe(
      map(mapResp),
      catchError((_e1) => this.http.get<any>(urlFallback, { headers: this.accept }).pipe(
        map(mapResp),
        catchError((e2) => throwError(() => ({ error: { message: e2?.error?.message || e2?.message || 'No se pudo obtener la sección' }, status: e2?.status })))
      ))
    );
  }
}
