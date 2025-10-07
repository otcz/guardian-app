// Componente placeholder genérico para rutas no implementadas todavía
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from './service/notification.service';

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
export class PagePlaceholderComponent {
  currentUrl = '';
  constructor(private router: Router, private notify: NotificationService) {
    this.currentUrl = this.router.url;
    this.notify.info('Funcionalidad en construcción', `Vista no implementada para ${this.currentUrl}`);
  }
  goDashboard() { this.router.navigate(['/']); }
  goBack() { history.back(); }
}
