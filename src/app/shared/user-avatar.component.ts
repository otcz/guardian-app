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
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule, RouterModule, AvatarModule, PopoverModule, ButtonModule, TagModule],
  styles: [`
    :host { display: inline-block; }
    .user-chip { display:flex; align-items:center; gap:.6rem; padding: .46rem .7rem; border-radius: 999px; cursor: pointer; transition: transform .15s ease, box-shadow .2s ease; }
    .user-chip:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,.12); }
    .avatar-initials { width: 28px; height: 28px; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-weight: 800; letter-spacing:.3px; font-size:.9rem; position: relative; }
    .meta { display:flex; flex-direction:column; line-height:1.15; }
    .name { font-weight: 900; font-size:.95rem; letter-spacing:.2px; }
    .org { font-size:.82rem; opacity:.85; }
    .sec { font-size:.78rem; opacity:.78; }

    /* Panel rediseñado */
    .panel { min-width: 320px; border-radius:14px; overflow:hidden; }
    .panel-hero { display:flex; gap:.8rem; align-items:center; padding:.9rem .95rem; background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 26%, #fff), color-mix(in srgb, var(--secondary) 10%, #eef4ff)); }
    :host-context(.theme-dark) .panel-hero, :host-context(.theme-black) .panel-hero {
      background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 18%, #1b1f2a), color-mix(in srgb, var(--secondary) 20%, #10131a));
    }
    .hero-avatar { position: relative; width: 44px; height: 44px; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-weight: 900; color:#fff; background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, #111)); box-shadow: 0 6px 18px rgba(0,0,0,.22); }
    .hero-avatar::after { content:""; position:absolute; inset:-3px; border-radius:50%; border:2px solid color-mix(in srgb, var(--primary) 55%, #fff); opacity:.6; }
    .status-dot { position:absolute; right:-2px; bottom:-2px; width:10px; height:10px; border-radius:50%; background: var(--success); box-shadow: 0 0 0 2px #fff; }
    :host-context(.theme-dark) .status-dot, :host-context(.theme-black) .status-dot { box-shadow: 0 0 0 2px #000; }
    .hero-meta { display:flex; flex-direction:column; line-height:1.15; }
    .hero-meta .title { font-weight:900; font-size:1.02rem; color:#0b1220; }
    .hero-meta .hint { font-size:.82rem; opacity:.85; color:#0b1220; }
    :host-context(.theme-dark) .hero-meta .title, :host-context(.theme-dark) .hero-meta .hint,
    :host-context(.theme-black) .hero-meta .title, :host-context(.theme-black) .hero-meta .hint { color:#fff; }

    .panel-body { padding:.85rem .95rem .9rem; background: transparent; }
    .chips { display:flex; gap:.5rem; flex-wrap:wrap; margin-bottom:.6rem; }
    .chip { display:inline-flex; align-items:center; gap:.35rem; padding:.28rem .55rem; border-radius:999px; font-size:.82rem; font-weight:700; background: color-mix(in srgb, var(--primary) 10%, #fff); color:#0b1220; border:1px solid color-mix(in srgb, var(--border) 70%, transparent); }
    .chip i { font-size:.85rem; opacity:.9; }
    :host-context(.theme-dark) .chip, :host-context(.theme-black) .chip { background: color-mix(in srgb, var(--primary) 12%, #111827); color:#fff; border-color: color-mix(in srgb, var(--border) 55%, transparent); }

    .row { display:flex; align-items:center; gap:.55rem; }
    .row i { font-size: .95rem; opacity:.85; }
    .kv { display:flex; flex-direction:column; gap:.1rem; }
    .kv .k { font-size:.78rem; opacity:.7; font-weight:700; letter-spacing:.2px; }
    .kv .v { font-size:.92rem; font-weight:800; }

    .roles { display:flex; gap:.35rem; flex-wrap:wrap; margin-top:.65rem; }
    .actions { display:flex; gap:.5rem; margin-top:.9rem; flex-wrap:wrap; justify-content:flex-end; }

    /* Tema claro */
    :host-context(.theme-light) .user-chip { background:#ffffff; color:#111; box-shadow: 0 2px 6px rgba(0,0,0,.08); border: 1px solid rgba(0,0,0,.06); }
    :host-context(.theme-light) .avatar-initials { background:#111; color:#fff; }
    :host-context(.theme-light) .panel { background:#fff; color:#111; box-shadow: 0 14px 32px rgba(0,0,0,0.12), 0 6px 18px rgba(79,140,255,0.12); }

    /* Tema oscuro/black */
    :host-context(.theme-dark) .user-chip, :host-context(.theme-black) .user-chip { background: color-mix(in srgb, var(--surface) 85%, #000); color:#fff; border:1px solid color-mix(in srgb, var(--border) 50%, transparent); }
    :host-context(.theme-dark) .panel, :host-context(.theme-black) .panel { background: color-mix(in srgb, var(--surface) 92%, #000); color:#fff; box-shadow: 0 12px 28px rgba(0,0,0,0.24), 0 6px 12px rgba(0,0,0,0.18); }

    /* Micro-animaciones */
    @keyframes pulseDot { 0% { transform: scale(1); opacity:.9; } 50% { transform: scale(1.25); opacity:.6; } 100% { transform: scale(1); opacity:.9; } }
    .status-dot { animation: pulseDot 2.2s ease-in-out infinite; }
  `],
  template: `
    <p-popover #pop [dismissable]="true" [showCloseIcon]="true">
      <div class="panel">
        <div class="panel-hero">
          <div class="hero-avatar">
            <span>{{ initials() }}</span>
            <span class="status-dot" title="Activo"></span>
          </div>
          <div class="hero-meta">
            <div class="title">{{ displayName() }}</div>
            <div class="hint">{{ emailHint() }}</div>
          </div>
        </div>
        <div class="panel-body">
          <div class="chips">
            <span class="chip"><i class="pi pi-building"></i> {{ orgName() || 'Sin organización' }}</span>
            <span class="chip" *ngIf="sectionName()"><i class="pi pi-sitemap"></i> {{ sectionName() }}</span>
          </div>
          <div class="row">
            <i class="pi pi-clock"></i>
            <div class="kv">
              <div class="k">Tiempo de sesión</div>
              <div class="v">{{ sessionLeft() }}</div>
            </div>
          </div>
          <div class="roles" *ngIf="roles().length">
            <p-tag *ngFor="let r of roles()" [value]="r"></p-tag>
          </div>
          <div class="actions">
            <button pButton type="button" class="p-button-text" icon="pi pi-sign-out" label="Cerrar sesión" (click)="logout()"></button>
          </div>
        </div>
      </div>
    </p-popover>

    <div class="user-chip" (click)="pop.toggle($event)">
      <div class="avatar-initials">{{ initials() }}</div>
      <div class="meta">
        <div class="name">{{ shortName() }}</div>
        <div class="org">{{ orgShort() }}</div>
        <div class="sec" *ngIf="sectionName()">{{ sectionShort() }}</div>
      </div>
    </div>
  `
})
export class UserAvatarComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  private orgSvc = inject(OrganizationService);

  username = signal<string>('');
  roles = signal<string[]>([]);
  orgId = signal<string | null>(null);
  orgName = signal<string | null>(null);
  sectionName = signal<string | null>(null);
  expiresAt = signal<number | null>(null);

  constructor() {
    this.loadFromStorage();
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
  }

  private loadFromStorage() {
    try {
      this.username.set(localStorage.getItem('username') || 'Usuario');
      const rolesRaw = localStorage.getItem('roles');
      this.roles.set(Array.isArray(JSON.parse(rolesRaw || 'null')) ? JSON.parse(rolesRaw!) : []);
    } catch { this.roles.set([]); }
    try { this.orgId.set(localStorage.getItem('currentOrgId')); } catch { this.orgId.set(null); }
    try { this.expiresAt.set(Number(localStorage.getItem('expiresAt') || '0') || null); } catch { this.expiresAt.set(null); }
    try { this.sectionName.set(localStorage.getItem('currentSectionName')); } catch { this.sectionName.set(null); }
  }

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
  orgShort = computed(() => {
    const o = this.orgName();
    return o ? (o.length > 26 ? o.slice(0,24) + '…' : o) : 'Sin organización';
  });
  sectionShort = computed(() => {
    const s = this.sectionName();
    return s && s.length > 24 ? s.slice(0,22) + '…' : (s || '');
  });
  sessionLeft = computed(() => {
    const exp = this.expiresAt();
    if (!exp) return '—';
    const ms = exp - Date.now();
    if (ms <= 0) return 'expirada';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  });

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
