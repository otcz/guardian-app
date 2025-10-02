import { Component, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule, OverlayPanelModule, ButtonModule],
  template: `
    <div style="position:relative; display:flex; align-items:center;">
      <button pButton type="button" class="p-button p-button-text" (click)="toggle($event)" aria-label="Usuario" #btn>
        <i class="pi pi-user" style="font-size:1.1rem"></i>
      </button>
      <p-overlayPanel #op [showTransitionOptions]="'100ms'" [hideTransitionOptions]="'80ms'" [dismissable]="true" [showCloseIcon]="false">
        <div style="min-width: 240px; display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:38px; height:38px; border-radius:50%; background: color-mix(in srgb, var(--primary) 25%, #888); display:grid; place-items:center; color:#fff; font-weight:800;">
              {{ initials() }}
            </div>
            <div style="line-height:1.2;">
              <div style="font-weight:800;">{{ username() }}</div>
              <div style="font-size:.85rem; color: var(--muted);">{{ role() }}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px; font-size:.9rem; color:var(--muted)">
            <i class="pi pi-clock"></i>
            <span>Sesión: {{ sessionLeft() }}</span>
          </div>
          <div style="height:1px; background: color-mix(in srgb, var(--border) 75%, transparent);"></div>
          <button pButton type="button" class="p-button p-button-text" (click)="logout()" style="justify-content:flex-start; gap:8px;">
            <i class="pi pi-sign-out"></i>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </p-overlayPanel>
    </div>
  `
})
export class UserAvatarComponent implements OnInit, OnDestroy {
  private uname = signal<string>(localStorage.getItem('username') || 'Usuario');
  private roles = signal<string[]>(JSON.parse(localStorage.getItem('roles') || '[]'));
  private expiresAtIso = signal<string | null>(localStorage.getItem('expiresAt'));
  private timerId: any;
  sessionLeft = signal<string>('—');

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.updateSessionLeft();
    this.timerId = setInterval(() => this.updateSessionLeft(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
  }

  username() { return this.uname(); }
  role() { return (this.roles()[0] || 'Usuario'); }
  initials() {
    const u = (this.uname() || '').trim();
    const parts = u.split(/[\s_.-]+/).filter(Boolean);
    const ini = parts.length >= 2 ? (parts[0][0] + parts[1][0]) : (u[0] || 'U');
    return ini.toUpperCase();
  }

  private updateSessionLeft() {
    const iso = this.expiresAtIso();
    if (!iso) { this.sessionLeft.set('—'); return; }
    const now = Date.now();
    const exp = Date.parse(iso);
    const diff = exp - now;
    if (isNaN(exp)) { this.sessionLeft.set('—'); return; }
    if (diff <= 0) { this.sessionLeft.set('Expirada'); return; }
    const totalSec = Math.floor(diff / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    this.sessionLeft.set(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
  }

  toggle(event: Event) {
    const btn = event.currentTarget as HTMLElement;
    const host = btn.parentElement as HTMLElement;
    const op = host.querySelector('p-overlayPanel') as any;
    op?.toggle(event);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
