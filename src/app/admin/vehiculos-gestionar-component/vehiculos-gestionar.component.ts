import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UppercaseDirective } from '../../shared/formatting.directives';
import { OrgContextService } from '../../service/org-context.service';
import { VehiculosService, VehicleEntity } from '../../service/vehiculos.service';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-vehiculos-gestionar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, ButtonModule, TagModule, ProgressSpinnerModule, UppercaseDirective],
  templateUrl: './vehiculos-gestionar.component.html',
  styleUrls: ['./vehiculos-gestionar.component.scss']
})
export class VehiculosGestionarComponent implements OnInit {
  orgId: string | null = null;
  vehiculoId: string | null = null;
  loading = false;
  saving = false;
  entity: VehicleEntity | null = null;

  model = { placa: '', marca: '', modelo: '', linea: '', anio: null as number | null, color: '' };

  constructor(
    private route: ActivatedRoute,
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
    this.vehiculos.get(this.orgId, this.vehiculoId).subscribe({
      next: (v) => {
        this.entity = v;
        this.model.placa = v.placa || '';
        this.model.marca = v.marca || '';
        this.model.modelo = v.modelo || '';
        this.model.linea = v.linea || '';
        this.model.anio = v.anio ?? null;
        this.model.color = v.color || '';
        this.loading = false;
      },
      error: (e) => { this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudo cargar el vehículo'); }
    });
  }

  validate(): string | null {
    const placa = (this.model.placa || '').trim();
    if (!placa) return 'La placa es requerida';
    if (placa.length < 5) return 'La placa debe tener al menos 5 caracteres';
    if (this.model.anio != null) {
      const year = Number(this.model.anio);
      const now = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > now + 1) return `El año debe estar entre 1900 y ${now + 1}`;
    }
    return null;
  }

  guardar() {
    const err = this.validate();
    if (err) { this.notify.warn('Validación', err); return; }
    if (!this.orgId || !this.vehiculoId) return;
    this.saving = true;
    const body: any = { placa: this.model.placa.trim().toUpperCase() };
    if ((this.model.marca || '').trim()) body.marca = this.model.marca!.trim(); else body.marca = null;
    if ((this.model.modelo || '').trim()) body.modelo = this.model.modelo!.trim(); else body.modelo = null;
    if ((this.model.linea || '').trim()) body.linea = this.model.linea!.trim(); else body.linea = null;
    if (this.model.anio != null) body.anio = Number(this.model.anio); else body.anio = null;
    if ((this.model.color || '').trim()) body.color = this.model.color!.trim(); else body.color = null;

    this.vehiculos.update(this.orgId, this.vehiculoId, body).subscribe({
      next: (res) => { this.saving = false; this.entity = res.vehicle; this.notify.success('Éxito', res.message || 'Vehículo actualizado'); },
      error: (e) => { this.saving = false; this.notify.error('Error', e?.error?.message || 'No se pudo actualizar el vehículo'); }
    });
  }

  toggleActivo() {
    if (!this.orgId || !this.vehiculoId || !this.entity) return;
    const target = !this.entity.activo;
    this.saving = true;
    this.vehiculos.setActive(this.orgId, this.vehiculoId, target).subscribe({
      next: (res) => { this.saving = false; if (res.vehicle) this.entity = res.vehicle; else this.entity = { ...(this.entity as any), activo: target }; },
      error: (e) => { this.saving = false; this.notify.error('Error', e?.error?.message || 'No se pudo cambiar el estado'); }
    });
  }

  irAsignar() {
    if (!this.entity) return;
    this.router.navigate(['/gestion-de-vehiculos/asignar-vehiculo-a-seccion'], { queryParams: { id: this.entity.id } });
  }

  volver() { this.router.navigate(['/gestion-de-vehiculos/mis-vehiculos']); }
}
