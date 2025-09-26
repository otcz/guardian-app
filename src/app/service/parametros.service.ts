import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ParamTipo = 'numero' | 'texto' | 'booleano' | 'lista';
export interface Parametro {
  clave: string;              // p.ej. DURACION_TOKEN_INGRESO
  descripcion: string;        // etiqueta visible
  tipo: ParamTipo;
  valor: number | string | boolean | string[];
}

@Injectable({ providedIn: 'root' })
export class ParametrosService {
  private readonly STORAGE_KEY = 'app:parametros';
  private readonly params$ = new BehaviorSubject<Parametro[]>([]);

  constructor() {
    const loaded = this.load();
    if (!loaded || loaded.length === 0) {
      this.seed();
    }
  }

  get list$() { return this.params$.asObservable(); }
  get list(): Parametro[] { return this.params$.value; }

  upsert(p: Parametro) {
    const next = this.list.slice();
    const idx = next.findIndex(x => x.clave === p.clave);
    if (idx >= 0) next[idx] = { ...p };
    else next.push({ ...p });
    this.persist(next);
  }

  remove(clave: string) {
    const next = this.list.filter(p => p.clave !== clave);
    this.persist(next);
  }

  find(clave: string): Parametro | undefined { return this.list.find(p => p.clave === clave); }

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
    const defaults: Parametro[] = [
      { clave: 'TIPOS_LUGAR', descripcion: 'Tipos de lugar', tipo: 'lista', valor: ['Casa','Apartamento','Oficina','Bodega'] },
      { clave: 'DURACION_TOKEN_INGRESO', descripcion: 'Duración token de ingreso (min)', tipo: 'numero', valor: 1080 },
      { clave: 'DURACION_TOKEN_ACCESO_SISTEMA', descripcion: 'Duración token de acceso (min)', tipo: 'numero', valor: 180 },
      { clave: 'TIPOS_DOCUMENTO_IDENTIDAD', descripcion: 'Tipos de documento', tipo: 'lista', valor: ['CC','TI','RC','Pasaporte'] },
      { clave: 'ESTADO_USUARIO', descripcion: 'Estados de usuario', tipo: 'lista', valor: ['Activo','Inactivo','Bloqueado'] },
      { clave: 'ESTADO_VEHICULO', descripcion: 'Estados de vehículo', tipo: 'lista', valor: ['Activo','Inactivo','Bloqueado'] },
      { clave: 'HORARIO_PERMITIDO_ACCESO', descripcion: 'Horario permitido (ej. 08:00-18:00)', tipo: 'texto', valor: '08:00-18:00' },
      { clave: 'NIVELES_ALERTA', descripcion: 'Niveles de alerta', tipo: 'lista', valor: ['Verde','Amarillo','Rojo'] },
      { clave: 'TIEMPO_EXPIRACION_INVITADO', descripcion: 'Expiración de invitado (min)', tipo: 'numero', valor: 1440 },
      { clave: 'MAX_SECCIONES_POR_USUARIO', descripcion: 'Máx. secciones por usuario', tipo: 'numero', valor: 3 }
    ];
    this.persist(defaults);
  }
}

