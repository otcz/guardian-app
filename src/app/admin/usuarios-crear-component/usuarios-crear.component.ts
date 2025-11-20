import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UppercaseDirective } from '../../shared/formatting.directives';
import { OrgContextService } from '../../service/org-context.service';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { UsersService, CreateUserRequest, ScopeNivel, UsuariosMeta } from '../../service/users.service';
import { NotificationService } from '../../service/notification.service';
import { SkeletonModule } from 'primeng/skeleton';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { SectionInviteDialogComponent } from '../../shared/section-invite-dialog.component';
import { OrganizationService, Organization } from '../../service/organization.service';
import { RolesService, RoleEntity } from '../../service/roles.service';
import { LugarService } from '../../service/lugar.service';
import { LugarEntity } from '../../models/lugar.models';

@Component({
  selector: 'app-usuarios-crear',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, DropdownModule, MultiSelectModule, ButtonModule, ProgressSpinnerModule, UppercaseDirective, SkeletonModule, ChipModule, TagModule, TooltipModule, AvatarModule, SectionInviteDialogComponent],
  templateUrl: './usuarios-crear.component.html',
  styleUrls: ['./usuarios-crear.component.scss']
})
export class UsuariosCrearComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  saving = false;
  secciones: SeccionEntity[] = [];
  showInvite = false;
  organizaciones: Organization[] = [];

  // NUEVO: roles filtrados por contexto
  rolesDisponibles: RoleEntity[] = [];

  // NUEVO: lugares disponibles según la sección seleccionada
  lugaresDisponibles: LugarEntity[] = [];

  // Metadata de scope desde backend
  usuariosMeta: UsuariosMeta | null = null;

  // Opciones del select de scope, derivadas de allowedScopeNiveles
  scopeOptions: { label: string; value: ScopeNivel }[] = [];

  // Mapa simple i18n de labels
  private scopeLabels: Record<string, string> = {
    ORGANIZACION: 'Organización',
    SECCION: 'Sección'
  };

  model: CreateUserRequest = {
    username: '',
    nombreCompleto: '',
    email: '',
    telefono: '',
    // no default para scopeNivel
    scopeNivel: undefined as any,
    seccionId: null,
    // organización que administrará cuando el alcance sea ORGANIZACION
    orgAdministradaId: null as any,
    // nuevo: roles seleccionados (single o multiple segun backend)
    rolesIds: [] as any,
    // nuevo: lugares asignados (múltiples)
    lugaresIds: []
  } as any;

  constructor(
    private orgCtx: OrgContextService,
    private seccionService: SeccionService,
    private users: UsersService,
    private notify: NotificationService,
    private router: Router,
    private orgService: OrganizationService,
    private rolesService: RolesService,
    private lugarService: LugarService
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }

    const contextoSeccionId = this.orgCtx.seccion || null;

    // Cargar metadata de usuarios (scope) y derivar opciones/default
    this.users.getUsuarioMeta(this.orgId).subscribe({
      next: (meta) => {
        this.usuariosMeta = meta;
        this.scopeOptions = (meta.allowedScopeNiveles || []).map((v) => ({ label: String(v), value: v }));

        // PRESELECCIÓN DE ALCANCE SEGÚN CONTEXTO (solo si el modelo aún no tiene valor)
        if (!this.model.scopeNivel && Array.isArray(meta.allowedScopeNiveles) && meta.allowedScopeNiveles.length) {
          const allowed = meta.allowedScopeNiveles.map((x: any) => String(x).toUpperCase());
          let defaultScope: ScopeNivel | undefined;

          if (contextoSeccionId && allowed.includes('SECCION')) {
            defaultScope = meta.allowedScopeNiveles.find((x: any) => String(x).toUpperCase() === 'SECCION');
            // Si hay contexto de sección, preseleccionarla
            if (defaultScope && !this.model.seccionId) {
              this.model.seccionId = contextoSeccionId;
            }
          } else if (!contextoSeccionId && allowed.includes('ORGANIZACION')) {
            defaultScope = meta.allowedScopeNiveles.find((x: any) => String(x).toUpperCase() === 'ORGANIZACION');
          }

          if (defaultScope !== undefined) {
            this.model.scopeNivel = defaultScope;
          }
        }

        this.onScopeChange();
        this.cargarRolesPorContexto();

        // Cargar lugares si hay sección preseleccionada
        if (this.model.seccionId) {
          this.onSeccionChange();
        }
      },
      error: () => {
        this.onScopeChange();
        this.cargarRolesPorContexto();
      }
    });

    this.loadSecciones();
    this.loadOrganizaciones();
  }

  loadOrganizaciones() {
    this.orgService.listAccessible().subscribe({
      next: (list) => { this.organizaciones = list || []; },
      error: (e) => { this.notify.error('Error', e?.error?.message || 'No se pudieron cargar organizaciones'); }
    });
  }

  private capitalize(v: string): string { return v ? (v[0].toUpperCase() + v.slice(1).toLowerCase()) : v; }

  get scopeLabel(): string {
    // Mostrar exactamente el valor que viene del backend, sin prefijo ni i18n
    return String(this.model.scopeNivel || '');
  }

  // Valor informativo para p-tag: nombre de sección (si hay), o id de sección, o scope del contexto
  get infoTag(): string {
    const secId = this.orgCtx.seccion || null;
    if (secId) {
      const found = this.secciones.find(s => String(s.id) === String(secId));
      if (found?.nombre) return String(found.nombre);
      return String(secId);
    }
    const scope = this.orgCtx.scope;
    return scope ? String(scope) : '';
  }

  get initial(): string {
    const src = (this.model.nombreCompleto || this.model.username || '').trim();
    if (!src) return 'U';
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src[0].toUpperCase();
  }

  // ¿Este scope requiere sección principal?
  get isSeccionRequerida(): boolean {
    const cur = String(this.model.scopeNivel || '').toUpperCase();
    const requires = this.usuariosMeta?.requiresSeccionPrincipalWhen ?? [];
    // backend ahora exige seccionId cuando aplique; reaprovechamos metadata existente
    return requires.map((x) => String(x).toUpperCase()).includes(cur);
  }

  get isAlcanceOrganizacion(): boolean {
    return String(this.model.scopeNivel || '').toUpperCase() === 'ORGANIZACION';
  }

  // NUEVO: alcance seccion explícito
  get isAlcanceSeccion(): boolean {
    return String(this.model.scopeNivel || '').toUpperCase() === 'SECCION';
  }

  // Mostrar campo de lugar cuando hay sección seleccionada
  get mostrarCampoLugar(): boolean {
    return !!this.model.seccionId;
  }

  onScopeChange() {
    if (!this.isSeccionRequerida) {
      this.model.seccionId = null;
    }
    if (!this.isAlcanceOrganizacion) {
      (this.model as any).orgAdministradaId = null;
    }
    // limpiar selección de roles al cambiar alcance
    (this.model as any).rolesIds = Array.isArray((this.model as any).rolesIds) ? [] : null;
    // limpiar lugares al cambiar alcance
    this.model.lugaresIds = [];
    this.lugaresDisponibles = [];
    this.cargarRolesPorContexto();
  }

  // Método para cargar lugares cuando cambia la sección
  onSeccionChange() {
    this.model.lugaresIds = [];
    this.lugaresDisponibles = [];
    if (this.model.seccionId && this.orgId) {
      this.lugarService.listBySeccion(this.orgId, this.model.seccionId).subscribe({
        next: (lugares) => {
          this.lugaresDisponibles = lugares || [];
        },
        error: (e) => {
          this.notify.error('Error', e?.error?.message || 'No se pudieron cargar los lugares');
          this.lugaresDisponibles = [];
        }
      });
    }
  }

  // nuevo: cuando cambia la organización administrada, recargar roles
  onOrganizacionAdministradaChange(): void {
    // cada cambio de organización implica limpiar el rol elegido
    (this.model as any).rolesIds = Array.isArray((this.model as any).rolesIds) ? [] : null;
    this.cargarRolesPorContexto();
  }

  // Cargar roles válidos según el contexto actual
  private cargarRolesPorContexto(): void {
    this.rolesDisponibles = [];
    if (!this.orgId) return;

    // Si el alcance es SECCION y hay una sección en contexto, usamos la org actual
    const seccionContexto = this.orgCtx.seccion || null;
    if (this.isAlcanceSeccion && seccionContexto) {
      this.rolesService.list(this.orgId).subscribe({
        next: (roles) => {
          this.rolesDisponibles = (roles || []).filter(r => r.estado === 'ACTIVO');
        },
        error: () => {
          this.rolesDisponibles = [];
        }
      });
      return;
    }

    // Si el alcance es ORGANIZACION y hay una organización administrada seleccionada,
    // usamos esa organización para listar roles.
    if (this.isAlcanceOrganizacion && (this.model as any).orgAdministradaId) {
      const orgAdminId = String((this.model as any).orgAdministradaId);
      this.rolesService.list(orgAdminId).subscribe({
        next: (roles) => {
          this.rolesDisponibles = (roles || []).filter(r => r.estado === 'ACTIVO');
        },
        error: () => {
          this.rolesDisponibles = [];
        }
      });
      return;
    }

    // Caso general: roles de la organización del contexto actual
    this.rolesService.list(this.orgId).subscribe({
      next: (roles) => {
        this.rolesDisponibles = (roles || []).filter(r => r.estado === 'ACTIVO');
      },
      error: () => {
        this.rolesDisponibles = [];
      }
    });
  }

  loadSecciones() {
    if (!this.orgId) return;
    this.loading = true;
    this.seccionService.list(this.orgId).subscribe({
      next: (list) => { this.secciones = list; this.loading = false; },
      error: (e) => { this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudieron cargar secciones'); }
    });
  }

  reset() {
    this.model = {
      username: '',
      nombreCompleto: '',
      email: '',
      telefono: '',
      scopeNivel: undefined as any,
      seccionId: null,
      orgAdministradaId: null,
      rolesIds: [] as any,
      lugaresIds: []
    } as any;
    this.lugaresDisponibles = [];
  }

  validate(): string | null {
    if (!this.model.username || this.model.username.trim().length < 3) return 'Username es requerido (mín. 3)';
    if (this.isSeccionRequerida && !this.model.seccionId) return 'Debe seleccionar la sección';
    if (this.isAlcanceOrganizacion && !(this.model as any).orgAdministradaId) return 'Debe seleccionar la organización que va a administrar';
    return null;
  }

  onSubmit() {
    const err = this.validate();
    if (err) { this.notify.warn('Validación', err); return; }
    if (!this.orgId) return;
    this.saving = true;
    const body: any = {
      username: this.model.username.trim().toUpperCase(),
      nombreCompleto: (this.model.nombreCompleto || '').trim() || undefined,
      email: (this.model.email || '').trim() || undefined,
      telefono: (this.model.telefono || '').trim() || undefined,
      scopeNivel: this.model.scopeNivel,
      seccionId: this.isSeccionRequerida ? (this.model.seccionId || null) : undefined,
      lugaresIds: Array.isArray(this.model.lugaresIds) && this.model.lugaresIds.length > 0 ? this.model.lugaresIds : undefined
    };
    if (this.isAlcanceOrganizacion && (this.model as any).orgAdministradaId) {
      body.orgAdministradaId = (this.model as any).orgAdministradaId;
    }
    // Incluir roles seleccionados solo si existen
    const rolesIds = (this.model as any).rolesIds;
    if (Array.isArray(rolesIds) && rolesIds.length) {
      body.rolesIds = rolesIds;
    } else if (rolesIds && typeof rolesIds === 'string') {
      body.rolesIds = [rolesIds];
    }
    this.users.create(this.orgId, body).subscribe({
      next: (res) => {
        this.saving = false;
        this.notify.success('Éxito', res.message || 'USUARIO CREADO CORRECTAMENTE.');
        this.router.navigate(['/gestion-de-usuarios/gestionar-usuario'], { queryParams: { id: res.user.id } });
      },
      error: (e) => {
        this.saving = false;
        this.notify.error('Error', e?.error?.message || 'No se pudo crear el usuario');
      }
    });
  }

  openInvite() { this.showInvite = true; }

  get seccionIdForInvite(): string | null {
    return this.isSeccionRequerida && this.model.seccionId ? String(this.model.seccionId) : null;
  }

  get seccionNombre(): string | null {
    const id = (this.model as any)?.seccionId;
    if (!id) return null;
    const found = this.secciones.find(s => String(s.id) === String(id));
    return found?.nombre ?? null;
  }
}
