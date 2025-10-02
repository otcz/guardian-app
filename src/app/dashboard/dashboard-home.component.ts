import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './dashboard-home.component.html'
})
export class DashboardHomeComponent {
  activities = [
    { fecha: '2025-09-24 10:21', evento: 'Login', detalle: 'sysadmin' },
    { fecha: '2025-09-24 10:25', evento: 'Creó usuario', detalle: 'juan.perez' },
    { fecha: '2025-09-24 10:40', evento: 'Asignó vehículo', detalle: 'ABC-123' }
  ];
}
