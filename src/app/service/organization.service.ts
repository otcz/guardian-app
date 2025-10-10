import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../config/environment';

export interface GovernanceStrategy {
  id?: string;
  nombre: 'CENTRALIZADA' | 'FEDERADA' | 'HIBRIDA' | string;
  descripcion?: string;
  hereda_roles: boolean;
  crea_roles_locales: boolean;
  crea_parametros_locales: boolean;
  autonomia_menu_local: boolean;
  crea_usuarios_en_seccion: boolean;
  gestiona_vehiculos_locales: boolean;
  asigna_permisos_directos: boolean;
  alcance_ingresos: 'ORGANIZACION' | 'SECCION' | 'AMBOS';
  activa?: boolean;
}

export interface Organization {
  id?: string;
  nombre: string;
  activa: boolean;
  id_estrategia_gobernanza?: string;
  estrategia?: GovernanceStrategy; // expandida
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface CreateOrganizationDTO {
  nombre: string;
  activa?: boolean;
  estrategia?: Partial<GovernanceStrategy> | string;
}

export interface UpdateOrganizationDTO extends Partial<CreateOrganizationDTO> {
}

export interface BackendGovernanceStrategyDto {
  id?: string | number;
  nombre: string;
  descripcion?: string;
  heredaRoles: boolean;
  creaRolesLocales: boolean;
  creaParametrosLocales: boolean;
  autonomiaMenuLocal: boolean;
  creaUsuariosEnSeccion: boolean;
  gestionaVehiculosLocales: boolean;
  asignaPermisosDirectos: boolean;
  alcanceIngresos: string;
  activa?: boolean;
  organizacionId: string | number;
  organizacionEntity?: { id: string | number };
}

export interface SaveStrategyOptions {
  // Si true, tras crear/actualizar se intentará aplicar a la organización
  applyToOrg?: boolean;
  // Si true, intentará marcar como activa
  activate?: boolean;
  // Si true, prefiere crear primero en catálogo y luego aplicar a la organización (estrategia comercial/reutilizable)
  preferCatalogFirst?: boolean;
}

export interface SaveStrategyResult {
  strategy: GovernanceStrategy;
  applied?: boolean;
  activated?: boolean;
  source: 'create' | 'update' | 'catalog-create';
  message?: string;
}

// Tipos de Parámetros por organización
export interface OrgParam {
  id: string;
  codigo: string;
  descripcion?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}
export interface OrgParamValue {
  id: string;
  codigo: string;
  valor: string;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private orgBase = environment.apiBase + '/orgs';
  private resolvedOrgCollectionUrl: string | null = (environment as any).organizationsEndpoint || null;

  constructor(private http: HttpClient) {}

  // -------------------- Helpers de URL --------------------
  private collectionUrl(): string {
    return (this.resolvedOrgCollectionUrl && this.resolvedOrgCollectionUrl.trim().length > 0)
      ? this.resolvedOrgCollectionUrl!
      : this.orgBase;
  }
  private orgStrategyBase(orgId: string | number) { return `${this.collectionUrl()}/${orgId}/estrategias`; }

