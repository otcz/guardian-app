import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { OrgContextService } from '../../service/org-context.service';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import type { UserEntity } from '../../service/users.service';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-seccion-asignar-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, DropdownModule, ButtonModule, TagModule, TooltipModule, InputTextModule],
  templateUrl: './seccion-asignar-admin.component.html',
  styleUrls: ['./seccion-asignar-admin.component.scss']
})
export class SeccionAsignarAdminComponent implements OnInit {
  orgId: string | null = null;
  secciones: SeccionEntity[] = [];
  usuarios: UserEntity[] = [];
  // colecciones filtradas usadas por la plantilla
  filteredSecciones: SeccionEntity[] = [];
  filteredUsuarios: UserEntity[] = [];

  seccionId: string | null = null;
  usuarioId: string | null = null;

  // filtros de búsqueda
  seccionQuery = '';
  usuarioQuery = '';

  loading = true;
  saving = false;
  private pendingLoads = 0;
  errorMsg: string | null = null;

  constructor(
    private orgCtx: OrgContextService,
    private seccionesSrv: SeccionService,
    private notify: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value || localStorage.getItem('currentOrgId');
    if (!this.orgId) { this.notify.warn('Atención', 'Seleccione una organización'); this.router.navigate(['/listar-organizaciones']); return; }

    this.loading = true;
    this.pendingLoads = 1;
    // Cargar secciones
    this.seccionesSrv.list(this.orgId).subscribe({
      next: list => { this.secciones = list || []; this.filteredSecciones = this.secciones.slice(); },
      error: (e) => { const msg = e?.error?.message || 'No se pudieron listar secciones'; this.errorMsg = msg; this.notify.error('Error', msg); },
      complete: () => { this.pendingLoads--; this.loading = this.pendingLoads > 0; }
    });

    // Prefill desde query
    this.route.queryParamMap.subscribe({
      next: (qm) => {
        const sId = qm.get('seccionId');
        const uId = qm.get('usuarioId');
        if (sId && sId !== this.seccionId) {
          this.seccionId = sId;
          this.loadCandidates();
        }
        this.usuarioId = uId;
      }
    });
  }

  get selectedUser(): UserEntity | null {
    if (!this.usuarioId) return null;
    return this.usuarios.find(u => String(u.id) === String(this.usuarioId)) || null;
  }

  get selectedSection(): SeccionEntity | null {
    if (!this.seccionId) return null;
    return this.secciones.find(s => String(s.id) === String(this.seccionId)) || null;
  }

  // aplicar filtros externos
  applyFilters() {
    const sq = (this.seccionQuery || '').trim().toLowerCase();
    this.filteredSecciones = !sq ? this.secciones.slice() : this.secciones.filter(s => (s.nombre || '').toLowerCase().includes(sq));

    const uq = (this.usuarioQuery || '').trim().toLowerCase();
    this.filteredUsuarios = !uq ? this.usuarios.slice() : this.usuarios.filter(u => (u.username || '').toLowerCase().includes(uq) || (u.nombreCompleto || '').toLowerCase().includes(uq));
  }

  onSeccionChange() {
    // Limpiar usuario seleccionado al cambiar de sección
    this.usuarioId = null;
    this.loadCandidates();
  }

  private loadCandidates() {
    if (!this.orgId || !this.seccionId) { this.usuarios = []; this.filteredUsuarios = []; return; }
    this.loading = true;
    this.seccionesSrv.getAdminCandidates(this.orgId, this.seccionId).subscribe({
      next: list => {
        this.usuarios = list || [];
        // Si el usuario preseleccionado ya no está, limpiar
        if (this.usuarioId && !this.usuarios.some(u => String(u.id) === String(this.usuarioId))) {
          this.usuarioId = null;
        }
        this.filteredUsuarios = this.usuarios.slice();
        this.applyFilters();
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        if (e?.status === 404) this.notify.warn('Sección', 'Sección no encontrada');
        else this.notify.error('Error', e?.error?.message || 'No se pudieron listar candidatos');
        this.usuarios = []; this.filteredUsuarios = [];
      }
    });
  }

  assign() {
    if (!this.orgId || !this.seccionId || !this.usuarioId) return;
    this.saving = true;
    this.seccionesSrv.assignAdministrador(this.orgId, this.seccionId, this.usuarioId).subscribe({
      next: _res => {
        this.saving = false;
        this.notify.success('Éxito', 'Administrador asignado');
      },
      error: e => {
        this.saving = false;
        const raw = (e?.error?.message || '').toString().toUpperCase();
        if (e?.status === 400) {
          if (raw.includes('USER_SCOPE_RESTRICTED') || raw.includes('ORGANIZACION')) {
            this.notify.warn('Validación', 'El usuario con alcance ORGANIZACIÓN no puede ser administrador de sección');
            return;
          }
          if (raw.includes('SECTION_ADMIN_FOREIGN_ORG')) {
            this.notify.warn('Validación', 'El usuario pertenece a otra organización');
            return;
          }
          if (raw.includes('SECTION_PARENT_INVALID_ORG')) {
            this.notify.warn('Validación', 'Inconsistencia de organización en la sección');
            return;
          }
        }
        if (e?.status === 404) {
          this.notify.warn('Sección', 'Sección no encontrada');
          return;
        }
        if (e?.status === 401 || e?.status === 403) {
          this.notify.warn('No autorizado', 'Inicie sesión nuevamente');
          return;
        }
        this.notify.error('Error', e?.error?.message || 'No se pudo asignar el administrador');
      }
    });
  }
}
