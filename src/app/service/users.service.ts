// filepath: c:\Users\OTCZ\WebstormProjects\guardian-app\src\app\service\users.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { ApiResponse } from './auth.service';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface UserMinimal {
  id: number;
  orgId: number;
  nombres: string;
  apellidos?: string;
  documento?: string;
  username: string;
  email?: string;
  status: UserStatus;
  roleIds?: number[];
  sectionIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Paged<T> { items: T[]; page: number; size: number; total: number; }

export interface UserCreateDto {
  orgId: number;
  nombres: string;
  apellidos?: string;
  documento?: string;
  username: string;
  email?: string;
  password: string;
  status?: UserStatus;
}
export interface UserUpdateDto extends Partial<Omit<UserCreateDto, 'orgId' | 'password'>> {
  password?: string; // para cambiar contraseña opcional
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly base = 'http://localhost:8081';
  constructor(private http: HttpClient) {}

  private org(): number { return Number(localStorage.getItem('orgId') ?? '0'); }

  list(params: { status?: UserStatus; role?: number; section?: number; q?: string; page?: number; size?: number }): Observable<Paged<UserMinimal>> {
    const orgId = this.org();
    let httpParams = new HttpParams();
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.role != null) httpParams = httpParams.set('role', String(params.role));
    if (params.section != null) httpParams = httpParams.set('section', String(params.section));
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params.size != null) httpParams = httpParams.set('size', String(params.size));
    const url = `${this.base}/orgs/${encodeURIComponent(String(orgId))}/users`;
    return this.http.get<ApiResponse<Paged<UserMinimal>>>(url, { params: httpParams }).pipe(
      map((r: any) => (r?.data ?? r) as Paged<UserMinimal>)
    );
  }

  getById(id: number): Observable<UserMinimal> {
    const orgId = this.org();
    const url = `${this.base}/orgs/${encodeURIComponent(String(orgId))}/users/${encodeURIComponent(String(id))}`;
    return this.http.get<ApiResponse<UserMinimal>>(url).pipe(map((r: any) => (r?.data ?? r) as UserMinimal));
  }

  create(dto: UserCreateDto): Observable<UserMinimal> {
    const url = `${this.base}/users`;
    return this.http.post<ApiResponse<UserMinimal>>(url, dto).pipe(map((r: any) => (r?.data ?? r) as UserMinimal));
  }

  update(id: number, dto: UserUpdateDto): Observable<UserMinimal> {
    const url = `${this.base}/users/${encodeURIComponent(String(id))}`;
    return this.http.put<ApiResponse<UserMinimal>>(url, dto).pipe(map((r: any) => (r?.data ?? r) as UserMinimal));
  }

  setStatus(id: number, status: UserStatus): Observable<any> {
    const url = `${this.base}/users/${encodeURIComponent(String(id))}/status`;
    return this.http.patch<ApiResponse<any>>(url, { status });
  }

  setRoles(id: number, role_ids: number[]): Observable<any> {
    const url = `${this.base}/users/${encodeURIComponent(String(id))}/roles`;
    return this.http.post<ApiResponse<any>>(url, { role_ids });
  }

  setSections(id: number, section_ids: number[]): Observable<any> {
    const url = `${this.base}/users/${encodeURIComponent(String(id))}/sections`;
    return this.http.post<ApiResponse<any>>(url, { section_ids });
  }

  getAudit(id: number): Observable<any[]> {
    const url = `${this.base}/audit/users/${encodeURIComponent(String(id))}`;
    return this.http.get<ApiResponse<any[]>>(url).pipe(map((r: any) => (r?.data ?? r) as any[]));
  }
}

