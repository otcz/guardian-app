import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../config/environment';

export interface OpcionEntity {
  id: string;
  nombre: string;
  ruta?: string | null;
  codigo?: string | null;
  padreId?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T;
}

@Injectable({ providedIn: 'root' })
export class OpcionesService {
  private base = environment.apiBase;
  private json = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
  private accept = new HttpHeaders({ Accept: 'application/json' });

  constructor(private http: HttpClient) {}

  private toApiResponse(payload: any): ApiResponse<any> {
    if (payload == null) return { success: true, data: undefined };
    if (typeof payload === 'string') {
      const text = payload.trim();
      if (!text) return { success: true, data: undefined };
      try {
        const obj = JSON.parse(text);
        if (obj && typeof obj === 'object' && 'success' in obj) return obj as ApiResponse<any>;
        return { success: true, data: obj } as ApiResponse<any>;
      } catch {
        return { success: true, data: undefined } as ApiResponse<any>;
      }
    }
    if (typeof payload === 'object') {
      if ('success' in payload) return payload as ApiResponse<any>;
      return { success: true, data: payload } as ApiResponse<any>;
    }
    return { success: true, data: payload } as ApiResponse<any>;
  }

  private ensureOpcion(d: any): OpcionEntity {
    return {
      id: String(d?.id ?? d?._id ?? ''),
      nombre: String(d?.nombre ?? d?.name ?? ''),
      ruta: d?.ruta ?? d?.path ?? null,
      codigo: d?.codigo ?? d?.code ?? null,
      padreId: d?.padreId ?? d?.parentId ?? null
    } as OpcionEntity;
  }

