// Servicio de Gestión de Usuarios basado en los endpoints provistos
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../config/environment';

export interface ApiResponse<T> { success?: boolean; message?: string; data?: T; }

export type ScopeNivel = 'ORGANIZACION' | 'SECCION' | string;

export interface LugarSimpleDto {
  id: string;
  nombre: string;
  tipoLugar: string;
  seccionId?: string | null;
  seccionNombre?: string | null;
}

export interface UserEntity {
  id: string;
  username: string;
  nombreCompleto?: string | null;
  email?: string | null;
  activo: boolean;
  scopeNivel?: ScopeNivel | null;
  // Nuevo: sección de pertenencia actual (ID_SECCION)
  seccionId?: string | null;
  // Sección principal (solo cuando es administrador de una sección)
  seccionPrincipalId?: string | null;
  orgId?: string | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
  // NUEVOS CAMPOS del listado del backend
  telefono?: string | null;
  seccionNombre?: string | null;
  orgNombre?: string | null;
  rolesOrganizacion?: { id: string; nombre: string }[] | null;
  rolNombres?: string[] | null;
  rolNombre?: string | null;
  // LUGARES ASIGNADOS
  lugaresAsignados?: LugarSimpleDto[] | null;
}

export interface CreateUserRequest {
  username: string;
  nombreCompleto?: string | null;
  email?: string | null;
  telefono?: string | null;
  scopeNivel?: ScopeNivel;
  // Nuevo: permitir setear pertenencia en alta
  seccionId?: string | null;
  // Nuevo: organización que administrará cuando el alcance es ORGANIZACION
  orgAdministradaId?: string | null;
  // NUEVO: lista de roles a asignar en la creación (ids)
  rolesIds?: string[] | string | null;
  // NUEVO: lugares asignados al usuario (múltiples)
  lugaresIds?: string[] | null;
}

export interface UpdateUserRequest {
  username?: string; // opcional en PATCH
  nombreCompleto?: string | null;
  email?: string | null;
  telefono?: string | null;
  scopeNivel?: ScopeNivel;
  seccionPrincipalId?: string | null;
  seccionId?: string | null;
  // NUEVO: lugares asignados (reemplaza completamente)
  lugaresIds?: string[] | null;
}

// Contrato de asignación de rol a usuario
export interface AssignRoleRequest { rolId?: string; rolNombre?: string; orgId?: string; }
export interface RolUsuarioDto { id: string; usuarioId: string | null; rolId: string | null; rolNombre: string | null; }

// Metadata de usuarios (scopeNivel) provista por backend
export interface UsuariosMeta {
  defaultScopeNivel: ScopeNivel | '';
  allowedScopeNiveles: ScopeNivel[];
  requiresSeccionPrincipalWhen: ScopeNivel[];
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private base = environment.apiBase;
  private json = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
  private accept = new HttpHeaders({ Accept: 'application/json' });

  // Caché en memoria por organización (TTL 5 min)
  private usuariosMetaCache = new Map<string, { meta: UsuariosMeta; ts: number }>();
  private META_TTL_MS = 5 * 60 * 1000;

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
      // mapear pertenencia y principal
      seccionId: d?.seccionId != null ? String(d?.seccionId) : (d?.seccionEntity?.id != null ? String(d?.seccionEntity?.id) : null),
      seccionPrincipalId: d?.seccionPrincipalId != null ? String(d?.seccionPrincipalId) : null,
      orgId: d?.orgId != null ? String(d?.orgId) : (d?.organizacionId != null ? String(d?.organizacionId) : null),
      fechaCreacion: d?.fechaCreacion ? String(d?.fechaCreacion) : null,
      fechaActualizacion: d?.fechaActualizacion ? String(d?.fechaActualizacion) : null,
      // nuevos campos
      telefono: d?.telefono != null ? String(d?.telefono) : null,
      seccionNombre: d?.seccionNombre != null ? String(d?.seccionNombre) : null,
      orgNombre: d?.orgNombre != null ? String(d?.orgNombre) : null,
      rolesOrganizacion: Array.isArray(d?.rolesOrganizacion)
        ? d.rolesOrganizacion.map((r: any) => ({ id: String(r?.id ?? r?._id ?? ''), nombre: String(r?.nombre ?? r?.name ?? '') }))
        : (Array.isArray(d?.roles) ? d.roles.map((r: any) => ({ id: String(r?.id ?? r?._id ?? ''), nombre: String(r?.nombre ?? r?.name ?? '') })) : null),
      rolNombres: Array.isArray(d?.rolNombres)
        ? d.rolNombres.map((x: any) => String(x))
        : (Array.isArray(d?.rolesOrganizacion)
          ? d.rolesOrganizacion.map((r: any) => String(r?.nombre ?? r?.name ?? '')).filter(Boolean)
          : (Array.isArray(d?.roles)
            ? d.roles.map((r: any) => String(r?.nombre ?? r?.name ?? '')).filter(Boolean)
            : null)),
      rolNombre: d?.rolNombre != null ? String(d?.rolNombre) : null,
      // lugares asignados
      lugaresAsignados: Array.isArray(d?.lugaresAsignados)
        ? d.lugaresAsignados.map((l: any) => ({
            id: String(l?.id ?? ''),
            nombre: String(l?.nombre ?? ''),
            tipoLugar: String(l?.tipoLugar ?? 'CASA'),
            seccionId: l?.seccionId != null ? String(l?.seccionId) : null,
            seccionNombre: l?.seccionNombre != null ? String(l?.seccionNombre) : null
          }))
        : null
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
    // Sanitizar: solo enviar campos permitidos en alta; NO enviar seccionPrincipalId
    const payload: any = {
      username: body.username,
      nombreCompleto: body.nombreCompleto ?? undefined,
      email: body.email ?? undefined,
      telefono: body.telefono ?? undefined,
      scopeNivel: body.scopeNivel ?? undefined,
      seccionId: body.seccionId ?? undefined,
      orgAdministradaId: body.orgAdministradaId ?? undefined,
      rolesIds: body.rolesIds ?? undefined,
      lugaresIds: body.lugaresIds ?? undefined
    };
    return this.http.post<ApiResponse<any>>(url, payload, { headers: this.json }).pipe(
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const user = this.ensureUser(d);
        return { user, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo crear el usuario' }, status: err?.status })))
    );
  }

