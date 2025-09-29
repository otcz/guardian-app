// filepath: c:\Users\OTCZ\WebstormProjects\guardian-app\src\app\service\menu.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type MenuTipo = 'MENU' | 'ITEM';
export interface MenuOption {
  id?: number;
  codigo: string;
  descripcion: string;
  path?: string;
  icon?: string; // clase MDI, ej: 'mdi-cog-outline'
  tipo?: MenuTipo; // MENU o ITEM
  parentId?: number | null; // id del padre si es ITEM (legacy)
  parentCodigo?: string | null; // codigo del padre si es ITEM (preferido)
}
export interface MenuGroup {
  id?: number;
  codigo: string;
  descripcion: string;
  icon?: string;
  path?: string; // si el MENU es navegable
  children: MenuOption[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly STORAGE_CODES = 'opciones';
  private readonly STORAGE_DETAILS = 'opcionesDetalle';

  private options$ = new BehaviorSubject<MenuOption[]>([]);
  private tree = new BehaviorSubject<MenuGroup[]>([]);
  private codes = new Set<string>();
  private orderMap: Map<string, number> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  get list$() { return this.options$.asObservable(); }
  get list(): MenuOption[] { return this.options$.value; }
  get tree$() { return this.tree.asObservable(); }

  setFromLogin(data: { opciones?: string[]; opcionesDetalle?: any[] }) {
    const rawDetalles: any[] = Array.isArray(data?.opcionesDetalle) ? (data!.opcionesDetalle as any[]) : [];
    const detalles: MenuOption[] = rawDetalles.map((d: any) => {
      const rawId = d?.id ?? d?.ID;
      const idNum = (typeof rawId === 'string' || typeof rawId === 'number') ? Number(rawId) : undefined;
      const rawParent = d?.parentId ?? d?.parent_id ?? d?.parent?.id;
      const parentNum = (rawParent === null || rawParent === undefined) ? null : Number(rawParent);
      const parentCodigo = d?.parentCodigo ?? d?.parent_code ?? d?.parentCode ?? null;
      return {
        id: Number.isFinite(idNum as number) ? (idNum as number) : undefined,
        codigo: d?.codigo ?? d?.code ?? '',
        descripcion: d?.descripcion ?? d?.label ?? '',
        path: d?.path ?? d?.ruta ?? undefined,
        icon: d?.icon ?? d?.icono ?? undefined,
        tipo: (typeof d?.tipo === 'string' ? String(d.tipo).toUpperCase() : undefined) as MenuTipo | undefined,
        parentId: (parentNum === null || Number.isNaN(parentNum)) ? null : (parentNum as number),
        parentCodigo: (typeof parentCodigo === 'string' && parentCodigo.trim().length > 0) ? String(parentCodigo) : null
      } as MenuOption;
    });
    const cods = Array.isArray(data?.opciones) ? (data!.opciones as string[]) : detalles.map(d => d.codigo).filter(Boolean);

    // Persistir crudo para compat
    localStorage.setItem(this.STORAGE_DETAILS, JSON.stringify(detalles));
    localStorage.setItem(this.STORAGE_CODES, JSON.stringify(cods));

    // Actualizar memoria y orden preferente
    this.codes = new Set(cods);
    this.orderMap = new Map(cods.map((c, i) => [c, i]));

    const ordered = detalles.slice().sort((a,b) => this.orderCompare(a.codigo, b.codigo, a.descripcion, b.descripcion));
    this.options$.next(ordered);
    this.tree.next(this.buildTree(ordered));
  }

  clear() {
    localStorage.removeItem(this.STORAGE_DETAILS);
    localStorage.removeItem(this.STORAGE_CODES);
    this.codes.clear();
    this.orderMap.clear();
    this.options$.next([]);
    this.tree.next([]);
  }

  canAccessCode(code: string): boolean { return this.codes.has(code); }

  canAccessPath(path: string): boolean {
    const p = (path || '').split('?')[0];
    return this.list.some(o => (o.path || '').split('?')[0] === p);
  }

  private loadFromStorage() {
    try {
      const detailsRaw = localStorage.getItem(this.STORAGE_DETAILS);
      const codesRaw = localStorage.getItem(this.STORAGE_CODES);
      const parsed: any[] = detailsRaw ? JSON.parse(detailsRaw) : [];
      const detalles: MenuOption[] = Array.isArray(parsed) ? parsed : [];
      const cods: string[] = codesRaw ? JSON.parse(codesRaw) : (detalles?.map(d => d.codigo) || []);
      this.codes = new Set(cods);
      this.orderMap = new Map(cods.map((c, i) => [c, i]));
      const ordered = detalles.slice().sort((a,b) => this.orderCompare(a.codigo, b.codigo, a.descripcion, b.descripcion));
      this.options$.next(ordered);
      this.tree.next(this.buildTree(ordered));
    } catch {
      this.codes = new Set();
      this.orderMap.clear();
      this.options$.next([]);
      this.tree.next([]);
    }
  }

  private orderCompare(codeA?: string, codeB?: string, descA?: string, descB?: string): number {
    const a = codeA || '';
    const b = codeB || '';
    const ia = this.orderMap.has(a) ? (this.orderMap.get(a) as number) : Number.MAX_SAFE_INTEGER;
    const ib = this.orderMap.has(b) ? (this.orderMap.get(b) as number) : Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return (descA || '').localeCompare(descB || '');
  }

  private buildTree(detalles: MenuOption[]): MenuGroup[] {
    if (!Array.isArray(detalles) || detalles.length === 0) return [];
    const menus = detalles.filter(d => (d.tipo || '').toUpperCase() === 'MENU')
                          .sort((a,b) => this.orderCompare(a.codigo, b.codigo, a.descripcion, b.descripcion));
    const items = detalles.filter(d => (d.tipo || '').toUpperCase() === 'ITEM')
                          .sort((a,b) => this.orderCompare(a.codigo, b.codigo, a.descripcion, b.descripcion));

    if (menus.length === 0 && items.length === 0) return [];

    // Indexar MENUs por codigo
    const menuByCode = new Map<string, MenuOption>();
    menus.forEach(m => { if (m.codigo) menuByCode.set(m.codigo, m); });

    // Agrupar ITEMs por parentCodigo, cayendo a parentId (legacy) y por defecto a orphans
    const byParentCode = new Map<string, MenuOption[]>();
    const orphans: MenuOption[] = [];

    for (const it of items) {
      const pcode = (typeof it.parentCodigo === 'string' && it.parentCodigo) ? it.parentCodigo : undefined;
      if (pcode && menuByCode.has(pcode)) {
        const arr = byParentCode.get(pcode) || [];
        arr.push(it);
        byParentCode.set(pcode, arr);
        continue;
      }
      // fallback por id si el backend lo mandara
      const pid = (typeof it.parentId === 'number') ? it.parentId! : -1;
      const foundById = menus.find(m => typeof m.id === 'number' && m.id === pid);
      if (foundById) {
        const arr = byParentCode.get(foundById.codigo) || [];
        arr.push(it);
        byParentCode.set(foundById.codigo, arr);
      } else {
        orphans.push(it);
      }
    }

    const groups: MenuGroup[] = menus.map(m => ({
      id: m.id,
      codigo: m.codigo,
      descripcion: m.descripcion,
      icon: m.icon,
      path: m.path,
      children: (byParentCode.get(m.codigo) || []).slice()
    }));

    if (orphans.length > 0) {
      groups.push({ codigo: '_UNGROUPED_', descripcion: 'General', children: orphans });
    }
    return groups;
  }
}
