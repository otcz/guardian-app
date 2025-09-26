import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
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
  tipo: ParamTipo;
  porDefecto?: boolean;
  // nuevos campos del endpoint defs/values
  orgIdDef?: number;
  valor?: string; // valor agregado (string)
  activoDef?: boolean;
  activoValor?: boolean;
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
  private readonly baseUrl = 'http://localhost:8081/admin/parameters';
  private readonly defsUrl = 'http://localhost:8081/params/admin/defs';
  private readonly defsValuesUrl = 'http://localhost:8081/params/admin/defs/values';

  constructor(private http: HttpClient) {
    const loaded = this.load();
    if (!loaded || loaded.length === 0) {
      this.seed();
    }
  }

  get list$() { return this.params$.asObservable(); }
  get list(): Parametro[] { return this.params$.value; }

  // Endpoint actualizado: definiciones con valores
  fetchDefs(orgId: number): Observable<Parametro[]> {
    const url = `${this.defsValuesUrl}?orgId=${encodeURIComponent(String(orgId))}`;
    return this.http.get<ApiResponse<Parametro[]>>(url).pipe(
      map(resp => Array.isArray((resp as any)?.data) ? (resp as any).data as Parametro[] : (resp as any) as any[]),
      tap(arr => this.persist(arr))
    );
  }

  // CRUD base (cuando exista id)
  fetchAll(): Observable<Parametro[]> {
    return this.http.get<ApiResponse<Parametro[]>>(this.baseUrl).pipe(
      map(resp => Array.isArray((resp as any)?.data) ? (resp as any).data as Parametro[] : (resp as any) as any[]),
      tap(arr => this.persist(arr))
    );
  }

  create(p: Omit<Parametro, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'porDefecto' | 'orgIdDef' | 'valor' | 'activoDef' | 'activoValor' | 'valores'>): Observable<Parametro> {
    const body = { orgId: p.orgId, nombre: p.nombre, descripcion: p.descripcion, tipo: p.tipo };
    return this.http.post<ApiResponse<Parametro>>(this.baseUrl, body).pipe(
      map(resp => (resp as any)?.data ?? (resp as any)),
      tap(item => this.upsertLocal(item))
    );
  }

  update(id: number, p: Partial<Parametro>): Observable<Parametro> {
    const body: any = { nombre: p.nombre, descripcion: p.descripcion, tipo: p.tipo };
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

  private seed() {
    const orgId = Number(localStorage.getItem('orgId') ?? '1');
    const now = new Date().toISOString();
    const defaults: Parametro[] = [
      { nombre: 'TIPOS_LUGAR', descripcion: 'Tipos de lugar', tipo: 'LIST', porDefecto: true, orgIdDef: orgId, valor: 'Casa,Apartamento,Oficina,Bodega', activoDef: true, activoValor: true, orgId, createdAt: now },
      { nombre: 'DURACION_TOKEN_INGRESO', descripcion: 'Duración token de ingreso (min)', tipo: 'NUM', porDefecto: true, orgIdDef: orgId, valor: '1080', activoDef: true, activoValor: true, orgId, createdAt: now },
      { nombre: 'DURACION_TOKEN_ACCESO_SISTEMA', descripcion: 'Duración token de acceso (min)', tipo: 'NUM', porDefecto: true, orgIdDef: orgId, valor: '180', activoDef: true, activoValor: true, orgId, createdAt: now },
      { nombre: 'TIPOS_DOCUMENTO_IDENTIDAD', descripcion: 'Tipos de documento', tipo: 'LIST', porDefecto: true, orgIdDef: orgId, valor: 'CC,TI,RC,Pasaporte', activoDef: true, activoValor: true, orgId, createdAt: now },
      { nombre: 'ESTADO_USUARIO', descripcion: 'Estados de usuario', tipo: 'LIST', porDefecto: true, orgIdDef: orgId, valor: 'Activo,Inactivo,Bloqueado,Pendiente', activoDef: true, activoValor: true, orgId, createdAt: now },
      { nombre: 'ESTADO_VEHICULO', descripcion: 'Estados de vehículo', tipo: 'LIST', porDefecto: true, orgIdDef: orgId, valor: 'Activo,Inactivo,Bloqueado', activoDef: true, activoValor: true, orgId, createdAt: now },
      { nombre: 'HORARIO_PERMITIDO_ACCESO', descripcion: 'Horario permitido (ej. 08:00-18:00)', tipo: 'TEXT', porDefecto: true, orgIdDef: orgId, valor: '08:00-18:00', activoDef: true, activoValor: true, orgId, createdAt: now },
      { nombre: 'NIVELES_ALERTA', descripcion: 'Niveles de alerta', tipo: 'LIST', porDefecto: true, orgIdDef: orgId, valor: 'Verde,Amarillo,Rojo', activoDef: true, activoValor: true, orgId, createdAt: now },
      { nombre: 'TIEMPO_EXPIRACION_INVITADO', descripcion: 'Expiración de invitado (min)', tipo: 'NUM', porDefecto: true, orgIdDef: orgId, valor: '1440', activoDef: true, activoValor: true, orgId, createdAt: now },
      { nombre: 'MAX_SECCIONES_POR_USUARIO', descripcion: 'Máx. secciones por usuario', tipo: 'NUM', porDefecto: true, orgIdDef: orgId, valor: '3', activoDef: true, activoValor: true, orgId, createdAt: now }
    ];
    defaults.forEach((d, i) => d.id = i + 1);
    this.persist(defaults);
  }

  private genId(arr: Parametro[]): number {
    return (arr.reduce((max, x) => Math.max(max, x.id ?? 0), 0) + 1) || 1;
  }
}
