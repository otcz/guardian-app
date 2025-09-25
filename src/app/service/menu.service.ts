// filepath: c:\Users\OTCZ\WebstormProjects\guardian-app\src\app\service\menu.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface MenuOption {
  codigo: string;
  descripcion: string;
  path: string;
  icon: string; // clase MDI, ej: 'mdi-cog-outline'
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly STORAGE_CODES = 'opciones';
  private readonly STORAGE_DETAILS = 'opcionesDetalle';

  private options$ = new BehaviorSubject<MenuOption[]>([]);
  private codes = new Set<string>();

  constructor() {
    this.loadFromStorage();
  }

  get list$() { return this.options$.asObservable(); }
  get list(): MenuOption[] { return this.options$.value; }

  setFromLogin(data: { opciones?: string[]; opcionesDetalle?: MenuOption[] }) {
    const detalles = Array.isArray(data?.opcionesDetalle) ? (data!.opcionesDetalle as MenuOption[]) : [];
    const cods = Array.isArray(data?.opciones) ? (data!.opciones as string[]) : detalles.map(d => d.codigo);

    // Persistir
    localStorage.setItem(this.STORAGE_DETAILS, JSON.stringify(detalles));
    localStorage.setItem(this.STORAGE_CODES, JSON.stringify(cods));

    // Actualizar memoria
    this.codes = new Set(cods);
    this.options$.next(detalles);
  }

  clear() {
    localStorage.removeItem(this.STORAGE_DETAILS);
    localStorage.removeItem(this.STORAGE_CODES);
    this.codes.clear();
    this.options$.next([]);
  }

  canAccessCode(code: string): boolean { return this.codes.has(code); }

  canAccessPath(path: string): boolean {
    const p = (path || '').split('?')[0];
    return this.list.some(o => o.path === p);
  }

  findByPath(path: string): MenuOption | undefined {
    const p = (path || '').split('?')[0];
    return this.list.find(o => o.path === p);
  }

  private loadFromStorage() {
    try {
      const detailsRaw = localStorage.getItem(this.STORAGE_DETAILS);
      const codesRaw = localStorage.getItem(this.STORAGE_CODES);
      const detalles: MenuOption[] = detailsRaw ? JSON.parse(detailsRaw) : [];
      const cods: string[] = codesRaw ? JSON.parse(codesRaw) : (detalles?.map(d => d.codigo) || []);
      this.codes = new Set(cods);
      this.options$.next(Array.isArray(detalles) ? detalles : []);
    } catch {
      this.codes = new Set();
      this.options$.next([]);
    }
  }
}

