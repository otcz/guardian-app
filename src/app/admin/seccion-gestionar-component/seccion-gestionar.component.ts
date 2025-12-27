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

@Component({
  selector: 'app-seccion-gestionar',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, ButtonModule, TagModule, TooltipModule, ProgressSpinnerModule, DropdownModule, FormsModule],
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
  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seccionService: SeccionService,
    private orgCtx: OrgContextService,
    private notify: NotificationService,
    private authService: AuthService
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
      next: (s) => { this.seccion = s; this.loading = false; },
      error: (e) => { this.notify.error('Error', e?.error?.message || 'No se pudo cargar la sección'); this.loading = false; }
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

  asignarAdmin() {
  }

  volver() { this.router.navigate(['/listar-secciones'], { queryParams: this.orgId ? { id: this.orgId } : undefined }); }
}
