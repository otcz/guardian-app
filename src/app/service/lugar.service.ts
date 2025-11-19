import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../config/environment';
import { CreateLugarRequest, LugarEntity, LugarTipo, UpdateLugarRequest } from '../models/lugar.models';

export interface ApiResponse<T> { success: boolean; message?: string; data?: T; }

@Injectable({ providedIn: 'root' })
export class LugarService {
  private base = environment.apiBase;
  private json = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
  private accept = new HttpHeaders({ Accept: 'application/json' });

  constructor(private http: HttpClient) {}

  private mapLugar(d: any): LugarEntity {
    return {
      id: String(d.id),
      nombre: String(d.nombre),
      tipoLugar: (d.tipoLugar ?? 'CASA') as LugarTipo,
      seccionId: String(d.seccionId || ''),
      orgId: d.orgId ? String(d.orgId) : undefined
    };
  }

  create(orgId: string, body: CreateLugarRequest): Observable<{ lugar: LugarEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/lugares`;
    const payload = {
      nombre: (body.nombre || '').trim(),
      tipoLugar: body.tipoLugar ?? ('CASA' as LugarTipo),
      seccionId: body.seccionId
    };
    return this.http.post<any>(url, payload, { headers: this.json }).pipe(
      map((resp) => {
        const d = resp?.data ?? resp;
        return { lugar: this.mapLugar(d), message: resp?.message };
      }),
      catchError((err) => {
        const status = err?.status;
        let msg = err?.error?.message || err?.message || 'No se pudo crear el lugar';
        if (status === 409) msg = 'YA EXISTE UN LUGAR CON ESE NOMBRE';
        return throwError(() => ({ status, error: { message: msg } }));
      })
    );
  }

  /**
   * Lista lugares de una sección específica
   * @param orgId - ID de la organización
   * @param seccionId - ID de la sección (requerido por el backend)
   */
  listBySeccion(orgId: string, seccionId: string): Observable<LugarEntity[]> {
    const url = `${this.base}/orgs/${orgId}/lugares?seccionId=${encodeURIComponent(seccionId)}`;
    return this.http.get<any>(url, { headers: this.accept }).pipe(
      map(resp => {
        const arr = resp?.data ?? resp;
        return Array.isArray(arr) ? arr.map(d => this.mapLugar(d)) : [];
      }),
      catchError(err => throwError(() => ({ status: err?.status, error: { message: err?.error?.message || 'No se pudieron listar lugares' } })))
    );
  }

  /**
   * Lista TODOS los lugares de una organización (requiere obtener todas las secciones primero)
   * Nota: El backend requiere seccionId, así que este método no se puede usar directamente
   * @deprecated Usar listBySeccion() ya que el backend requiere seccionId obligatorio
   */
  list(orgId: string): Observable<LugarEntity[]> {
    // El backend requiere seccionId obligatorio, este método no funciona
    // Se mantiene por compatibilidad pero debería usarse listBySeccion
    return throwError(() => ({
      status: 400,
      error: { message: 'El backend requiere seccionId. Usa listBySeccion() en su lugar.' }
    }));
  }

  get(orgId: string, lugarId: string): Observable<LugarEntity> {
    const url = `${this.base}/orgs/${orgId}/lugares/${lugarId}`;
    return this.http.get<any>(url, { headers: this.accept }).pipe(
      map(resp => this.mapLugar(resp?.data ?? resp)),
      catchError(err => throwError(() => ({ status: err?.status, error: { message: err?.error?.message || 'No se pudo obtener el lugar' } })))
    );
  }

  update(orgId: string, lugarId: string, body: UpdateLugarRequest): Observable<{ lugar: LugarEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/lugares/${lugarId}`;
    return this.http.patch<any>(url, body, { headers: this.json }).pipe(
      map(resp => ({ lugar: this.mapLugar(resp?.data ?? resp), message: resp?.message })),
      catchError(err => {
        const status = err?.status;
        let msg = err?.error?.message || err?.message || 'No se pudo actualizar el lugar';
        if (status === 409) msg = 'YA EXISTE UN LUGAR CON ESE NOMBRE';
        return throwError(() => ({ status, error: { message: msg } }));
      })
    );
  }

  delete(orgId: string, lugarId: string): Observable<{ message?: string }> {
    const url = `${this.base}/orgs/${orgId}/lugares/${lugarId}`;
    return this.http.delete<any>(url, { headers: this.accept }).pipe(
      map(resp => ({ message: resp?.message })),
      catchError(err => throwError(() => ({ status: err?.status, error: { message: err?.error?.message || 'No se pudo eliminar el lugar' } })))
    );
  }
}
