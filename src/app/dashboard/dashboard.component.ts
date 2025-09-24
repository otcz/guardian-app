import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ThemeToggleComponent } from '../shared/theme-toggle.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, ThemeToggleComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  sidebarOpen = true;
  activities = [
    { fecha: '2025-09-24 10:21', evento: 'Login', detalle: 'sysadmin' },
    { fecha: '2025-09-24 10:25', evento: 'Creó usuario', detalle: 'juan.perez' },
    { fecha: '2025-09-24 10:40', evento: 'Asignó vehículo', detalle: 'ABC-123' }
  ];
}

