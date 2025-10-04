import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
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

  constructor(private http: HttpClient) {}

  list(): Observable<Organization[]> { return this.http.get<Organization[]>(this.orgBase); }
  get(id: string): Observable<Organization> { return this.http.get<Organization>(`${this.orgBase}/${id}`); }
  create(dto: CreateOrganizationDTO): Observable<Organization> { return this.http.post<Organization>(this.orgBase, dto); }
  update(id: string, dto: UpdateOrganizationDTO): Observable<Organization> { return this.http.patch<Organization>(`${this.orgBase}/${id}`, dto); }

  /** Base de estrategias por organización */
  private orgStrategyBase(orgId: string | number) { return `${this.orgBase}/${orgId}/estrategias`; }

  listOrgGovernanceStrategies(orgId: string | number) {
    return this.http.get<BackendGovernanceStrategyDto[]>(this.orgStrategyBase(orgId))
      .pipe(map(arr => (arr || []).map(d => this.mapStrategyFromBackend(d)))); }

  getCurrentOrgStrategy(orgId: string | number): Observable<GovernanceStrategy | null> {
    return this.http.get<BackendGovernanceStrategyDto>(`${this.orgStrategyBase(orgId)}/actual`)
      .pipe(
        map(d => this.mapStrategyFromBackend(d)),
        catchError(err => {
          if (err?.status === 400 || err?.status === 404) {
            // No existe estrategia vigente: devolvemos null sin propagar error
            return of(null as any);
          }
          return throwError(() => err);
        })
      ); }

  createOrgGovernanceStrategy(orgId: string | number, model: Partial<GovernanceStrategy>): Observable<GovernanceStrategy> {
    const payload = this.mapStrategyToBackend(model, orgId);
    delete (payload as any).activa;
    return this.http.post<BackendGovernanceStrategyDto>(this.orgStrategyBase(orgId), payload, { observe: 'response' })
      .pipe(
        mergeMap((resp: HttpResponse<BackendGovernanceStrategyDto>) => {
          const body = resp.body as BackendGovernanceStrategyDto | undefined;
          if (body) return of(this.mapStrategyFromBackend(body));
          // Fallback: intentar obtener la actual; si no hay, devolver el modelo enviado
          return this.getCurrentOrgStrategy(orgId).pipe(map(st => (st ?? (model as GovernanceStrategy))));
        })
      ); }

  updateOrgGovernanceStrategy(orgId: string | number, strategyId: string | number, model: Partial<GovernanceStrategy>): Observable<GovernanceStrategy> {
    const payload = this.mapStrategyToBackend(model, orgId);
    return this.http.patch<BackendGovernanceStrategyDto>(`${this.orgStrategyBase(orgId)}/${strategyId}`, payload, { observe: 'response' })
      .pipe(
        mergeMap((resp: HttpResponse<BackendGovernanceStrategyDto>) => {
          const body = resp.body as BackendGovernanceStrategyDto | undefined;
          if (body) return of(this.mapStrategyFromBackend(body));
          return this.getCurrentOrgStrategy(orgId).pipe(map(st => (st ?? (model as GovernanceStrategy))));
        })
      ); }

  applyOrgGovernanceStrategy(orgId: string | number, strategyId: string | number) {
    return this.http.post(`${this.orgStrategyBase(orgId)}/${strategyId}/aplicar`, null, { observe: 'response' }); }

  setOrgGovernanceStrategyActive(orgId: string | number, strategyId: string | number, value: boolean) {
    return this.http.patch(`${this.orgStrategyBase(orgId)}/${strategyId}/activar`, null, { params: { value } as any, observe: 'response' }); }

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
    }; }

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
    }; }

  mapBackendStrategy(dto: BackendGovernanceStrategyDto): GovernanceStrategy { return this.mapStrategyFromBackend(dto); }
}
