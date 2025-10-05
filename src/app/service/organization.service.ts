import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, mergeMap } from 'rxjs/operators';
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

export interface CreateOrganizationDTO { nombre: string; activa?: boolean; estrategia?: Partial<GovernanceStrategy> | string; }
export interface UpdateOrganizationDTO extends Partial<CreateOrganizationDTO> {}

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

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private orgBase = environment.apiBase + '/orgs';
  private resolvedOrgCollectionUrl: string | null = (environment as any).organizationsEndpoint || null;

  constructor(private http: HttpClient) {}

  /** Devuelve URL base efectiva para colección */
  private collectionUrl(): string {
    return (this.resolvedOrgCollectionUrl && this.resolvedOrgCollectionUrl.trim().length > 0)
      ? this.resolvedOrgCollectionUrl!
      : this.orgBase;
  }

  /** Resolución simplificada: usa config; no hace llamadas de prueba */
  private resolveCollectionUrl(): Observable<string> { return of(this.collectionUrl()); }

  /** Normaliza posibles formas de respuesta del backend */
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
      activa: !!activa,
      id_estrategia_gobernanza: estrategiaId != null ? String(estrategiaId) : undefined,
      fecha_creacion: fechaCreacion ? String(fechaCreacion) : undefined,
      fecha_actualizacion: fechaActualizacion ? String(fechaActualizacion) : undefined
    } as Organization;
  }

  list(): Observable<Organization[]> {
    const url = this.collectionUrl();
    const headers = new HttpHeaders({ Accept: 'application/json' });
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

  /** Base de estrategias por organización usando la URL resuelta */
  private orgStrategyBase(orgId: string | number) { return `${this.collectionUrl()}/${orgId}/estrategias`; }

  listOrgGovernanceStrategies(orgId: string | number) {
    const url = this.orgStrategyBase(orgId);
    return this.http.get<BackendGovernanceStrategyDto[]>(url).pipe(
      map(arr => (arr || []).map(d => this.mapStrategyFromBackend(d)))
    ); }

  getCurrentOrgStrategy(orgId: string | number): Observable<GovernanceStrategy | null> {
    const url = `${this.orgStrategyBase(orgId)}/actual`;
    return this.http.get<BackendGovernanceStrategyDto>(url).pipe(
      map(d => this.mapStrategyFromBackend(d)),
      catchError(err => {
        if (err?.status === 400 || err?.status === 404) return of(null as any);
        return throwError(() => err);
      })
    ); }

  createOrgGovernanceStrategy(orgId: string | number, model: Partial<GovernanceStrategy>): Observable<GovernanceStrategy> {
    const payload = this.mapStrategyToBackend(model, orgId);
    delete (payload as any).activa;
    const url = this.orgStrategyBase(orgId);
    return this.http.post<BackendGovernanceStrategyDto>(url, payload, { observe: 'response' }).pipe(
      mergeMap((resp: HttpResponse<BackendGovernanceStrategyDto>) => {
        const body = resp.body as BackendGovernanceStrategyDto | undefined;
        if (body) return of(this.mapStrategyFromBackend(body));
        return this.listOrgGovernanceStrategies(orgId).pipe(
          map(list => {
            const active = (list || []).find(s => s.activa);
            return active ?? ((list && list.length > 0) ? list[list.length - 1] : (model as GovernanceStrategy));
          })
        );
      })
    ); }

  updateOrgGovernanceStrategy(orgId: string | number, strategyId: string | number, model: Partial<GovernanceStrategy>): Observable<GovernanceStrategy> {
    const payload = this.mapStrategyToBackend(model, orgId);
    const url = `${this.orgStrategyBase(orgId)}/${strategyId}`;
    return this.http.patch<BackendGovernanceStrategyDto>(url, payload, { observe: 'response' }).pipe(
      mergeMap((resp: HttpResponse<BackendGovernanceStrategyDto>) => {
        const body = resp.body as BackendGovernanceStrategyDto | undefined;
        if (body) return of(this.mapStrategyFromBackend(body));
        return this.listOrgGovernanceStrategies(orgId).pipe(
          map(list => {
            const active = (list || []).find(s => s.activa);
            return active ?? ((list && list.length > 0) ? list[list.length - 1] : (model as GovernanceStrategy));
          })
        );
      })
    ); }

  applyOrgGovernanceStrategy(orgId: string | number, strategyId: string | number) {
    const url = `${this.orgStrategyBase(orgId)}/${strategyId}/aplicar`;
    return this.http.post(url, null, { observe: 'response' }); }

  setOrgGovernanceStrategyActive(orgId: string | number, strategyId: string | number, value: boolean) {
    const url = `${this.orgStrategyBase(orgId)}/${strategyId}/activar`;
    return this.http.patch(url, null, { params: { value } as any, observe: 'response' }); }

  // --- Mapeos ---
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
}
