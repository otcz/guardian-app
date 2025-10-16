import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../config/environment';

export interface Organization {
  id?: string;
  nombre: string;
  activa: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface CreateOrganizationDTO {
  nombre: string;
  activa?: boolean;
}

export interface UpdateOrganizationDTO extends Partial<CreateOrganizationDTO> {}

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
    const estadoRaw = (d?.estado ?? d?.status ?? d?.state ?? null);
    let activaBool: boolean;
    if (d?.activa != null) activaBool = !!d.activa;
    else if (d?.active != null) activaBool = !!d.active;
    else if (d?.isActive != null) activaBool = !!d.isActive;
    else if (d?.activo != null) activaBool = !!d.activo;
    else if (typeof estadoRaw === 'string') {
      const s = estadoRaw.toString().toUpperCase();
      activaBool = ['ACTIVO', 'ACTIVE', 'HABILITADO', 'ENABLED', 'SI', 'SÍ'].includes(s);
    } else activaBool = false;
    return {
      id: d?.id != null ? String(d?.id ?? d?._id ?? d?.uuid ?? d?.idOrganizacion ?? d?.organizacionId) : undefined,
      nombre: String(d?.nombre ?? d?.name ?? d?.razonSocial ?? ''),
      activa: activaBool,
      fecha_creacion: (d?.fecha_creacion ?? d?.fechaCreacion ?? d?.createdAt ?? d?.fechaRegistro ?? undefined) ? String(d?.fecha_creacion ?? d?.fechaCreacion ?? d?.createdAt ?? d?.fechaRegistro) : undefined,
      fecha_actualizacion: (d?.fecha_actualizacion ?? d?.fechaActualizacion ?? d?.updatedAt ?? undefined) ? String(d?.fecha_actualizacion ?? d?.fechaActualizacion ?? d?.updatedAt) : undefined
    } as Organization;
  }

  // -------------------- CRUD Organización --------------------
  list(): Observable<Organization[]> {
    const url = this.collectionUrl();
    const headers = this.acceptJsonHeaders().set('Cache-Control', 'no-cache').set('Pragma', 'no-cache');
    const params = { t: Date.now().toString() } as any;
    return this.http.get<any>(url, { headers, params }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return this.normalizeListResponse(resp).map(x => this.mapOrgFromBackend(x));
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  /** Lista de organizaciones accesibles para el usuario autenticado. Fallback: list() */
  listAccessible(): Observable<Organization[]> {
    if (!(environment as any).features || (environment as any).features.accessibleOrgsEndpoint === false) {
      return this.list();
    }
    const url = `${environment.apiBase}/organizaciones/accesibles`;
    const headers = this.acceptJsonHeaders().set('Cache-Control', 'no-cache').set('Pragma', 'no-cache');
    const params = { t: Date.now().toString() } as any;
    return this.http.get<any>(url, { headers, params }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        return this.normalizeListResponse(resp).map(x => this.mapOrgFromBackend(x));
      }),
      catchError((err) => {
        const status = err?.status;
        if (status === 404 || status === 0) {
          return this.list();
        }
        return throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } }));
      })
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

  create(dto: CreateOrganizationDTO): Observable<{ org: Organization; message?: string }> {
    const payload: any = {};
    if (dto.nombre !== undefined) payload.nombre = dto.nombre;
    if (dto.activa !== undefined) payload.activa = !!dto.activa;
    return this.http.post<any>(this.collectionUrl(), payload, { headers: this.jsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const d = this.unwrapApi(resp);
        const org = this.mapOrgFromBackend(d);
        return { org, message: resp?.message };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  update(id: string, dto: UpdateOrganizationDTO): Observable<{ org: Organization; message?: string }> {
    const payload: any = {};
    if (dto.nombre !== undefined) payload.nombre = dto.nombre;
    if (dto.activa !== undefined) payload.activa = !!dto.activa;
    return this.http.patch<any>(`${this.collectionUrl()}/${id}`, payload, { headers: this.jsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const d = this.unwrapApi(resp);
        const org = this.mapOrgFromBackend(d);
        return { org, message: resp?.message };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
    );
  }

  // Activar/Desactivar por query param
  setOrgActive(orgId: string | number, value: boolean): Observable<{ org?: Organization; message?: string }> {
    const url = `${this.collectionUrl()}/${orgId}/activo`;
    return this.http.patch<any>(url, null, { params: { value } as any, headers: this.acceptJsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const d = this.unwrapApi(resp);
        const org = d ? this.mapOrgFromBackend(d) : undefined;
        return { org, message: resp?.message };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined } })))
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

  // -------------------- Administración de Organización --------------------
  assignOrgAdmin(orgId: string | number, usuarioId: string | number): Observable<{ message?: string; orgId: string; usuarioId: string }> {
    const url = `${this.collectionUrl()}/${orgId}/administrador`;
    const body = { usuarioId } as any;
    return this.http.post<any>(url, body, { headers: this.jsonHeaders() }).pipe(
      map((resp: any) => {
        if (resp && resp.success === false) { throw { error: { message: resp.message } }; }
        const message = (resp && typeof resp === 'object' && 'message' in resp) ? (resp.message as string) : undefined;
        return { message, orgId: String(orgId), usuarioId: String(usuarioId) };
      }),
      catchError(err => throwError(() => ({ error: { message: (err?.error?.message ?? err?.message) as string | undefined }, status: err?.status })))
    );
  }
}
