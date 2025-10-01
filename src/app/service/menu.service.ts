// filepath: c:\Users\OTCZ\WebstormProjects\guardian-app\src\app\service\menu.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// RawOption refleja exactamente lo que viene del backend
export interface RawOption {
  nombre: string;            // Texto mostrado / etiqueta
  tipo: 'MENU' | 'ITEM';      // Nivel raíz o elemento hoja
  icono: string | null;       // Nombre icono (clase, key, etc.)
  ruta: string | null;        // Path navegable (solo para ITEM normalmente)
  padreNombre: string | null; // Nombre del menú padre (para ITEM)
}

// Nodo interno construido para el sidebar
export interface MenuNode {
  key: string;
  label: string;
  icon?: string;
  path?: string | null;
  type: 'MENU' | 'ITEM';
  children?: MenuNode[];
  raw?: RawOption;
  descripcion?: string; // compat: alias usado por UI existente
}

export type MenuOption = MenuNode; // Alias de compatibilidad

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly STORAGE_RAW = 'opcionesDetalleRaw';
  private rawOptions: RawOption[] = [];

  private flatItems$ = new BehaviorSubject<MenuNode[]>([]);   // Solo items hoja con path
  private tree$ = new BehaviorSubject<MenuNode[]>([]);        // Árbol jerárquico completo
  private paths = new Set<string>();                          // Rutas permitidas
  private keys = new Set<string>();                           // Claves normalizadas

  get items$() { return this.flatItems$.asObservable(); }
  get treeObservable$() { return this.tree$.asObservable(); }
  get tree(): MenuNode[] { return this.tree$.value; }
  // Compatibilidad con código existente (dashboard usa list$)
  get list$() { return this.items$; }

  constructor() {
    this.loadFromStorage();
  }

  /** Punto principal desde login: recibe arreglo crudo opcionesDetalle */
  setFromLogin(raw: RawOption[] | null | undefined) {
    const safe = Array.isArray(raw) ? raw.filter(r => !!r && !!r.nombre) : [];
    this.rawOptions = safe;
    localStorage.setItem(this.STORAGE_RAW, JSON.stringify(safe));
    this.rebuild();
  }

  clear() {
    this.rawOptions = [];
    localStorage.removeItem(this.STORAGE_RAW);
    this.flatItems$.next([]);
    this.tree$.next([]);
    this.paths.clear();
    this.keys.clear();
  }

  /** Verifica acceso por path exacto (ignorando query params) */
  canAccessPath(path: string): boolean {
    const p = (path || '').split('?')[0];
    return this.paths.has(p);
  }

  /** Verifica acceso por key (nombre normalizado) */
  canAccessCode(code: string): boolean {
    return this.keys.has(this.normalize(code));
  }

  /** Busca un item por path en los nodos hoja */
  findByPath(path: string): MenuNode | undefined {
    const p = (path || '').split('?')[0];
    return this.flatItems$.value.find(o => o.path === p);
  }

  // ================= Internos =================

  private rebuild() {
    // 1. Normalizar duplicados y corregir problemas de codificación (acentos / caracteres raros)
    const normalizedMap = new Map<string, RawOption>();
    for (const r of this.rawOptions) {
      const nKey = this.normalize(r.tipo === 'MENU' ? r.nombre : (r.padreNombre || r.nombre));
      // Guardar el último que llegue para menú, pero si ya existe y el nuevo tiene icono usarlo
      if (r.tipo === 'MENU') {
        const existing = normalizedMap.get(nKey);
        if (!existing || (!existing.icono && r.icono)) {
          normalizedMap.set(nKey, r);
        }
      }
    }

    // 2. Reunir nombres de menús padres detectados en items aunque no llegaran como MENU explícito
    const parentNames = new Set<string>();
    this.rawOptions.forEach(r => { if (r.padreNombre) parentNames.add(r.padreNombre); });

    // 3. Crear estructura base de menús (solo raíz - sin hijos todavía)
    const menusMap = new Map<string, MenuNode>();
    parentNames.forEach(pName => {
      const key = this.normalize(pName);
      const rawMenu = Array.from(normalizedMap.values()).find(r => this.normalize(r.nombre) === key && r.tipo === 'MENU');
      menusMap.set(key, {
        key,
        label: rawMenu ? rawMenu.nombre : pName,
        icon: rawMenu?.icono || 'folder',
        path: rawMenu?.ruta || null,
        type: 'MENU',
        children: [],
        raw: rawMenu || undefined
      });
    });

    // 4. Añadir también menús explícitos que quizá no tenían hijos (para consistencia)
    for (const raw of this.rawOptions.filter(r => r.tipo === 'MENU')) {
      const key = this.normalize(raw.nombre);
      if (!menusMap.has(key)) {
        menusMap.set(key, {
          key,
            label: raw.nombre,
            icon: raw.icono || 'folder',
            path: raw.ruta || null,
            type: 'MENU',
            children: [],
            raw
        });
      }
    }

    // 5. Construir nodos ITEM
    const leafNodes: MenuNode[] = [];
    for (const raw of this.rawOptions.filter(r => r.tipo === 'ITEM')) {
      const parentKey = raw.padreNombre ? this.normalize(raw.padreNombre) : null;
      const nodeKey = this.normalize(raw.nombre);
      const node: MenuNode = {
        key: nodeKey,
        label: raw.nombre,
        descripcion: raw.nombre, // compatibilidad
        icon: raw.icono || 'dot',
        path: raw.ruta || null,
        type: 'ITEM',
        raw
      };
      leafNodes.push(node);
      if (parentKey && menusMap.has(parentKey)) {
        menusMap.get(parentKey)!.children!.push(node);
      } else if (parentKey) {
        // Crear menú padre implícito si no existe (edge case)
        const implicit: MenuNode = {
          key: parentKey,
          label: raw.padreNombre!,
          icon: 'folder',
          path: null,
          type: 'MENU',
          children: [node]
        };
        menusMap.set(parentKey, implicit);
      }
    }

    // 6. Ordenar hijos alfabéticamente (puedes cambiar a otra lógica: peso, orden backend, etc.)
    menusMap.forEach(m => {
      if (m.children) {
        m.children = this.sortNodes(m.children);
      }
    });

    // 7. Preparar colecciones finales
    const tree = this.sortNodes(Array.from(menusMap.values()));
    this.tree$.next(tree);
    this.flatItems$.next(leafNodes.filter(n => !!n.path));
    this.paths = new Set(this.flatItems$.value.filter(n => !!n.path).map(n => n.path!));
    this.keys = new Set([ ...tree.map(n => n.key), ...leafNodes.map(l => l.key) ]);
  }

  private sortNodes(nodes: MenuNode[]): MenuNode[] {
    return nodes.slice().sort((a,b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }

  private normalize(txt: string): string {
    return (txt || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.STORAGE_RAW);
      this.rawOptions = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(this.rawOptions)) this.rawOptions = [];
      this.rebuild();
    } catch {
      this.clear();
    }
  }
}
