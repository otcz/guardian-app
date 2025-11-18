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
      tipoLugar: (d.tipoLugar ?? 'CASA') as LugarTipo
    };
  }

  create(orgId: string, body: CreateLugarRequest): Observable<{ lugar: LugarEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/lugares`;
    const payload = { nombre: (body.nombre || '').trim(), tipoLugar: (body.tipoLugar ?? 'CASA') as LugarTipo };
    return this.http.post<ApiResponse<any>>(url, payload, { headers: this.json }).pipe(
      map((resp) => {
        const ok = (resp && (resp as any).success !== false);
        if (!ok) throw { status: 400, error: { message: resp?.message || 'No se pudo crear el lugar' } };
        const d = (resp?.data ?? resp) as any;
        return { lugar: this.mapLugar(d), message: resp?.message };
      }),
      catchError((err) => {
        const status = err?.status;
        const msg = err?.error?.message || err?.message || (status === 409 ? 'NOMBRE DE LUGAR DUPLICADO' : 'No se pudo crear el lugar');
        return throwError(() => ({ status, error: { message: msg } }));
      })
    );
  }

  list(orgId: string): Observable<LugarEntity[]> {
    const url = `${this.base}/orgs/${orgId}/lugares`;
    return this.http.get<ApiResponse<any>>(url, { headers: this.accept }).pipe(
      map((resp) => {
        const ok = (resp && (resp as any).success !== false);
        if (!ok) throw { status: 400, error: { message: resp?.message || 'No se pudieron obtener los lugares' } };
        const arr = Array.isArray(resp.data) ? resp.data : (Array.isArray((resp as any)) ? (resp as any) : []);
        return arr.map((d: any) => this.mapLugar(d));
      }),
      catchError((err) => throwError(() => ({ status: err?.status, error: { message: err?.error?.message || err?.message || 'No se pudieron obtener los lugares' } })))
    );
  }

  get(orgId: string, lugarId: string): Observable<LugarEntity> {
    const url = `${this.base}/orgs/${orgId}/lugares/${lugarId}`;
    return this.http.get<ApiResponse<any>>(url, { headers: this.accept }).pipe(
      map((resp) => {
        const ok = (resp && (resp as any).success !== false);
        if (!ok) throw { status: 404, error: { message: resp?.message || 'Lugar no encontrado' } };
        const d = (resp?.data ?? resp) as any;
        return this.mapLugar(d);
      }),
      catchError((err) => throwError(() => ({ status: err?.status, error: { message: err?.error?.message || err?.message || 'No se pudo obtener el lugar' } })))
    );
  }

  update(orgId: string, lugarId: string, body: UpdateLugarRequest): Observable<{ lugar: LugarEntity; message?: string }> {
    const url = `${this.base}/orgs/${orgId}/lugares/${lugarId}`;
    return this.http.patch<ApiResponse<any>>(url, body, { headers: this.json }).pipe(
      map((resp) => {
        const ok = (resp && (resp as any).success !== false);
        if (!ok) throw { status: 400, error: { message: resp?.message || 'No se pudo actualizar el lugar' } };
        const d = (resp?.data ?? resp) as any;
        return { lugar: this.mapLugar(d), message: resp?.message };
      }),
      catchError((err) => {
        const status = err?.status;
        const msg = err?.error?.message || err?.message || (status === 409 ? 'NOMBRE DE LUGAR DUPLICADO' : 'No se pudo actualizar el lugar');
        return throwError(() => ({ status, error: { message: msg } }));
      })
    );
  }

  delete(orgId: string, lugarId: string): Observable<{ message?: string }> {
    const url = `${this.base}/orgs/${orgId}/lugares/${lugarId}`;
    return this.http.delete<ApiResponse<any>>(url, { headers: this.accept }).pipe(
      map((resp) => {
        const ok = (resp && (resp as any).success !== false);
        if (!ok) throw { status: 400, error: { message: resp?.message || 'No se pudo eliminar el lugar' } };
        return { message: resp?.message };
      }),
      catchError((err) => throwError(() => ({ status: err?.status, error: { message: err?.error?.message || err?.message || 'No se pudo eliminar el lugar' } })))
    );
  }
}
