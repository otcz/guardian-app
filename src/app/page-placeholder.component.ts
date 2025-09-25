import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-page-placeholder',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="placeholder">
      <h2>Página en construcción</h2>
      <p>Esta sección aún no está disponible o requiere permisos adicionales.</p>
      <a routerLink="/dashboard">Volver al dashboard</a>
    </div>
  `,
  styles: [`
    .placeholder { display: grid; gap: 0.75rem; place-content: center; min-height: 60vh; text-align: center; }
    h2 { margin: 0; }
    a { color: var(--primary-color, #3b82f6); text-decoration: none; }
  `]
})
export class PagePlaceholderComponent {}

