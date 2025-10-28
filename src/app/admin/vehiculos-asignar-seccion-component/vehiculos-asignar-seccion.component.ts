import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { CheckboxModule } from 'primeng/checkbox';
import { OrgContextService } from '../../service/org-context.service';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { VehiculosService, VehicleEntity } from '../../service/vehiculos.service';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-vehiculos-asignar-seccion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, DropdownModule, ButtonModule, ProgressSpinnerModule, TagModule, TableModule, InputTextModule, InputSwitchModule, CheckboxModule],
  templateUrl: './vehiculos-asignar-seccion.component.html',
  styleUrls: ['./vehiculos-asignar-seccion.component.scss']
})
export class VehiculosAsignarSeccionComponent implements OnInit {
  orgId: string | null = null;
  vehiculoId: string | null = null;
  loading = false;
  saving = false;
  forbidden = false;

  // Modo selección
  selectionMode = false;
  vehicles: VehicleEntity[] = [];

  secciones: SeccionEntity[] = [];
  entity: VehicleEntity | null = null;
  selectedSeccionId: string | null = null;
  // Filtros de listado
  selectedSeccionFiltroId: string | null = null;
  includeSubtree = false;
  soloMios = true; // siempre listar solo mis vehículos
  pageReportTemplate = 'Mostrando {first} a {last} de {totalRecords} vehículos';

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
    // Cargar secciones para usar en ambos modos
    this.loadSecciones();

    if (!this.vehiculoId) {
      // Sin id → modo selección
      this.selectionMode = true;
      // Fijar por defecto la sección actual del usuario
      this.selectedSeccionFiltroId = this.orgCtx.seccion || null;
      this.loadVehicles();
      return;
    }
    // Con id → flujo existente
    this.loadEntity();
  }

  private loadSecciones() {
    if (!this.orgId) return;
    // El front no transforma: se usa tal cual para dropdown (optionLabel/optionValue)
    this.seccionesService.list(this.orgId).subscribe({
      next: (secs) => { this.secciones = secs; },
      error: (e) => { this.notify.warn('Secciones', e?.error?.message || 'No se pudieron cargar secciones'); }
    });
  }

  private loadVehicles() {
    if (!this.orgId) return;
    if (!this.selectedSeccionFiltroId) { this.vehicles = []; return; }
    this.loading = true;
    this.vehiculos.list(this.orgId, { seccionId: this.selectedSeccionFiltroId, subtree: this.includeSubtree, soloMios: this.soloMios }).subscribe({
      next: (arr) => { this.vehicles = arr; this.loading = false; },
      error: (e) => {
        this.loading = false;
        if (e?.status === 403) { this.vehicles = []; this.notify.warn('No autorizado', e?.error?.message || 'No autorizado para ver vehículos de esta sección'); }
        else this.notify.error('Error', e?.error?.message || 'No se pudieron cargar vehículos');
      }
    });
  }

  private loadEntity() {
    if (!this.orgId || !this.vehiculoId) return;
    this.loading = true;
    this.vehiculos.get(this.orgId, this.vehiculoId).subscribe({
      next: (v) => { this.entity = v; this.selectedSeccionId = v.seccionAsignadaId || v.seccionId || null; this.loading = false; this.forbidden = false; },
      error: (e) => {
        this.loading = false;
        if (e?.status === 404) {
          this.notify.warn('Aviso', 'El vehículo no existe');
          // En modo id inválido, regresar al selector con la sección actual
          this.selectionMode = true; this.vehiculoId = null; this.selectedSeccionFiltroId = this.orgCtx.seccion || null; this.loadVehicles();
        } else if (e?.status === 403) {
          this.forbidden = true;
          this.notify.warn('Sin permisos', e?.error?.message || 'No tiene permisos para ver este vehículo');
        } else {
          this.notify.error('Error', e?.error?.message || 'No se pudo cargar el vehículo');
        }
      }
    });
  }

  seleccionar(v: VehicleEntity) {
    this.entity = v;
    this.vehiculoId = v.id;
    this.selectedSeccionId = v.seccionAsignadaId || v.seccionId || null;
    this.selectionMode = false;
  }

  asignar() {
    if (this.forbidden) { this.notify.warn('Sin permisos', 'No puede reasignar sección'); return; }
    if (!this.orgId || !this.vehiculoId) { this.notify.warn('Aviso', 'Seleccione un vehículo primero'); return; }
    this.saving = true;
    this.vehiculos.assignSection(this.orgId, this.vehiculoId, this.selectedSeccionId || null).subscribe({
      next: (res) => { this.saving = false; this.entity = res.vehicle; this.notify.success('Éxito', res.message || 'Sección asignada'); this.volver(); },
      error: (e) => {
        this.saving = false;
        if (e?.status === 404) {
          this.notify.warn('Aviso', e?.error?.message || 'No encontrado');
        } else if (e?.status === 403) {
          this.notify.warn('Sin permisos', e?.error?.message || 'No tiene permisos para mover a esa sección');
        } else if (e?.status === 400) {
          this.notify.warn('Validación', e?.error?.message || 'Solicitud inválida');
        } else {
          this.notify.error('Error', e?.error?.message || 'No se pudo asignar la sección');
        }
      }
    });
  }

  limpiar() { this.selectedSeccionId = null; }

  volver() {
    // Si venimos desde selección, volver al selector; si no, volver a gestionar el vehículo
    if (this.route.snapshot.queryParamMap.get('from') === 'gestionar' || (!this.selectionMode && this.route.snapshot.queryParamMap.has('id'))) {
      this.router.navigate(['/gestion-de-vehiculos/gestionar-vehiculo'], { queryParams: { id: this.vehiculoId } });
    } else {
      this.selectionMode = true; this.entity = null; this.vehiculoId = null; this.loadVehicles();
    }
  }
}
