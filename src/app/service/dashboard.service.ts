import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../config/environment';

export interface ApiResponse<T> { success?: boolean; message?: string; data?: T }

export interface DashboardHomeDto {
  message?: string;
  qrString?: string; // preferido si backend lo envía listo
  qr?: { tipo?: string; tokens?: string } | string | null;
  usuario?: { id?: string; nombre?: string; nombreCompleto?: string; documentoIdentidad?: string | null } | null;
  vehiculos?: Array<{ placa: string; marca?: string | null; modelo?: string | null; activo?: boolean; bloqueado?: boolean | null }>; // lista tal cual
  actividad?: { ingresosUsuario?: number; salidasUsuario?: number; ingresosVehiculo?: number; salidasVehiculo?: number; invitados?: number } | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private base = environment.apiBase;
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
        if (obj && typeof obj === 'object' && ('data' in obj || 'message' in obj)) return { success: true, ...(obj as any) } as ApiResponse<any>;
        return { success: true, data: obj } as ApiResponse<any>;
      } catch { return { success: true, data: undefined } as ApiResponse<any>; }
    }
    if (typeof payload === 'object') { if ('success' in payload) return payload as ApiResponse<any>; return { success: true, data: payload } as ApiResponse<any>; }
    return { success: true, data: payload } as ApiResponse<any>;
  }

  /** Devuelve DTO tal como lo provee el backend (sin transformación de datos). */
  getHome(orgId: string): Observable<DashboardHomeDto> {
    const url = `${this.base}/orgs/${orgId}/dashboard/home`;
    return this.http.get<any>(url, { headers: this.accept, responseType: 'text' as 'json' }).pipe(
      map((payload: any) => this.toApiResponse(payload)),
      map((resp) => (resp && typeof resp === 'object' && 'data' in resp) ? (resp as any).data as DashboardHomeDto : resp as DashboardHomeDto)
    );
  }
}

