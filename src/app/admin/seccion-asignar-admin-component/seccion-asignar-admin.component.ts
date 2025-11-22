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
import { AuthService } from '../../service/auth.service';

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
    private route: ActivatedRoute,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    // Permitir orgId por query param (para SYSADMIN que salta desde listado de organizaciones)
    const qpOrgId = this.route.snapshot.queryParamMap.get('orgId') || this.route.snapshot.queryParamMap.get('oId');
    // Contexto base (locked) o storage
    const ctxOrgId = this.orgCtx.value || localStorage.getItem('currentOrgId');
    // Prioridad: query param explícito > contexto > storage
    this.orgId = qpOrgId || ctxOrgId || null;

    if (!this.orgId) { this.notify.warn('Atención', 'Seleccione una organización'); this.router.navigate(['/listar-organizaciones']); return; }

    // Validar formato UUID (si backend lo requiere) para evitar enviar orgId inválido que cause error de resolución de rol
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.orgId);
    if (!uuidLike) {
      // Si es SYSADMIN intentar continuar (puede ser código interno), pero avisar.
      if (this.auth.hasRole('SYSADMIN')) {
        this.notify.warn('OrgId', 'Formato de orgId no parece UUID, continuar como SYSADMIN');
      } else {
        this.notify.warn('OrgId', 'Identificador de organización inválido');
        this.router.navigate(['/listar-organizaciones']);
        return;
      }
    }

    this.loading = true;
    this.pendingLoads = 1;
    // Cargar secciones de la organización efectiva
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
        const orgIdQ = qm.get('orgId') || qm.get('oId');
        if (orgIdQ && orgIdQ !== this.orgId) {
          this.orgId = orgIdQ; // actualizar si cambia (caso navegación directa SYSADMIN)
          this.onOrgIdChanged();
        }
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

  private onOrgIdChanged() {
    if (!this.orgId) { this.secciones = []; this.filteredSecciones = []; return; }
    this.loading = true;
    this.seccionesSrv.list(this.orgId).subscribe({
      next: list => { this.secciones = list || []; this.filteredSecciones = this.secciones.slice(); this.applyFilters(); },
      error: e => { this.notify.error('Error', e?.error?.message || 'No se pudieron listar secciones'); this.secciones = []; this.filteredSecciones = []; },
      complete: () => { this.loading = false; }
    });
  }

  assign() {
    if (!this.orgId || !this.seccionId || !this.usuarioId) { this.notify.warn('Datos', 'Complete selección de organización, sección y usuario'); return; }
    // Para SYSADMIN: si la organización objetivo difiere del contexto locked, enviamos orgId explícito igualmente (ya incluido en body) y advertimos si coincide con DEFAULT_ORG para evitar ambigüedad.
    const isSysadmin = this.auth.hasRole('SYSADMIN');
    if (isSysadmin) {
      const lockedOrg = this.orgCtx.value || localStorage.getItem('loginOrgImmutable');
      if (lockedOrg && lockedOrg !== this.orgId) {
        // Documentar diferencia (solo aviso visual)
        this.notify.warn('Contexto', 'Asignando en organización distinta al contexto de login (permitido por SYSADMIN)');
      }
    }
    this.saving = true;

    try {
      console.log('[SeccionAsignarAdmin] 📡 Asignando administrador...', {
        orgId: this.orgId,
        seccionId: this.seccionId,
        usuarioId: this.usuarioId,
        usuario: this.selectedUser?.username,
        seccion: this.selectedSection?.nombre
      });
    } catch {}

    this.seccionesSrv.assignAdministrador(this.orgId, this.seccionId, this.usuarioId).subscribe({
      next: _res => {
        this.saving = false;
        this.notify.success('Éxito', 'Administrador asignado correctamente');
        try {
          console.log('[SeccionAsignarAdmin] ✅ Asignación exitosa');
        } catch {}
        // Navegar de vuelta al listado de secciones
        this.router.navigate(['/listar-secciones'], { queryParams: { id: this.orgId } });
      },
      error: e => {
        this.saving = false;
        const raw = (e?.error?.message || '').toString();
        const rawUpper = raw.toUpperCase();

        try {
          console.error('[SeccionAsignarAdmin] ❌ Error al asignar administrador:', {
            status: e?.status,
            message: raw,
            error: e
          });
        } catch {}

        // ⚠️ NUEVOS MENSAJES DE ERROR SEGÚN REQUERIMIENTO (2025-11-21)
        if (e?.status === 400) {
          // Error: Usuario de otra organización
          if (rawUpper.includes('ORGANIZACIÓN') && (rawUpper.includes('PERTENECE') || rawUpper.includes('DIFERENTE') || rawUpper.includes('FOREIGN'))) {
            this.notify.error(
              'No se puede asignar el administrador',
              `El usuario seleccionado pertenece a una organización diferente a la de esta sección.\n\nPor favor, selecciona un usuario de la misma organización.`
            );
            return;
          }

          // Error: Usuario con scope ORGANIZACION
          if (rawUpper.includes('ALCANCE') || rawUpper.includes('SCOPE') || rawUpper.includes('USER_SCOPE_RESTRICTED')) {
            this.notify.error(
              'No se puede asignar el administrador',
              `El usuario seleccionado tiene un nivel de alcance (scope) que no le permite administrar secciones individuales.\n\nLos administradores de sección deben tener alcance de SECCION.`
            );
            return;
          }

          // Error: Determinar organización (legacy - menos común ahora)
          if ((rawUpper.includes('DETERMINAR') || rawUpper.includes('RESOLVER')) && rawUpper.includes('ORGANIZ')) {
            this.notify.warn('Validación', 'No se pudo determinar la organización para resolver el rol por nombre. Verifique orgId y reintente');
            return;
          }

          // Error: Inconsistencia de organización en sección padre
          if (rawUpper.includes('SECTION_PARENT_INVALID_ORG') || rawUpper.includes('INCONSISTENCIA')) {
            this.notify.warn('Validación', 'Inconsistencia de organización en la sección');
            return;
          }

          // Error genérico 400
          this.notify.error('Error de validación', raw || 'Los datos enviados no son válidos');
          return;
        }

        // Error 403: Sin permisos
        if (e?.status === 403) {
          this.notify.error('Acceso prohibido', 'No tienes permisos para asignar administradores de sección');
          return;
        }

        // Error 404: Sección no encontrada
        if (e?.status === 404) {
          this.notify.warn('Sección no encontrada', 'La sección seleccionada no existe o fue eliminada');
          return;
        }

        // Error 401: No autenticado
        if (e?.status === 401) {
          this.notify.warn('Sesión expirada', 'Por favor, inicia sesión nuevamente');
          return;
        }

        // Error genérico
        this.notify.error(
          'Error al asignar administrador',
          raw || 'Ocurrió un error al procesar la solicitud. Por favor, intenta nuevamente o contacta al soporte.'
        );
      }
    });
  }
}









