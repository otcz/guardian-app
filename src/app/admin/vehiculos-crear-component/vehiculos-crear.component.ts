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
import { VehiculosService, VehicleEntity } from '../../service/vehiculos.service';
import { MultiSelectModule } from 'primeng/multiselect';
import { UsersService, UserEntity } from '../../service/users.service';
import { AuthService } from '../../service/auth.service';
import { TabViewModule } from 'primeng/tabview';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-vehiculos-crear',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, DropdownModule, ButtonModule, ProgressSpinnerModule, UppercaseDirective, MultiSelectModule, TabViewModule, MessageModule],
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

  // Usuario actual
  currentUsername: string | null = null;
  currentUserId: string | null = null;

  // Nuevo: búsqueda por placa y asociación a existente
  buscando = false;
  existente: { status: 'idle' | 'found' | 'notfound' | 'error'; vehiculo?: VehicleEntity | null; message?: string | null } = { status: 'idle', vehiculo: null };
  usuariosParaExistente: string[] = [];
  asignando = false;

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
    this.currentUsername = this.readUsername();
    // Determinar si el usuario posee rol de admin (tolerante a variantes de nombre)
    this.isAdmin = this.auth.hasAnyRole('SYSADMIN', 'ORGADMIN', 'ORG_ADMIN', 'ADMIN_ORG', 'ADMIN');
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }
    this.loadSecciones();
    // Cargar usuarios si es admin (para seleccionar usuarios y detectar currentUserId)
    if (this.isAdmin) this.loadUsuarios();
  }

  private readUsername(): string | null {
    try { const u = localStorage.getItem('username'); return u ? String(u) : null; } catch { return null; }
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
      next: (arr) => {
        this.usuarios = arr;
        // Intentar resolver currentUserId por username
        if (!this.currentUserId && this.currentUsername) {
          const me = arr.find(u => (u.username || '').toLowerCase() === this.currentUsername!.toLowerCase());
          if (me) this.currentUserId = me.id;
        }
      },
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
    // usuarioIds (solo admins pueden enviar 1..N usuarios)
    if (this.isAdmin && this.model.usuarioIds && this.model.usuarioIds.length) body.usuarioIds = this.model.usuarioIds;

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

  // ==== NUEVO: Buscar por placa y asociar a un vehículo existente ====
  buscarPorPlaca() {
    const placa = (this.model.placa || '').trim().toUpperCase();
    if (!placa) { this.notify.warn('Búsqueda', 'Ingrese una placa para buscar'); return; }
    if (!this.orgId) return;

    this.buscando = true;
    this.existente = { status: 'idle', vehiculo: null };

    // Nota: el backend no expone búsqueda por placa directa; listamos y filtramos en el front
    this.vehiculos.list(this.orgId, { subtree: true }).subscribe({
      next: (items) => {
        const found = (items || []).find(v => (v.placa || '').toUpperCase() === placa);
        if (found) {
          this.existente = { status: 'found', vehiculo: found };
          // Resetear selección de usuarios para este flujo
          this.usuariosParaExistente = [];
        } else {
          this.existente = { status: 'notfound', vehiculo: null, message: 'No se encontró un vehículo con esa placa en la organización' };
        }
        this.buscando = false;
      },
      error: (e) => {
        this.buscando = false;
        const msg = e?.error?.message || e?.message || 'Error buscando vehículo';
        this.existente = { status: 'error', vehiculo: null, message: msg };
        this.notify.error('Error', msg);
      }
    });
  }

  asociarAExistente() {
    if (!this.orgId) return;
    if (!this.isAdmin) { this.notify.warn('Sin permisos', 'Solo un administrador puede asociar usuarios a un vehículo existente'); return; }
    const v = this.existenteVehiculo();
    if (!v) { this.notify.warn('Asociar', 'Primero busque y seleccione un vehículo existente'); return; }
    const usuarios = this.usuariosParaExistente || [];
    if (!usuarios.length) { this.notify.warn('Validación', 'Seleccione al menos un usuario para asociar'); return; }

    this.asignando = true;
    this.vehiculos.assignUsers(this.orgId, v.id, usuarios).subscribe({
      next: (res) => {
        this.asignando = false;
        this.notify.success('Listo', res.message || 'Usuarios asociados al vehículo');
        // Navegar a gestionar el vehículo
        this.router.navigate(['/gestion-de-vehiculos/gestionar-vehiculo'], { queryParams: { id: v.id } });
      },
      error: (e) => {
        this.asignando = false;
        if (e?.status === 403) {
          this.notify.warn('Sin permisos', e?.error?.message || 'No tiene permisos para asociar usuarios a este vehículo');
        } else if (e?.status === 400) {
          this.notify.warn('Validación', e?.error?.message || 'Solicitud inválida');
        } else {
          this.notify.error('Error', e?.error?.message || 'No se pudo asociar el/los usuario(s)');
        }
      }
    });
  }

  // Helpers: Agregarme a mí
  addMeToCreateUsers() {
    if (!this.isAdmin) { this.notify.warn('Sin permisos', 'Solo administradores pueden asignar usuarios en creación'); return; }
    if (!this.currentUserId) { this.notify.warn('Usuario', 'No se pudo identificar el usuario actual'); return; }
    this.model.usuarioIds = this.model.usuarioIds || [];
    if (!this.model.usuarioIds.includes(this.currentUserId)) {
      this.model.usuarioIds.push(this.currentUserId);
      this.notify.success('Listo', 'Te agregaste como usuario del vehículo a crear');
    }
  }

  addMeToExistingUsers() {
    if (!this.isAdmin) { this.notify.warn('Sin permisos', 'Solo administradores pueden asociar usuarios a un vehículo existente'); return; }
    if (!this.currentUserId) { this.notify.warn('Usuario', 'No se pudo identificar el usuario actual'); return; }
    if (!this.existenteVehiculo()) { this.notify.warn('Asociar', 'Primero busca un vehículo existente'); return; }
    if (!this.usuariosParaExistente.includes(this.currentUserId)) {
      this.usuariosParaExistente.push(this.currentUserId);
      this.notify.success('Listo', 'Te agregaste para asociarte a este vehículo');
    }
  }

  // Acción rápida: Asignarme directo al vehículo encontrado
  asignarmeAExistente() {
    if (!this.isAdmin) { this.notify.warn('Sin permisos', 'Solo administradores pueden asociar usuarios a un vehículo existente'); return; }
    if (!this.currentUserId) { this.notify.warn('Usuario', 'No se pudo identificar el usuario actual'); return; }
    const v = this.existenteVehiculo();
    if (!v) { this.notify.warn('Asociar', 'Primero busca un vehículo existente'); return; }
    if (!this.usuariosParaExistente.includes(this.currentUserId)) {
      this.usuariosParaExistente.push(this.currentUserId);
    }
    this.asociarAExistente();
  }

  // Mostrar nombre de sección (sin UUID)
  seccionNombreVehiculo(v: VehicleEntity): string {
    const nombreDirecto = (v as any)?.seccionNombre as string | undefined;
    if (nombreDirecto) return nombreDirecto;
    const id = (v as any)?.seccionAsignadaId || (v as any)?.seccionId || null;
    if (!id) return '-';
    const sec = this.secciones.find(s => s.id === id);
    return sec?.nombre || '-';
  }

  private existenteVehiculo(): VehicleEntity | null {
    return (this.existente.status === 'found' && this.existente.vehiculo) ? this.existente.vehiculo : null;
  }
}
