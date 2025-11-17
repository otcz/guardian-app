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
// SectionInviteDialogComponent eliminado del listado
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../../config/environment';
import { OrganizationService } from '../../service/organization.service';
import { RoleLabelPipe } from '../../shared/pipes/role-label.pipe';
import { RoleSeverityPipe } from '../../shared/pipes/role-severity.pipe';
import { OverlayPanelModule } from 'primeng/overlaypanel';

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
  // showInvite eliminado
  // Nombre de la organización actual para construir la línea de mando
  orgName: string | null = null;

  // Paginación adaptable
  pageSize = 10;
  rowsOptions: number[] = [5, 8, 10, 12, 15, 20];
  private _first = 0; // índice del primer registro de la página actual
  get first(): number { return this._first; }
  set first(v: number) { this._first = v || 0; this.loadSectionRolesIfApplies(); }
  private adjustTimer: any;
  private loadRolesTimer: any;
  private fetchedSecIds = new Set<string>();
  private roleCacheBySection = new Map<string, Record<string, string>>();
  private failedSecIdsUntil: Map<string, number> = new Map(); // secId -> epoch ms hasta el que se evita reintento
  private inFlightSecIds = new Set<string>();

  // Mapa de rol contextual por usuario (solo en scope SECCION)
  roleByUserId: Record<string, string> = {};

  private sectionNameCache: Record<string, string> = {};
  private sectionFetchInFlight = new Set<string>();

  constructor(
    private orgCtx: OrgContextService,
    private users: UsersService,
    private notify: NotificationService,
    private router: Router,
    private confirm: ConfirmationService,
    private seccionSvc: SeccionService,
    private orgSvc: OrganizationService
  ) {}

  private calcRowsFromViewport(viewH: number): number {
    // Reserva aproximada para header, buscador, paddings y paginador
    const reserved = 440; // px, margen extra para evitar scroll residual
    const rowH = 82; // altura estimada de una fila (avatar + chips + separadores)
    const usable = Math.max(240, viewH - reserved);
    let rows = Math.floor(usable / rowH);
    // Margen de seguridad: si queda muy justo, reducir una fila
    if (rows > 0 && (usable - rows * rowH) < 40) rows -= 1;
    return Math.min(25, Math.max(5, rows));
  }

  private refreshPageSizing() {
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const next = this.calcRowsFromViewport(h);
    this.pageSize = next;
    // Opciones sugeridas incluyendo la calculada
    const base = [5, 8, 10, 12, 15, 20, next].filter(n => n >= 5 && n <= 25);
    this.rowsOptions = Array.from(new Set(base)).sort((a, b) => a - b);
    this.deferAdjustToViewport();
  }

  private deferAdjustToViewport() {
    if (this.adjustTimer) { try { clearTimeout(this.adjustTimer); } catch {} this.adjustTimer = null; }
    this.adjustTimer = setTimeout(() => this.adjustRowsToFitViewport(), 0);
  }

  private adjustRowsToFitViewport() {
    // Reduce filas si aún hay desbordamiento vertical, con límite para evitar ciclos
    let guard = 0;
    const minRows = 5;
    while (guard < 4) {
      const doc = document?.documentElement as HTMLElement | null;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
      const scrollH = doc ? doc.scrollHeight : winH;
      const overflow = scrollH > winH + 1; // tolerancia
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
    // Cargar lista de usuarios
    this.load();
    // Cargar secciones para mostrar el nombre y luego roles contextuales si aplica
    this.seccionSvc.list(this.orgId).subscribe({
      next: list => { this.secciones = list || []; this.loadSectionRolesIfApplies(); },
      error: () => { this.secciones = []; this.loadSectionRolesIfApplies(); }
    });
    // Cargar nombre de la organización para construir la línea de mando
    this.orgSvc.get(this.orgId).subscribe({
      next: org => { this.orgName = (org && org.nombre) ? String(org.nombre) : null; },
      error: () => { this.orgName = null; }
    });
  }

  private loadSectionRolesIfApplies() {
    // Debounce para evitar martilleo por cambios de paginador/filtro
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
    const TTL_ERROR_MS = 60_000; // 60s sin reintentar una sección que falla (500)

    const secIdsAll = Array.from(new Set(baseArr
      .map(u => (u as any).seccionId)
      .filter((v): v is string => !!v)
      .map(s => String(s))));

    // Si no hay secciones visibles, borrar mapa y salir
    if (secIdsAll.length === 0) { this.roleByUserId = {}; return; }

    // Excluir secciones con error reciente
    const eligible = secIdsAll.filter(id => {
      const until = this.failedSecIdsUntil.get(id) || 0;
      return now >= until;
    });

    // Agregar inmediatamente lo que ya esté en caché para mejorar UX
    const preMap: Record<string, string> = {};
    secIdsAll.forEach(id => {
      const cached = this.roleCacheBySection.get(id);
      if (cached) {
        Object.keys(cached).forEach(uid => { preMap[uid] = cached[uid]; });
      }
    });
    this.roleByUserId = preMap;

    // Determinar cuáles faltan cargar realmente
    const toFetch = eligible.filter(id => !this.fetchedSecIds.has(id) && !this.inFlightSecIds.has(id));
    if (toFetch.length === 0) return; // nada nuevo por cargar

    // Preparar llamadas tolerantes a errores (error -> lista vacía y marcar sección en fallo temporal)
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
        // results[i] corresponde a toFetch[i]
        results.forEach((arr, idx) => {
          const sec = toFetch[idx];
          const map: Record<string, string> = {};
          (arr || []).forEach(us => {
            const uid = String(us?.usuarioEntity?.id || '');
            const rn = (us?.rolEntityContextual?.nombre || '').toString().trim();
            if (uid && rn) map[uid] = rn;
          });
          // Cachear y marcar como fetched si hubo datos (o incluso vacío para evitar refetch inmediato)
          this.roleCacheBySection.set(sec, map);
          this.fetchedSecIds.add(sec);
        });
        // Reconstruir roleByUserId solo con secciones visibles
        const agg: Record<string, string> = { ...preMap };
        secIdsAll.forEach(id => {
          const cached = this.roleCacheBySection.get(id);
          if (cached) Object.keys(cached).forEach(uid => { agg[uid] = cached[uid]; });
        });
        this.roleByUserId = agg;
      },
      error: () => {
        // En teoría no entra porque cada obs maneja su error
      }
    });
  }

  load() {
    if (!this.orgId) return;
    this.loading = true;
    this.users.list(this.orgId).subscribe({
      next: list => {
        try { console.log('[UsuariosListar] Usuarios cargados:', list); } catch {}
        this.usuarios = list; this.applyFilter(); this.loading = false; this.deferAdjustToViewport(); this.loadSectionRolesIfApplies();
      },
      error: e => { this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudieron listar usuarios'); }
    });
  }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    if (!f) { this.filtered = [...this.usuarios]; this.first = 0; this.deferAdjustToViewport(); return; }
    this.filtered = this.usuarios.filter(u => [u.username, u.nombreCompleto, u.email, u.scopeNivel].some(v => (v || '').toString().toLowerCase().includes(f)));
    this.first = 0; // reset a primera página tras filtrar
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
    const sid = (u as any)?.seccionId;
    if (!sid) return '-';

    // 1) Caché local
    const cached = this.sectionNameCache[String(sid)];
    if (cached) return cached;

    // 2) Buscar en lista precargada
    const found = this.secciones.find(s => String(s.id) === String(sid));
    if (found) {
      this.sectionNameCache[String(sid)] = found.nombre;
      return found.nombre;
    }

    // 3) Resolver bajo demanda (una sola vez por id)
    if (this.orgId && !this.sectionFetchInFlight.has(String(sid))) {
      this.sectionFetchInFlight.add(String(sid));
      this.seccionSvc.get(this.orgId, String(sid)).subscribe({
        next: (sec) => {
          this.sectionNameCache[String(sid)] = (sec?.nombre ?? String(sid));
          this.sectionFetchInFlight.delete(String(sid));
        },
        error: () => {
          // fallback: no cachear nombre inválido, permitir reintentos futuros tras TTL implícito (navegación/refresco)
          this.sectionFetchInFlight.delete(String(sid));
        }
      });
    }

    // Mientras se resuelve, mostrar el id; se actualizará automáticamente cuando llegue el nombre
    return String(sid);
  }

  // Devuelve solo los nombres: "ORG", o "ORG, SEC" si corresponde
  mandoNombre(u: UserEntity): string {
    const org = (this.orgName && this.orgName.trim()) ? this.orgName.trim() : (this.orgId || '-');
    const sec = this.sectionName(u);
    if (sec && sec !== '-' ) return `${org}, ${sec}`;
    return org || '-';
  }

  // Consolidar roles con prioridad y sin duplicados
  rolesFor(u: UserEntity): string[] {
    const fromNames: string[] = Array.isArray((u as any).rolNombres)
      ? (u as any).rolNombres.map((x: any) => String(x))
      : [];
    const fromOrg: string[] = Array.isArray((u as any).rolesOrganizacion)
      ? (u as any).rolesOrganizacion.map((r: any) => String(r?.nombre || '')).filter(Boolean)
      : [];
    const single: string[] = (u as any).rolNombre ? [String((u as any).rolNombre)] : [];
    const fallbackCtx: string[] = this.roleByUserId[u.id] ? [this.roleByUserId[u.id]] : [];
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