  listOrgOptions(orgId: string): Observable<OpcionEntity[]> {
    const path = `/orgs/${orgId}/opciones`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;
    const mapResp = (resp: ApiResponse<any> | any) => {
      const r = (resp && typeof resp === 'object' && 'success' in resp) ? resp as ApiResponse<any> : ({ success: true, data: resp } as ApiResponse<any>);
      if (r && (r as any).success === false) throw { error: { message: r?.message || 'No se pudieron listar las opciones' }, status: 400 };
      const data: any = (r as any).data;
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(resp) ? resp : []));
      return arr.map((d: any) => this.ensureOpcion(d));
    };
    return this.http.get(url, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map(mapResp),
      catchError((e1) => {
        const status = e1?.status;
        if (status === 0 || status === 200 || status === 204 || status === 404 || status === 500 || status === 502 || status === 503) {
          return this.http.get(urlFallback, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
            map((payload: any) => this.toApiResponse(payload)),
            map(mapResp),
            catchError((e2) => throwError(() => ({ error: { message: e2?.error?.message || e2?.message || 'No se pudieron listar las opciones' }, status: e2?.status })))
          );
        }
        return throwError(() => ({ error: { message: e1?.error?.message || e1?.message || 'No se pudieron listar las opciones' }, status }));
      })
    );
  }

  // Más robusto: intenta crear catálogo incluso si el GET falla (500, etc.), y reintenta GET luego.
  ensureOrgOptions(orgId: string): Observable<OpcionEntity[]> {
    // Si la siembra está desactivada, solo listar (no hacer POSTs que podrían fallar con 500)
    if (!environment.features?.seedOrgOptionsOnEmpty) {
      return this.listOrgOptions(orgId);
    }

    const path = `/orgs/${orgId}/opciones`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;

    const safeList = () => this.listOrgOptions(orgId).pipe(catchError(() => of([] as OpcionEntity[])));
    const trySeed = (u: string) => this.http.post(u, {}, { headers: this.accept, observe: 'response' }).pipe(
      catchError(() => of(null))
    );

    return safeList().pipe(
      switchMap((arr) => {
        if (Array.isArray(arr) && arr.length > 0) return of(arr);
        return trySeed(url).pipe(
          switchMap(() => safeList()),
          switchMap((afterFirst) => {
            if (Array.isArray(afterFirst) && afterFirst.length > 0) return of(afterFirst);
            return trySeed(urlFallback).pipe(
              switchMap(() => safeList())
            );
          })
        );
      })
    );
  }

  listRoleOptions(orgId: string, rolId: string): Observable<OpcionEntity[]> {
    const path = `/orgs/${orgId}/roles/${rolId}/opciones`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;
    const mapResp = (resp: ApiResponse<any> | any) => {
      const r = (resp && typeof resp === 'object' && 'success' in resp) ? resp as ApiResponse<any> : ({ success: true, data: resp } as ApiResponse<any>);
      if (r && (r as any).success === false) throw { error: { message: r?.message || 'No se pudieron listar opciones del rol' }, status: 400 };
      const data: any = (r as any).data;
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(resp) ? resp : []));
      return arr.map((d: any) => this.ensureOpcion(d));
    };
    return this.http.get(url, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map(mapResp),
      catchError((e1) => {
        const status = e1?.status;
        if (status === 0 || status === 200 || status === 204 || status === 404 || status === 500 || status === 502 || status === 503) {
          return this.http.get(urlFallback, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
            map((payload: any) => this.toApiResponse(payload)),
            map(mapResp),
            catchError((e2) => throwError(() => ({ error: { message: e2?.error?.message || e2?.message || 'No se pudieron listar opciones del rol' }, status: e2?.status })))
          );
        }
        return throwError(() => ({ error: { message: e1?.error?.message || e1?.message || 'No se pudieron listar opciones del rol' }, status }));
      })
    );
  }

  assignOptionToRole(orgId: string, rolId: string, opcionId: string): Observable<void> {
    const url = `${this.base}/orgs/${orgId}/roles/${rolId}/opciones/${opcionId}`;
    return this.http.post(url, null, { headers: this.accept, observe: 'response' }).pipe(
      map(() => void 0),
      catchError((e) => throwError(() => ({ error: { message: e?.error?.message || e?.message || 'No se pudo asignar la opción' }, status: e?.status })))
    );
  }

  unassignOptionFromRole(orgId: string, rolId: string, opcionId: string): Observable<void> {
    const url = `${this.base}/orgs/${orgId}/roles/${rolId}/opciones/${opcionId}`;
    return this.http.delete(url, { headers: this.accept, observe: 'response' }).pipe(
      map(() => void 0),
      catchError((e) => throwError(() => ({ error: { message: e?.error?.message || e?.message || 'No se pudo quitar la opción' }, status: e?.status })))
    );
  }

  // Opcional: vista efectiva por usuario
  getVisibleOptions(orgId: string, usuarioId: string, seccionId?: string | null, tree: boolean = false): Observable<OpcionEntity[] | any> {
    const basePath = `/orgs/${orgId}/opciones/visibles${tree ? '/tree' : ''}`;
    const url = `${this.base}${basePath}`;
    const urlFallback = `${environment.backendHost}${this.base}${basePath}`;
    const params: any = { usuarioId }; if (seccionId) params.seccionId = seccionId;
    if (tree) {
      // devolver lo que el backend entregue (árbol), sin transformar
      const mapTree = (resp: ApiResponse<any> | any) => (resp && typeof resp === 'object' && 'success' in resp) ? (resp as ApiResponse<any>).data : resp;
      return this.http.get<any>(url, { headers: this.accept, responseType: 'text' as 'json', params }).pipe(
        map((payload: any) => this.toApiResponse(payload)),
        map(mapTree),
        catchError((e1) => {
          const status = e1?.status;
          if (status === 0 || status === 200 || status === 204 || status === 404 || status === 500 || status === 502 || status === 503) {
            return this.http.get<any>(urlFallback, { headers: this.accept, responseType: 'text' as 'json', params }).pipe(
              map((payload: any) => this.toApiResponse(payload)),
              map(mapTree),
              catchError((e2) => throwError(() => ({ error: { message: e2?.error?.message || e2?.message || 'No se pudieron obtener opciones visibles' }, status: e2?.status })))
            );
          }
          return throwError(() => ({ error: { message: e1?.error?.message || e1?.message || 'No se pudieron obtener opciones visibles' }, status }));
        })
      );
    }
    // Lista plana
    const mapList = (resp: ApiResponse<any>) => {
      if (resp && resp.success === false) throw { error: { message: resp?.message || 'No se pudieron obtener opciones visibles' }, status: 400 };
      const data = (resp?.data ?? resp) as any;
      const arr = Array.isArray(data) ? data : (Array.isArray((data as any)?.items) ? (data as any).items : []);
      return arr.map((d: any) => this.ensureOpcion(d));
    };
    return this.http.get<any>(url, { headers: this.accept, responseType: 'text' as 'json', params }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map(mapList),
      catchError((e1) => {
        const status = e1?.status;
        if (status === 0 || status === 200 || status === 204 || status === 404 || status === 500 || status === 502 || status === 503) {
          return this.http.get<any>(urlFallback, { headers: this.accept, responseType: 'text' as 'json', params }).pipe(
            map((payload: any) => this.toApiResponse(payload)),
            map(mapList),
            catchError((e2) => throwError(() => ({ error: { message: e2?.error?.message || e2?.message || 'No se pudieron obtener opciones visibles' }, status: e2?.status })))
          );
        }
        return throwError(() => ({ error: { message: e1?.error?.message || e1?.message || 'No se pudieron obtener opciones visibles' }, status }));
      })
    );
  }

  // Sembrar explícitamente el catálogo de opciones para una organización
  seedOrgOptions(orgId: string): Observable<void> {
    const path = `/orgs/${orgId}/opciones`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;
    // Intenta por proxy y luego por absoluto; acepta 204/200 sin cuerpo
    return this.http.post(url, {}, { headers: this.accept, observe: 'response' }).pipe(
      map(() => void 0),
      catchError((e1) => {
        return this.http.post(urlFallback, {}, { headers: this.accept, observe: 'response' }).pipe(
          map(() => void 0),
          catchError((e2) => throwError(() => ({ error: { message: e2?.error?.message || e2?.message || 'No se pudo sembrar el catálogo de opciones' }, status: e2?.status })))
        );
      })
    );
  }
}
