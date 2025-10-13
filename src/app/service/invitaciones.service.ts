// filepath: c:\Users\OTCZ\WebstormProjects\guardian-app\src\app\service\invitaciones.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../config/environment';

export interface InvitationCreateRequest {
  rolContextualId?: string | null;
  expiraEn?: string | null; // ISO-8601
  ttlMinutes?: number | null; // si >0 y no hay expiraEn, backend usa ahora + ttl
  usosMaximos?: number | null; // null/omitido = ilimitado
  emailDestino?: string | null;
  notas?: string | null;
}

export interface InvitationDto {
  id: string;
  codigo: string;
  seccionId: string;
  rolContextualId?: string | null;
  expiraEn?: string | null;
  usosMaximos?: number | null;
  usosActuales: number;
  activo: boolean;
  emailDestino?: string | null;
  notas?: string | null;
  joinUrl: string; // e.g. "/api/invitaciones/{codigo}"
  inviteUrl?: string | null; // URL completa del front
  frontJoinUrl?: string | null; // alias/back-compat
}

export interface InvitationPreviewDto {
  codigo: string;
  activo: boolean;
  expiraEn?: string | null;
  usosMaximos?: number | null;
  usosActuales: number;
  seccion?: { id: string; nombre?: string };
  organizacion?: { id: string; nombre?: string };
  seccionNombre?: string | null; // soporte directo al campo del backend solicitado
  frontJoinUrl?: string | null;
  inviteUrl?: string | null;
}

export interface ApiResponse<T> { success: boolean; message?: string; data: T; }

