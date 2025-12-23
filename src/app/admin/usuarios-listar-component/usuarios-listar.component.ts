import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { ChipModule } from 'primeng/chip';
import { OrgContextService } from '../../service/org-context.service';
import { UsersService, UserEntity } from '../../service/users.service';
import { NotificationService } from '../../service/notification.service';
import { ConfirmationService } from 'primeng/api';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../../config/environment';
import { OrganizationService } from '../../service/organization.service';
import { RoleLabelPipe } from '../../shared/pipes/role-label.pipe';
import { RoleSeverityPipe } from '../../shared/pipes/role-severity.pipe';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { RolesService } from '../../service/roles.service';

/**
 * Componente de Listado de Usuarios
 *
 * IMPLEMENTACIÓN SEGÚN REQUERIMIENTO TÉCNICO BACKEND v1.0 (2025-11-22)
 *
 * Funcionalidades:
 * - Listado de usuarios con filtrado automático por backend según rol del usuario autenticado
 * - Paginación adaptable al viewport
 * - Carga de roles contextuales por sección
 * - Visualización de línea de mando (Organización, Sección)
 *
 * Filtrado Automático por Rol (aplicado por el backend):
 * - SYSADMIN: Ve todos los usuarios del sistema
 * - ORGADMIN: Ve todos los usuarios de su organización
 * - ADMIN (Sección): Ve SOLO usuarios de su(s) sección(es) - FILTRO FORZOSO
 * - USUARIO: Sin acceso (403 Forbidden)
 *
 * Manejo de Errores HTTP:
 * - 200 OK: Listado exitoso
 * - 403 Forbidden: Sin permisos para listar usuarios
 * - 404 Not Found: Organización no encontrada
 * - 500 Internal Server Error: Error del servidor
 */
