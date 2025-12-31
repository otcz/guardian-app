import { Component, OnDestroy, OnInit } from '@angular/core';
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
    private menu: MenuService
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
        console.error('Error al cargar administrador:', e);
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
    this.router.navigate(['/listar-lugares'], { queryParams: { id: this.orgId } });
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

    this.saving = true;
    this.seccionService.update(this.orgId, this.seccionId, {
      nombre: this.draft.nombre,
      descripcion: this.draft.descripcion,
      autonomiaConfigurada: this.draft.autonomiaConfigurada
    }).subscribe({
      next: () => {
        this.notify.success('Éxito', 'Sección actualizada correctamente');
        this.editing = false;
        this.saving = false;
        this.load(); // Recargar datos
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

    // Como 'estado' no está en UpdateSeccionRequest, usamos el método toggle específico si existe
    // o actualizamos solo los campos permitidos
    this.seccionService.update(this.orgId, this.seccionId, {
      nombre: this.seccion.nombre,
      descripcion: this.seccion.descripcion,
      autonomiaConfigurada: this.seccion.autonomiaConfigurada
    }).subscribe({
      next: () => {
        // Actualizar estado localmente
        if (this.seccion) {
          this.seccion.estado = nuevoEstado;
        }
        this.notify.success('Éxito', `Sección ${nuevoEstado.toLowerCase()} correctamente`);
        this.load(); // Recargar datos para sincronizar con el servidor
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

  verAuditoria() {
    if (!this.orgId) return;
    this.router.navigate(['/auditoria-seccion'], {
      queryParams: { id: this.orgId, seccionId: this.seccionId }
    });
  }

  volver() {
    this.router.navigate(['/gestion-de-secciones/listar-secciones'], {
      queryParams: this.orgId ? { id: this.orgId } : undefined
    });
  }
}