  // -------------------- Headers --------------------
  private jsonHeaders(): HttpHeaders { return new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }); }
  private acceptJsonHeaders(): HttpHeaders { return new HttpHeaders({ Accept: 'application/json' }); }

  // Bypass SYSADMIN (desarrollo): compone headers/params según environment.adminBypass u opciones
  private composeAdminBypass(opts?: { mode?: 'header' | 'apikey' | 'basic' | false; sysUser?: string; apiKey?: string }) {
    const cfg = (environment as any)?.adminBypass || {};
    const enabled: boolean = cfg.enabled === true;
    const mode: 'header' | 'apikey' | 'basic' | false = (opts?.mode ?? (enabled ? (cfg.mode as any) : false)) || false;
    let headers = this.acceptJsonHeaders();
    const params: any = {};

    if (!mode) return { headers, params };

    const ensureBypassQuery = () => {
      const qn = (cfg.bypassQueryName || 'bypass') as string;
      const qv = (cfg.bypassQueryValue || 'true') as string;
      if (qn && qv) params[qn] = qv;
    };

    const maybeAttachApiKey = () => {
      const keyHeader = (cfg.apiKeyHeader || 'X-Api-Sysadmin-Key') as string;
      const keyValue = (opts?.apiKey || cfg.apiKey || '').toString();
      if (keyValue) headers = headers.set(keyHeader, keyValue);
    };

    if (mode === 'header') {
      const preferredHeaderName = (cfg.headerUserName || cfg.userHeaderName || 'X-User') as string;
      const fallbackNames: string[] = [preferredHeaderName].concat(
        (cfg.userHeaderSynonyms || cfg.headerUserSynonyms || ['X-Username', 'X-User-Name']) as string[]
      );
      const sysUser = (opts?.sysUser || cfg.headerUserValue || cfg.userHeaderValue || cfg.basicUser || localStorage.getItem('username') || 'sysadmin').toString();
      headers = headers.set(preferredHeaderName, sysUser);
      if (Array.isArray(fallbackNames)) {
        for (const name of fallbackNames) {
          if (!name || name === preferredHeaderName) continue;
          headers = headers.set(name, sysUser);
        }
      }
      if (cfg.addHeaderRoles && cfg.headerName && cfg.headerValue) {
        headers = headers.set(cfg.headerName as string, cfg.headerValue as string);
      }
      ensureBypassQuery();
      // Adjuntar API key si está disponible, incluso en modo header
      maybeAttachApiKey();
    } else if (mode === 'apikey') {
      maybeAttachApiKey();
      ensureBypassQuery();
    } else if (mode === 'basic') {
      const u = (opts?.sysUser || cfg.basicUser || '').toString();
      const p = (cfg.basicPass || '').toString();
      if (u && p) {
        const token = btoa(`${u}:${p}`);
        headers = headers.set('Authorization', `Basic ${token}`);
      }
      ensureBypassQuery();
      // Adjuntar API key si está disponible, para máxima compatibilidad
      maybeAttachApiKey();
    }
    return { headers, params };
  }

  // -------------------- Normalización --------------------
  private normalizeListResponse(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.items)) return payload.items;
    if (payload && Array.isArray(payload.content)) return payload.content;
    if (payload && Array.isArray(payload.results)) return payload.results;
    if (payload && Array.isArray(payload.result)) return payload.result;
    if (payload && Array.isArray(payload.rows)) return payload.rows;
    if (payload && Array.isArray(payload.list)) return payload.list;
    return [];
  }
  private unwrapApi<T = any>(payload: any): T { return (payload && typeof payload === 'object' && 'data' in payload) ? (payload as any).data as T : payload as T; }

  // -------------------- Mapeos --------------------
  private mapOrgFromBackend(d: any): Organization {
    const estadoRaw = (d?.estado ?? d?.status ?? d?.state ?? null);
    let activaBool: boolean;
    if (d?.activa != null) activaBool = !!d.activa;
    else if (d?.active != null) activaBool = !!d.active;
    else if (d?.isActive != null) activaBool = !!d.isActive;
    else if (d?.activo != null) activaBool = !!d.activo;
    else if (typeof estadoRaw === 'string') {
      const s = estadoRaw.toString().toUpperCase();
      activaBool = ['ACTIVO', 'ACTIVE', 'HABILITADO', 'ENABLED', 'SI', 'SÍ'].includes(s);
    } else activaBool = false;
    return {
      id: d?.id != null ? String(d?.id ?? d?._id ?? d?.uuid ?? d?.idOrganizacion ?? d?.organizacionId) : undefined,
      nombre: String(d?.nombre ?? d?.name ?? d?.razonSocial ?? ''),
      activa: activaBool,
      id_estrategia_gobernanza: d?.id_estrategia_gobernanza ? String(d?.id_estrategia_gobernanza) : undefined,
      fecha_creacion: (d?.fecha_creacion ?? d?.fechaCreacion ?? d?.createdAt ?? d?.fechaRegistro ?? undefined) ? String(d?.fecha_creacion ?? d?.fechaCreacion ?? d?.createdAt ?? d?.fechaRegistro) : undefined,
      fecha_actualizacion: (d?.fecha_actualizacion ?? d?.fechaActualizacion ?? d?.updatedAt ?? undefined) ? String(d?.fecha_actualizacion ?? d?.fechaActualizacion ?? d?.updatedAt) : undefined
    } as Organization;
  }

  private normalizeStrategyInput(model: Partial<GovernanceStrategy>): GovernanceStrategy {
    const nombre = (model.nombre || '').toString().trim().toUpperCase();
    const alcance: GovernanceStrategy['alcance_ingresos'] = (model.alcance_ingresos as any) || 'ORGANIZACION';
    return {
      id: model.id ? String(model.id) : undefined,
      nombre,
      descripcion: (model.descripcion || '').toString().trim() || undefined,
      hereda_roles: !!model.hereda_roles,
      crea_roles_locales: !!model.crea_roles_locales,
      crea_parametros_locales: !!model.crea_parametros_locales,
      autonomia_menu_local: !!model.autonomia_menu_local,
      crea_usuarios_en_seccion: !!model.crea_usuarios_en_seccion,
      gestiona_vehiculos_locales: !!model.gestiona_vehiculos_locales,
      asigna_permisos_directos: !!model.asigna_permisos_directos,
      alcance_ingresos: alcance,
      activa: model.activa
    };
  }
  private validateStrategy(model: GovernanceStrategy): void {
    if (!model.nombre || model.nombre.toString().trim().length === 0) throw new Error('El nombre de la estrategia es requerido');
    if (model.descripcion && model.descripcion.trim().toUpperCase() === model.nombre.trim().toUpperCase()) throw new Error('La descripción no puede ser igual al nombre');
  }
  private mapStrategyToBackendGlobal(model: Partial<GovernanceStrategy>): Omit<BackendGovernanceStrategyDto, 'organizacionId'> {
    const alcance = model.alcance_ingresos || 'ORGANIZACION';
    return {
      id: model.id,
      nombre: (model.nombre || '').toString() as any,
      descripcion: model.descripcion || '',
      heredaRoles: !!model.hereda_roles,
      creaRolesLocales: !!model.crea_roles_locales,
      creaParametrosLocales: !!model.crea_parametros_locales,
      autonomiaMenuLocal: !!model.autonomia_menu_local,
      creaUsuariosEnSeccion: !!model.crea_usuarios_en_seccion,
      gestionaVehiculosLocales: !!model.gestiona_vehiculos_locales,
      asignaPermisosDirectos: !!model.asigna_permisos_directos,
      alcanceIngresos: alcance
    } as Omit<BackendGovernanceStrategyDto, 'organizacionId'>;
  }
  private mapStrategyFromBackend(dto: BackendGovernanceStrategyDto): GovernanceStrategy {
    return {
      id: String(dto.id || ''),
      nombre: dto.nombre as any,
      descripcion: dto.descripcion,
      hereda_roles: dto.heredaRoles,
      crea_roles_locales: dto.creaRolesLocales,
      crea_parametros_locales: dto.creaParametrosLocales,
      autonomia_menu_local: dto.autonomiaMenuLocal,
      crea_usuarios_en_seccion: dto.creaUsuariosEnSeccion,
      gestiona_vehiculos_locales: dto.gestionaVehiculosLocales,
      asigna_permisos_directos: dto.asignaPermisosDirectos,
      alcance_ingresos: dto.alcanceIngresos as any,
      activa: dto.activa
    };
  }

  // -------------------- CRUD Organización (se mantiene) --------------------
  list(): Observable<Organization[]> {
    const url = this.collectionUrl();
    const headers = this.acceptJsonHeaders().set('Cache-Control', 'no-cache').set('Pragma', 'no-cache');
    const params = { t: Date.now().toString() } as any;
    return this.http.get<any>(url, { headers, params }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return this.normalizeListResponse(resp).map(x => this.mapOrgFromBackend(x));
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  /** Lista de organizaciones accesibles para el usuario autenticado. Fallback: list() */
  listAccessible(): Observable<Organization[]> {
    if (!(environment as any).features || (environment as any).features.accessibleOrgsEndpoint === false) {
      // Bandera deshabilitada: no intentar endpoint especial, usar list() directamente
      return this.list();
    }
    const url = `${environment.apiBase}/organizaciones/accesibles`;
    const headers = this.acceptJsonHeaders().set('Cache-Control', 'no-cache').set('Pragma', 'no-cache');
    const params = { t: Date.now().toString() } as any;
    return this.http.get<any>(url, { headers, params }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return this.normalizeListResponse(resp).map(x => this.mapOrgFromBackend(x));
      }),
      catchError((err) => {
        const status = err?.status;
        if (status === 404 || status === 0) {
          return this.list();
        }
        return throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } }));
      })
    );
  }

  get(id: string): Observable<Organization> {
    return this.http.get<any>(`${this.collectionUrl()}/${id}`, { headers: this.acceptJsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const d = this.unwrapApi(resp);
        return this.mapOrgFromBackend(d);
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  create(dto: CreateOrganizationDTO): Observable<{ org: Organization; message?: string }> {
    const payload: any = {};
    if (dto.nombre !== undefined) payload.nombre = dto.nombre;
    if (dto.activa !== undefined) payload.activa = !!dto.activa;
    if (dto.estrategia !== undefined) payload.estrategia = dto.estrategia;
    return this.http.post<any>(this.collectionUrl(), payload, { headers: this.jsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const d = this.unwrapApi(resp);
        const org = this.mapOrgFromBackend(d);
        return { org, message: resp?.message };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  update(id: string, dto: UpdateOrganizationDTO): Observable<{ org: Organization; message?: string }> {
    const payload: any = {};
    if (dto.nombre !== undefined) payload.nombre = dto.nombre;
    if (dto.activa !== undefined) payload.activa = !!dto.activa;
    if (dto.estrategia !== undefined) payload.estrategia = dto.estrategia;
    return this.http.patch<any>(`${this.collectionUrl()}/${id}`, payload, { headers: this.jsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const d = this.unwrapApi(resp);
        const org = this.mapOrgFromBackend(d);
        return { org, message: resp?.message };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  // Activar/Desactivar por query param
  setOrgActive(orgId: string | number, value: boolean): Observable<{ org?: Organization; message?: string }> {
    const url = `${this.collectionUrl()}/${orgId}/activo`;
    return this.http.patch<any>(url, null, { params: { value } as any, headers: this.acceptJsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const d = this.unwrapApi(resp);
        const org = d ? this.mapOrgFromBackend(d) : undefined;
        return { org, message: resp?.message };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  // -------------------- Estrategias por Organización (usado por config) --------------------
  listOrgGovernanceStrategies(orgId: string | number) {
    const url = this.orgStrategyBase(orgId);
    return this.http.get<any>(url, { headers: this.acceptJsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return this.normalizeListResponse(resp).map((d: any) => this.mapStrategyFromBackend(d));
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  listOrgActiveStrategies(orgId: string | number) {
    const url = `${this.orgStrategyBase(orgId)}/activas`;
    return this.http.get<any>(url, { headers: this.acceptJsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return this.normalizeListResponse(resp).map((d: any) => this.mapStrategyFromBackend(d));
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  getOrgCurrentStrategy(orgId: string | number) {
    const url = `${this.collectionUrl()}/${orgId}/estrategia/actual`;
    return this.http.get<any>(url, { headers: this.acceptJsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message }, status: 404 }; }
        const d = this.unwrapApi(resp);
        return this.mapStrategyFromBackend(d);
      })
    );
  }

  setOrgGovernanceStrategyActive(orgId: string | number, strategyId: string | number, value: boolean) {
    const url = `${this.orgStrategyBase(orgId)}/${strategyId}/activar`;
    return this.http.patch<any>(url, null, { params: { value } as any, headers: this.acceptJsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const data = this.unwrapApi(resp);
        return { strategy: data ? this.mapStrategyFromBackend(data) : undefined, message: resp?.message } as { strategy?: GovernanceStrategy; message?: string };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  applyOrgStrategy(orgId: string | number, strategyId: string | number, options?: { bypassMode?: 'header' | 'apikey' | 'basic' | false; sysUser?: string; apiKey?: string }) {
    const baseUrl = `${this.orgStrategyBase(orgId)}/${strategyId}/aplicar`;
    const { headers, params } = this.composeAdminBypass({
      mode: options?.bypassMode ?? undefined,
      sysUser: options?.sysUser,
      apiKey: options?.apiKey
    });
    return this.http.post<any>(baseUrl, null, { headers, params }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return { message: resp?.message } as { message?: string };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  // -------------------- Catálogo de Estrategias (global) --------------------
  listCatalogGovernanceStrategies(): Observable<GovernanceStrategy[]> {
    const url = `${environment.apiBase}/catalogos/estrategias`;
    return this.http.get<any>(url, { headers: this.acceptJsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return (this.normalizeListResponse(resp) as any[]).map(d => this.mapStrategyFromBackend(d));
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  // Guarda en catálogo o por organización según orgId; retorna mensaje + estrategia
  saveOrgGovernanceStrategy(orgId: string | number | null | undefined, input: Partial<GovernanceStrategy>, _options: SaveStrategyOptions = {}): Observable<SaveStrategyResult> {
    const model = this.normalizeStrategyInput(input);
    try { this.validateStrategy(model); } catch (e) { return throwError(() => e); }

    // Si hay organización, crear bajo /orgs/{orgId}/estrategias
    if (orgId != null) {
      const url = this.orgStrategyBase(orgId);
      // Mapear a DTO esperado por backend (sin organizacionId en body; va en path)
      const payload = this.mapStrategyToBackendGlobal(model); // mismos campos; el controlador por org usa estas claves camelCase
      return this.http.post<any>(url, payload, { headers: this.jsonHeaders() }).pipe(
        map((resp: any) => {
          if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
          const strategy = this.mapStrategyFromBackend(this.unwrapApi(resp));
          return { strategy, source: 'create', applied: false, activated: !!strategy.activa, message: resp?.message } as SaveStrategyResult;
        }),
        catchError((err) => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
      );
    }

    // Sin organización: crear en catálogo global
    const url = `${environment.apiBase}/catalogos/estrategias`;
    const payload = this.mapStrategyToBackendGlobal(model);
    return this.http.post<any>(url, payload, { headers: this.jsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const strategy = this.mapStrategyFromBackend(this.unwrapApi(resp));
        return { strategy, source: 'catalog-create', applied: false, activated: !!strategy.activa, message: resp?.message } as SaveStrategyResult;
      }),
      catchError((err) => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  // -------------------- Parámetros por Organización --------------------
  listOrgParams(orgId: string | number): Observable<OrgParam[]> {
    const url = `${this.collectionUrl()}/${orgId}/parametros`;
    return this.http.get<any>(url, { headers: this.acceptJsonHeaders() }).pipe(
      map(resp => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return (this.normalizeListResponse(resp) as any[]).map(d => ({
          id: String(d.id ?? d._id ?? ''),
          codigo: String(d.codigo ?? ''),
          descripcion: d.descripcion,
          fechaCreacion: d.fechaCreacion ?? d.createdAt,
          fechaActualizacion: d.fechaActualizacion ?? d.updatedAt
        } as OrgParam));
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  getOrgParam(orgId: string | number, paramId: string | number): Observable<OrgParam> {
    const url = `${this.collectionUrl()}/${orgId}/parametros/${paramId}`;
    return this.http.get<any>(url, { headers: this.acceptJsonHeaders() }).pipe(
      map(resp => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const d = this.unwrapApi(resp) as any;
        return {
          id: String(d.id ?? d._id ?? ''),
          codigo: String(d.codigo ?? ''),
          descripcion: d.descripcion,
          fechaCreacion: d.fechaCreacion ?? d.createdAt,
          fechaActualizacion: d.fechaActualizacion ?? d.updatedAt
        } as OrgParam;
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  createOrgParam(orgId: string | number, body: { codigo: string; descripcion?: string }): Observable<{ param: OrgParam; message?: string }> {
    const url = `${this.collectionUrl()}/${orgId}/parametros`;
    return this.http.post<any>(url, body, { headers: this.jsonHeaders() }).pipe(
      map(resp => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const d = this.unwrapApi(resp) as any;
        const param: OrgParam = {
          id: String(d.id ?? d._id ?? ''),
          codigo: String(d.codigo ?? ''),
          descripcion: d.descripcion,
          fechaCreacion: d.fechaCreacion ?? d.createdAt,
          fechaActualizacion: d.fechaActualizacion ?? d.updatedAt
        };
        return { param, message: resp?.message };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  updateOrgParam(orgId: string | number, paramId: string | number, body: Partial<{ codigo: string; descripcion: string }>): Observable<{ param: OrgParam; message?: string }> {
    const url = `${this.collectionUrl()}/${orgId}/parametros/${paramId}`;
    return this.http.patch<any>(url, body, { headers: this.jsonHeaders() }).pipe(
      map(resp => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const d = this.unwrapApi(resp) as any;
        const param: OrgParam = {
          id: String(d.id ?? d._id ?? ''),
          codigo: String(d.codigo ?? ''),
          descripcion: d.descripcion,
          fechaCreacion: d.fechaCreacion ?? d.createdAt,
          fechaActualizacion: d.fechaActualizacion ?? d.updatedAt
        };
        return { param, message: resp?.message };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  deleteOrgParam(orgId: string | number, paramId: string | number): Observable<{ message?: string }> {
    const url = `${this.collectionUrl()}/${orgId}/parametros/${paramId}`;
    return this.http.delete<any>(url, { headers: this.acceptJsonHeaders() }).pipe(
      map(resp => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return { message: resp?.message };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  listOrgParamValues(orgId: string | number, paramId: string | number): Observable<OrgParamValue[]> {
    const url = `${this.collectionUrl()}/${orgId}/parametros/${paramId}/valores`;
    return this.http.get<any>(url, { headers: this.acceptJsonHeaders() }).pipe(
      map(resp => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return (this.normalizeListResponse(resp) as any[]).map(v => ({
          id: String(v.id ?? v._id ?? ''),
          codigo: String(v.codigo ?? ''),
          valor: String(v.valor ?? ''),
          activo: !!v.activo,
          fechaCreacion: v.fechaCreacion ?? v.createdAt,
          fechaActualizacion: v.fechaActualizacion ?? v.updatedAt
        } as OrgParamValue));
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  createOrgParamValue(orgId: string | number, paramId: string | number, body: { codigo: string; valor: string; activo?: boolean }): Observable<{ value: OrgParamValue; message?: string }> {
    const url = `${this.collectionUrl()}/${orgId}/parametros/${paramId}/valores`;
    return this.http.post<any>(url, body, { headers: this.jsonHeaders() }).pipe(
      map(resp => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const v = this.unwrapApi(resp) as any;
        const value: OrgParamValue = {
          id: String(v.id ?? v._id ?? ''),
          codigo: String(v.codigo ?? ''),
          valor: String(v.valor ?? ''),
          activo: !!v.activo,
          fechaCreacion: v.fechaCreacion ?? v.createdAt,
          fechaActualizacion: v.fechaActualizacion ?? v.updatedAt
        };
        return { value, message: resp?.message };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  updateOrgParamValue(orgId: string | number, valorId: string | number, body: Partial<{ valor: string; activo: boolean; codigo: string }>): Observable<{ value: OrgParamValue; message?: string }> {
    const url = `${this.collectionUrl()}/${orgId}/parametros/valores/${valorId}`;
    return this.http.patch<any>(url, body, { headers: this.jsonHeaders() }).pipe(
      map(resp => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const v = this.unwrapApi(resp) as any;
        const value: OrgParamValue = {
          id: String(v.id ?? v._id ?? ''),
          codigo: String(v.codigo ?? ''),
          valor: String(v.valor ?? ''),
          activo: !!v.activo,
          fechaCreacion: v.fechaCreacion ?? v.createdAt,
          fechaActualizacion: v.fechaActualizacion ?? v.updatedAt
        };
        return { value, message: resp?.message };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  deleteOrgParamValue(orgId: string | number, valorId: string | number): Observable<{ message?: string }> {
    const url = `${this.collectionUrl()}/${orgId}/parametros/valores/${valorId}`;
    return this.http.delete<any>(url, { headers: this.acceptJsonHeaders() }).pipe(
      map(resp => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return { message: resp?.message };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  // -------------------- Administración de Organización --------------------
  /**
   * Asigna un usuario como Administrador de la Organización (ORGADMIN).
   * Efecto esperado en backend: mueve al usuario a la org destino (si estaba en otra),
   * asegura/otorga el rol ORGADMIN y lo asigna como administrador.
   */
  assignOrgAdmin(orgId: string | number, usuarioId: string | number): Observable<{ message?: string; orgId: string; usuarioId: string }> {
    const url = `${this.collectionUrl()}/${orgId}/administrador`;
    const body = { usuarioId } as any;
    return this.http.post<any>(url, body, { headers: this.jsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const message = (resp && typeof resp === 'object' && 'message' in resp) ? (resp.message as string) : undefined;
        return { message, orgId: String(orgId), usuarioId: String(usuarioId) };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined }, status: err?.status })))
    );
  }
}
