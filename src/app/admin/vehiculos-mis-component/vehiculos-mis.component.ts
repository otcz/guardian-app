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
import { FormsModule } from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TooltipModule } from 'primeng/tooltip';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';

@Component({
  selector: 'app-vehiculos-mis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, TableModule, ButtonModule, TagModule, ProgressSpinnerModule, InputSwitchModule, TooltipModule],
  templateUrl: './vehiculos-mis.component.html',
  styleUrls: ['./vehiculos-mis.component.scss']
})
export class VehiculosMisComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  items: VehicleEntity[] = [];
  savingId: string | null = null;
  seccionesMap: Record<string, string> = {};

  constructor(
    private orgCtx: OrgContextService,
    private vehiculos: VehiculosService,
    private notify: NotificationService,
    private router: Router,
    private secciones: SeccionService
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }
    this.precacheSecciones();
    this.load();
  }

  private precacheSecciones() {
    if (!this.orgId) return;
    this.secciones.list(this.orgId).subscribe({
      next: (arr: SeccionEntity[]) => {
        const map: Record<string, string> = {};
        for (const s of arr) map[s.id] = s.nombre;
        this.seccionesMap = map;
      },
      error: (e) => this.notify.warn('Secciones', e?.error?.message || 'No se pudieron cargar las secciones')
    });
  }

  load() {
    if (!this.orgId) return;
    this.loading = true;
    this.vehiculos.listWithMessage(this.orgId, { soloMios: true }).subscribe({
      next: (res) => {
        console.log('[VehiculosMisComponent] GET /vehiculos?soloMios=true respuesta:', res);
        this.items = res.items;
        this.loading = false;
        if (res?.message) this.notify.info('Info', res.message);
      },
      error: (e) => { console.error('[VehiculosMisComponent] GET /vehiculos error:', e?.status, e?.error || e); this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudieron cargar vehículos'); }
    });
  }

  seccionNombre(id?: string | null) {
    if (!id) return '—';
    return this.seccionesMap[id] || '—';
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
        if (res?.message) this.notify.success('Listo', res.message);
      },
      error: (e) => {
        this.savingId = null;
        row.activo = prev; // revertir visualmente si falla
        this.notify.error('Error', e?.error?.message || 'No se pudo cambiar el estado');
      }
    });
  }

  gestionar(v: VehicleEntity) {
    this.router.navigate(['/gestion-de-vehiculos/gestionar-vehiculo'], { queryParams: { id: v.id } });
  }

  asignar(v: VehicleEntity) {
    this.router.navigate(['/gestion-de-vehiculos/asignar-vehiculo-a-seccion'], { queryParams: { id: v.id } });
  }
}
