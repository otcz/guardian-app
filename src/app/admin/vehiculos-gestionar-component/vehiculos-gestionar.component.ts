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
import { VehiculosService, VehicleEntity, VehiculoCapabilities } from '../../service/vehiculos.service';
import { NotificationService } from '../../service/notification.service';
import { SeccionService } from '../../service/seccion.service';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-vehiculos-gestionar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, ButtonModule, TagModule, ProgressSpinnerModule, UppercaseDirective, InputSwitchModule, TooltipModule],
  templateUrl: './vehiculos-gestionar.component.html',
  styleUrls: ['./vehiculos-gestionar.component.scss']
})
export class VehiculosGestionarComponent implements OnInit {
  orgId: string | null = null;
  vehiculoId: string | null = null;
  loading = false;
  saving = false;
  entity: VehicleEntity | null = null;
  forbidden = false;
  seccionNombre: string | null = null;

  // Bloqueado (UI)
  bloqueadoUI = false;
  canUpdateBloqueado = false;
  blockedSaving = false;
  capabilitiesMsg: string | null = null;
  isAdmin = false;
  // Visible para ADMIN; se deshabilita si backend no permite
  showBloqueado = false;

  // Modelo de edición
  model: { placa: string; marca: string; modelo: string; linea: string; anio: number | null; color: string } = {
    placa: '', marca: '', modelo: '', linea: '', anio: null, color: ''
  };

