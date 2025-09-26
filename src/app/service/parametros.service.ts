import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import type { ApiResponse } from './auth.service';

export type ParamTipo = 'NUM' | 'TEXT' | 'LIST';
export interface Parametro {
  id?: number;
  orgId: number;
  nombre: string;           // p.ej. DURACION_TOKEN_INGRESO
  descripcion?: string;     // etiqueta visible (opcional)
  tipo: ParamTipo;          // 'NUM' | 'TEXT' | 'LIST'
  porDefecto?: boolean;     // viene en defs
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

  constructor(private http: HttpClient) {
    const loaded = this.load();
    if (!loaded || loaded.length === 0) {
      this.seed();
    }
  }

  get list$() { return this.params$.asObservable(); }
  get list(): Parametro[] { return this.params$.value; }

  // API: Listar definiciones por orgId (vista)
  fetchDefs(orgId: number): Observable<Parametro[]> {
    return this.http.get<ApiResponse<Parametro[]>>(`${this.defsUrl}?orgId=${encodeURIComponent(String(orgId))}`).pipe(
      map(resp => Array.isArray((resp as any)?.data) ? (resp as any).data as Parametro[] : (resp as any) as any[]),
      tap(arr => this.persist(arr))
    );
  }

  // API: Listar (CRUD base)
  fetchAll(): Observable<Parametro[]> {
    return this.http.get<ApiResponse<Parametro[]>>(this.baseUrl).pipe(
      map(resp => Array.isArray((resp as any)?.data) ? (resp as any).data as Parametro[] : (resp as any) as any[]),
      tap(arr => this.persist(arr))
    );
  }

  // API: Crear
  create(p: Omit<Parametro, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'porDefecto'>): Observable<Parametro> {
    const body = { orgId: p.orgId, nombre: p.nombre, descripcion: p.descripcion, tipo: p.tipo };
    return this.http.post<ApiResponse<Parametro>>(this.baseUrl, body).pipe(
      map(resp => (resp as any)?.data ?? (resp as any)),
      tap(item => this.upsertLocal(item))
    );
  }

  // API: Actualizar
  update(id: number, p: Partial<Parametro>): Observable<Parametro> {
    const body: any = { nombre: p.nombre, descripcion: p.descripcion, tipo: p.tipo };
    return this.http.put<ApiResponse<Parametro>>(`${this.baseUrl}/${id}`, body).pipe(
      map(resp => (resp as any)?.data ?? (resp as any)),
      tap(item => this.upsertLocal(item))
    );
  }

  // API: Eliminar
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
      // mantener id existente
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
      { nombre: 'TIPOS_LUGAR', descripcion: 'Tipos de lugar', tipo: 'LIST', orgId, porDefecto: true, createdAt: now },
      { nombre: 'DURACION_TOKEN_INGRESO', descripcion: 'Duración token de ingreso (min)', tipo: 'NUM', orgId, porDefecto: true, createdAt: now },
      { nombre: 'DURACION_TOKEN_ACCESO_SISTEMA', descripcion: 'Duración token de acceso (min)', tipo: 'NUM', orgId, porDefecto: true, createdAt: now },
      { nombre: 'TIPOS_DOCUMENTO_IDENTIDAD', descripcion: 'Tipos de documento', tipo: 'LIST', orgId, porDefecto: true, createdAt: now },
      { nombre: 'ESTADO_USUARIO', descripcion: 'Estados de usuario', tipo: 'LIST', orgId, porDefecto: true, createdAt: now },
      { nombre: 'ESTADO_VEHICULO', descripcion: 'Estados de vehículo', tipo: 'LIST', orgId, porDefecto: true, createdAt: now },
      { nombre: 'HORARIO_PERMITIDO_ACCESO', descripcion: 'Horario permitido (ej. 08:00-18:00)', tipo: 'TEXT', orgId, porDefecto: true, createdAt: now },
      { nombre: 'NIVELES_ALERTA', descripcion: 'Niveles de alerta', tipo: 'LIST', orgId, porDefecto: true, createdAt: now },
      { nombre: 'TIEMPO_EXPIRACION_INVITADO', descripcion: 'Expiración de invitado (min)', tipo: 'NUM', orgId, porDefecto: true, createdAt: now },
      { nombre: 'MAX_SECCIONES_POR_USUARIO', descripcion: 'Máx. secciones por usuario', tipo: 'NUM', orgId, porDefecto: true, createdAt: now }
    ];
    // set ids locales para ergonomía (aunque la API de defs no envía id)
    defaults.forEach((d, i) => d.id = i + 1);
    this.persist(defaults);
  }

  private genId(arr: Parametro[]): number {
    return (arr.reduce((max, x) => Math.max(max, x.id ?? 0), 0) + 1) || 1;
  }
}
