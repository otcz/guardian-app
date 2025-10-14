import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UppercaseDirective } from '../../shared/formatting.directives';
import { OrgContextService } from '../../service/org-context.service';
import { SeccionEntity, SeccionService } from '../../service/seccion.service';
import { NotificationService } from '../../service/notification.service';
import { VehiculosService } from '../../service/vehiculos.service';

@Component({
  selector: 'app-vehiculos-crear',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, DropdownModule, ButtonModule, ProgressSpinnerModule, UppercaseDirective],
  templateUrl: './vehiculos-crear.component.html',
  styleUrls: ['./vehiculos-crear.component.scss']
})
export class VehiculosCrearComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  saving = false;

  secciones: SeccionEntity[] = [];
  model: { placa: string; seccionAsignadaId: string | null; marca?: string | null; modelo?: string | null; linea?: string | null; anio?: number | null; color?: string | null } = { placa: '', seccionAsignadaId: null, marca: null, modelo: null, linea: null, anio: null, color: null };

  constructor(
    private orgCtx: OrgContextService,
    private seccionService: SeccionService,
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
    this.loadSecciones();
  }

  loadSecciones() {
    if (!this.orgId) return;
    this.loading = true;
    this.seccionService.list(this.orgId).subscribe({
      next: (list) => { this.secciones = list; this.loading = false; },
      error: (e) => { this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudieron cargar secciones'); }
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

  onSubmit() {
    const err = this.validate();
    if (err) { this.notify.warn('Validación', err); return; }
    if (!this.orgId) return;

    this.saving = true;
    const placa = this.model.placa.trim().toUpperCase();
    const body: any = {
      placa,
      seccionAsignadaId: this.model.seccionAsignadaId || null
    };
    if ((this.model.marca || '').trim()) body.marca = String(this.model.marca).trim();
    if ((this.model.modelo || '').trim()) body.modelo = String(this.model.modelo).trim();
    if ((this.model.linea || '').trim()) body.linea = String(this.model.linea).trim();
    if (this.model.anio != null) body.anio = Number(this.model.anio);
    if ((this.model.color || '').trim()) body.color = String(this.model.color).trim();

    this.vehiculos.create(this.orgId, body).subscribe({
      next: (res) => {
        this.saving = false;
        this.notify.success('Éxito', res?.message || 'Vehículo creado correctamente');
        this.router.navigate(['/gestion-de-vehiculos/gestionar-vehiculo'], { queryParams: { id: res.vehicle.id } });
      },
      error: (e) => {
        this.saving = false;
        this.notify.error('Error', e?.error?.message || 'No se pudo crear el vehículo');
      }
    });
  }

  cancelar() {
    this.router.navigate(['/gestion-de-vehiculos/mis-vehiculos']);
  }
}
