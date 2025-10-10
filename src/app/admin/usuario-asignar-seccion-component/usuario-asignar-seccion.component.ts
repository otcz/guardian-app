import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { OrgContextService } from '../../service/org-context.service';
import { UsersService, UserEntity } from '../../service/users.service';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { NotificationService } from '../../service/notification.service';
import { ConfirmationService } from 'primeng/api';
import { OrganizationService, Organization } from '../../service/organization.service';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-usuario-asignar-seccion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, DropdownModule, ButtonModule, AvatarModule, ChipModule, TagModule, TooltipModule],
  templateUrl: './usuario-asignar-seccion.component.html',
  styleUrls: ['./usuario-asignar-seccion.component.scss']
})
export class UsuarioAsignarSeccionComponent implements OnInit {
  orgId: string | null = null; // contexto actual (para listar usuarios y secciones)
  usuarios: UserEntity[] = [];
  secciones: SeccionEntity[] = [];
  usuarioId: string | null = null;
  seccionId: string | null = null;
  saving = false;

  // Organizaciones disponibles para asignar administrador (destino)
  orgs: Organization[] = [];
  orgAdminTargetOrgId: string | null = null;

  constructor(
    private orgCtx: OrgContextService,
    private users: UsersService,
    private seccionesSrv: SeccionService,
    private notify: NotificationService,
    private router: Router,
    private confirm: ConfirmationService,
    private route: ActivatedRoute,
    private orgService: OrganizationService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }
    this.load();
    this.route.queryParamMap.subscribe(qm => {
      const id = qm.get('id');
      if (id) this.usuarioId = id;
      const targetOrgId = qm.get('targetOrgId');
      if (targetOrgId) this.orgAdminTargetOrgId = targetOrgId;
    });
  }

  get isSysadmin(): boolean { return this.auth.hasRole('SYSADMIN'); }

  get selectedUser(): UserEntity | null {
    if (!this.usuarioId) return null;
    return this.usuarios.find(u => String(u.id) === String(this.usuarioId)) || null;
  }
  get initial(): string {
    const src = (this.selectedUser?.nombreCompleto || this.selectedUser?.username || '').trim();
    if (!src) return 'U';
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src[0].toUpperCase();
  }

  load() {
    if (!this.orgId) return;
    this.users.list(this.orgId).subscribe({ next: list => { this.usuarios = list; }, error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar usuarios') });
    this.seccionesSrv.list(this.orgId).subscribe({ next: list => this.secciones = list, error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar secciones') });
    // cargar organizaciones para selección de admin destino
    this.orgService.list().subscribe({ next: list => this.orgs = list, error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar organizaciones') });
  }

  assign() {
    if (!this.orgId || !this.usuarioId || !this.seccionId) return;
    this.saving = true;
    this.users.assignMainSection(this.orgId, this.usuarioId, this.seccionId).subscribe({
      next: res => { this.saving = false; this.notify.success('Éxito', res.message || 'SECCIÓN PRINCIPAL ASIGNADA.'); },
      error: e => { this.saving = false; this.notify.error('Error', e?.error?.message || 'No se pudo asignar la sección'); }
    });
  }

  // Asignar como Administrador de la Organizaci��n seleccionada (requiere SYSADMIN)
  assignAsOrgAdmin() {
    if (!this.isSysadmin) { this.notify.warn('No autorizado', 'Requiere rol SYSADMIN'); return; }
    if (!this.usuarioId) { this.notify.warn('Falta usuario', 'Seleccione un usuario'); return; }
    if (!this.orgAdminTargetOrgId) { this.notify.warn('Falta organización', 'Seleccione la organización destino'); return; }
    this.saving = true;
    this.orgService.assignOrgAdmin(this.orgAdminTargetOrgId, this.usuarioId).subscribe({
      next: (resp) => {
        this.saving = false;
        const orgName = this.orgs.find(o => String(o.id) === String(this.orgAdminTargetOrgId))?.nombre || 'la organización seleccionada';
        const userName = this.selectedUser?.username || this.usuarioId;
        const detail = resp.message || `Usuario ${userName} ahora es ORGADMIN en ${orgName}.`;
        this.notify.success('Asignado', detail);
      },
      error: (e) => {
        this.saving = false;
        const status = e?.status;
        if (status === 403) this.notify.warn('No autorizado', 'Solo SYSADMIN puede asignar administrador de organización.');
        else this.notify.error('Error', e?.error?.message || 'No se pudo asignar el administrador');
      }
    });
  }

  remove() {
    if (!this.orgId || !this.usuarioId) return;
    this.confirm.confirm({
      header: 'Confirmación',
      message: '¿Deseas quitar la sección principal del usuario seleccionado?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.saving = true;
        this.users.removeMainSection(this.orgId!, this.usuarioId!).subscribe({
          next: res => { this.saving = false; this.notify.success('Éxito', res.message || 'SECCIÓN PRINCIPAL ELIMINADA.'); },
          error: e => { this.saving = false; this.notify.error('Error', e?.error?.message || 'No se pudo quitar la sección'); }
        });
      }
    });
  }
}
