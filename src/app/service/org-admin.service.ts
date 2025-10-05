import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';

export interface Role { id: string; nombre: string; descripcion?: string; }
export interface Permission { id: string; codigo: string; nombre: string; descripcion?: string; }

@Injectable({ providedIn: 'root' })
export class OrgAdminService {
  private base = environment.apiBase;
  private headers = new HttpHeaders({ Accept: 'application/json' });

  constructor(private http: HttpClient) {}

  // Roles disponibles en la organización
  listRoles(orgId: string): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.base}/roles`, { headers: this.headers, params: { orgId } as any });
  }
  // Plantilla de roles asignada a la organización (si existe endpoint dedicado)
  listOrgRoleTemplate(orgId: string): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.base}/orgs/${orgId}/roles-template`, { headers: this.headers });
  }
  saveOrgRoleTemplate(orgId: string, roleIds: string[]): Observable<any> {
    return this.http.patch(`${this.base}/orgs/${orgId}/roles-template`, { roleIds }, { headers: this.headers });
  }

  // Permisos disponibles
  listPermissions(orgId: string): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.base}/permisos`, { headers: this.headers, params: { orgId } as any });
  }
  // Permisos directos de la organización
  listOrgDirectPermissions(orgId: string): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.base}/orgs/${orgId}/permisos`, { headers: this.headers });
  }
  saveOrgDirectPermissions(orgId: string, permissionIds: string[]): Observable<any> {
    return this.http.patch(`${this.base}/orgs/${orgId}/permisos`, { permissionIds }, { headers: this.headers });
  }
}

