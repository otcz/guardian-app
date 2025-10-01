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
  private readonly FUZZY_THRESHOLD = 2; // distancia máxima permitida para considerar duplicado / similar

  private readonly ICON_MAP: Record<string, string> = {
    'user-shield': 'mdi mdi-shield-account',
    'link': 'pi pi-link',
    'autonomy': 'mdi mdi-account-cog-outline',
    'swap': 'mdi mdi-swap-horizontal',
    'tune': 'mdi mdi-tune',
    'add': 'pi pi-plus',
    'edit': 'pi pi-pencil',
    'filter': 'pi pi-filter',
    'settings': 'pi pi-cog',
    'shield-lock': 'mdi mdi-shield-lock',
    'strategy': 'mdi mdi-chess-knight',
    'gate': 'mdi mdi-gate',
    'layers': 'mdi mdi-layers',
    'building': 'mdi mdi-office-building',
    'menu': 'pi pi-bars',
    'key': 'pi pi-key',
    'shield': 'mdi mdi-shield-outline',
    'tree': 'mdi mdi-file-tree',
    'users': 'pi pi-users',
    'car': 'pi pi-car',
    'list': 'pi pi-list',
    'override': 'mdi mdi-application-braces-outline',
    'audit': 'mdi mdi-file-search-outline',
    'chart': 'mdi mdi-chart-line',
    'chart-pie': 'mdi mdi-chart-pie',
    'eye': 'pi pi-eye'
  };

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

  private resolveIcon(raw: string | null | undefined): string {
    if (!raw) return 'pi pi-circle';
    const v = raw.trim();
    if (/^(pi|mdi)\s/.test(v)) return v; // ya es clase compuesta
    if (v.startsWith('mdi-')) return 'mdi ' + v;
    if (v.startsWith('pi-')) return 'pi ' + v;
    const norm = v.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (this.ICON_MAP[norm]) return this.ICON_MAP[norm];
    return 'mdi mdi-' + norm; // fallback genérico mdi
  }

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
        icon: this.resolveIcon(rawMenu?.icono || 'folder'),
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
          icon: this.resolveIcon(raw.icono || 'folder'),
          path: raw.ruta || null,
          type: 'MENU',
          children: [],
          raw
        });
      }
    }

    // Función auxiliar para buscar key similar si no existe exacto
    const findSimilarMenuKey = (targetKey: string): string | null => {
      if (menusMap.has(targetKey)) return targetKey;
      let best: { key: string; dist: number } | null = null;
      for (const existingKey of menusMap.keys()) {
        const d = this.levenshtein(existingKey, targetKey);
        if (d <= this.FUZZY_THRESHOLD && (!best || d < best.dist)) {
          best = { key: existingKey, dist: d };
        }
      }
      return best ? best.key : null;
    };

    // 5. Construir nodos ITEM
    const leafNodes: MenuNode[] = [];
    for (const raw of this.rawOptions.filter(r => r.tipo === 'ITEM')) {
      const parentKeyRaw = raw.padreNombre ? this.normalize(raw.padreNombre) : null;
      const parentKey = parentKeyRaw ? findSimilarMenuKey(parentKeyRaw) : null;
      const nodeKey = this.normalize(raw.nombre);
      const node: MenuNode = {
        key: nodeKey,
        label: raw.nombre,
        descripcion: raw.nombre,
        icon: this.resolveIcon(raw.icono || null),
        path: raw.ruta || null,
        type: 'ITEM',
        raw
      };
      leafNodes.push(node);
      if (parentKey && menusMap.has(parentKey)) {
        menusMap.get(parentKey)!.children!.push(node);
      } else if (parentKeyRaw) {
        // Crear menú impl��cito solo si no encontramos similar (edge case extremo)
        const implicitKey = parentKeyRaw;
        if (!menusMap.has(implicitKey)) {
          menusMap.set(implicitKey, {
            key: implicitKey,
            label: raw.padreNombre!,
            icon: 'folder',
            path: null,
            type: 'MENU',
            children: [node]
          });
        } else {
          menusMap.get(implicitKey)!.children!.push(node);
        }
      }
    }

    // 6. Ordenar hijos alfabéticamente (puedes cambiar a otra lógica: peso, orden backend, etc.)
    menusMap.forEach(m => { if (m.children) m.children = this.sortNodes(m.children); });

    // 6b. Eliminar menús duplicados vacíos (probable corrupción). Un menú sin hijos y path null/duplicada y similar a otro con hijos.
    const toDelete: string[] = [];
    const menusArray = Array.from(menusMap.values());
    for (const a of menusArray) {
      if ((a.children?.length || 0) > 0) continue; // solo vacíos
      for (const b of menusArray) {
        if (a === b) continue;
        if ((b.children?.length || 0) === 0) continue;
        const d = this.levenshtein(a.key, b.key);
        if (d <= this.FUZZY_THRESHOLD) {
          toDelete.push(a.key);
          break;
        }
      }
    }
    toDelete.forEach(k => menusMap.delete(k));

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

  private levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    const al = a.length, bl = b.length;
    if (!al) return bl; if (!bl) return al;
    const dp: number[] = [];
    for (let i = 0; i <= bl; i++) dp[i] = i;
    for (let i = 1; i <= al; i++) {
      let prev = i; dp[0] = i;
      for (let j = 1; j <= bl; j++) {
        const tmp = dp[j];
        if (a[i - 1] === b[j - 1]) dp[j] = prev; else dp[j] = Math.min(prev + 1, dp[j] + 1, dp[j - 1] + 1);
        prev = tmp;
      }
    }
    return dp[bl];
  }
}
