import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { OrgContextService } from '../../service/org-context.service';
import { VehiculosService, VehicleEntity } from '../../service/vehiculos.service';
import { NotificationService } from '../../service/notification.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-vehiculos-activar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, TableModule, ButtonModule, TagModule, ProgressSpinnerModule, ToggleButtonModule],
  templateUrl: './vehiculos-activar.component.html',
  styleUrls: ['./vehiculos-activar.component.scss']
})
export class VehiculosActivarComponent implements OnInit {
  orgId: string | null = null;
  seccionId: string | null = null;
  loading = false;
  savingId: string | null = null;
  items: VehicleEntity[] = [];

  constructor(
    private orgCtx: OrgContextService,
    private vehiculos: VehiculosService,
    private notify: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    this.seccionId = this.orgCtx.seccion;
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
    this.vehiculos.list(this.orgId, { seccionId: this.seccionId || undefined }).subscribe({
      next: (list) => { this.items = list; this.loading = false; },
      error: (e) => { this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudieron cargar vehículos'); }
    });
  }

  toggle(row: VehicleEntity, value: boolean) {
    if (!this.orgId) return;
    const prev = row.activo;
    row.activo = value;
    this.savingId = row.id;
    this.vehiculos.setActive(this.orgId, row.id, value).subscribe({
      next: (res) => {
        this.savingId = null;
        if (res.vehicle) {
          const idx = this.items.findIndex(i => i.id === res.vehicle!.id);
          if (idx >= 0) this.items[idx] = res.vehicle!;
        }
      },
      error: (e) => {
        this.savingId = null;
        row.activo = prev; // revertir visualmente
        this.notify.error('Error', e?.error?.message || 'No se pudo cambiar el estado');
      }
    });
  }
}
