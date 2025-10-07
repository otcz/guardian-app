import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {environment} from '../config/environment';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface RoleEntity {
  id: string;
  nombre: string;
  descripcion?: string | null;
  estado?: 'ACTIVO' | 'INACTIVO' | string;
}

export interface CreateRoleRequest {
  nombre: string;
  descripcion?: string | null;
}

export interface UpdateRoleRequest {
  nombre?: string;
  descripcion?: string | null;
}

export interface UserRoleAssignment {
  id: string; // rolUsuarioId
  usuarioId: string;
  rolId: string;
  rol?: RoleEntity;
}

@Injectable({providedIn: 'root'})
export class RolesService {
  private base = environment.apiBase;
  private json = new HttpHeaders({'Content-Type': 'application/json', Accept: 'application/json'});
  private accept = new HttpHeaders({Accept: 'application/json'});

  constructor(private http: HttpClient) {
  }

  private unwrap<T = any>(resp: any): T {
    return (resp && typeof resp === 'object' && 'data' in resp) ? (resp as any).data as T : (resp as T);
  }

  private ensureRole(d: any): RoleEntity {
    return {
      id: String(d?.id ?? d?._id ?? ''),
      nombre: String(d?.nombre ?? d?.name ?? ''),
      descripcion: d?.descripcion ?? null,
      estado: (d?.estado ?? d?.active === false ? 'INACTIVO' : 'ACTIVO') as any
    } as RoleEntity;
  }

  // Parser seguro para respuestas que no sean JSON o estén vacías
  private toApiResponse(payload: any): ApiResponse<any> {
    if (payload == null) return {success: true, data: undefined};
    if (typeof payload === 'string') {
      const text = payload.trim();
      if (!text) return {success: true, data: undefined};
      try {
        const obj = JSON.parse(text);
        if (obj && typeof obj === 'object' && 'success' in obj) return obj as ApiResponse<any>;
        return {success: true, data: obj} as ApiResponse<any>;
      } catch {
        // Si llega HTML/Texto, no romper: tratar como sin datos
        return {success: true, data: undefined} as ApiResponse<any>;
      }
    }
    if (typeof payload === 'object') {
      if ('success' in payload) return payload as ApiResponse<any>;
      return {success: true, data: payload} as ApiResponse<any>;
    }
    return {success: true, data: payload} as ApiResponse<any>;
  }

  list(orgId: string): Observable<RoleEntity[]> {
    const path = `/orgs/${orgId}/roles`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;
    const mapResp = (resp: ApiResponse<any>) => {
      if (!resp || resp.success === false) {
        throw {error: {message: resp?.message || 'No se pudieron obtener los roles'}, status: 400};
      }
      const arr = Array.isArray(resp.data) ? resp.data : [];
      return arr.map((d: any) => this.ensureRole(d));
    };
    return this.http.get(url, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map(mapResp),
      catchError((e1) => {
        const status = e1?.status;
        if (status === 0 || status === 200 || status === 204 || status === 404 || status === 502 || status === 503) {
          return this.http.get(urlFallback, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
            map((payload: any) => this.toApiResponse(payload)),
            map(mapResp),
            catchError((e2) => throwError(() => ({
              error: {message: e2?.error?.message || e2?.message || 'No se pudieron obtener los roles'},
              status: e2?.status
            })))
          );
        }
        return throwError(() => ({
          error: {message: e1?.error?.message || e1?.message || 'No se pudieron obtener los roles'},
          status
        }));
      })
    );
  }

  get(orgId: string, roleId: string): Observable<RoleEntity> {
    const url = `${this.base}/orgs/${orgId}/roles/${roleId}`;
    return this.http.get(url, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map(resp => {
        if (!resp || resp.success === false) throw {
          error: {message: resp?.message || 'No se pudo obtener el rol'},
          status: 400
        };
        return this.ensureRole(this.unwrap(resp));
      })
    );
  }

  create(orgId: string, body: CreateRoleRequest): Observable<{ role: RoleEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/roles`;
    return this.http.post<ApiResponse<any>>(url, body, {headers: this.json}).pipe(
      map((resp) => {
        if (!resp || resp.success === false) throw {
          error: {message: resp?.message || 'No se pudo crear el rol'},
          status: 400
        };
        return {role: this.ensureRole(this.unwrap(resp)), message: resp.message};
      }),
      catchError((err) => throwError(() => ({
        error: {message: err?.error?.message || err?.message || 'No se pudo crear el rol'},
        status: err?.status
      })))
    );
  }

  update(orgId: string, roleId: string, body: UpdateRoleRequest): Observable<{ role: RoleEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/roles/${roleId}`;
    return this.http.patch<ApiResponse<any>>(url, body, {headers: this.json}).pipe(
      map((resp) => {
        if (!resp || resp.success === false) throw {
          error: {message: resp?.message || 'No se pudo actualizar el rol'},
          status: 400
        };
        return {role: this.ensureRole(this.unwrap(resp)), message: resp.message};
      }),
      catchError((err) => throwError(() => ({
        error: {message: err?.error?.message || err?.message || 'No se pudo actualizar el rol'},
        status: err?.status
      })))
    );
  }

