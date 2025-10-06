import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../config/environment';

export interface SeccionEntity {
  id: string;
  nombre: string;
  descripcion?: string;
  estado?: string;
  autonomiaConfigurada?: boolean;
  seccionPadreId?: string | null;
}

export interface CreateSeccionRequest {
  nombre: string;
  descripcion?: string;
  seccionPadreId?: string | null;
  autonomiaConfigurada?: boolean;
}

export interface UpdateSeccionRequest {
  nombre?: string;
  descripcion?: string | null;
  idSeccionPadre?: string | null;
  administradorPrincipal?: string | null;
  autonomiaConfigurada?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

@Injectable({ providedIn: 'root' })
export class SeccionService {
  private base = environment.apiBase;
  private json = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
  private accept = new HttpHeaders({ Accept: 'application/json' });

  constructor(private http: HttpClient) {}

  create(orgId: string, body: CreateSeccionRequest): Observable<{ seccion: SeccionEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/secciones`;
    return this.http.post<ApiResponse<any>>(url, body, { headers: this.json }).pipe(
      map((resp) => {
        if (!resp || resp.success === false) {
          throw { error: { message: resp?.message || 'No se pudo crear la sección' }, status: 400 };
        }
        const d = (resp.data || {}) as any;
        const nombre = d?.nombre != null ? String(d.nombre) : body?.nombre;
        const seccion: any = { id: String(d.id), nombre };
        if (d.descripcion !== undefined) seccion.descripcion = d.descripcion || undefined;
        if (d.estado !== undefined) seccion.estado = d.estado || undefined;
        if (d.autonomiaConfigurada !== undefined) seccion.autonomiaConfigurada = !!d.autonomiaConfigurada;
        if (d.seccionPadreId !== undefined || d.idSeccionPadre !== undefined) seccion.seccionPadreId = d.seccionPadreId ?? d.idSeccionPadre ?? null;
        return { seccion: seccion as SeccionEntity, message: resp.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo crear la sección' }, status: err?.status })))
    );
  }

  list(orgId: string): Observable<SeccionEntity[]> {
    const path = `/orgs/${orgId}/secciones`;
    const urlPrimary = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;

    const mapResponse = (resp: ApiResponse<any>): SeccionEntity[] => {
      if (!resp || resp.success === false) {
        throw { error: { message: resp?.message || 'No se pudieron obtener las secciones' }, status: 400 };
      }
      const arr = Array.isArray(resp.data) ? resp.data : [];
      return arr.map((d: any) => ({
        id: String(d.id),
        nombre: String(d.nombre),
        descripcion: d.descripcion || undefined,
        estado: d.estado || undefined,
        autonomiaConfigurada: !!(d.autonomiaConfigurada ?? d.autonomiaConfigurada === true),
        seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null
      })) as SeccionEntity[];
    };

    return this.http.get<ApiResponse<any>>(urlPrimary, { headers: this.accept }).pipe(
      map(mapResponse),
      catchError((err) => {
        const status = err?.status;
        if (status === 0 || status === 404 || status === 502 || status === 503) {
          return this.http.get<ApiResponse<any>>(urlFallback, { headers: this.accept }).pipe(
            map(mapResponse),
            catchError((e2) =>
              throwError(() => ({ error: { message: e2?.error?.message || e2?.message || 'No se pudieron obtener las secciones' }, status: e2?.status }))
            )
          );
        }
        return throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudieron obtener las secciones' }, status }));
      })
    );
  }

  update(orgId: string, seccionId: string, body: UpdateSeccionRequest): Observable<{ seccion: SeccionEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}`;
    return this.http.patch<ApiResponse<any>>(url, body, { headers: this.json }).pipe(
      map((resp) => {
        if (!resp || resp.success === false) {
          throw { error: { message: resp?.message || 'No se pudo actualizar la sección' }, status: 400 };
        }
        const d = (resp.data || {}) as any;
        const nombre = d?.nombre != null ? String(d.nombre) : (body?.nombre ?? '');
        const seccion: any = { id: String(d.id ?? seccionId), nombre };
        if (d.descripcion !== undefined) seccion.descripcion = d.descripcion || undefined;
        if (d.estado !== undefined) seccion.estado = d.estado || undefined;
        if (d.autonomiaConfigurada !== undefined) seccion.autonomiaConfigurada = !!d.autonomiaConfigurada;
        if (d.seccionPadreId !== undefined || d.idSeccionPadre !== undefined) seccion.seccionPadreId = d.seccionPadreId ?? d.idSeccionPadre ?? null;
        return { seccion: seccion as SeccionEntity, message: resp.message };
      }),
      catchError((err) => throwError(() => ({ error: { message: err?.error?.message || err?.message || 'No se pudo actualizar la sección' }, status: err?.status })))
    );
  }

