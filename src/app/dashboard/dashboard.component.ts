import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ThemeToggleComponent } from '../shared/theme-toggle.component';
import { RouterModule } from '@angular/router';
import { MenuService, MenuOption } from '../service/menu.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, TableModule, ThemeToggleComponent],
  templateUrl: './dashboard.component.html',
  styles: [`
    /* Solo en modo claro, aplicar look claro a la tabla 'Actividad reciente' */
    :host-context(.theme-light) .recent-activity .p-datatable-wrapper table { background: var(--surface); color: var(--text); }
    :host-context(.theme-light) .recent-activity .p-datatable-thead > tr > th { background: color-mix(in srgb, var(--surface) 96%, var(--primary) 4%); color: var(--text); border-bottom: 1px solid var(--border); font-weight: 700; }
    :host-context(.theme-light) .recent-activity .p-datatable-tbody > tr > td { background: var(--surface); color: var(--text); border-top: 1px solid var(--border); }
    :host-context(.theme-light) .recent-activity { border-radius: 12px; overflow: hidden; }
  `]
})
export class DashboardComponent {
  sidebarOpen = true;
  options$: Observable<MenuOption[]> = this.menu.list$;
  activities = [
    { fecha: '2025-09-24 10:21', evento: 'Login', detalle: 'sysadmin' },
    { fecha: '2025-09-24 10:25', evento: 'Creó usuario', detalle: 'juan.perez' },
    { fecha: '2025-09-24 10:40', evento: 'Asignó vehículo', detalle: 'ABC-123' }
  ];
  constructor(private menu: MenuService) {}
}