  changeState(orgId: string, roleId: string, estado: 'ACTIVO' | 'INACTIVO'): Observable<{
    role: RoleEntity;
    message?: string
  }> {
    const path = `/orgs/${orgId}/roles/${roleId}/estado`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;
    const options = {headers: this.accept, params: {estado} as any} as const;
    const mapResp = (resp: ApiResponse<any>) => {
      if (!resp || resp.success === false) throw {
        error: {message: resp?.message || 'NO SE PUDO CAMBIAR EL ESTADO DEL ROL'},
        status: 400
      };
      return {role: this.ensureRole(this.unwrap(resp)), message: resp.message};
    };
    return this.http.patch<ApiResponse<any>>(url, null, options).pipe(
      map(mapResp),
      catchError((e1) => {
        const status = e1?.status;
        if (status === 0 || status === 404 || status === 502 || status === 503) {
          return this.http.patch<ApiResponse<any>>(urlFallback, null, options).pipe(
            map(mapResp),
            catchError((e2) => throwError(() => ({
              error: {message: e2?.error?.message || e2?.message || 'NO SE PUDO CAMBIAR EL ESTADO DEL ROL'},
              status: e2?.status
            })))
          );
        }
        return throwError(() => ({
          error: {message: e1?.error?.message || e1?.message || 'NO SE PUDO CAMBIAR EL ESTADO DEL ROL'},
          status
        }));
      })
    );
  }

  delete(orgId: string, roleId: string): Observable<{ message?: string; role?: RoleEntity }> {
    const url = `${this.base}/orgs/${orgId}/roles/${roleId}`;
    return this.http.delete<ApiResponse<any> | any>(url, {headers: this.accept}).pipe(
      map((payload) => {
        const resp = (payload && typeof payload === 'object' && 'success' in payload) ? payload as ApiResponse<any> : ({
          success: true,
          message: undefined,
          data: payload
        } as any);
        if (resp.success === false) throw {error: {message: resp.message || 'No se pudo eliminar el rol'}, status: 400};
        const d = (resp.data || {}) as any;
        const role = d && Object.keys(d).length ? this.ensureRole(d) : undefined;
        return {role, message: resp.message};
      }),
      catchError((e) => throwError(() => ({
        error: {message: e?.error?.message || 'No se pudo eliminar el rol'},
        status: e?.status
      })))
    );
  }

  // --------- Roles de Usuario ---------
  assignRoleToUser(usuarioId: string, rolId: string): Observable<{ assignment: UserRoleAssignment; message?: string }> {
    const url = `${this.base}/usuarios/${usuarioId}/roles`;
    return this.http.post<ApiResponse<any>>(url, {rolId}, {headers: this.json}).pipe(
      map((resp) => {
        if (!resp || resp.success === false) throw {
          error: {message: resp?.message || 'No se pudo asignar el rol'},
          status: 400
        };
        const d = this.unwrap<any>(resp);
        const assignment: UserRoleAssignment = {
          id: String(d?.id ?? d?._id ?? ''),
          usuarioId: String(d?.usuarioId ?? usuarioId),
          rolId: String(d?.rolId ?? rolId),
          rol: d?.rol ? this.ensureRole(d?.rol) : undefined
        };
        return {assignment, message: resp.message};
      }),
      catchError((err) => throwError(() => ({
        error: {message: err?.error?.message || err?.message || 'No se pudo asignar el rol'},
        status: err?.status
      })))
    );
  }

  listUserRoles(usuarioId: string): Observable<UserRoleAssignment[]> {
    const url = `${this.base}/usuarios/${usuarioId}/roles`;
    return this.http.get<ApiResponse<any>>(url, {headers: this.accept}).pipe(
      map((resp) => {
        if (!resp || resp.success === false) throw {
          error: {message: resp?.message || 'No se pudieron listar roles del usuario'},
          status: 400
        };
        const arr = Array.isArray(resp.data) ? resp.data : [];
        return arr.map((d: any) => ({
          id: String(d?.id ?? d?._id ?? ''),
          usuarioId: String(d?.usuarioId ?? ''),
          rolId: String(d?.rolId ?? d?.rol?.id ?? ''),
          rol: d?.rol ? this.ensureRole(d?.rol) : undefined
        } as UserRoleAssignment));
      })
    );
  }

  unassignUserRole(usuarioId: string, rolUsuarioId: string): Observable<{ message?: string }> {
    const url = `${this.base}/usuarios/${usuarioId}/roles/${rolUsuarioId}`;
    return this.http.delete<ApiResponse<any> | any>(url, {headers: this.accept}).pipe(
      map((payload) => {
        // 204 No Content -> payload null/undefined
        if (payload == null) return { message: undefined };
        const resp = (payload && typeof payload === 'object' && 'success' in payload) ? payload as ApiResponse<any> : ({
          success: true,
          message: undefined,
          data: payload
        } as any);
        if (resp.success === false) throw { error: { message: resp.message || 'No se pudo desasignar el rol' }, status: 400 };
        return { message: resp.message };
      })
    );
  }
}