  changeState(orgId: string, seccionId: string, estado: 'ACTIVA' | 'INACTIVA'): Observable<{ seccion: SeccionEntity; message?: string }> {
    const path = `/orgs/${orgId}/secciones/${seccionId}/estado`;
    const url = `${this.base}${path}`;
    const urlFallback = `${environment.backendHost}${this.base}${path}`;

    const mapResp = (resp: ApiResponse<any>) => {
      if (!resp || resp.success === false) {
        throw { error: { message: resp?.message || 'No se pudo actualizar el estado de la sección' }, status: 400 };
      }
      const d = (resp.data || {}) as any;
      const nombre = d?.nombre != null ? String(d.nombre) : undefined;
      const seccion: any = { id: String(d.id ?? seccionId) };
      if (nombre != null) seccion.nombre = nombre;
      const boolEstado = (typeof d.activo === 'boolean' ? d.activo : (typeof d.activa === 'boolean' ? d.activa : undefined));
      const estadoFinal = d.estado || (boolEstado === true ? 'ACTIVA' : (boolEstado === false ? 'INACTIVA' : estado));
      seccion.estado = estadoFinal;
      if (d.descripcion !== undefined) seccion.descripcion = d.descripcion || undefined;
      if (d.autonomiaConfigurada !== undefined) seccion.autonomiaConfigurada = !!d.autonomiaConfigurada;
      if (d.seccionPadreId !== undefined || d.idSeccionPadre !== undefined) seccion.seccionPadreId = d.seccionPadreId ?? d.idSeccionPadre ?? null;
      return { seccion: seccion as SeccionEntity, message: resp.message };
    };

    const headersJson = { headers: this.json } as const;
    const headersAccept = { headers: this.accept } as const;
    const estadoAlt = estado === 'ACTIVA' ? 'ACTIVO' : 'INACTIVO';
    const activaBool = estado === 'ACTIVA';

    // 1) body estado (ACTIVA/INACTIVA)
    return this.http.patch<ApiResponse<any>>(url, { estado } as any, headersJson).pipe(
      map(mapResp),
      catchError((err1) => {
        // 2) query param estado
        return this.http.patch<ApiResponse<any>>(url, null, { ...headersAccept, params: { estado } as any }).pipe(
          map(mapResp),
          catchError((err2) => {
            // 3) query param value
            return this.http.patch<ApiResponse<any>>(url, null, { ...headersAccept, params: { value: estado } as any }).pipe(
              map(mapResp),
              catchError((err3) => {
                // 4) body estado variante (ACTIVO/INACTIVO)
                return this.http.patch<ApiResponse<any>>(url, { estado: estadoAlt } as any, headersJson).pipe(
                  map(mapResp),
                  catchError((err4) => {
                    // 5) query param estado variante
                    return this.http.patch<ApiResponse<any>>(url, null, { ...headersAccept, params: { estado: estadoAlt } as any }).pipe(
                      map(mapResp),
                      catchError((err5) => {
                        // 6) host fallback + body estado normal
                        return this.http.patch<ApiResponse<any>>(urlFallback, { estado } as any, headersJson).pipe(
                          map(mapResp),
                          catchError((err6) => {
                            // 7) activa/activo (boolean)
                            return this.http.patch<ApiResponse<any>>(url, { activa: activaBool } as any, headersJson).pipe(
                              map(mapResp),
                              catchError((err7) => this.http.patch<ApiResponse<any>>(url, { activo: activaBool } as any, headersJson).pipe(
                                map(mapResp),
                                catchError((err8) => this.http.patch<ApiResponse<any>>(urlFallback, { activa: activaBool } as any, headersJson).pipe(
                                  map(mapResp),
                                  catchError((eFinal) => throwError(() => ({ error: { message: err1?.error?.message || err2?.error?.message || err3?.error?.message || err4?.error?.message || err5?.error?.message || err6?.error?.message || err7?.error?.message || err8?.error?.message || eFinal?.error?.message || 'No se pudo cambiar el estado de la sección' }, status: eFinal?.status ?? err8?.status ?? err7?.status ?? err6?.status ?? err5?.status ?? err4?.status ?? err3?.status ?? err2?.status ?? err1?.status })))
                                ))
                              ))
                            );
                          })
                        );
                      })
                    );
                  })
                );
              })
            );
          })
        );
      })
    );
  }

