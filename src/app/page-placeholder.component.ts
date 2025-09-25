import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MenuService } from './service/menu.service';

@Component({
  selector: 'app-page-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container" style="padding:24px;">
      <div class="card" style="padding:20px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <i class="mdi" [ngClass]="opt?.icon" style="font-size:24px;"></i>
          <h2 style="margin:0;">{{ opt?.descripcion || 'Módulo' }}</h2>
        </div>
        <p style="color:var(--muted); margin-top:8px;">Ruta: <code>{{ current }}</code></p>
        <p style="margin-top:8px;">Contenido en construcción.</p>
      </div>
    </div>
  `
})
export class PagePlaceholderComponent {
  current!: string;
  opt: ReturnType<MenuService['findByPath']>;
  constructor(private router: Router, private menu: MenuService) {
    this.current = this.router.url;
    this.opt = this.menu.findByPath(this.current);
  }
}
