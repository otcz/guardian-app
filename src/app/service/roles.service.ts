import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable, throwError, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {environment} from '../config/environment';
import {PageDto} from '../models/paging.models';
import {RolGlobalItem} from '../models/roles.models';

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
  activo?: boolean;
  orgId?: string | null;
  orgNombre?: string | null;
  display?: string | null;
  visibleParaHijos?: boolean;
  propio?: boolean; // sin uso de lógica; backend es fuente única
  heredado?: boolean; // sin uso de lógica
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
  id: string;
  usuarioId: string;
  rolId: string;
  rol?: RoleEntity;
  rolNombre?: string;
}

export interface PagedResult<T> {
  total: number;
  items: T[]
}

@Injectable({providedIn: 'root'})
export class RolesService {
  private base = environment.apiBase;
  private json = new HttpHeaders({'Content-Type': 'application/json', Accept: 'application/json'});
  private accept = new HttpHeaders({Accept: 'application/json'});
  private readonly rolesBase = `${this.base}/roles`;
  private readonly rolesPaged = `${this.base}/roles/paged`;

  constructor(private http: HttpClient) {
  }

  private unwrap<T = any>(resp: any): T {
    return (resp && typeof resp === 'object' && 'data' in resp) ? (resp as any).data as T : (resp as T);
  }

  private ensureRole(d: any): RoleEntity {
    const orgRaw = d?.org ?? d?.organizacion ?? d?.organization ?? null;
    const orgIdRaw = d?.orgId ?? d?.organizacionId ?? d?.organizationId ?? (orgRaw?.id) ?? null;
    const orgNameRaw = d?.orgNombre ?? d?.organizacionNombre ?? d?.organizationName ?? d?.orgName ?? orgRaw?.nombre ?? orgRaw?.name ?? null;
    const visible = d?.visibleParaHijos ?? d?.visibleHijos ?? d?.visible ?? d?.heredable ?? false;
    return {
      id: String(d?.id ?? d?._id ?? d?.rolId ?? ''),
      nombre: String(d?.nombre ?? d?.name ?? d?.rolNombre ?? d?.rol ?? ''),
      descripcion: d?.descripcion ?? null,
      estado: (d?.estado ?? (d?.active === false ? 'INACTIVO' : 'ACTIVO')) as any,
      activo: (d?.activo != null ? !!d.activo : ((d?.estado ?? (d?.active === false ? 'INACTIVO' : 'ACTIVO')) === 'ACTIVO')),
      orgId: orgIdRaw != null ? String(orgIdRaw) : null,
      orgNombre: orgNameRaw != null ? String(orgNameRaw) : (d?.org ?? d?.organization ?? null),
      display: d?.display ?? null,
      visibleParaHijos: !!visible,
      propio: undefined,
      heredado: undefined
    } as RoleEntity;
  }

  private toApiResponse(payload: any): ApiResponse<any> {
    if (payload == null) return {success: true, data: undefined};
    if (typeof payload === 'string') {
      const text = payload.trim();
      if (!text) return {success: true, data: undefined};
      try {
        const obj = JSON.parse(text);
        return ('success' in obj) ? obj : {success: true, data: obj};
      } catch {
        return {success: true, data: undefined};
      }
    }
    if (typeof payload === 'object') return ('success' in payload) ? payload : {success: true, data: payload};
    return {success: true, data: payload};
  }