  constructor(
    private route: ActivatedRoute,
    private orgCtx: OrgContextService,
    private vehiculos: VehiculosService,
    private notify: NotificationService,
    private router: Router,
    private secciones: SeccionService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    this.isAdmin = this.auth.hasRole('ADMIN');
    this.showBloqueado = this.isAdmin;

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

  private cargarSeccionNombre(seccionId: string | null | undefined) {
    if (!this.orgId || !seccionId) { this.seccionNombre = null; return; }
    this.secciones.list(this.orgId).subscribe({
      next: (arr) => {
        const sec = arr.find(s => s.id === seccionId);
        this.seccionNombre = sec?.nombre ?? seccionId;
      },
      error: () => { this.seccionNombre = seccionId || null; }
    });
  }

  private loadCapabilities() {
    if (!this.orgId || !this.vehiculoId) return;
    this.vehiculos.getCapabilities(this.orgId, this.vehiculoId).subscribe({
      next: (caps: VehiculoCapabilities) => {
        this.canUpdateBloqueado = !!caps?.canUpdateBloqueado;
        this.capabilitiesMsg = caps?.message || null;
        this.showBloqueado = this.isAdmin; // visible; se deshabilita con canUpdateBloqueado
      },
      error: (e: any) => {
        console.warn('[VehiculosGestionarComponent] GET capabilities error:', e);
        this.canUpdateBloqueado = false;
        this.capabilitiesMsg = e?.error?.message || 'No autorizado';
        this.showBloqueado = this.isAdmin; // visible pero deshabilitado
      }
    });
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
        this.bloqueadoUI = !!v.bloqueado;
        this.cargarSeccionNombre((v as any).seccionAsignadaId ?? (v as any).seccionId ?? null);
        this.loading = false;
        this.forbidden = false;
        this.loadCapabilities();
      },
      error: (e: any) => {
        this.loading = false;
        if (e?.status === 404) {
          this.notify.warn('Aviso', 'El vehículo no existe');
          this.router.navigate(['/gestion-de-vehiculos/mis-vehiculos']);
        } else if (e?.status === 403) {
          this.forbidden = true;
          this.notify.warn('Sin permisos', e?.error?.message || 'No tiene permisos para ver este vehículo');
        } else {
          this.notify.error('Error', e?.error?.message || 'No se pudo cargar el vehículo');
        }
      }
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
    if (this.forbidden) { this.notify.warn('Sin permisos', 'No puede editar este vehículo'); return; }
    const err = this.validate();
    if (err) { this.notify.warn('Validación', err); return; }
    if (!this.orgId || !this.vehiculoId) return;

    this.saving = true;
    const body: any = { placa: this.model.placa.trim().toUpperCase() };
    const marca = (this.model.marca || '').trim();
    const modelo = (this.model.modelo || '').trim();
    const linea = (this.model.linea || '').trim();
    const color = (this.model.color || '').trim();
    const anio = this.model.anio != null ? Number(this.model.anio) : undefined;
    if (marca) body.marca = marca;
    if (modelo) body.modelo = modelo;
    if (linea) body.linea = linea;
    if (!isNaN(anio as any) && anio != null) body.anio = anio;
    if (color) body.color = color;

    this.vehiculos.update(this.orgId, this.vehiculoId, body).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.vehicle) {
          this.entity = res.vehicle;
          // reflejar en modelo
          this.model.placa = this.entity.placa || this.model.placa;
          this.model.marca = this.entity.marca || '';
          this.model.modelo = this.entity.modelo || '';
          this.model.linea = this.entity.linea || '';
          this.model.anio = this.entity.anio ?? null;
          this.model.color = this.entity.color || '';
          this.bloqueadoUI = !!this.entity.bloqueado;
        }
        this.notify.success('Listo', res?.message || 'Vehículo actualizado');
      },
      error: (e: any) => {
        this.saving = false;
        if (e?.status === 400) this.notify.warn('Validación', e?.error?.message || 'Solicitud inválida');
        else if (e?.status === 403) this.notify.warn('Sin permisos', e?.error?.message || 'No autorizado');
        else this.notify.error('Error', e?.error?.message || 'No se pudo actualizar el vehículo');
      }
    });
  }

  toggleBloqueado(newValue: boolean) {
    if (this.forbidden) { this.notify.warn('Sin permisos', 'No puede cambiar el bloqueo'); this.bloqueadoUI = !!this.entity?.bloqueado; return; }
    if (!this.canUpdateBloqueado && !this.isAdmin) { this.notify.warn('Sin permisos', this.capabilitiesMsg || 'No autorizado para cambiar el bloqueo'); this.bloqueadoUI = !!this.entity?.bloqueado; return; }
    if (!this.orgId || !this.vehiculoId) { this.bloqueadoUI = !!this.entity?.bloqueado; return; }

    this.blockedSaving = true;
    this.vehiculos.setBloqueado(this.orgId, this.vehiculoId, newValue).subscribe({
      next: (res) => {
        this.blockedSaving = false;
        if (res.vehicle) this.entity = res.vehicle;
        this.bloqueadoUI = (this.entity?.bloqueado ?? newValue);
        if (res?.message) this.notify.success('Listo', res.message);
      },
      error: (e: any) => {
        this.blockedSaving = false;
        this.bloqueadoUI = !!this.entity?.bloqueado; // revertir UI
        const msg = e?.error?.message || (typeof e?.error === 'string' ? e.error : 'No se pudo cambiar el bloqueo');
        this.notify.error('Error', msg);
      }
    });
  }

  toggleActivo() {
    if (this.forbidden || !this.orgId || !this.vehiculoId || !this.entity) { this.notify.warn('Sin permisos', 'No puede cambiar el estado'); return; }
    const target = !this.entity.activo;
    this.saving = true;
    this.vehiculos.setActive(this.orgId, this.vehiculoId, target).subscribe({
      next: (res) => {
        this.saving = false;
        if (res.vehicle) this.entity = res.vehicle; else this.entity = { ...(this.entity as any), activo: target };
        if (res?.message) this.notify.success('Listo', res.message);
      },
      error: (e: any) => {
        this.saving = false;
        this.notify.error('Error', e?.error?.message || (typeof e?.error === 'string' ? e.error : 'No se pudo cambiar el estado'));
      }
    });
  }

  irAsignar() {
    if (!this.vehiculoId) return;
    this.router.navigate(['/gestion-de-vehiculos/asignar-vehiculo-a-seccion'], { queryParams: { id: this.vehiculoId, from: 'gestionar' } });
  }

  volver() {
    this.router.navigate(['/gestion-de-vehiculos/mis-vehiculos']);
  }
}
