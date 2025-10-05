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
    return {
      id: d?.id != null ? String(d?.id ?? d?._id ?? d?.uuid ?? d?.idOrganizacion ?? d?.organizacionId) : undefined,
      nombre: String(d?.nombre ?? d?.name ?? d?.razonSocial ?? ''),
      activa: !!(d?.activa ?? d?.active ?? d?.isActive ?? false),
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
    return this.http.get<any>(url, { headers: this.acceptJsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return this.normalizeListResponse(resp).map(x => this.mapOrgFromBackend(x));
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
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

  create(dto: CreateOrganizationDTO): Observable<Organization> {
    return this.http.post<any>(this.collectionUrl(), dto, { headers: this.jsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const d = this.unwrapApi(resp);
        return this.mapOrgFromBackend(d);
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  update(id: string, dto: UpdateOrganizationDTO): Observable<Organization> {
    return this.http.patch<any>(`${this.collectionUrl()}/${id}`, dto, { headers: this.jsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const d = this.unwrapApi(resp);
        return this.mapOrgFromBackend(d);
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  // -------------------- Estrategias por Organización (usado por config) --------------------
  listOrgGovernanceStrategies(orgId: string | number) {
    const url = this.orgStrategyBase(orgId);
    return this.http.get<any>(url).pipe(map(payload => this.normalizeListResponse(payload).map((d: any) => this.mapStrategyFromBackend(d))));
  }

  setOrgGovernanceStrategyActive(orgId: string | number, strategyId: string | number, value: boolean) {
    const url = `${this.orgStrategyBase(orgId)}/${strategyId}/activar`;
    return this.http.patch(url, null, { params: { value } as any });
  }

  // -------------------- Catálogo de Estrategias (global) --------------------
  listCatalogGovernanceStrategies(): Observable<GovernanceStrategy[]> {
    const url = `${environment.apiBase}/catalogos/estrategias`;
    return this.http.get<any>(url, { headers: this.acceptJsonHeaders() }).pipe(
      map((resp: any) => (this.normalizeListResponse(resp) as any[]).map(d => this.mapStrategyFromBackend(d)))
    );
  }

  // Guarda en catálogo y retorna mensaje + estrategia (sin tocar organización)
  saveOrgGovernanceStrategy(_orgId: string | number | null | undefined, input: Partial<GovernanceStrategy>, _options: SaveStrategyOptions = {}): Observable<SaveStrategyResult> {
    const model = this.normalizeStrategyInput(input);
    try { this.validateStrategy(model); } catch (e) { return throwError(() => e); }
    const url = `${environment.apiBase}/catalogos/estrategias`;
    const payload = this.mapStrategyToBackendGlobal(model);
    return this.http.post<any>(url, payload, { headers: this.jsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const strategy = this.mapStrategyFromBackend(this.unwrapApi(resp));
        return { strategy, source: 'catalog-create', applied: false, activated: false, message: resp?.message } as SaveStrategyResult;
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
}