  // Obtener metadata de usuarios por organización con caché y fallback seguro
  getUsuarioMeta(orgId: string, forceRefresh = false): Observable<UsuariosMeta> {
    const key = String(orgId);
    const now = Date.now();
    const cached = this.usuariosMetaCache.get(key);
    if (!forceRefresh && cached && (now - cached.ts) < this.META_TTL_MS) {
      return new Observable<UsuariosMeta>((sub) => { sub.next(cached.meta); sub.complete(); });
    }

    const url = `${this.base}/orgs/${orgId}/usuarios/meta`;

    return this.http.get<any>(url, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        // Devolver exactamente lo que viene en data, sin normalizar ni defaults
        const d = (resp && typeof resp === 'object' && 'data' in resp) ? (resp as any).data : resp;
        const meta: UsuariosMeta = {
          defaultScopeNivel: (d?.defaultScopeNivel ?? '') as any,
          allowedScopeNiveles: Array.isArray(d?.allowedScopeNiveles) ? (d.allowedScopeNiveles as any[]) : [],
          requiresSeccionPrincipalWhen: Array.isArray(d?.requiresSeccionPrincipalWhen) ? (d.requiresSeccionPrincipalWhen as any[]) : []
        };
        this.usuariosMetaCache.set(key, { meta, ts: Date.now() });
        return meta;
      })
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

  // Asignar rol a usuario (por rolId o rolNombre+orgId)
  asignarRol(usuarioId: string, payload: AssignRoleRequest): Observable<RolUsuarioDto> {
    if (!payload || (!payload.rolId && !payload.rolNombre)) {
      throw new Error('Debe especificar rolId o rolNombre');
    }
    const url = `${this.base}/usuarios/${usuarioId}/roles`;
    return this.http.post<any>(url, payload, { headers: this.json }).pipe(
      map((resp) => {
        const d = this.unwrap<any>(resp) ?? resp;
        return {
          id: String(d?.id ?? d?._id ?? ''),
          usuarioId: d?.usuarioId != null ? String(d?.usuarioId) : null,
          rolId: d?.rolId != null ? String(d?.rolId) : null,
          rolNombre: d?.rolNombre != null ? String(d?.rolNombre) : null
        } as RolUsuarioDto;
      }),
      catchError((err) => throwError(() => ({
        error: { message: err?.error?.message ?? (typeof err?.error === 'string' ? err.error : (err?.message || 'No se pudo asignar el rol')) },
        status: err?.status
      })))
    );
  }

