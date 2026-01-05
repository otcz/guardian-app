import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { OrgContextService } from '../../service/org-context.service';
import { NotificationService } from '../../service/notification.service';
import { Subscription } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../service/auth.service';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MenuService } from '../../service/menu.service';

@Component({
  selector: 'app-seccion-gestionar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ProgressSpinnerModule,
    DropdownModule,
    FormsModule,
    InputSwitchModule,
    InputTextModule,
    InputTextareaModule
  ],
  templateUrl: './seccion-gestionar.component.html',
  styleUrls: ['./seccion-gestionar.component.scss']
})
export class SeccionGestionarComponent implements OnInit, OnDestroy {
  orgId: string | null = null;
  seccionId: string | null = null;
  seccion: SeccionEntity | null = null;
  secciones: SeccionEntity[] = [];
  loading = false;
  loadingSecciones = false;
  isAdminRole = false; // True si el usuario es ADMIN (de sección)
  showSeccionSelector = true; // False si el usuario es ADMIN (tiene sección fija)

  // Información del administrador actual
  currentAdmin: any | null = null;
  loadingAdmin = false;

  // Edición
  editing = false;
  draft: SeccionEntity = {} as SeccionEntity;
  saving = false;

  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seccionService: SeccionService,
    private orgCtx: OrgContextService,
    private notify: NotificationService,
    private authService: AuthService,
    private menu: MenuService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Detectar si el usuario es ADMIN (tiene sección fija)
    this.isAdminRole = this.authService.hasRole('ADMIN') && !this.authService.hasRole('ORGADMIN');