  list(orgId: string): Observable<RoleEntity[]> {
    const url = `${this.base}/orgs/${orgId}/roles`;
    const fb = `${environment.backendHost}${this.base}/orgs/${orgId}/roles`;
    const mapResp = (resp: ApiResponse<any> | any) => {
      if (resp && typeof resp === 'object' && 'success' in resp && (resp as ApiResponse<any>).success === false) {
        throw {
          error: {message: (resp as ApiResponse<any>)?.message || 'No se pudieron obtener los roles'},
          status: 400
        };
      }
      const r = (resp && typeof resp === 'object' && 'success' in resp) ? (resp as ApiResponse<any>) : ({
        success: true,
        data: resp
      } as ApiResponse<any>);
      const data: any = r.data as any;
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(resp) ? resp : []));
      return arr as any[];
    };
    return this.http.get(url, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map(mapResp),
      catchError((e1) => {
        const st = e1?.status;
        if ([0, 200, 204, 404, 502, 503].includes(st)) {
          return this.http.get(fb, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
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
          status: st
        }));
      })
    );
  }

  /** Listado de roles efectivos para una sección específica (aplica reglas de backend) */
  listForSection(orgId: string, seccionId: string): Observable<RoleEntity[]> {
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}/roles`;
    const fb = `${environment.backendHost}${this.base}/orgs/${orgId}/secciones/${seccionId}/roles`;
    const mapResp = (resp: ApiResponse<any> | any) => {
      if (resp && typeof resp === 'object' && 'success' in resp && (resp as ApiResponse<any>).success === false) {
        throw {
          error: {message: (resp as ApiResponse<any>)?.message || 'No se pudieron obtener los roles de la sección'},
          status: 400
        };
      }
      const r = (resp && typeof resp === 'object' && 'success' in resp) ? (resp as ApiResponse<any>) : ({
        success: true,
        data: resp
      } as ApiResponse<any>);
      const data: any = r.data as any;
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(resp) ? resp : []));
      // devolver datos tal cual, sin normalizar
      return arr as any[];
    };
    return this.http.get(url, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map(mapResp),
      catchError((e1) => {
        const st = e1?.status;
        if ([0, 200, 204, 404, 502, 503].includes(st)) {
          return this.http.get(fb, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
            map((payload: any) => this.toApiResponse(payload)),
            map(mapResp),
            catchError((e2) => throwError(() => ({
              error: {message: e2?.error?.message || e2?.message || 'No se pudieron obtener los roles de la sección'},
              status: e2?.status
            })))
          );
        }
        return throwError(() => ({
          error: {message: e1?.error?.message || e1?.message || 'No se pudieron obtener los roles de la sección'},
          status: st
        }));
      })
    );
  }

  searchGlobalRoles(opts?: { q?: string; page?: number; size?: number }): Observable<PagedResult<RoleEntity>> {
    const q = opts?.q ?? '';
    const page = Math.max(0, Math.floor(opts?.page ?? 0));
    const size = Math.min(200, Math.max(1, Math.floor(opts?.size ?? 20)));
    const params: any = {page: String(page), size: String(size)};
    if (q) params.q = q;
    const mapPaged = (payload: any): PagedResult<RoleEntity> => {
      const inner = this.toApiResponse(payload).data ?? payload;
      const dto: PageDto<RolGlobalItem> = inner as any;
      const content: any[] = Array.isArray((dto as any)?.content) ? (dto as any).content : [];
      const total = typeof (dto as any)?.totalElements === 'number' ? (dto as any).totalElements : content.length;
      const items = content.map((it: any) => this.ensureRole({
        id: it?.id,
        rol: it?.rol,
        org: it?.org,
        orgId: it?.orgId,
        display: it?.display
      }));
      return {total, items};
    };
    return this.http.get(this.rolesPaged, {headers: this.accept, params, responseType: 'text' as 'json'}).pipe(
      map(mapPaged),
      catchError((e1) => {
        const fbOk = [0, 200, 204, 404, 500, 502, 503].includes(e1?.status ?? 0);
        if (!fbOk) return throwError(() => ({
          error: {message: e1?.error?.message || e1?.message || 'No se pudieron obtener los roles'},
          status: e1?.status
        }));
        const abs = `${environment.backendHost}${this.rolesPaged}`;
        return this.http.get(abs, {headers: this.accept, params, responseType: 'text' as 'json'}).pipe(
          map(mapPaged),
          catchError((e2) => throwError(() => ({
            error: {message: e2?.error?.message || e2?.message || 'No se pudieron obtener los roles'},
            status: e2?.status
          })))
        );
      })
    );
  }

  listGlobalPaged(opts?: { q?: string; page?: number; size?: number }): Observable<PagedResult<RoleEntity>> {
    return this.searchGlobalRoles(opts);
  }

  fetchAllGlobalRoles(): Observable<RoleEntity[]> {
    const mapList = (payload: any): RoleEntity[] => {
      const inner = this.toApiResponse(payload).data ?? payload;
      const arr: RolGlobalItem[] = Array.isArray(inner) ? inner : (Array.isArray((inner as any)?.items) ? (inner as any).items : []);
      return arr.map((it: any) => this.ensureRole({
        id: it?.id,
        rol: it?.rol ?? it?.nombre,
        org: it?.org ?? it?.orgNombre,
        orgId: it?.orgId,
        display: it?.display
      }));
    };
    return this.http.get(this.rolesBase, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
      map(mapList),
      catchError((e1) => {
        const fbOk = [0, 200, 204, 404, 500, 502, 503].includes(e1?.status ?? 0);
        if (!fbOk) return throwError(() => ({
          error: {message: e1?.error?.message || e1?.message || 'No se pudieron obtener los roles'},
          status: e1?.status
        }));
        const abs = `${environment.backendHost}${this.rolesBase}`;
        return this.http.get(abs, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
          map(mapList),
          catchError((e2) => throwError(() => ({
            error: {message: e2?.error?.message || e2?.message || 'No se pudieron obtener los roles'},
            status: e2?.status
          })))
        );
      })
    );
  }

  listGlobalAll(): Observable<RoleEntity[]> {
    return this.fetchAllGlobalRoles();
  }

  get(orgId: string, roleId: string): Observable<RoleEntity> {
    const url = `${this.base}/orgs/${orgId}/roles/${roleId}`;
    return this.http.get(url, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map(resp => {
        if (!resp || (resp as any).success === false) throw {
          error: {message: (resp as any)?.message || 'No se pudo obtener el rol'},
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
    role?: RoleEntity;
    message?: string
  }> {
    const url = `${this.base}/orgs/${orgId}/roles/${roleId}/estado`;
    const fb = `${environment.backendHost}${this.base}/orgs/${orgId}/roles/${roleId}/estado`;
    const params = {estado} as any;
    const opt = {headers: this.accept, params, responseType: 'text' as 'json'} as const;
    const mapText = (text: any) => ({role: undefined, message: (typeof text === 'string' ? text.trim() : undefined)});
    return this.http.patch(url, null, opt).pipe(
      map(mapText),
      catchError((e1) => {
        const st = e1?.status;
        if ([0, 404, 502, 503].includes(st)) {
          return this.http.patch(fb, null, opt).pipe(map(mapText), catchError((e2) => throwError(() => ({
            error: {message: e2?.error?.message || e2?.message || 'NO SE PUDO CAMBIAR EL ESTADO DEL ROL'},
            status: e2?.status
          }))))
        }
        return throwError(() => ({
          error: {message: e1?.error?.message || e1?.message || 'NO SE PUDO CAMBIAR EL ESTADO DEL ROL'},
          status: st
        }));
      })
    );
  }

  setVisibleForChildren(orgId: string, roleId: string, value: boolean): Observable<{
    role: RoleEntity;
    message?: string
  }> {
    const url = `${this.base}/orgs/${orgId}/roles/${roleId}/visible-para-hijos`;
    const fb = `${environment.backendHost}${this.base}/orgs/${orgId}/roles/${roleId}/visible-para-hijos`;
    const params = {value} as any;
    const opt = {headers: this.accept, params} as const;
    const mapJson = (resp: any) => {
      if (resp && resp.success === false) throw {
        error: {message: resp.message || 'NO SE PUDO CAMBIAR LA VISIBILIDAD'},
        status: 400
      };
      const inner = (resp && typeof resp === 'object' && 'data' in resp) ? resp.data : resp;
      return {role: this.ensureRole(inner), message: resp?.message};
    };
    return this.http.patch<any>(url, null, opt).pipe(
      map(mapJson),
      catchError((e1) => {
        const st = e1?.status;
        if ([0, 404, 502, 503].includes(st)) {
          return this.http.patch<any>(fb, null, opt).pipe(map(mapJson), catchError((e2) => throwError(() => ({
            error: {message: e2?.error?.message || e2?.message || 'NO SE PUDO CAMBIAR LA VISIBILIDAD'},
            status: e2?.status
          }))))
        }
        return throwError(() => ({
          error: {message: e1?.error?.message || e1?.message || 'NO SE PUDO CAMBIAR LA VISIBILIDAD'},
          status: st
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

  assignRoleToUser(usuarioId: string, rolId: string): Observable<{ assignment: UserRoleAssignment; message?: string }> {
    const url = `${this.base}/usuarios/${usuarioId}/roles`;
    return this.http.post<ApiResponse<any>>(url, {rolId}, {headers: this.json}).pipe(
      map((resp) => {
        if (!resp || resp.success === false) throw {
          error: {message: resp?.message || 'No se pudo asignar el rol'},
          status: 400
        };
        const d = this.unwrap<any>(resp);
        return {
          assignment: {
            id: String(d?.id ?? d?._id ?? ''),
            usuarioId: String(d?.usuarioId ?? usuarioId),
            rolId: String(d?.rolId ?? rolId),
            rol: d?.rol ? this.ensureRole(d?.rol) : undefined,
            rolNombre: String(d?.rolNombre ?? d?.rol?.nombre ?? '')
          }, message: resp.message
        };
      }),
      catchError((err) => throwError(() => ({
        error: {message: err?.error?.message || err?.message || 'No se pudo asignar el rol'},
        status: err?.status
      })))
    );
  }

  assignRoleToUserByName(usuarioId: string, rolNombre: string, orgId?: string): Observable<{
    assignment: UserRoleAssignment;
    message?: string
  }> {
    const url = `${this.base}/usuarios/${usuarioId}/roles`;
    const body: any = {rolNombre};
    if (orgId) body.orgId = orgId;
    return this.http.post<ApiResponse<any>>(url, body, {headers: this.json}).pipe(
      map((resp) => {
        if (!resp || resp.success === false) throw {
          error: {message: resp?.message || 'No se pudo asignar el rol'},
          status: 400
        };
        const d = this.unwrap<any>(resp);
        return {
          assignment: {
            id: String(d?.id ?? d?._id ?? ''),
            usuarioId: String(d?.usuarioId ?? usuarioId),
            rolId: String(d?.rolId ?? d?.rol?.id ?? ''),
            rol: d?.rol ? this.ensureRole(d?.rol) : undefined,
            rolNombre: String(d?.rolNombre ?? rolNombre ?? d?.rol?.nombre ?? '')
          }, message: resp.message
        };
      }),
      catchError((err) => throwError(() => ({
        error: {message: err?.error?.message || err?.message || 'No se pudo asignar el rol'},
        status: err?.status
      })))
    );
  }

  listUserRoles(usuarioId: string): Observable<UserRoleAssignment[]> {
    const url = `${this.base}/usuarios/${usuarioId}/roles`;
    const fb = `${environment.backendHost}${this.base}/usuarios/${usuarioId}/roles`;
    const mapResp = (resp: ApiResponse<any> | any) => {
      if (resp && typeof resp === 'object' && 'success' in resp && (resp as ApiResponse<any>).success === false) {
        throw {
          error: {message: (resp as ApiResponse<any>)?.message || 'No se pudieron listar roles del usuario'},
          status: 400
        };
      }
      const r = (resp && typeof resp === 'object' && 'success' in resp) ? (resp as ApiResponse<any>) : ({
        success: true,
        data: resp
      } as ApiResponse<any>);
      const data: any = r.data as any;
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : ([]));
      return arr.map((d: any) => ({
        id: String(d?.id ?? d?._id ?? ''),
        usuarioId: String(d?.usuarioId ?? ''),
        rolId: String(d?.rolId ?? d?.rol?.id ?? ''),
        rol: d?.rol ? this.ensureRole(d?.rol) : undefined,
        rolNombre: String(d?.rolNombre ?? d?.rol?.nombre ?? '')
      }));
    };
    return this.http.get<any>(url, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map(mapResp),
      catchError((e1) => {
        const st = e1?.status;
        if ([0, 200, 204, 404, 502, 503].includes(st)) {
          return this.http.get<any>(fb, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
            map((payload: any) => this.toApiResponse(payload)),
            map(mapResp),
            catchError((e2) => throwError(() => ({
              error: {message: e2?.error?.message || e2?.message || 'No se pudieron listar roles del usuario'},
              status: e2?.status
            })))
          );
        }
        return throwError(() => ({
          error: {message: e1?.error?.message || e1?.message || 'No se pudieron listar roles del usuario'},
          status: st
        }));
      })
    );
  }

  unassignUserRole(usuarioId: string, rolUsuarioId: string): Observable<{ message?: string }> {
    const url = `${this.base}/usuarios/${usuarioId}/roles/${rolUsuarioId}`;
    return this.http.delete<ApiResponse<any> | any>(url, {headers: this.accept}).pipe(
      map((payload) => {
        if (payload == null) return {message: undefined};
        const resp = (payload && typeof payload === 'object' && 'success' in payload) ? payload as ApiResponse<any> : ({
          success: true,
          message: undefined,
          data: payload
        } as any);
        if (resp.success === false) throw {
          error: {message: resp.message || 'No se pudo desasignar el rol'},
          status: 400
        };
        return {message: resp.message};
      })
    );
  }

  getOrgPropagarRolesAHijos(orgId: string): Observable<boolean> {
    const url = `${this.base}/orgs/${orgId}/roles/propagar-a-hijos`;
    return this.http.get<any>(url, {headers: this.accept, responseType: 'text' as 'json'}).pipe(
      map(raw => {
        const r = this.toApiResponse(raw);
        const data = r.data ?? raw;
        if (typeof data === 'boolean') return data;
        if (data && typeof data === 'object') {
          if ('value' in data && typeof (data as any).value === 'boolean') return !!(data as any).value;
          if ('propagarRolesAHijos' in data && typeof (data as any).propagarRolesAHijos === 'boolean') return !!(data as any).propagarRolesAHijos;
        }
        return true;
      }),
      catchError(() => of(true))
    );
  }

  setOrgPropagarRolesAHijos(orgId: string, value: boolean): Observable<{ value: boolean; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/roles/propagar-a-hijos`;
    const params = {value: String(value)} as any;
    return this.http.patch<any>(url, null, {headers: this.accept, params}).pipe(
      map(raw => {
        const r = this.toApiResponse(raw);
        const data = r.data ?? raw;
        let v: boolean = value;
        if (typeof data === 'boolean') v = data; else if (data && typeof data === 'object') {
          if ('value' in data && typeof (data as any).value === 'boolean') v = !!(data as any).value;
          if ('propagarRolesAHijos' in data && typeof (data as any).propagarRolesAHijos === 'boolean') v = !!(data as any).propagarRolesAHijos;
        }
        return {value: v, message: r.message};
      })
    );
  }
}