  /**
   * Lista usuarios de una organización
   *
   * ⚠️ IMPORTANTE - CAMBIO DE COMPORTAMIENTO (2025-11-21):
   * El backend ahora aplica FILTRADO AUTOMÁTICO basándose en el rol del usuario autenticado:
   * - SYSADMIN: ve todos los usuarios del sistema
   * - ORGADMIN: ve todos los usuarios de la organización
   * - ADMIN (Sección): ve SOLO usuarios de su(s) sección(es) - el parámetro seccionId es IGNORADO
   * - USUARIO: 403 Forbidden
   *
   * El parámetro params.seccionId se mantiene por compatibilidad pero será ignorado por el backend
   * para administradores de sección.
   *
   * @param orgId ID de la organización
   * @param params Parámetros opcionales (seccionId será ignorado para admins de sección)
   */
  list(orgId: string, params?: { seccionId?: string; excludeAdmins?: boolean }): Observable<UserEntity[]> {
    const path = `/orgs/${orgId}/usuarios`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;

    // ⚠️ Construir parámetros de query - NOTA: seccionId puede ser ignorado por el backend
    const queryParams: any = {};
    if (params?.seccionId) {
      queryParams.seccionId = params.seccionId;
      try {
        console.log('[UsersService] ℹ️ Parámetro seccionId enviado:', params.seccionId, '(puede ser ignorado por backend para admins de sección)');
      } catch {}
    }
    if (params?.excludeAdmins !== undefined) {
      queryParams.excludeAdmins = params.excludeAdmins;
    }

    const mapResp = (resp: ApiResponse<any>) => {
      if (resp && resp.success === false) {
        throw { error: { message: resp?.message || 'No se pudieron listar usuarios' }, status: 400 };
      }
      const data = resp?.data as any;
      const arr = Array.isArray(data) ? data : (Array.isArray((data as any)?.items) ? (data as any).items : (Array.isArray((resp as any)) ? (resp as any) : []));
      return arr.map((d: any) => this.ensureUser(d));
    };

    const httpOptions = {
      headers: this.accept,
      responseType: 'text' as 'json',
      params: queryParams
    };

    try {
      const queryString = Object.keys(queryParams).length > 0
        ? '?' + Object.entries(queryParams).map(([k, v]) => `${k}=${v}`).join('&')
        : '';
      console.log('[UsersService] 📡 GET', `${path}${queryString}`);
      console.log('[UsersService] ℹ️ Backend aplicará filtrado automático según rol de usuario autenticado');
    } catch {}

    return this.http.get<any>(url, httpOptions).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map(mapResp),
      catchError((_e1) => this.http.get<any>(urlFallback, httpOptions).pipe(
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

  // ===== GESTIÓN DE LUGARES DE USUARIOS =====

  /**
   * Asignar un lugar a un usuario
   * POST /api/orgs/{orgId}/usuarios/{usuarioId}/lugares
   */
  asignarLugar(orgId: string, usuarioId: string, lugarId: string): Observable<{ lugar: LugarSimpleDto; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/usuarios/${usuarioId}/lugares`;
    return this.http.post<ApiResponse<any>>(url, { lugarId }, { headers: this.json }).pipe(
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const lugar: LugarSimpleDto = {
          id: String(d?.id ?? ''),
          nombre: String(d?.nombre ?? ''),
          tipoLugar: String(d?.tipoLugar ?? 'CASA'),
          seccionId: d?.seccionId != null ? String(d?.seccionId) : null,
          seccionNombre: d?.seccionNombre != null ? String(d?.seccionNombre) : null
        };
        return { lugar, message: (resp as any)?.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo asignar el lugar' }, status: err?.status })))
    );
  }

  /**
   * Desasignar un lugar de un usuario
   * DELETE /api/orgs/{orgId}/usuarios/{usuarioId}/lugares/{lugarId}
   */
  desasignarLugar(orgId: string, usuarioId: string, lugarId: string): Observable<{ message?: string }> {
    const url = `${this.base}/orgs/${orgId}/usuarios/${usuarioId}/lugares/${lugarId}`;
    return this.http.delete<ApiResponse<any>>(url, { headers: this.accept }).pipe(
      map((resp) => ({ message: (resp as any)?.message })),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo desasignar el lugar' }, status: err?.status })))
    );
  }

  /**
   * Listar lugares de un usuario
   * GET /api/orgs/{orgId}/usuarios/{usuarioId}/lugares
   */
  listarLugaresUsuario(orgId: string, usuarioId: string): Observable<LugarSimpleDto[]> {
    const url = `${this.base}/orgs/${orgId}/usuarios/${usuarioId}/lugares`;
    return this.http.get<any>(url, { headers: this.accept }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => {
        const d = this.unwrap<any>(resp);
        const arr = Array.isArray(d) ? d : [];
        return arr.map((l: any) => ({
          id: String(l?.id ?? ''),
          nombre: String(l?.nombre ?? ''),
          tipoLugar: String(l?.tipoLugar ?? 'CASA'),
          seccionId: l?.seccionId != null ? String(l?.seccionId) : null,
          seccionNombre: l?.seccionNombre != null ? String(l?.seccionNombre) : null
        }));
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudieron listar los lugares' }, status: err?.status })))
    );
  }
}
