// Componente placeholder genérico para rutas no implementadas todavía
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { NotificationService } from './service/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-page-placeholder',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="padding:32px; max-width:860px; margin:0 auto;">
      <h2 style="margin:0 0 12px; font-weight:600; font-size:1.4rem;">Funcionalidad en construcción</h2>
      <p style="margin:0 0 20px; line-height:1.4;">
        Esta ruta (<code>{{ currentUrl }}</code>) todavía no tiene una vista implementada.
        Usa este placeholder temporal para validar permisos y navegación.
      </p>
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <button (click)="goDashboard()" style="background:var(--primary,#3b82f6); color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Ir al Dashboard</button>
        <button (click)="goBack()" style="background:#555; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Volver atrás</button>
      </div>
    </div>
  `
})
export class PagePlaceholderComponent implements OnInit, OnDestroy {
  currentUrl = '';
  private sub?: Subscription;
  private static notifiedUrls = new Set<string>();

  constructor(private router: Router, private notify: NotificationService) {
    this.currentUrl = this.normalizeUrl(this.router.url);
    this.maybeNotify(this.currentUrl);
  }

  ngOnInit() {
    this.sub = this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd) {
        const url = this.normalizeUrl(ev.urlAfterRedirects || ev.url);
        this.currentUrl = url;
        this.maybeNotify(url);
      }
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe?.(); }

  goDashboard() { this.router.navigate(['/']); }
  goBack() {
    if (history.length > 1) history.back();
    else this.router.navigate(['/']);
  }

  private normalizeUrl(u: string) {
    const base = (u || '').split('?')[0].split('#')[0];
    if (base.length > 1 && base.endsWith('/')) return base.replace(/\/$/, '');
    return base || '/';
  }

  private maybeNotify(url: string) {
    if (!PagePlaceholderComponent.notifiedUrls.has(url)) {
      PagePlaceholderComponent.notifiedUrls.add(url);
      this.notify.info('Funcionalidad en construcción', `Vista no implementada para ${url}`);
    }
  }
}