@Injectable({ providedIn: 'root' })
export class InvitacionesService {
  private base = environment.apiBase;
  private accept = new HttpHeaders({ Accept: 'application/json' });
  private json = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });

  constructor(private http: HttpClient) {}

  private urlCandidates(path: string): string[] {
    const rel = `${this.base}${path}`; // via proxy (/api)
    const absApi = `${(environment.apiBaseUrl || `${environment.backendHost}${this.base}`)}${path}`;
    // sin prefijo /api
    const noApi = `${environment.backendHost}${path}`;
    // Quitar dobles barras accidentales
    const normalize = (u: string) => u.replace(/([^:]\/)\/+/g, '$1/');
    return [rel, absApi, noApi].map(normalize);
  }

  private isRetryableStatus(status: any) {
    return status === 0 || status === 404 || status === 502 || status === 503;
  }

  private altInvitationPaths(orgId: string, seccionId: string, suffix: string = ''): string[] {
    const org = encodeURIComponent(orgId);
    const sec = encodeURIComponent(seccionId);
    return [
      `/orgs/${org}/secciones/${sec}/invitaciones${suffix}`,
      `/organizaciones/${org}/secciones/${sec}/invitaciones${suffix}`,
      `/secciones/${sec}/invitaciones${suffix}`
    ];
  }

  private tryPost<T>(urls: string[], body: any, headers: HttpHeaders, idx = 0): Observable<T> {
    if (idx >= urls.length) return throwError(() => ({ status: 404, error: { message: 'Endpoint no encontrado (POST)' } })) as Observable<T>;
    return this.http.post<T>(urls[idx], body, { headers }).pipe(
      catchError((e): Observable<T> => this.isRetryableStatus(e?.status)
        ? this.tryPost<T>(urls, body, headers, idx + 1)
        : throwError(() => e) as Observable<T>)
    );
  }
  private tryGet<T>(urls: string[], headers: HttpHeaders, idx = 0): Observable<T> {
    if (idx >= urls.length) return throwError(() => ({ status: 404, error: { message: 'Endpoint no encontrado (GET)' } })) as Observable<T>;
    return this.http.get<T>(urls[idx], { headers }).pipe(
      catchError((e): Observable<T> => this.isRetryableStatus(e?.status)
        ? this.tryGet<T>(urls, headers, idx + 1)
        : throwError(() => e) as Observable<T>)
    );
  }
  private tryPatch<T>(urls: string[], body: any, headers: HttpHeaders, idx = 0): Observable<T> {
    if (idx >= urls.length) return throwError(() => ({ status: 404, error: { message: 'Endpoint no encontrado (PATCH)' } })) as Observable<T>;
    return this.http.patch<T>(urls[idx], body, { headers }).pipe(
      catchError((e): Observable<T> => this.isRetryableStatus(e?.status)
        ? this.tryPatch<T>(urls, body, headers, idx + 1)
        : throwError(() => e) as Observable<T>)
    );
  }

  private toApiResponse<T = any>(payload: any): ApiResponse<T> {
    if (payload == null) return { success: true, data: undefined as any } as ApiResponse<T>;
    // Caso envelope estándar
    if (typeof payload === 'object' && 'success' in payload && 'data' in payload) {
      const p: any = payload as any;
      const inner: any = p.data;
      // Desanidar envelope doble: { success, data: { data, message } }
      if (inner && typeof inner === 'object' && 'data' in inner && !Array.isArray(inner) && inner.data !== undefined) {
        return { success: !!p.success, message: (p.message ?? inner.message) as any, data: inner.data as T } as ApiResponse<T>;
      }
      return payload as ApiResponse<T>;
    }
    // Caso payload sin envelope
    return { success: true, data: payload as T } as ApiResponse<T>;
  }

  crear(orgId: string, seccionId: string, body: InvitationCreateRequest): Observable<ApiResponse<InvitationDto>> {
    const paths = this.altInvitationPaths(orgId, seccionId, '');
    const urls = paths.flatMap((p) => this.urlCandidates(p));
    return this.tryPost<any>(urls, body || {}, this.json).pipe(
      // Normalizar a ApiResponse
      map((payload: any) => this.toApiResponse<InvitationDto>(payload))
    );
  }

  listar(orgId: string, seccionId: string): Observable<ApiResponse<InvitationDto[]>> {
    const paths = this.altInvitationPaths(orgId, seccionId, '');
    const urls = paths.flatMap((p) => this.urlCandidates(p));
    return this.tryGet<any>(urls, this.accept).pipe(
      map((payload: any) => this.toApiResponse<InvitationDto[]>(payload))
    );
  }

  desactivar(orgId: string, seccionId: string, invitacionId: string): Observable<ApiResponse<InvitationDto>> {
    const suffix = `/${encodeURIComponent(invitacionId)}`;
    const paths = this.altInvitationPaths(orgId, seccionId, suffix);
    const urls = paths.flatMap((p) => this.urlCandidates(p));
    return this.tryPatch<any>(urls, {}, this.json).pipe(
      map((payload: any) => this.toApiResponse<InvitationDto>(payload))
    );
  }

  previewPorCodigo(codigo: string): Observable<ApiResponse<InvitationPreviewDto>> {
    const basePath = `/invitaciones/${encodeURIComponent(codigo)}`;
    const urls = this.urlCandidates(basePath);
    return this.tryGet<any>(urls, this.accept).pipe(
      map((payload: any) => this.toApiResponse<InvitationPreviewDto>(payload))
    );
  }

  unirse(codigo: string, body: { username: string; email: string; nombreCompleto?: string | null; createIfNotExists?: boolean }): Observable<ApiResponse<{ usuarioSeccionId: string; usuarioId: string; seccionId: string }>> {
    const path = `/invitaciones/${encodeURIComponent(codigo)}/unirse`;
    const urls = this.urlCandidates(path);
    return this.tryPost<any>(urls, body || {}, this.json).pipe(
      map((payload: any) => this.toApiResponse<{ usuarioSeccionId: string; usuarioId: string; seccionId: string }>(payload))
    );
  }

  buildShareUrl(joinUrl?: string | null): string {
    const base = environment.backendHost || window.location.origin;
    if (joinUrl == null) return '';
    const raw = String(joinUrl).trim();
    if (!raw || raw.toLowerCase() === 'undefined' || raw.toLowerCase() === 'null' || /\/(undefined|null)$/i.test(raw)) return '';
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${base}${path}`;
  }

  buildFrontInviteUrlFromCode(codigo?: string | null): string {
    const code = (codigo || '').toString().trim();
    if (!code || code.toLowerCase() === 'undefined' || code.toLowerCase() === 'null') return '';
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : (environment.backendHost || '');
    if (!origin) return '';
    const sep = '/register?invite=';
    return `${origin}${sep}${encodeURIComponent(code)}`;
  }
}
