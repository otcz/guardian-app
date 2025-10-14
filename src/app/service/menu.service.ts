// filepath: c:\Users\OTCZ\WebstormProjects\guardian-app\src\app\service\menu.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OrgContextService } from './org-context.service';
import { environment } from '../config/environment';
import { NotificationService } from './notification.service';

// RawOption refleja exactamente lo que viene del backend
export interface RawOption {
  nombre: string;            // Texto mostrado / etiqueta
  tipo: 'MENU' | 'ITEM';      // Nivel raíz o elemento hoja
  icono: string | null;       // Nombre icono (clase, key, etc.)
  ruta: string | null;        // Path navegable (solo para ITEM normalmente)
  padreNombre: string | null; // Nombre del menú padre (para ITEM)
  codigo?: string | null;     // NUEVO: código de permiso/menú provisto por backend (e.g., SECTION_CREATE)
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
  private keys = new Set<string>();                           // Claves normalizadas por nombre
  private codes = new Set<string>();                          // NUEVO: Códigos de permiso provistos por backend (normalizados)
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

  constructor(private orgCtx: OrgContextService, private notify: NotificationService) {
    this.loadFromStorage();
    // Rebuild menú cuando cambie la organización activa para propagar ?id=orgId a rutas que lo requieran
    try { this.orgCtx.orgId$.subscribe(() => this.rebuild()); } catch {}
  }

