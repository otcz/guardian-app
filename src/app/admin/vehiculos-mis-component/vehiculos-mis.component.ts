import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { OrgContextService } from '../../service/org-context.service';
import { VehiculosService, VehicleEntity } from '../../service/vehiculos.service';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-vehiculos-mis',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, TableModule, ButtonModule, TagModule, ProgressSpinnerModule],
  templateUrl: './vehiculos-mis.component.html',
  styleUrls: ['./vehiculos-mis.component.scss']
})
export class VehiculosMisComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  items: VehicleEntity[] = [];

  constructor(
    private orgCtx: OrgContextService,
    private vehiculos: VehiculosService,
    private notify: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }
    this.load();
  }

  load() {
    if (!this.orgId) return;
    this.loading = true;
    this.vehiculos.list(this.orgId, { soloMios: true }).subscribe({
      next: (list) => { this.items = list; this.loading = false; },
      error: (e) => { this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudieron cargar vehículos'); }
    });
  }

  gestionar(v: VehicleEntity) {
    this.router.navigate(['/gestion-de-vehiculos/gestionar-vehiculo'], { queryParams: { id: v.id } });
  }

  asignar(v: VehicleEntity) {
    this.router.navigate(['/gestion-de-vehiculos/asignar-vehiculo-a-seccion'], { queryParams: { id: v.id } });
  }
}

