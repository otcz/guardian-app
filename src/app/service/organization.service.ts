import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private orgBase = environment.apiBase + '/orgs';
  private resolvedOrgCollectionUrl: string | null = (environment as any).organizationsEndpoint || null;

  constructor(private http: HttpClient) {
  }

  // -------------------- Helpers de URL --------------------
  /** Devuelve URL base efectiva para colección */
  private collectionUrl(): string {
    return (this.resolvedOrgCollectionUrl && this.resolvedOrgCollectionUrl.trim().length > 0)
      ? this.resolvedOrgCollectionUrl!
      : this.orgBase;
  }

  /** Base de estrategias por organización usando la URL resuelta */
  private orgStrategyBase(orgId: string | number) { return `${this.collectionUrl()}/${orgId}/estrategias`; }

  // -------------------- Helpers de HTTP/fallback --------------------
  private jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
  }

  private acceptJsonHeaders(): HttpHeaders {
    return new HttpHeaders({ Accept: 'application/json' });
  }

  private isFallbackStatus(status: any) {
    // Importante: NO usar 400 para fallback; 400 suele ser una validación de negocio con mensaje útil
    return status === 404 || status === 405 || status === 501;
  }

  private postWithFallback<T>(urls: string[], body: any): Observable<T> {
    if (!urls || urls.length === 0) return throwError(() => new Error('No hay endpoints para POST'));
    const [first, ...rest] = urls;
    return this.http.post<T>(first, body, { headers: this.jsonHeaders() }).pipe(
      catchError(err => (this.isFallbackStatus(err?.status) && rest.length) ? this.postWithFallback<T>(rest, body) : throwError(() => err))
    );
  }

  private getWithFallback<T>(urls: string[]): Observable<T> {
    if (!urls || urls.length === 0) return throwError(() => new Error('No hay endpoints para GET'));
    const [first, ...rest] = urls;
    return this.http.get<T>(first, { headers: this.acceptJsonHeaders() }).pipe(
      catchError(err => (this.isFallbackStatus(err?.status) && rest.length) ? this.getWithFallback<T>(rest) : throwError(() => err))
    );
  }

  // -------------------- Normalización y validación --------------------
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

  /** Si payload es ApiResponse<T>, devuelve payload.data; en otro caso, el payload tal cual */
  private unwrapApi<T = any>(payload: any): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as any).data as T;
    }
    return payload as T;
  }

  /** Map flexible de organización desde backend con variantes de nombre de campo */
  private mapOrgFromBackend(d: any): Organization {
    const id = d?.id ?? d?._id ?? d?.uuid ?? d?.idOrganizacion ?? d?.organizacionId;
    const nombre = d?.nombre ?? d?.name ?? d?.razonSocial ?? '';
    const activa = (d?.activa ?? d?.active ?? d?.isActive ?? false) as boolean;
    const fechaCreacion = d?.fecha_creacion ?? d?.fechaCreacion ?? d?.createdAt ?? d?.fechaRegistro ?? null;
    const fechaActualizacion = d?.fecha_actualizacion ?? d?.fechaActualizacion ?? d?.updatedAt ?? null;
    const estrategiaId = d?.id_estrategia_gobernanza ?? d?.estrategiaId ?? d?.idEstrategiaGobernanza ?? null;
    return {
      id: id != null ? String(id) : undefined,
      nombre: String(nombre),
      activa: activa,
      id_estrategia_gobernanza: estrategiaId != null ? String(estrategiaId) : undefined,
      fecha_creacion: fechaCreacion ? String(fechaCreacion) : undefined,
      fecha_actualizacion: fechaActualizacion ? String(fechaActualizacion) : undefined
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
    if (!model.nombre || model.nombre.toString().trim().length === 0) {
      throw new Error('El nombre de la estrategia es requerido');
    }
    if (model.descripcion && model.descripcion.trim().toUpperCase() === model.nombre.trim().toUpperCase()) {
      throw new Error('La descripción no puede ser igual al nombre');
    }
  }

  private mapStrategyToBackend(model: Partial<GovernanceStrategy>, orgId: string | number): BackendGovernanceStrategyDto {
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
      alcanceIngresos: alcance,
      activa: model.activa,
      organizacionId: orgId
    };
  }

  /** Mapper para enviar estrategia al catálogo (sin organizacionId) */
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

  mapBackendStrategy(dto: BackendGovernanceStrategyDto): GovernanceStrategy { return this.mapStrategyFromBackend(dto); }

  // -------------------- CRUD de Organización --------------------
  list(): Observable<Organization[]> {
    const url = this.collectionUrl();
    const headers = this.acceptJsonHeaders();
    return this.http.get<any>(url, { headers }).pipe(
      map(payload => this.normalizeListResponse(payload).map(x => this.mapOrgFromBackend(x)))
    );
  }

  get(id: string): Observable<Organization> {
    const url = `${this.collectionUrl()}/${id}`;
    return this.http.get<any>(url).pipe(map(d => this.mapOrgFromBackend(d)));
  }

  create(dto: CreateOrganizationDTO): Observable<Organization> {
    const url = this.collectionUrl();
    return this.http.post<any>(url, dto).pipe(map(d => this.mapOrgFromBackend(d)));
  }

  update(id: string, dto: UpdateOrganizationDTO): Observable<Organization> {
    const url = `${this.collectionUrl()}/${id}`;
    return this.http.patch<any>(url, dto).pipe(map(d => this.mapOrgFromBackend(d)));
  }

  // -------------------- Estrategias por Organización --------------------
  listOrgGovernanceStrategies(orgId: string | number) {
    const url = this.orgStrategyBase(orgId);
    return this.http.get<any>(url).pipe(
      map(payload => this.normalizeListResponse(payload).map((d: any) => this.mapStrategyFromBackend(d)))
    );
  }

  getCurrentOrgStrategy(orgId: string | number): Observable<GovernanceStrategy | null> {
    const url = `${this.orgStrategyBase(orgId)}/actual`;
    return this.http.get<any>(url).pipe(
      map(d => this.mapStrategyFromBackend(this.unwrapApi(d))),
      catchError(err => {
        if (err?.status === 400 || err?.status === 404) return of(null as any);
        return throwError(() => err);
      })
    );
  }

  getCurrentOrgStrategySingular(orgId: string | number): Observable<GovernanceStrategy | null> {
    const url = `${this.collectionUrl()}/${orgId}/estrategia/actual`;
    return this.http.get<any>(url).pipe(
      map(d => this.mapStrategyFromBackend(this.unwrapApi(d))),
      catchError(err => {
        if (err?.status === 400 || err?.status === 404) return of(null as any);
        return throwError(() => err);
      })
    );
  }

  /** Obtiene la estrategia actual intentando plural -> singular -> lista(activa). */
  getCurrentOrgStrategyAuto(orgId: string | number): Observable<GovernanceStrategy | null> {
    const plural = `${this.orgStrategyBase(orgId)}/actual`;
    const singular = `${this.collectionUrl()}/${orgId}/estrategia/actual`;
    return this.http.get<any>(plural).pipe(
      map(d => this.mapStrategyFromBackend(this.unwrapApi(d))),
      catchError(err => {
        if (err?.status === 400 || err?.status === 404) {
          return this.http.get<any>(singular).pipe(
            map(d => this.mapStrategyFromBackend(this.unwrapApi(d))),
            catchError(err2 => {
              if (err2?.status === 400 || err2?.status === 404) {
                return this.listOrgGovernanceStrategies(orgId).pipe(
                  map(list => (list || []).find(s => s.activa) || null)
                );
              }
              return throwError(() => err2);
            })
          );
        }
        return throwError(() => err);
      })
    );
  }

  createOrgGovernanceStrategy(orgId: string | number, model: Partial<GovernanceStrategy>): Observable<GovernanceStrategy> {
    const payload = this.mapStrategyToBackend(model, orgId);
    delete (payload as any).activa;
    const url = this.orgStrategyBase(orgId);
    return this.http.post<any>(url, payload).pipe(
      map(resp => this.mapStrategyFromBackend(this.unwrapApi(resp)))
    );
  }

  updateOrgGovernanceStrategy(orgId: string | number, strategyId: string | number, model: Partial<GovernanceStrategy>): Observable<GovernanceStrategy> {
    const payload = this.mapStrategyToBackend(model, orgId);
    const url = `${this.orgStrategyBase(orgId)}/${strategyId}`;
    return this.http.patch<any>(url, payload).pipe(
      map(resp => this.mapStrategyFromBackend(this.unwrapApi(resp)))
    );
  }

  applyOrgGovernanceStrategy(orgId: string | number, strategyId: string | number) {
    const url = `${this.orgStrategyBase(orgId)}/${strategyId}/aplicar`;
    return this.http.post(url, null, { observe: 'response' });
  }

  setOrgGovernanceStrategyActive(orgId: string | number, strategyId: string | number, value: boolean) {
    const url = `${this.orgStrategyBase(orgId)}/${strategyId}/activar`;
    return this.http.patch(url, null, { params: { value } as any, observe: 'response' }); }

  // -------------------- Catálogo de Estrategias (global) --------------------
  listCatalogGovernanceStrategies(): Observable<GovernanceStrategy[]> {
    const candidates = [
      `${environment.apiBase}/catalogos/estrategias/all`,
      `${environment.apiBase}/catalogos/estrategias`,
      `${environment.apiBase}/estrategias`,
      `${environment.apiBase}/catalogo/estrategias`,
      `${environment.backendHost}/api/catalogos/estrategias/all`,
      `${environment.backendHost}/api/catalogos/estrategias`,
      `${environment.backendHost}/api/estrategias`,
      `${environment.backendHost}/api/catalogo/estrategias`
    ];
    return this.getWithFallback<BackendGovernanceStrategyDto[] | any>(candidates).pipe(
      map((resp: any) => {
        const arr = Array.isArray(resp) ? resp : (this.normalizeListResponse(resp));
        return (arr || []).map((d: any) => this.mapStrategyFromBackend(d));
      })
    );
  }

  createCatalogGovernanceStrategy(model: Partial<GovernanceStrategy>): Observable<GovernanceStrategy> {
    const payload = this.mapStrategyToBackendGlobal(model);
    const candidates = [
      `${environment.apiBase}/catalogos/estrategias/save`,
      `${environment.apiBase}/catalogos/estrategias`,
      `${environment.backendHost}/api/catalogos/estrategias/save`,
      `${environment.backendHost}/api/catalogos/estrategias`
    ];
    return this.postWithFallback<any>(candidates, payload).pipe(
      map(resp => this.mapStrategyFromBackend(this.unwrapApi(resp)))
    );
  }

  /** Guarda (create/update) una estrategia sin involucrar organización: crea en catálogo y retorna la estrategia creada. */
  saveOrgGovernanceStrategy(_orgId: string | number | null | undefined, input: Partial<GovernanceStrategy>, _options: SaveStrategyOptions = {}): Observable<SaveStrategyResult> {
    const model = this.normalizeStrategyInput(input);
    try { this.validateStrategy(model); } catch (e) { return throwError(() => e); }

    // Post directo a catálogo para capturar message y data
    const payload = this.mapStrategyToBackendGlobal(model);
    const candidates = [
      `${environment.apiBase}/catalogos/estrategias/save`,
      `${environment.apiBase}/catalogos/estrategias`,
      `${environment.backendHost}/api/catalogos/estrategias/save`,
      `${environment.backendHost}/api/catalogos/estrategias`
    ];
    return this.postWithFallback<any>(candidates, payload).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) {
          throw { error: { message: resp.message } };
        }
        const strategy = this.mapStrategyFromBackend(this.unwrapApi(resp));
        const message = resp?.message as string | undefined;
        return { strategy, source: 'catalog-create', applied: false, activated: false, message } as SaveStrategyResult;
      }),
      catchError((err) => {
        const msg = (err?.error?.message ?? err?.message) as string | undefined;
        return throwError(() => ({ error: { message: msg } }));
      })
    );
  }
}
