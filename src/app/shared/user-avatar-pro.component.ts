import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../service/auth.service';
import { OrganizationService, Organization } from '../service/organization.service';
import { OrgContextService, ScopeNivel } from '../service/org-context.service';
import { SeccionService, SeccionEntity } from '../service/seccion.service';

@Component({
  selector: 'app-user-avatar-pro',
  standalone: true,
  imports: [CommonModule, RouterModule, AvatarModule, PopoverModule, ButtonModule, TagModule],
  templateUrl: './user-avatar-pro.component.html',
  styleUrls: ['./user-avatar-pro.component.scss']
})
export class UserAvatarProComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  private orgSvc = inject(OrganizationService);
  private ctx = inject(OrgContextService);
  private secSvc = inject(SeccionService);

  username = signal<string>('');
  roles = signal<string[]>([]);
  orgId = signal<string | null>(null);
  orgName = signal<string | null>(null);
  scopeNivel = signal<ScopeNivel | null>(null);
  seccionId = signal<string | null>(null);
  seccionName = signal<string | null>(null);
  expiresAt = signal<number | null>(null);
  orgs = signal<Organization[]>([]);
  displayedOrgs = computed(() => {
    const list = this.orgs() || [];
    const scope = (this.scopeNivel() || '').toString().toUpperCase();
    const currentId = this.orgId();
    // Si el alcance es ORGANIZACION o SECCION y hay orgId activo, restringir a esa organización
    if ((scope === 'ORGANIZACION' || scope === 'SECCION') && currentId) {
      return list.filter(o => String(o.id) === String(currentId));
    }
    return list;
  });

  private timer?: any;
  private tick = signal<number>(Date.now());

  constructor() {
    this.loadFromStorage();

    const isAuth = this.auth.isAuthenticated();

    // NUEVO: sincronizar señales con cambios del contexto global
    this.ctx.orgId$.subscribe((id) => {
      const newId = id ? String(id) : null;
      if (this.orgId() !== newId) {
        this.orgId.set(newId);
        try { if (newId) localStorage.setItem('currentOrgId', newId); } catch {}
      }
    });
    this.ctx.scope$.subscribe((sc) => {
      const v = sc != null ? (String(sc).toUpperCase() as any) : null;
      if (this.scopeNivel() !== v) {
        this.scopeNivel.set(v);
        try { if (v) localStorage.setItem('scopeNivel', v as string); else localStorage.removeItem('scopeNivel'); } catch {}
      }
    });
    this.ctx.seccionId$.subscribe((sid) => {
      const v = sid ? String(sid) : null;
      if (this.seccionId() !== v) {
        this.seccionId.set(v);
        try { if (v) localStorage.setItem('seccionPrincipalId', v); else localStorage.removeItem('seccionPrincipalId'); } catch {}
      }
    });

    // Refrescar nombre de organización actual y persistirlo (solo si autenticado)
    effect((onCleanup) => {
      if (!isAuth) { this.orgName.set(null); return; }
      const id = this.orgId();
      let sub: any;
      if (id) {
        sub = this.orgSvc.get(id).subscribe({
          next: (org: Organization) => {
            const name = org?.nombre || null;
            this.orgName.set(name);
            try { if (name) localStorage.setItem('currentOrgName', name); } catch {}
          },
          error: () => this.orgName.set(null)
        });
      } else {
        this.orgName.set(null);
      }
      if (onCleanup && typeof onCleanup === 'function') {
        onCleanup(() => { if (sub?.unsubscribe) sub.unsubscribe(); });
      }
    }, { allowSignalWrites: true });

    // Cargar lista de organizaciones accesibles y auto-seleccionar si falta (solo si autenticado)
    if (isAuth) {
      this.orgSvc.listAccessible().subscribe({
        next: (list) => {
          const arr = Array.isArray(list) ? list : [];
          this.orgs.set(arr);
          const current = this.orgId();
          const exists = current ? arr.some(o => String(o.id) === String(current)) : false;
          if (!current || !exists) {
            const active = arr.find(o => (o as any)?.activa);
            const chosen = active || arr[0] || null;
            if (chosen?.id) {
              const id = String(chosen.id);
              const name = chosen.nombre || null;
              try { localStorage.setItem('currentOrgId', id); } catch {}
              if (name) { try { localStorage.setItem('currentOrgName', name); } catch {} }
              this.orgId.set(id);
              this.orgName.set(name);
              this.ctx.set(id);
            } else {
              // Sin organizaciones
              try { localStorage.removeItem('currentOrgId'); localStorage.removeItem('currentOrgName'); } catch {}
              this.orgId.set(null);
              this.orgName.set(null);
              this.ctx.set(null);
            }
          }
        },
        error: () => this.orgs.set([])
      });
    }

    // Cargar nombre de sección si aplica (solo si autenticado)
    effect((onCleanup) => {
      if (!isAuth) { this.seccionName.set(null); return; }
      const orgId = this.orgId();
      const secId = this.seccionId();
      this.seccionName.set(null);
      if (!orgId || !secId) return;
      let sub: any;
      sub = this.secSvc.list(orgId).subscribe({
        next: (list: SeccionEntity[]) => {
          const found = (list || []).find(s => String(s.id) === String(secId));
          const n = found?.nombre || null;
          this.seccionName.set(n);
          try { if (n) localStorage.setItem('currentSectionName', n); } catch {}
        },
        error: () => this.seccionName.set(null)
      });
      if (onCleanup) onCleanup(() => { if (sub?.unsubscribe) sub.unsubscribe(); });
    }, { allowSignalWrites: true });

    // Iniciar intervalo para refrescar cuenta regresiva y progreso
    this.timer = setInterval(() => this.tick.set(Date.now()), 1000);
  }

  private loadFromStorage() {
    try {
      this.username.set(localStorage.getItem('username') || 'Usuario');
      const rolesRaw = localStorage.getItem('roles');
      this.roles.set(Array.isArray(JSON.parse(rolesRaw || 'null')) ? JSON.parse(rolesRaw!) : []);
    } catch { this.roles.set([]); }
    try { this.orgId.set(localStorage.getItem('currentOrgId')); } catch { this.orgId.set(null); }
    try { this.orgName.set(localStorage.getItem('currentOrgName')); } catch { this.orgName.set(null); }
    try { this.expiresAt.set(Number(localStorage.getItem('expiresAt') || '0') || null); } catch { this.expiresAt.set(null); }
    // contexto
    try { this.scopeNivel.set((localStorage.getItem('scopeNivel') as any) || null); } catch { this.scopeNivel.set(null); }
    try { this.seccionId.set(localStorage.getItem('seccionPrincipalId')); } catch { this.seccionId.set(null); }
    try { this.seccionName.set(localStorage.getItem('currentSectionName')); } catch { this.seccionName.set(null); }
  }

  // Computados UI
  initials = computed(() => {
    const n = (this.username() || '').trim();
    const parts = n.split(/\s+/).filter(Boolean);
    const ini = parts.slice(0,2).map(p => p.charAt(0).toUpperCase()).join('');
    return ini || 'U';
  });
  shortName = computed(() => {
    const n = (this.username() || '').trim();
    return n.length > 22 ? n.slice(0,20) + '…' : n || 'Usuario';
  });
  displayName = computed(() => this.username());
  emailHint = computed(() => {
    const u = this.username();
    return u?.includes('@') ? u : 'Usuario autenticado';
  });
  primaryRole = computed(() => (this.roles()[0] || '').toString());
  orgShort = computed(() => {
    const o = this.orgName();
    return o ? (o.length > 26 ? o.slice(0,24) + '…' : o) : 'Sin organización';
  });

  // Sesión: progreso
  private sessionBounds() {
    // forzar dependencia reactiva en tick para recalcular cada segundo
    this.tick();
    const exp = this.expiresAt();
    if (!exp) return { totalMs: 0, leftMs: 0 };
    // Intentar inferir total a partir de expiresAt y un TTL típico si no guardamos issuedAt
    const defaultTtlMs = 60 * 60 * 1000; // 1h por defecto
    const left = Math.max(0, exp - Date.now());
    const total = Math.max(defaultTtlMs, left);
    return { totalMs: total, leftMs: left };
  }
  progressRatio = computed(() => {
    const { totalMs, leftMs } = this.sessionBounds();
    if (!totalMs) return 0;
    const ratio = 1 - (leftMs / totalMs);
    return Math.max(0, Math.min(1, ratio));
  });
  progressPercent = computed(() => Math.round(this.progressRatio() * 100));
  sessionLeftDetailed = computed(() => {
    const { leftMs } = this.sessionBounds();
    if (!leftMs) return '—';
    if (leftMs <= 0) return 'expirada';
    const m = Math.floor(leftMs / 60000);
    const s = Math.floor((leftMs % 60000) / 1000);
    return `${m}m ${s}s`;
  });

  // Acciones
  switchOrg(o: Organization, pop: any) {
    if (!o?.id) return;
    const id = String(o.id);
    const name = o.nombre || null;
    try { localStorage.setItem('currentOrgId', id); } catch {}
    if (name) { try { localStorage.setItem('currentOrgName', name); } catch {} }
    this.orgId.set(id);
    this.orgName.set(name);
    this.ctx.set(id);
    if (pop?.hide) pop.hide();
    // Navegar al panel de gestión de la org seleccionada
    this.router.navigate(['/gestionar-organizacion'], { queryParams: { id: o.id } });
  }

  goManage(pop: any) {
    const id = this.orgId();
    if (!id) { this.router.navigate(['/listar-organizaciones']); return; }
    if (pop?.hide) pop.hide();
    this.router.navigate(['/gestionar-organizacion'], { queryParams: { id } });
  }

  goList(pop: any) {
    if (pop?.hide) pop.hide();
    this.router.navigate(['/listar-organizaciones']);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
  }
}
