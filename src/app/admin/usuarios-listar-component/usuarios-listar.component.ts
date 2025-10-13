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
import { SectionInviteDialogComponent } from '../../shared/section-invite-dialog.component';

@Component({
  selector: 'app-usuarios-listar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, ButtonModule, TableModule, TagModule, TooltipModule, AvatarModule, ChipModule, SectionInviteDialogComponent],
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
  showInvite = false;

  // Paginación adaptable
  pageSize = 10;
  rowsOptions: number[] = [5, 8, 10, 12, 15, 20];
  first = 0; // índice del primer registro de la página actual
  private adjustTimer: any;

  // Mapa de rol contextual por usuario (solo en scope SECCION)
  roleByUserId: Record<string, string> = {};

  constructor(
    private orgCtx: OrgContextService,
    private users: UsersService,
    private notify: NotificationService,
    private router: Router,
    private confirm: ConfirmationService,
    private seccionSvc: SeccionService
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
    this.load();
    // Cargar secciones para mostrar el nombre y luego roles contextuales si aplica
    this.seccionSvc.list(this.orgId).subscribe({
      next: list => { this.secciones = list || []; this.loadSectionRolesIfApplies(); },
      error: () => { this.secciones = []; this.loadSectionRolesIfApplies(); }
    });
  }

  private loadSectionRolesIfApplies() {
    const scope = String(this.orgCtx.scope || '').toUpperCase();
    const secId = this.orgCtx.seccion;
    if (!this.orgId || scope !== 'SECCION' || !secId) { this.roleByUserId = {}; return; }
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
  }

  load() {
    if (!this.orgId) return;
    this.loading = true;
    this.users.list(this.orgId).subscribe({
      next: list => { this.usuarios = list; this.applyFilter(); this.loading = false; this.deferAdjustToViewport(); this.loadSectionRolesIfApplies(); },
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
    if (!u?.seccionPrincipalId) return '-';
    const found = this.secciones.find(s => String(s.id) === String(u.seccionPrincipalId));
    return found?.nombre || String(u.seccionPrincipalId);
  }

  get seccionIdForInvite(): string | null {
    const scope = this.orgCtx.scope;
    const sec = this.orgCtx.seccion;
    return (String(scope || '').toUpperCase() === 'SECCION' && sec) ? String(sec) : null;
  }

  openInvite() { this.showInvite = true; }
}