  /** Punto principal desde login: recibe arreglo crudo opcionesDetalle */
  setFromLogin(raw: RawOption[] | null | undefined) {
    const safe = Array.isArray(raw) ? raw.filter(r => !!r && !!r.nombre) : [];

    // Filtro opcional: ocultar "Gestión de Organización" y sus ítems asociados (solo si la bandera lo indica)
    const shouldHideOrg = !!((environment as any)?.security?.hideOrgManagement);
    let effective = safe;
    if (shouldHideOrg) {
      const norm = (txt: string | null | undefined) => (txt || '')
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const isOrgMgmtMenu = (r: RawOption) => r.tipo === 'MENU' && norm(r.nombre) === 'gestion-de-organizacion';
      const ORG_ITEM_NAMES = new Set<string>([
        'gestionar-organizacion',
        'crear-organizacion',
        'listar-organizaciones',
        'ver-auditoria-de-organizacion',
        'configurar-parametros-globales'
      ]);
      const isOrgMgmtItem = (r: RawOption) => r.tipo === 'ITEM' && (
        norm(r.padreNombre || '') === 'gestion-de-organizacion' || ORG_ITEM_NAMES.has(norm(r.nombre))
      );
      effective = safe.filter(r => !(isOrgMgmtMenu(r) || isOrgMgmtItem(r)));
    }

    // Filtro incondicional: ocultar Gobernanza y Parámetros Locales
    const norm2 = (txt: string | null | undefined) => (txt || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const blockedMenus = new Set<string>(['gestion-de-estrategias-de-gobernanza', 'gestion-de-parametros-locales']);
    effective = effective.filter(r => {
      const nm = norm2(r.nombre);
      const np = norm2(r.padreNombre || '');
      const isGovOrLocalParamMenu = blockedMenus.has(nm) || nm.includes('estrateg') || nm.includes('gobernanz') || nm.includes('parametro-local') || nm.includes('parametros-locales');
      const isGovOrLocalParamItem = blockedMenus.has(np) || nm.includes('estrateg') || nm.includes('gobernanz') || nm.includes('parametro-local') || nm.includes('parametros-locales');
      if (r.tipo === 'MENU' && isGovOrLocalParamMenu) return false;
      if (r.tipo === 'ITEM' && isGovOrLocalParamItem) return false;
      return true;
    });

    this.rawOptions = effective;
    localStorage.setItem(this.STORAGE_RAW, JSON.stringify(effective));
    this.rebuild();
    // Auditar discrepancias entre lo recibido y lo mostrado
    this.auditAgainstRaw(effective);
  }

  clear() {
    this.rawOptions = [];
    localStorage.removeItem(this.STORAGE_RAW);
    this.flatItems$.next([]);
    this.tree$.next([]);
    this.paths.clear();
    this.keys.clear();
    this.codes.clear();
  }

  /** Verifica acceso por path exacto (ignorando query params) */
  canAccessPath(path: string): boolean {
    const p = (path || '').split('?')[0];
    return this.paths.has(p);
  }

  /** Verifica acceso por código exacto; acepta variantes normalizadas */
  canAccessCode(code: string): boolean {
    const norm = this.normalizeCode(code);
    if (this.codes.has(norm)) return true;
    // Fallback legacy: algunos lugares usan nombre normalizado como "código"
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
    // Reiniciar colecciones
    this.codes.clear();

    const keepLiteral = !!((environment as any)?.security?.keepBackendRoutesLiterally);

    // 1. Normalizar duplicados y corregir problemas de codificación (acentos / caracteres raros)
    const normalizedMap = new Map<string, RawOption>();
    const sanitizePath = (p: string | null | undefined): string | null => this.sanitizePathCommon(p);
    for (const r of this.rawOptions) {
      const nKey = this.normalize(r.tipo === 'MENU' ? r.nombre : (r.padreNombre || r.nombre));
      // Códigos de permiso
      if (r.codigo) this.codes.add(this.normalizeCode(r.codigo));
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
        path: sanitizePath(rawMenu?.ruta || null),
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
            path: sanitizePath(raw.ruta || null),
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
      let path = sanitizePath(raw.ruta || null);

      if (!keepLiteral) {
        // Heurísticas de reasignación a rutas canónicas solo si NO se pidió literal
        const nameNorm = this.normalize(raw.nombre);
        const parentNorm = this.normalize(raw.padreNombre || '');
        const looksCrearEstrategia = nameNorm.includes('crear') && nameNorm.includes('estrateg');
        const looksCambiarEstrategia = nameNorm.includes('cambiar') && nameNorm.includes('estrateg');
        const looksGestionarOrg = nameNorm.includes('gestionar') && nameNorm.includes('organizacion');
        const looksCrearOrg = nameNorm.includes('crear') && nameNorm.includes('organizacion');
        const looksListarOrgs = (nameNorm.includes('listar') || nameNorm.includes('listado')) && nameNorm.includes('organizacion');
        const looksConfigParams = (nameNorm.includes('configurar') || nameNorm.includes('parametro')) && nameNorm.includes('global');
        const looksVerAuditoria = (nameNorm.includes('ver') || nameNorm.includes('auditoria')) && nameNorm.includes('organizacion');
        const looksCrearSeccion = nameNorm.includes('crear') && (nameNorm.includes('seccion') || nameNorm.includes('seccion'));
        const looksListarSeccion = (nameNorm.includes('listar') || nameNorm.includes('listado')) && (nameNorm.includes('seccion') || nameNorm.includes('seccion'));
        const looksCrearRol = nameNorm.includes('crear') && nameNorm.includes('rol');
        const looksGestionarRol = nameNorm.includes('gestionar') && nameNorm.includes('rol');
        const looksListarRol = (nameNorm.includes('listar') || nameNorm.includes('listado')) && (nameNorm.includes('rol') || nameNorm.includes('roles'));
        const looksAsignarAdminSeccion = nameNorm.includes('asignar') && nameNorm.includes('administrador') && (nameNorm.includes('seccion') || nameNorm.includes('seccion'));

        // NUEVO: Gestión de opciones/menú
        const parentLooksMenuOpts = parentNorm.includes('opciones') || parentNorm.includes('menu');
        const looksAsignarOpcionesSeccion = parentLooksMenuOpts && nameNorm.includes('asignar') && (nameNorm.includes('seccion') || nameNorm.includes('seccion'));
        const looksCrearOpcion = parentLooksMenuOpts && nameNorm.includes('crear') && nameNorm.includes('opcion');
        const looksGestionarOpcion = parentLooksMenuOpts && nameNorm.includes('gestionar') && nameNorm.includes('opcion');
        const looksListarOpciones = parentLooksMenuOpts && (nameNorm.includes('listar') || nameNorm.includes('listado')) && (nameNorm.includes('opcion') || nameNorm.includes('opciones'));
        const looksOverrideMenuLocal = parentLooksMenuOpts && (nameNorm.includes('override') || (nameNorm.includes('menu') && nameNorm.includes('local')));

        // NUEVO: Gestión de vehículos
        const looksAsignarVehiculoSeccion = nameNorm.includes('asignar') && nameNorm.includes('vehiculo') && nameNorm.includes('seccion');
        const looksCrearVehiculo = nameNorm.includes('crear') && nameNorm.includes('vehiculo');
        const looksGestionarVehiculo = nameNorm.includes('gestionar') && nameNorm.includes('vehiculo');
        const looksListarVehiculos = (nameNorm.includes('listar') || nameNorm.includes('listado')) && (nameNorm.includes('vehiculo') || nameNorm.includes('vehiculos'));

        if (looksCrearEstrategia) path = '/crear-estrategia-de-gobernanza';
        if (looksCambiarEstrategia) path = '/cambiar-estrategia-de-gobernanza';
        if (looksGestionarOrg) path = '/gestionar-organizacion';
        if (looksCrearOrg) path = '/crear-organizacion';
        if (looksListarOrgs) path = '/listar-organizaciones';
        if (looksConfigParams) path = '/configurar-parametros-globales';
        if (looksVerAuditoria) path = '/ver-auditoria-de-organizacion';
        if (looksCrearSeccion) path = '/crear-seccion';
        if (looksListarSeccion) path = '/listar-secciones';
        if (looksCrearRol) path = '/crear-rol';
        if (looksGestionarRol) path = '/gestionar-rol';
        if (looksListarRol) path = '/listar-roles';
        if (looksAsignarAdminSeccion) path = '/asignar-administrador-de-seccion';

        // Asignaciones canónicas para opciones de menú
        if (looksAsignarOpcionesSeccion) path = '/gestion-de-opciones-menu/asignar-opciones-por-seccion';
        if (looksCrearOpcion) path = '/gestion-de-opciones-menu/crear-opcion';
        if (looksGestionarOpcion) path = '/gestion-de-opciones-menu/gestionar-opcion';
        if (looksListarOpciones) path = '/gestion-de-opciones-menu/listar-opciones';
        if (looksOverrideMenuLocal) path = '/gestion-de-opciones-menu/override-menu-local';

        // Asignaciones canónicas para gestión de vehículos
        if (looksAsignarVehiculoSeccion) path = '/gestion-de-vehiculos/asignar-vehiculo-a-seccion';
        if (looksCrearVehiculo) path = '/gestion-de-vehiculos/crear-vehiculo';
        if (looksGestionarVehiculo) path = '/gestion-de-vehiculos/gestionar-vehiculo';
        if (looksListarVehiculos) path = '/gestion-de-vehiculos/listar-vehiculos';

        // Adjuntar id organización cuando aplica (solo si no es literal)
        const needsOrgId = looksCambiarEstrategia || looksGestionarOrg || looksConfigParams || looksVerAuditoria || looksCrearSeccion || looksListarSeccion || looksCrearRol || looksGestionarRol || looksListarRol;
        if (path && needsOrgId && !path.includes('?')) {
          try { const orgId = localStorage.getItem('currentOrgId'); if (orgId) path = `${path}?id=${encodeURIComponent(orgId)}`; } catch {}
        }
      }

      const node: MenuNode = {
        key: nodeKey,
        label: raw.nombre,
        descripcion: raw.nombre,
        icon: this.resolveIcon(raw.icono || null),
        path: path || null,
        type: 'ITEM',
        raw
      };
      leafNodes.push(node);
      if (parentKey && menusMap.has(parentKey)) {
        menusMap.get(parentKey)!.children!.push(node);
      } else if (parentKeyRaw) {
        // Crear menú implícito solo si no encontramos similar (edge case extremo)
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
    this.paths = new Set(this.flatItems$.value.filter(n => !!n.path).map(n => n.path!.split('?')[0]));
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

  private normalizeCode(code: string): string {
    return (code || '')
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
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

  private sanitizePathCommon(p: string | null | undefined): string | null {
    if (!p) return null;
    let s = p.trim();
    if (!s.startsWith('/')) s = '/' + s;
    s = s.replace(/^\/dashboard(\/)?/, '/');
    if (s.length > 1) s = s.replace(/\/+/g, '/').replace(/\/$/, '');
    return s;
  }

  private auditAgainstRaw(raw: RawOption[]) {
    try {
      const rawItems = (raw || []).filter(r => r && r.tipo === 'ITEM' && !!r.ruta);
      const canonPath = (p: string) => {
        let s = (p || '').split('?')[0];
        // Normalización de prefijos legacy
        s = s.replace(/^\/gestion-de-[^/]+\//, '/');
        // Aliases comunes a rutas canónicas
        if (s === '/crear-estrategia') s = '/crear-estrategia-de-gobernanza';
        if (s === '/cambiar-estrategia') s = '/cambiar-estrategia-de-gobernanza';
        return s;
      };
      const rawPaths = new Set((rawItems.map(r => this.sanitizePathCommon(r.ruta)!).filter(Boolean) as string[]).map(canonPath));
      const uiPaths = new Set(this.flatItems$.value.filter(n => !!n.path).map(n => (n.path as string).split('?')[0]).map(canonPath));

      // --- Mejor coincidencia: primero exacta, luego por último segmento ---
      const missingInUI: string[] = [];
      const extraInUI: string[] = [];

      // Mapear por último segmento para segundo intento de emparejamiento
      const lastSegment = (p: string) => {
        const segs = (p || '').split('?')[0].split('/').filter(Boolean);
        return segs.length ? segs[segs.length - 1] : '';
      };

      // 1) Comprobación exacta
      const rawOnly = new Set<string>();
      rawPaths.forEach(p => { if (!uiPaths.has(p)) rawOnly.add(p); });
      const uiOnly = new Set<string>();
      uiPaths.forEach(p => { if (!rawPaths.has(p)) uiOnly.add(p); });

      // 2) Segundo pase: emparejar por último segmento (evita falsos positivos por prefijos)
      if (rawOnly.size > 0 && uiOnly.size > 0) {
        const rawArr = Array.from(rawOnly);
        const uiArr = Array.from(uiOnly);
        const normalizeSegment = (seg: string) => (seg || '').replace(/-/g, '').toLowerCase();
        const DIST_THRESHOLD = 3; // tolerancia para Levenshtein en segmentos

        for (const rp of rawArr) {
          let paired = false;
          for (const up of uiArr) {
            if (!rawOnly.has(rp) || !uiOnly.has(up)) continue; // ya emparejado

            // 1) sufijo completo: '/.../x' vs '/.../.../x'
            if (up.endsWith(rp) || rp.endsWith(up)) {
              uiOnly.delete(up);
              rawOnly.delete(rp);
              paired = true;
              break;
            }

            // 2) última segment equality o contención (sin guiones)
            const rs = normalizeSegment(lastSegment(rp));
            const us = normalizeSegment(lastSegment(up));
            if (rs && us) {
              if (rs === us || rs.includes(us) || us.includes(rs)) {
                uiOnly.delete(up);
                rawOnly.delete(rp);
                paired = true;
                break;
              }

              // 2b) Token-overlap: dividir por '-' y comparar intersección
              const splitTokens = (s: string) => (s || '').split(' ').join('-').split('-').map(x => x.trim()).filter(Boolean);
              const rTokens = splitTokens(lastSegment(rp).toLowerCase());
              const uTokens = splitTokens(lastSegment(up).toLowerCase());
              if (rTokens.length && uTokens.length) {
                const setR = new Set(rTokens);
                const setU = new Set(uTokens);
                let common = 0;
                setR.forEach(t => { if (setU.has(t)) common++; });
                const minLen = Math.min(rTokens.length, uTokens.length);
                if (minLen > 0 && (common / minLen) >= 0.5) { // >=50% tokens en común
                  uiOnly.delete(up);
                  rawOnly.delete(rp);
                  paired = true;
                  break;
                }
              }

              // 3) Levenshtein tolerante
              try {
                const d = this.levenshtein(rs, us);
                if (d <= DIST_THRESHOLD) {
                  uiOnly.delete(up);
                  rawOnly.delete(rp);
                  paired = true;
                  break;
                }
              } catch (e) {
                // si falla levenshtein por cualquier motivo, no bloquear
              }
            }
          }
          if (paired) continue;
        }
      }

      // Los que queden en rawOnly son realmente faltantes en la UI
      rawOnly.forEach(p => missingInUI.push(p));
      // Los que queden en uiOnly son realmente extra locales
      uiOnly.forEach(p => extraInUI.push(p));

      if (missingInUI.length > 0) {
        console.warn('[MenuAudit] Opciones recibidas no renderizadas en UI:', missingInUI);
        const preview = missingInUI.slice(0, 4).join(', ');
        const detail = missingInUI.length > 4 ? `${preview}, y ${missingInUI.length - 4} más…` : preview;
        this.notify.warn('Alerta de menú', `Hay ${missingInUI.length} opciones sin vista: ${detail}`);
      }

      if (extraInUI.length > 0) {
        console.warn('[MenuAudit] Items en UI no presentes en opcionesDetalle:', extraInUI);
        const preview = extraInUI.slice(0, 4).join(', ');
        const detail = extraInUI.length > 4 ? `${preview}, y ${extraInUI.length - 4} más…` : preview;
        this.notify.info('Menú adicional', `Se detectaron ${extraInUI.length} items locales: ${detail}`);
      }
    } catch (e) {
      console.warn('[MenuAudit] No se pudo auditar menús:', e);
    }
  }
}
