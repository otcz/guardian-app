import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap, switchMap, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import type { ApiResponse } from './auth.service';

export type ParamTipo = 'NUM' | 'TEXT' | 'LIST';
export interface ParametroValorDetalle { orgId: number; sectionId?: number | null; valor: string; activo: boolean }
export interface Parametro {
  id?: number;
  // en defs/values no viene id, pero mantenemos opcional para CRUD
  orgId?: number;
  nombre: string;
  descripcion?: string;
  tipo?: ParamTipo; // ahora opcional porque el backend de defs no lo envía
  porDefecto?: boolean;
  // nuevos campos del endpoint defs/values
  orgIdDef?: number;
  valor?: string; // valor agregado (string)
  activoDef?: boolean;
  activoValor?: boolean;
  activo?: boolean; // agregado para endpoint /params/admin/defs
  valores?: ParametroValorDetalle[];
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
  deletedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ParametrosService {
  private readonly STORAGE_KEY = 'app:parametros.v2';
  private readonly params$ = new BehaviorSubject<Parametro[]>([]);
  private readonly fromBackend$ = new BehaviorSubject<boolean>(false);
  private readonly baseUrl = 'http://localhost:8081/admin/parameters';
  private readonly defsUrl = 'http://localhost:8081/params/admin/defs';

  constructor(private http: HttpClient) {
    const loaded = this.load();
    if (!loaded || loaded.length === 0) {

    }
  }

  get list$() { return this.params$.asObservable(); }
  get list(): Parametro[] { return this.params$.value; }
  get sourceIsBackend$() { return this.fromBackend$.asObservable(); }
  get sourceIsBackend(): boolean { return this.fromBackend$.value; }

  // Endpoint actualizado: definiciones con posibles valores
  fetchDefs(orgId: number): Observable<Parametro[]> {
    const url = `${this.defsUrl}?orgId=${encodeURIComponent(String(orgId))}`;
    return this.http.get<ApiResponse<Parametro[]>>(url).pipe(
      map(resp => Array.isArray((resp as any)?.data) ? (resp as any).data as any[] : (resp as any) as any[]),
      map((arr: any[]) => (arr || []).map(it => ({
        orgId: it.orgId ?? it.orgIdDef,
        nombre: it.nombre,
        descripcion: it.descripcion,
        porDefecto: !!it.porDefecto,
        orgIdDef: it.orgIdDef,
        valor: typeof it.valor !== 'undefined' ? String(it.valor) : undefined,
        activoDef: typeof it.activoDef === 'boolean' ? it.activoDef : undefined,
        activoValor: typeof it.activoValor === 'boolean' ? it.activoValor : undefined,
        activo: typeof it.activo === 'boolean' ? it.activo : (typeof it.activoValor === 'boolean' ? it.activoValor : true),
        valores: Array.isArray(it.valores) ? it.valores.map((v: any) => ({ orgId: v.orgId, sectionId: v.sectionId ?? null, valor: String(v.valor), activo: !!v.activo })) : []
      }) as Parametro)),
      tap(arr => { this.persist(arr); this.fromBackend$.next(true); })
    );
  }

  // Crear: devolver respuesta cruda del backend para poder mostrar su mensaje
  create(p: { orgId: number; nombre: string; descripcion?: string; activo?: boolean }): Observable<ApiResponse<any>> {
    const body: any = { orgId: p.orgId, nombre: p.nombre, descripcion: p.descripcion };
    if (typeof p.activo === 'boolean') body.activo = p.activo; // opcional
    return this.http.post<ApiResponse<any>>(this.defsUrl, body).pipe(
      tap((resp: any) => {
        const it = (resp?.data ?? {}) as any;
        const item: Parametro = {
          orgId: it?.orgId ?? p.orgId,
          orgIdDef: it?.orgIdDef ?? p.orgId,
          nombre: it?.nombre ?? p.nombre,
          descripcion: it?.descripcion ?? p.descripcion,
          porDefecto: !!it?.porDefecto,
          activo: typeof it?.activo === 'boolean' ? it.activo : (typeof it?.activoValor === 'boolean' ? it.activoValor : (typeof p.activo === 'boolean' ? p.activo : true)),
          activoDef: typeof it?.activoDef === 'boolean' ? it.activoDef : undefined,
          activoValor: typeof it?.activoValor === 'boolean' ? it.activoValor : undefined,
          valores: Array.isArray(it?.valores) ? it.valores.map((v: any) => ({ orgId: v.orgId, sectionId: v.sectionId ?? null, valor: String(v.valor), activo: !!v.activo })) : []
        };
        this.upsertLocal(item);
      })
    );
  }

  // Editar por nombre + orgId
  updateByNombre(orgId: number, nombre: string, data: { descripcion?: string; activo?: boolean }): Observable<ApiResponse<any>> {
    const url = `${this.defsUrl}/${encodeURIComponent(nombre)}?orgId=${encodeURIComponent(String(orgId))}`;
    return this.http.put<ApiResponse<any>>(url, data).pipe(
      tap((resp: any) => {
        const it = (resp?.data ?? {}) as any;
        const merged: Parametro = {
          orgId: it?.orgId ?? orgId,
          orgIdDef: it?.orgIdDef ?? orgId,
          nombre: it?.nombre ?? nombre,
          descripcion: it?.descripcion ?? data.descripcion,
          porDefecto: !!it?.porDefecto,
          activo: typeof it?.activo === 'boolean' ? it.activo : data.activo,
          activoDef: typeof it?.activoDef === 'boolean' ? it.activoDef : undefined,
          activoValor: typeof it?.activoValor === 'boolean' ? it.activoValor : undefined,
          valores: Array.isArray(it?.valores) ? it.valores.map((v: any) => ({ orgId: v.orgId, sectionId: v.sectionId ?? null, valor: String(v.valor), activo: !!v.activo })) : []
        };
        this.upsertLocal(merged);
      })
    );
  }

  // Eliminar por nombre + orgId
  deleteByNombre(orgId: number, nombre: string): Observable<ApiResponse<any>> {
    const url = `${this.defsUrl}/${encodeURIComponent(nombre)}?orgId=${encodeURIComponent(String(orgId))}`;
    return this.http.delete<ApiResponse<any>>(url).pipe(
      tap(() => this.removeLocal(nombre))
    );
  }

  update(id: number, p: Partial<Parametro>): Observable<Parametro> {
    const body: any = { nombre: p.nombre, descripcion: p.descripcion };
    if (typeof p.tipo !== 'undefined') body.tipo = p.tipo;
    if (typeof p.activo !== 'undefined') body.activo = p.activo;
    if (typeof p.activoValor !== 'undefined') body.activoValor = p.activoValor;
    if (typeof p.activoDef !== 'undefined') body.activoDef = p.activoDef;
    return this.http.put<ApiResponse<Parametro>>(`${this.baseUrl}/${id}`, body).pipe(
      map(resp => (resp as any)?.data ?? (resp as any)),
      tap(item => this.upsertLocal(item))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => void 0),
      tap(() => this.removeLocal(id))
    );
  }