    this.sub = this.route.queryParamMap.subscribe(q => {
      const qOrg = q.get('id');
      this.orgId = this.orgCtx.ensureFromQuery(qOrg);
      const qSeccionId = q.get('seccionId');

      if (!this.orgId) {
        this.notify.warn('Falta organización', 'Selecciona una organización');
        this.router.navigate(['/listar-organizaciones']);
        return;
      }

      // Si es ADMIN, cargar su sección desde localStorage
      if (this.isAdminRole) {
        const seccionInmutable = localStorage.getItem('loginSeccionImmutable');

        if (seccionInmutable) {
          this.seccionId = seccionInmutable;
          this.showSeccionSelector = false;
          this.load(); // Cargar directamente la sección del ADMIN
        } else {
          // Si no hay sección inmutable pero es ADMIN, intentar obtener del contexto
          const seccionFromContext = localStorage.getItem('seccionPrincipalId');
          if (seccionFromContext) {
            this.seccionId = seccionFromContext;
            this.showSeccionSelector = false;
            this.load();
          } else {
            this.notify.warn('Sin sección asignada', 'No tienes una sección asignada');
          }
        }
      } else {
        // Es ORGADMIN o superior - mostrar selector y permitir elegir
        this.showSeccionSelector = true;
        this.seccionId = qSeccionId;

        // Cargar lista de secciones disponibles
        this.loadSecciones();

        if (this.seccionId) {
          this.load();
        }
      }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  loadSecciones() {
    if (!this.orgId) return;
    this.loadingSecciones = true;
    this.seccionService.list(this.orgId).subscribe({
      next: (list) => {
        this.secciones = list;
        this.loadingSecciones = false;
      },
      error: (e) => {
        this.notify.error('Error', e?.error?.message || 'No se pudo cargar las secciones');
        this.loadingSecciones = false;
      }
    });
  }

  load() {
    if (!this.orgId || !this.seccionId) return;

    this.loading = true;
    this.seccionService.get(this.orgId, this.seccionId).subscribe({
      next: (s) => {
        this.seccion = s;
        this.loading = false;
        // Cargar información del administrador
        this.loadAdminInfo();
      },
      error: (e) => {
        this.notify.error('Error', e?.error?.message || 'No se pudo cargar la sección');
        this.loading = false;
      }
    });
  }

  loadAdminInfo() {
    if (!this.orgId || !this.seccionId) return;

    this.loadingAdmin = true;
    this.currentAdmin = null;

    this.seccionService.getSectionAdmin(this.orgId, this.seccionId).subscribe({
      next: (response) => {
        this.currentAdmin = response.data;
        this.loadingAdmin = false;
      },
      error: (e) => {
        this.currentAdmin = null;
        this.loadingAdmin = false;
      }
    });
  }

  onSeccionChange(seccionId: string) {
    if (!this.orgId || !seccionId) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: this.orgId, seccionId: seccionId },
      queryParamsHandling: 'merge'
    });
  }

  crearLugar() {
    if (!this.orgId) return;
    this.router.navigate(['/crear-lugar'], { queryParams: { id: this.orgId, seccionId: this.seccionId } });
  }

  listarLugares() {
    if (!this.orgId) return;
    this.router.navigate(['/listar-lugares'], {
      queryParams: {
        id: this.orgId,
        seccionId: this.seccionId
      }
    });
  }

  isSeccionActiva(): boolean {
    return ['ACTIVA', 'ACTIVO'].includes((this.seccion?.estado || '').toUpperCase());
  }

  toggleEdit() {
    this.editing = true;
    this.draft = { ...this.seccion } as SeccionEntity;
  }

  cancelEdit() {
    this.editing = false;
    this.draft = {} as SeccionEntity;
  }

  save() {
    if (!this.orgId || !this.seccionId || !this.draft) return;

    const requestBody = {
      nombre: this.draft.nombre,
      descripcion: this.draft.descripcion,
      autonomiaConfigurada: this.draft.autonomiaConfigurada
    };

    this.saving = true;
    this.seccionService.update(this.orgId, this.seccionId, requestBody).subscribe({
      next: (res) => {
        // Preservar información del administrador desde this.currentAdmin
        // (this.seccion no tiene adminInfo porque el GET tampoco lo retorna)
        const adminInfo = this.currentAdmin ? {
          id: this.currentAdmin.id,
          username: this.currentAdmin.username,
          nombreCompleto: this.currentAdmin.nombreCompleto,
          email: this.currentAdmin.email,
          telefono: this.currentAdmin.telefono,
          activo: this.currentAdmin.activo,
          scopeNivel: this.currentAdmin.scopeNivel,
          tipoIdentificacion: this.currentAdmin.tipoIdentificacion,
          identificacion: this.currentAdmin.identificacion,
          seccionId: this.currentAdmin.seccionId,
          seccionNombre: this.currentAdmin.seccionNombre,
          roles: this.currentAdmin.roles
        } : undefined;

        const adminId = this.currentAdmin?.id || null;
        const adminNombre = this.currentAdmin?.nombreCompleto || null;

        // Actualizar directamente con los datos retornados del servidor
        if (this.seccion && res.seccion) {
          // Usar Object.assign para actualizar sin crear nueva referencia
          Object.assign(this.seccion, res.seccion, {
            // Preservar explícitamente la info del admin desde currentAdmin
            adminInfo: adminInfo,
            adminId: adminId,
            adminNombre: adminNombre
          });
        }

        this.notify.success('Éxito', res.message || 'Sección actualizada correctamente');
        this.editing = false;
        this.saving = false;

        // Forzar detección de cambios de Angular para asegurar que la vista se actualice
        this.cdr.detectChanges();

        // No recargar todo - los datos ya están actualizados
      },
      error: (e) => {
        this.notify.error('Error', e?.error?.message || 'No se pudo actualizar la sección');
        this.saving = false;
      }
    });
  }

  toggleActive() {
    if (!this.orgId || !this.seccionId || !this.seccion) return;

    const nuevoEstado = this.isSeccionActiva() ? 'INACTIVA' : 'ACTIVA';

    // Usar el método específico changeState del servicio
    this.seccionService.changeState(this.orgId, this.seccionId, nuevoEstado).subscribe({
      next: (res) => {
        // Actualizar con los datos del servidor
        if (this.seccion && res.seccion) {
          this.seccion = { ...this.seccion, ...res.seccion };
        }
        this.notify.success('Estado actualizado', res.message || `Sección ${nuevoEstado.toLowerCase()} correctamente`);
      },
      error: (e) => {
        this.notify.error('Error', e?.error?.message || 'No se pudo cambiar el estado');
      }
    });
  }

  gotoAssignAdmin() {
    if (!this.seccionId) return;
    this.router.navigate(['/asignar-administrador-de-seccion'], {
      queryParams: { seccionId: this.seccionId }
    });
  }

  get canAssignAdmin(): boolean {
    return this.menu?.canAccessCode('SECTION_ASSIGN_ADMIN') || false;
  }


  volver() {
    this.router.navigate(['/gestion-de-secciones/listar-secciones'], {
      queryParams: this.orgId ? { id: this.orgId } : undefined
    });
  }
}
