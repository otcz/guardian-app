import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { OrgContextService } from '../../service/org-context.service';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { VehiculosService, VehicleEntity } from '../../service/vehiculos.service';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-vehiculos-asignar-seccion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, DropdownModule, ButtonModule, ProgressSpinnerModule, TagModule],
  templateUrl: './vehiculos-asignar-seccion.component.html',
  styleUrls: ['./vehiculos-asignar-seccion.component.scss']
})
export class VehiculosAsignarSeccionComponent implements OnInit {
  orgId: string | null = null;
  vehiculoId: string | null = null;
  loading = false;
  saving = false;

  secciones: SeccionEntity[] = [];
  entity: VehicleEntity | null = null;
  selectedSeccionId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgCtx: OrgContextService,
    private seccionesService: SeccionService,
    private vehiculos: VehiculosService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }
    this.vehiculoId = String(this.route.snapshot.queryParamMap.get('id') || '');
    if (!this.vehiculoId) {
      this.notify.warn('Atención', 'Falta el parámetro id del vehículo');
      this.router.navigate(['/gestion-de-vehiculos/mis-vehiculos']);
      return;
    }
    this.load();
  }

  load() {
    if (!this.orgId || !this.vehiculoId) return;
    this.loading = true;
    this.seccionesService.list(this.orgId).subscribe({
      next: (secs) => { this.secciones = secs; },
      error: (e) => { this.notify.error('Error', e?.error?.message || 'No se pudieron cargar secciones'); }
    });
    this.vehiculos.get(this.orgId, this.vehiculoId).subscribe({
      next: (v) => { this.entity = v; this.selectedSeccionId = v.seccionAsignadaId || null; this.loading = false; },
      error: (e) => { this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudo cargar el vehículo'); }
    });
  }

  asignar() {
    if (!this.orgId || !this.vehiculoId) return;
    this.saving = true;
    this.vehiculos.assignSection(this.orgId, this.vehiculoId, this.selectedSeccionId || null).subscribe({
      next: (res) => { this.saving = false; this.entity = res.vehicle; this.notify.success('Éxito', res.message || 'Sección asignada'); this.volver(); },
      error: (e) => { this.saving = false; this.notify.error('Error', e?.error?.message || 'No se pudo asignar la sección'); }
    });
  }

  limpiar() {
    this.selectedSeccionId = null;
  }

  volver() { this.router.navigate(['/gestion-de-vehiculos/gestionar-vehiculo'], { queryParams: { id: this.vehiculoId } }); }
}

