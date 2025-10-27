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
import { MultiSelectModule } from 'primeng/multiselect';
import { UsersService, UserEntity } from '../../service/users.service';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-vehiculos-crear',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, DropdownModule, ButtonModule, ProgressSpinnerModule, UppercaseDirective, MultiSelectModule],
  templateUrl: './vehiculos-crear.component.html',
  styleUrls: ['./vehiculos-crear.component.scss']
})
export class VehiculosCrearComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  saving = false;

  secciones: SeccionEntity[] = [];
  usuarios: UserEntity[] = [];
  isAdmin = false;
  model: { placa: string; seccionAsignadaId: string | null; marca?: string | null; modelo?: string | null; linea?: string | null; anio?: number | null; color?: string | null; usuarioIds?: string[] } = { placa: '', seccionAsignadaId: null, marca: null, modelo: null, linea: null, anio: null, color: null, usuarioIds: [] };

  constructor(
    private orgCtx: OrgContextService,
    private seccionService: SeccionService,
    private vehiculos: VehiculosService,
    private notify: NotificationService,
    private router: Router,
    private users: UsersService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    // Determinar si el usuario posee rol de admin (tolerante a variantes de nombre)
    this.isAdmin = this.auth.hasAnyRole('SYSADMIN', 'ORGADMIN', 'ORG_ADMIN', 'ADMIN_ORG');
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }
    this.loadSecciones();
    if (this.isAdmin) this.loadUsuarios();
  }

  loadSecciones() {
    if (!this.orgId) return;
    this.loading = true;
    this.seccionService.list(this.orgId).subscribe({
      next: (list) => { this.secciones = list; this.loading = false; },
      error: (e) => { this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudieron cargar secciones'); }
    });
  }

  private loadUsuarios() {
    if (!this.orgId) return;
    this.users.list(this.orgId).subscribe({
      next: (arr) => { this.usuarios = arr; },
      error: (e) => { this.notify.warn('Usuarios', e?.error?.message || 'No se pudieron cargar usuarios'); }
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
    if (this.isAdmin) {
      const ids = this.model.usuarioIds || [];
      if (!ids.length) return 'Debe seleccionar al menos un usuario';
    }
    return null;
  }

  onSubmit() {
    const err = this.validate();
    if (err) { this.notify.warn('Validación', err); return; }
    if (!this.orgId) return;

    this.saving = true;
    const placa = this.model.placa.trim().toUpperCase();
    const body: any = { placa };

    // Incluir opcionales solo si tienen valor
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
    // Nuevo: usuarioIds (solo admins pueden enviar 1..N usuarios)
    if (this.isAdmin && this.model.usuarioIds && this.model.usuarioIds.length) body.usuarioIds = this.model.usuarioIds;
    // Nota: ya no enviar seccionAsignadaId en create; el backend la determina automáticamente

    console.log('[VehiculosCrearComponent] POST body:', body);

    this.vehiculos.create(this.orgId, body).subscribe({
      next: (res) => {
        console.log('[VehiculosCrearComponent] POST /vehiculos respuesta:', res);
        this.saving = false;
        this.notify.success('Éxito', res?.message || 'Vehículo creado correctamente');
        this.router.navigate(['/gestion-de-vehiculos/gestionar-vehiculo'], { queryParams: { id: res.vehicle.id } });
      },
      error: (e) => {
        console.error('[VehiculosCrearComponent] POST /vehiculos error:', e?.status, e?.error || e);
        this.saving = false;
        if (e?.status === 409) {
          this.notify.warn('Validación', 'Placa duplicada');
        } else {
          this.notify.error('Error', e?.error?.message || e?.message || 'No se pudo crear el vehículo');
        }
      }
    });
  }

  cancelar() {
    this.router.navigate(['/gestion-de-vehiculos/mis-vehiculos']);
  }
}
