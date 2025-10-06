import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../service/auth.service';
import { OrganizationService, Organization } from '../service/organization.service';

@Component({
  selector: 'app-user-avatar-pro',
  standalone: true,
  imports: [CommonModule, RouterModule, AvatarModule, PopoverModule, ButtonModule, TagModule],
  styles: [`
    :host { display: inline-block; }

    /* Chip compacto */
    .chip { display:flex; align-items:center; gap:.6rem; padding:.46rem .7rem; border-radius: 999px; cursor: pointer; transition: transform .15s ease, box-shadow .2s ease; }
    .chip:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,.12); }
    .chip .initials { width: 34px; height: 34px; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-weight: 900; }
    .chip .meta { display:flex; flex-direction:column; line-height:1.1; }
    .chip .name { font-weight: 900; font-size:.95rem; letter-spacing:.1px; }
    .chip .sub { font-size:.8rem; opacity:.85; }

    /* Panel del popover */
    .panel { min-width: 360px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,0,0,.06); background: #ffffff; color: #111827; box-shadow: 0 14px 32px rgba(0,0,0,0.12), 0 6px 18px rgba(0,0,0,0.08); }
    :host-context(.theme-dark) .panel, :host-context(.theme-black) .panel { background: #0f172a; color:#e5e7eb; border-color: rgba(148,163,184,.24); box-shadow: 0 12px 28px rgba(0,0,0,0.35), 0 6px 12px rgba(0,0,0,0.28); }

    .hero { display:flex; gap:1rem; align-items:center; padding: 1rem; background: linear-gradient(135deg, #e9efff, #eef4ff); }
    :host-context(.theme-dark) .hero, :host-context(.theme-black) .hero { background: linear-gradient(135deg, rgba(59,130,246,.18), rgba(99,102,241,.12)), linear-gradient(180deg, #0f172a, #0b1220); }

    /* Avatar circular simple (sin efectos complejos) */
    .ring { width: 56px; height: 56px; border-radius: 50%; display:grid; place-items:center; background: linear-gradient(135deg, #93c5fd, #64748b); border: 2px solid rgba(99,102,241,.55); }
    :host-context(.theme-dark) .ring, :host-context(.theme-black) .ring { background: linear-gradient(135deg, #1f2937, #0b1220); border-color: rgba(99,102,241,.45); }
    .ring .inner { width: 44px; height: 44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight: 900; color: #fff; background: linear-gradient(135deg, #4f46e5, #334155); box-shadow: 0 6px 18px rgba(0,0,0,.22); }

    .hero-meta { display:flex; flex-direction:column; gap:.15rem; line-height:1.12; }
    .hero-meta .title { font-weight: 900; font-size: 1.05rem; }
    .hero-meta .hint { font-size:.82rem; opacity:.9; }

    .body { padding: .9rem 1rem 1rem; display:flex; flex-direction:column; gap:.75rem; }

    /* Progreso de sesión */
    .session { display:flex; align-items:center; gap:.6rem; }
    .bar { position:relative; flex: 1 1 auto; height: 7px; border-radius: 999px; background: rgba(203,213,225,.5); overflow:hidden; }
    :host-context(.theme-dark) .bar, :host-context(.theme-black) .bar { background: rgba(148,163,184,.28); }
    .bar .bar-fill { position:absolute; left:0; top:0; bottom:0; height:100%; background: linear-gradient(90deg, #4f46e5, #06b6d4); border-radius: 999px; width: 0%; }
    .session .time { font-size:.8rem; font-weight: 800; min-width: 70px; text-align:right; }

    /* Lista de organizaciones */
    .orgs { display:flex; flex-direction:column; gap:.35rem; }
    .org-item { display:flex; align-items:center; gap:.6rem; padding:.42rem .55rem; border-radius:12px; cursor:pointer; border:1px solid rgba(203,213,225,.55); background: #f8fafc; color:#0f172a; }
    .org-item b { color: inherit; }
    .org-item small { opacity:.82; }
    .org-item.active { outline: 2px solid rgba(99,102,241,.55); background: #eef2ff; }
    .org-item .dot { width:8px; height:8px; border-radius:50%; background: #4f46e5; box-shadow: 0 0 0 2px #fff; }
    :host-context(.theme-dark) .org-item, :host-context(.theme-black) .org-item { background: #0b1220; color:#e5e7eb; border-color: rgba(148,163,184,.30); }
    :host-context(.theme-dark) .org-item.active, :host-context(.theme-black) .org-item.active { outline-color: rgba(99,102,241,.65); background: #0f172a; }
    :host-context(.theme-dark) .org-item .dot, :host-context(.theme-black) .org-item .dot { box-shadow: 0 0 0 2px #0f172a; }

    .actions { display:flex; gap:.5rem; justify-content:flex-end; flex-wrap:wrap; margin-top:.2rem; }

    /* Tema claro/oscuro del chip */
    :host-context(.theme-light) .chip { background:#ffffff; color:#111; box-shadow: 0 2px 6px rgba(0,0,0,.08); border: 1px solid rgba(0,0,0,.06); }
    :host-context(.theme-light) .chip .initials { background:#111; color:#fff; }
    :host-context(.theme-dark) .chip, :host-context(.theme-black) .chip { background: #111827; color:#e5e7eb; border:1px solid rgba(148,163,184,.24); box-shadow: 0 8px 18px rgba(0,0,0,.25); }
    :host-context(.theme-dark) .chip .initials, :host-context(.theme-black) .chip .initials { background: linear-gradient(135deg, #334155, #1f2937); color:#e5e7eb; }
  `],
  template: `
    <p-popover #pop [dismissable]="true" [showCloseIcon]="true">
      <div class="panel">
        <div class="hero">
          <div class="ring"><div class="inner">{{ initials() }}</div></div>
          <div class="hero-meta">
            <div class="title">{{ displayName() }}</div>
            <div class="hint">{{ emailHint() }}</div>
            <div *ngIf="primaryRole()">
              <p-tag [value]="primaryRole()" severity="info"></p-tag>
            </div>
          </div>
        </div>
        <div class="body">
          <div class="session">
            <i class="bar"><span class="bar-fill" [style.width.%]="progressPercent()"></span></i>
            <div class="time">{{ sessionLeftDetailed() }}</div>
          </div>

          <div class="orgs" *ngIf="orgs().length">
            <div class="org-item" *ngFor="let o of orgs()" [class.active]="o.id === orgId()" (click)="switchOrg(o, pop)">
              <span class="dot"></span>
              <div style="display:flex; flex-direction:column; line-height:1.1;">
                <b>{{ o.nombre }}</b>
                <small style="opacity:.8;">{{ o.activa ? 'Activa' : 'Inactiva' }}</small>
              </div>
            </div>
          </div>

          <div class="actions">
            <button pButton type="button" class="p-button-text" icon="pi pi-cog" label="Gestionar" (click)="goManage(pop)"></button>
            <button pButton type="button" class="p-button-text" icon="pi pi-list" label="Organizaciones" (click)="goList(pop)"></button>
            <button pButton type="button" class="p-button-danger p-button-text" icon="pi pi-sign-out" label="Salir" (click)="logout()"></button>
          </div>
        </div>
      </div>
    </p-popover>

    <div class="chip" (click)="pop.toggle($event)">
      <div class="initials">{{ initials() }}</div>
      <div class="meta">
        <div class="name">{{ shortName() }}</div>
        <div class="sub">{{ orgShort() }}</div>
      </div>
    </div>
  `
})
export class UserAvatarProComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  private orgSvc = inject(OrganizationService);

  username = signal<string>('');
  roles = signal<string[]>([]);
  orgId = signal<string | null>(null);
  orgName = signal<string | null>(null);
  expiresAt = signal<number | null>(null);
  orgs = signal<Organization[]>([]);

  constructor() {
    this.loadFromStorage();

    // Refrescar nombre de organización actual
    effect((onCleanup) => {
      const id = this.orgId();
      let sub: any;
      if (id) {
        sub = this.orgSvc.get(id).subscribe({
          next: (org: Organization) => this.orgName.set(org?.nombre || null),
          error: () => this.orgName.set(null)
        });
      } else {
        this.orgName.set(null);
      }
      if (onCleanup && typeof onCleanup === 'function') {
        onCleanup(() => { if (sub?.unsubscribe) sub.unsubscribe(); });
      }
    }, { allowSignalWrites: true });

    // Cargar lista de organizaciones (para cambiar rápido)
    this.orgSvc.list().subscribe({
      next: (list) => this.orgs.set(Array.isArray(list) ? list : []),
      error: () => this.orgs.set([])
    });
  }

  private loadFromStorage() {
    try {
      this.username.set(localStorage.getItem('username') || 'Usuario');
      const rolesRaw = localStorage.getItem('roles');
      this.roles.set(Array.isArray(JSON.parse(rolesRaw || 'null')) ? JSON.parse(rolesRaw!) : []);
    } catch { this.roles.set([]); }
    try { this.orgId.set(localStorage.getItem('currentOrgId')); } catch { this.orgId.set(null); }
    try { this.expiresAt.set(Number(localStorage.getItem('expiresAt') || '0') || null); } catch { this.expiresAt.set(null); }
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
    try { localStorage.setItem('currentOrgId', String(o.id)); } catch {}
    this.orgId.set(String(o.id));
    this.orgName.set(o.nombre || null);
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
}