  delete(orgId: string, seccionId: string): Observable<{ message?: string; seccion?: SeccionEntity; soft?: boolean }> {
    const basePath = `/orgs/${orgId}/secciones/${seccionId}`;
    const url = `${this.base}${basePath}`;
    const urlFallback = `${environment.backendHost}${this.base}${basePath}`;

    const parseOk = (resp: any) => {
      if (resp && typeof resp === 'object' && 'success' in resp) {
        if ((resp as any).success === false) {
          throw { error: { message: (resp as any).message || 'No se pudo eliminar la sección' }, status: 400 };
        }
        return { message: (resp as any).message } as { message?: string };
      }
      return { message: undefined } as { message?: string };
    };

    // Intentar DELETE real
    return this.http.delete<any>(url, { headers: this.accept }).pipe(
      map((r) => ({ ...parseOk(r), soft: false })),
      catchError((e1) => this.http.delete<any>(urlFallback, { headers: this.accept }).pipe(
        map((r) => ({ ...parseOk(r), soft: false })),
        catchError((_e2) => {
          // Fallback: baja lógica via PATCH /estado
          const estadoUrl = `${this.base}${basePath}/estado`;
          const estadoUrlFallback = `${environment.backendHost}${this.base}${basePath}/estado`;

          const mapResp = (resp: ApiResponse<any>) => {
            if (!resp || resp.success === false) {
              throw { error: { message: resp?.message || 'No se pudo eliminar la sección' }, status: 400 };
            }
            const d = (resp.data || {}) as any;
            const boolEstado = (typeof d.activo === 'boolean' ? d.activo : (typeof d.activa === 'boolean' ? d.activa : undefined));
            const estadoFinal = d.estado || (boolEstado === true ? 'ACTIVA' : (boolEstado === false ? 'INACTIVA' : 'INACTIVA'));
            const seccion: SeccionEntity = {
              id: String(d.id ?? seccionId),
              nombre: String(d.nombre ?? ''),
              descripcion: d.descripcion || undefined,
              estado: estadoFinal,
              autonomiaConfigurada: d.autonomiaConfigurada != null ? !!d.autonomiaConfigurada : undefined,
              seccionPadreId: d.seccionPadreId ?? d.idSeccionPadre ?? null
            } as SeccionEntity;
            return { seccion, message: resp?.message, soft: true } as { seccion: SeccionEntity; message?: string; soft?: boolean };
          };

          const headersJson = { headers: this.json } as const;
          const headersAccept = { headers: this.accept } as const;

          return this.http.patch<ApiResponse<any>>(estadoUrl, { estado: 'INACTIVA' } as any, headersJson).pipe(
            map(mapResp),
            catchError(() => this.http.patch<ApiResponse<any>>(estadoUrl, null, { ...headersAccept, params: { estado: 'INACTIVA' } as any }).pipe(
              map(mapResp),
              catchError(() => this.http.patch<ApiResponse<any>>(estadoUrl, { estado: 'INACTIVO' } as any, headersJson).pipe(
                map(mapResp),
                catchError(() => this.http.patch<ApiResponse<any>>(estadoUrlFallback, { estado: 'INACTIVA' } as any, headersJson).pipe(
                  map(mapResp),
                  catchError(() => this.http.patch<ApiResponse<any>>(estadoUrl, { activa: false } as any, headersJson).pipe(
                    map(mapResp),
                    catchError((eFinal) => throwError(() => ({ error: { message: eFinal?.error?.message || 'No se pudo eliminar la sección' }, status: eFinal?.status })))
                  ))
                ))
              ))
            ))
          );
        })
      ))
    );
  }
}
