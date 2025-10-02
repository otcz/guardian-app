import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private base = environment.apiBase + '/orgs';
  constructor(private http: HttpClient) {}

  list(): Observable<Organization[]> { return this.http.get<Organization[]>(this.base); }
  get(id: string): Observable<Organization> { return this.http.get<Organization>(`${this.base}/${id}`); }
  create(dto: CreateOrganizationDTO): Observable<Organization> { return this.http.post<Organization>(this.base, dto); }
  update(id: string, dto: UpdateOrganizationDTO): Observable<Organization> { return this.http.patch<Organization>(`${this.base}/${id}`, dto); }

  getStrategy(orgId: string): Observable<GovernanceStrategy> { return this.http.get<GovernanceStrategy>(`${this.base}/${orgId}/estrategia`); }
  updateStrategy(orgId: string, patch: Partial<GovernanceStrategy>): Observable<GovernanceStrategy> { return this.http.patch<GovernanceStrategy>(`${this.base}/${orgId}/estrategia`, patch); }
  listStrategies(orgId: string): Observable<GovernanceStrategy[]> { return this.http.get<GovernanceStrategy[]>(`${this.base}/${orgId}/estrategias`); }
}