  // Obtiene todas las definiciones completas (incluye id); uso interno para resolver id
  private fetchAll(): Observable<Parametro[]> {
    return this.http.get<ApiResponse<Parametro[]>>(this.baseUrl).pipe(
      map(resp => Array.isArray((resp as any)?.data) ? (resp as any).data as any[] : (resp as any) as any[])
    );
  }

  // Cambia el estado activo por nombre (resuelve id si es necesario)
  setActivo(orgId: number, nombre: string, activo: boolean): Observable<Parametro | void> {
    // preferir endpoint por nombre si está disponible
    return this.updateByNombre(orgId, nombre, { activo }) as any;
  }

  // Local helpers
  upsertLocal(p: Parametro) {
    const next = this.list.slice();
    const idx = next.findIndex(x => (p.id != null ? x.id === p.id : x.nombre === p.nombre));
    const item: Parametro = { ...p };
    if (idx >= 0) {
      item.id = next[idx].id ?? item.id;
      next[idx] = item;
    } else {
      item.id = item.id ?? this.genId(next);
      next.push(item);
    }
    this.persist(next);
  }

  removeLocal(idOrNombre: number | string) {
    const next = this.list.filter(p => (typeof idOrNombre === 'number' ? p.id !== idOrNombre : p.nombre !== idOrNombre));
    this.persist(next);
  }

  findByNombre(nombre: string): Parametro | undefined { return this.list.find(p => p.nombre === nombre); }

  private persist(items: Parametro[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    this.params$.next(items);
  }

  private load(): Parametro[] | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const arr = raw ? (JSON.parse(raw) as Parametro[]) : null;
      if (arr && Array.isArray(arr)) this.params$.next(arr);
      return arr;
    } catch {
      return null;
    }
  }

  private genId(arr: Parametro[]): number {
    return (arr.reduce((max, x) => Math.max(max, x.id ?? 0), 0) + 1) || 1;
  }
}
