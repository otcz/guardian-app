import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { ApiResponse } from './auth.service';

export interface Role {
  id: number;
  orgId: number;
  name: string; // mapeado desde 'nombre'
  code?: string; // puede no venir del backend
  description?: string; // mapeado desde 'descripcion'
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly base = 'http://localhost:8081';
  constructor(private http: HttpClient) {}
  private org(): number { return Number(localStorage.getItem('orgId') ?? '0'); }

  private fromApi(it: any): Role {
    return {
      id: Number(it?.id ?? it?.ID ?? 0),
      orgId: Number(it?.orgId ?? it?.org_id ?? this.org()),
      name: String(it?.nombre ?? it?.name ?? ''),
      code: it?.codigo ?? it?.code ?? undefined,
      description: it?.descripcion ?? it?.description ?? undefined,
      createdAt: it?.createdAt,
      updatedAt: it?.updatedAt
    } as Role;
  }

  list(): Observable<Role[]> {
    const url = `${this.base}/auth/roles?orgId=${encodeURIComponent(String(this.org()))}`;
    return this.http.get<ApiResponse<any[]>>(url).pipe(
      map((r: any) => Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : [])),
      map((arr: any[]) => arr.map(it => this.fromApi(it)))
    );
  }

  create(role: Partial<Role>): Observable<Role> {
    const url = `${this.base}/auth/roles`;
    const body: any = {
      orgId: role.orgId ?? this.org(),
      nombre: role.name,
      descripcion: role.description
    };
    return this.http.post<ApiResponse<any>>(url, body).pipe(map((r: any) => this.fromApi(r?.data ?? r)));
  }

  update(id: number, role: Partial<Role>): Observable<Role> {
    const url = `${this.base}/auth/roles/${encodeURIComponent(String(id))}`;
    const body: any = {};
    if (typeof role.name === 'string') body.nombre = role.name;
    if (typeof role.description === 'string') body.descripcion = role.description;
    if (typeof role.orgId === 'number') body.orgId = role.orgId; // por si aplica
    return this.http.put<ApiResponse<any>>(url, body).pipe(map((r: any) => this.fromApi(r?.data ?? r)));
  }

  delete(id: number): Observable<void> {
    const url = `${this.base}/auth/roles/${encodeURIComponent(String(id))}`;
    return this.http.delete<ApiResponse<void>>(url).pipe(map(() => void 0));
  }
}