@Component({
  selector: 'app-usuarios-listar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, ButtonModule, TableModule, TagModule, TooltipModule, AvatarModule, ChipModule, OverlayPanelModule, RoleLabelPipe, RoleSeverityPipe],
  templateUrl: './usuarios-listar.component.html',
  styleUrls: ['./usuarios-listar.component.scss']
})
export class UsuariosListarComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  usuarios: UserEntity[] = [];
  filtered: UserEntity[] = [];
  filter = '';
  secciones: SeccionEntity[] = [];
  orgName: string | null = null;

  // Paginación adaptable
  pageSize = 10;
  rowsOptions: number[] = [5, 8, 10, 12, 15, 20];
  private _first = 0;
  get first(): number { return this._first; }
  set first(v: number) { this._first = v || 0; this.loadSectionRolesIfApplies(); }
  private adjustTimer: any;
  private loadRolesTimer: any;
  private fetchedSecIds = new Set<string>();
  private roleCacheBySection = new Map<string, Record<string, string>>();
  private failedSecIdsUntil: Map<string, number> = new Map();
  private inFlightSecIds = new Set<string>();

  // Mapa de rol contextual por usuario (solo en scope SECCION)
  roleByUserId: Record<string, string> = {};

  private sectionNameCache: Record<string, string> = {};
  private sectionFetchInFlight = new Set<string>();
  private isDevelopment = !environment.production;

  constructor(
    private orgCtx: OrgContextService,
    private users: UsersService,
    private notify: NotificationService,
    private router: Router,
    private confirm: ConfirmationService,
    private seccionSvc: SeccionService,
    private orgSvc: OrganizationService,
    private rolesSvc: RolesService
  ) {}

  private calcRowsFromViewport(viewH: number): number {
    const reserved = 440;
    const rowH = 82;
    const usable = Math.max(240, viewH - reserved);
    let rows = Math.floor(usable / rowH);
    if (rows > 0 && (usable - rows * rowH) < 40) rows -= 1;
    return Math.min(25, Math.max(5, rows));
  }

  private refreshPageSizing() {
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const next = this.calcRowsFromViewport(h);
    this.pageSize = next;
    const base = [5, 8, 10, 12, 15, 20, next].filter(n => n >= 5 && n <= 25);
    this.rowsOptions = Array.from(new Set(base)).sort((a, b) => a - b);
    this.deferAdjustToViewport();
  }

  private deferAdjustToViewport() {
    if (this.adjustTimer) { try { clearTimeout(this.adjustTimer); } catch {} this.adjustTimer = null; }
    this.adjustTimer = setTimeout(() => this.adjustRowsToFitViewport(), 0);
  }

  private adjustRowsToFitViewport() {
    let guard = 0;
    const minRows = 5;
    while (guard < 4) {
      const doc = document?.documentElement as HTMLElement | null;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
      const scrollH = doc ? doc.scrollHeight : winH;
      const overflow = scrollH > winH + 1;
      if (overflow && this.pageSize > minRows) {
        this.pageSize -= 1;
        guard++;
        continue;
      }
      break;
    }
  }

  @HostListener('window:resize') onResize() { this.refreshPageSizing(); }

  ngOnInit(): void {
    this.refreshPageSizing();
    this.orgId = this.orgCtx.value;
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }
    this.load();
    this.seccionSvc.list(this.orgId).subscribe({
      next: list => { this.secciones = list || []; this.loadSectionRolesIfApplies(); },
      error: () => { this.secciones = []; this.loadSectionRolesIfApplies(); }
    });
    this.orgSvc.get(this.orgId).subscribe({
      next: org => { this.orgName = (org && org.nombre) ? String(org.nombre) : null; },
      error: () => { this.orgName = null; }
    });
  }

  private loadSectionRolesIfApplies() {
    if (this.loadRolesTimer) { try { clearTimeout(this.loadRolesTimer); } catch {} this.loadRolesTimer = null; }
    this.loadRolesTimer = setTimeout(() => this._doLoadSectionRoles(), 200);
  }

  private _doLoadSectionRoles() {
    const scope = String(this.orgCtx.scope || '').toUpperCase();
    const secId = this.orgCtx.seccion;
    if (!this.orgId) { this.roleByUserId = {}; return; }

    // Caso 1: contexto de sección -> una sola llamada
    if (scope === 'SECCION' && secId) {
      this.seccionSvc.getUsuariosPorSeccion(this.orgId, String(secId)).subscribe({
        next: (arr) => {
          const map: Record<string, string> = {};
          (arr || []).forEach(us => {
            const uid = String(us?.usuarioEntity?.id || '');
            const rn = (us?.rolEntityContextual?.nombre || '').toString().trim();
            if (uid && rn) map[uid] = rn;
          });
          this.roleByUserId = map;
        },
        error: () => { this.roleByUserId = {}; }
      });
      return;
    }

    // Feature toggle: evitar llamadas en contexto ORGANIZACION si está desactivado
    if (!environment.features || (environment.features as any).fetchSectionRolesInOrgList === false) {
      this.roleByUserId = {};
      return;
    }

    // Caso 2: contexto de organización -> cargar roles por sección de la página visible
    const baseArr = (this.filtered && this.filtered.length)
      ? this.filtered.slice(this.first, this.first + this.pageSize)
      : (this.usuarios || []);

    const now = Date.now();
    const TTL_ERROR_MS = 60_000;

    const secIdsAll = Array.from(new Set(baseArr
      .map(u => (u as any).seccionId)
      .filter((v): v is string => !!v)
      .map(s => String(s))));

    if (secIdsAll.length === 0) { this.roleByUserId = {}; return; }

    const eligible = secIdsAll.filter(id => {
      const until = this.failedSecIdsUntil.get(id) || 0;
      return now >= until;
    });

    const preMap: Record<string, string> = {};
    secIdsAll.forEach(id => {
      const cached = this.roleCacheBySection.get(id);
      if (cached) {
        Object.keys(cached).forEach(uid => { preMap[uid] = cached[uid]; });
      }
    });
    this.roleByUserId = preMap;

    const toFetch = eligible.filter(id => !this.fetchedSecIds.has(id) && !this.inFlightSecIds.has(id));
    if (toFetch.length === 0) return;

    const calls = toFetch.map(id => {
      this.inFlightSecIds.add(id);
      return this.seccionSvc.getUsuariosPorSeccion(this.orgId!, id).pipe(
        catchError(() => {
          this.failedSecIdsUntil.set(id, now + TTL_ERROR_MS);
          return of([]);
        }),
        finalize(() => { this.inFlightSecIds.delete(id); })
      );
    });

    forkJoin(calls).subscribe({
      next: (results) => {
        results.forEach((arr, idx) => {
          const sec = toFetch[idx];
          const map: Record<string, string> = {};
          (arr || []).forEach(us => {
            const uid = String(us?.usuarioEntity?.id || '');
            const rn = (us?.rolEntityContextual?.nombre || '').toString().trim();
            if (uid && rn) map[uid] = rn;
          });
          this.roleCacheBySection.set(sec, map);
          this.fetchedSecIds.add(sec);
        });
        const agg: Record<string, string> = { ...preMap };
        secIdsAll.forEach(id => {
          const cached = this.roleCacheBySection.get(id);
          if (cached) Object.keys(cached).forEach(uid => { agg[uid] = cached[uid]; });
        });
        this.roleByUserId = agg;
      },
      error: () => {}
    });
  }

  /**
   * Carga la lista de usuarios desde el backend
   *
   * BACKEND APLICA FILTRADO AUTOMÁTICO (implementado 2025-11-22):
   * El backend lee el JWT del usuario autenticado y filtra automáticamente:
   * - SYSADMIN: todos los usuarios del sistema
   * - ORGADMIN: todos los usuarios de la organización
   * - ADMIN (Sección): SOLO usuarios de su(s) sección(es) [FILTRO FORZOSO EN BACKEND]
   * - USUARIO: 403 Forbidden
   *
   * ⚠️ NO se envía parámetro seccionId - el backend lo detecta automáticamente desde el JWT
   */
  load() {
    if (!this.orgId) return;
    this.loading = true;

    if (this.isDevelopment) {
      console.log('[UsuariosListar] 📡 Cargando usuarios desde backend');
      console.log('[UsuariosListar] ℹ️ Backend aplica filtrado automático desde JWT del usuario');
    }

    // ⚠️ NO enviar params.seccionId - el backend lo detecta automáticamente desde el JWT
    this.users.list(this.orgId).subscribe({
      next: list => {
        if (this.isDevelopment) {
          console.log(`[UsuariosListar] ✅ Recibidos ${list.length} usuarios del backend (ya filtrados)`);
          const seccionesMap = new Map<string, number>();
          list.forEach(u => {
            const secNombre = u.seccionNombre || 'Sin sección';
            seccionesMap.set(secNombre, (seccionesMap.get(secNombre) || 0) + 1);
          });
          console.log('[UsuariosListar] 📊 Distribución por sección:', Object.fromEntries(seccionesMap));
        }

        // ✅ El backend YA retorna usuarios filtrados - NO aplicar filtro manual
        this.usuarios = list;
        this.applyFilter();
        this.loading = false;
        this.deferAdjustToViewport();
        this.loadSectionRolesIfApplies();
        this.loadMissingRoles();
      },
      error: e => {
        this.loading = false;

        // Manejo de errores según especificación del backend
        const status = e?.status;
        let errorMsg = 'No se pudieron listar usuarios';

        switch (status) {
          case 403:
            errorMsg = 'No tiene permisos para listar usuarios';
            if (this.isDevelopment) {
              console.error('[UsuariosListar] ❌ 403 Forbidden - Sin permisos');
            }
            break;
          case 404:
            errorMsg = 'Organización no encontrada';
            if (this.isDevelopment) {
              console.error('[UsuariosListar] ❌ 404 Not Found - Organización inexistente');
            }
            break;
          case 500:
            errorMsg = 'Error del servidor. Intente nuevamente';
            if (this.isDevelopment) {
              console.error('[UsuariosListar] ❌ 500 Internal Server Error');
            }
            break;
          default:
            errorMsg = e?.error?.message || errorMsg;
        }

        console.error('[UsuariosListar] ❌ Error al cargar usuarios:', e);
        this.notify.error('Error', errorMsg);
      }
    });
  }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    if (!f) { this.filtered = [...this.usuarios]; this.first = 0; this.deferAdjustToViewport(); return; }
    this.filtered = this.usuarios.filter(u => [u.username, u.nombreCompleto, u.email, u.scopeNivel].some(v => (v || '').toString().toLowerCase().includes(f)));
    this.first = 0;
    this.deferAdjustToViewport();
  }

  toggle(u: UserEntity) {
    if (!this.orgId) return;
    const next = !u.activo;
    const actionLabel = next ? 'activar' : 'desactivar';
    this.confirm.confirm({
      header: 'Confirmación',
      message: `¿Deseas ${actionLabel} el usuario "${u.username}"?`,
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.users.setActive(this.orgId!, u.id, next).subscribe({
          next: res => {
            u.activo = next;
            this.notify.success('Éxito', res.message || (next ? 'USUARIO ACTIVADO.' : 'USUARIO DESACTIVADO.'));
          },
          error: e => this.notify.error('Error', e?.error?.message || 'No se pudo cambiar el estado')
        });
      }
    });
  }

  userInitial(u: UserEntity): string {
    const src = (u?.nombreCompleto || u?.username || '').trim();
    if (!src) return 'U';
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src[0].toUpperCase();
  }

  sectionName(u: UserEntity): string {
    // Priorizar seccionNombre si viene del backend
    if (u.seccionNombre) {
      return u.seccionNombre;
    }

    const sid = (u as any)?.seccionId;
    if (!sid) return '-';

    const cached = this.sectionNameCache[String(sid)];
    if (cached) return cached;

    const found = this.secciones.find(s => String(s.id) === String(sid));
    if (found) {
      this.sectionNameCache[String(sid)] = found.nombre;
      return found.nombre;
    }

    if (this.orgId && !this.sectionFetchInFlight.has(String(sid))) {
      this.sectionFetchInFlight.add(String(sid));
      this.seccionSvc.get(this.orgId, String(sid)).subscribe({
        next: (sec) => {
          this.sectionNameCache[String(sid)] = (sec?.nombre ?? String(sid));
          this.sectionFetchInFlight.delete(String(sid));
        },
        error: () => {
          this.sectionFetchInFlight.delete(String(sid));
        }
      });
    }

    return String(sid);
  }

  /**
   * Obtiene el label amigable del tipo de identificación
   */
  getTipoIdentificacionLabel(tipo: string | null | undefined): string {
    if (!tipo) return '-';
    const labels: Record<string, string> = {
      'CEDULA': 'Cédula',
      'PASAPORTE': 'Pasaporte',
      'DNI': 'DNI',
      'RUC': 'RUC',
      'LICENCIA': 'Licencia',
      'OTRO': 'Otro'
    };
    return labels[tipo] || tipo;
  }

  mandoNombre(u: UserEntity): string {
    const org = (this.orgName && this.orgName.trim()) ? this.orgName.trim() : (this.orgId || '-');
    const sec = this.sectionName(u);
    if (sec && sec !== '-' ) return `${org}, ${sec}`;
    return org || '-';
  }

  private loadMissingRoles() {
    const usersWithoutRoles = this.usuarios.filter(u => {
      const fromNames = Array.isArray((u as any).rolNombres) && (u as any).rolNombres.length > 0;
      const fromOrg = Array.isArray((u as any).rolesOrganizacion) && (u as any).rolesOrganizacion.length > 0;
      const single = !!(u as any).rolNombre;
      const fallback = !!this.roleByUserId[u.id];
      return !fromNames && !fromOrg && !single && !fallback;
    });

    if (usersWithoutRoles.length === 0) {
      if (this.isDevelopment) {
        console.log('[UsuariosListar] ✅ Todos los usuarios tienen roles asignados');
      }
      return;
    }

    if (this.isDevelopment) {
      console.log(`[UsuariosListar] 🔄 Cargando roles para ${usersWithoutRoles.length} usuarios sin roles`);
    }

    const requests = usersWithoutRoles.map(u =>
      this.rolesSvc.listUserRoles(u.id).pipe(
        catchError(err => {
          if (this.isDevelopment) {
            console.error(`[UsuariosListar] ❌ Error cargando roles de ${u.username}:`, err);
          }
          return of([]);
        })
      )
    );

    forkJoin(requests).subscribe({
      next: results => {
        if (this.isDevelopment) {
          console.log('[UsuariosListar] ✅ Roles cargados exitosamente');
        }

        results.forEach((roles, index) => {
          const user = usersWithoutRoles[index];
          if (roles && roles.length > 0) {
            const rolesNombres = roles.map(r => r.rolNombre || r.rol?.nombre || '').filter(Boolean);
            (user as any).rolNombres = rolesNombres;
            (user as any).rolNombre = rolesNombres[0] || null;

            if (this.isDevelopment) {
              console.log(`[UsuariosListar] ✅ ${user.username} → roles:`, rolesNombres);
            }
          }
        });

        this.usuarios = [...this.usuarios];
        this.applyFilter();
      },
      error: err => {
        console.error('[UsuariosListar] ❌ Error cargando roles faltantes:', err);
      }
    });
  }

  rolesFor(u: UserEntity): string[] {
    const fromNames: string[] = Array.isArray((u as any).rolNombres)
      ? (u as any).rolNombres.map((x: any) => String(x))
      : [];
    const fromOrg: string[] = Array.isArray((u as any).rolesOrganizacion)
      ? (u as any).rolesOrganizacion.map((r: any) => String(r?.nombre || '')).filter(Boolean)
      : [];
    const single: string[] = (u as any).rolNombre ? [String((u as any).rolNombre)] : [];
    const fallbackCtx: string[] = this.roleByUserId[u.id] ? [this.roleByUserId[u.id]] : [];

    if (this.isDevelopment && u.scopeNivel === 'ORGANIZACION' && !fromNames.length && !fromOrg.length && !single.length && !fallbackCtx.length) {
      console.warn('[UsuariosListar] ⚠️ Usuario ORGANIZACION sin roles:', {
        username: u.username,
        scopeNivel: u.scopeNivel,
        rolNombres: (u as any).rolNombres,
        rolesOrganizacion: (u as any).rolesOrganizacion
      });
    }

    const preferred: string[] = fromNames.length
      ? fromNames
      : (fromOrg.length
        ? fromOrg
        : (single.length ? single : fallbackCtx));

    const seen = new Set<string>();
    const out: string[] = [];
    preferred.forEach((r: string) => {
      const k = r.trim();
      if (k && !seen.has(k.toLowerCase())) {
        seen.add(k.toLowerCase());
        out.push(k);
      }
    });
    return out;
  }
}

