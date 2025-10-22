import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { AvatarModule } from 'primeng/avatar';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { OrgContextService } from '../../service/org-context.service';
import { UsersService, UserEntity } from '../../service/users.service';
import { RolesService, RoleEntity, UserRoleAssignment } from '../../service/roles.service';
import { NotificationService } from '../../service/notification.service';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-usuario-asignar-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, DropdownModule, ButtonModule, TableModule, AvatarModule, ChipModule, TagModule, TooltipModule, ConfirmDialogModule],
  templateUrl: './usuario-asignar-roles.component.html',
  styleUrls: ['./usuario-asignar-roles.component.scss']
})
export class UsuarioAsignarRolesComponent implements OnInit {
  orgId: string | null = null;
  usuarios: UserEntity[] = [];
  roles: RoleEntity[] = [];
  roleNameById: Record<string, string> = {};
  rolesUsuario: UserRoleAssignment[] = [];
  usuarioId: string | null = null;
  rolSeleccionado: string | null = null;
  saving = false;

  constructor(private orgCtx: OrgContextService, private users: UsersService, private rolesSrv: RolesService, private notify: NotificationService, private router: Router, private confirm: ConfirmationService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) { this.notify.warn('Atención', 'Seleccione una organización'); this.router.navigate(['/listar-organizaciones']); return; }

    // Cargar catálogos básicos
    this.users.list(this.orgId).subscribe({ next: list => { this.usuarios = list; this.autoSelectFromQuery(); }, error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar usuarios') });
    // Precarga roles por org del contexto como fallback inicial
    this.loadRolesForOrg(this.orgId);

    // Reaccionar a cambios de query param
    this.route.queryParamMap.subscribe(qm => {
      const id = qm.get('id');
      if (id) { this.usuarioId = id; this.onUserChange(); }
    });
  }

  // Cargar roles de una organización específica
  private loadRolesForOrg(orgId: string | null | undefined) {
    if (!orgId) { this.roles = []; this.roleNameById = {}; return; }
    this.rolesSrv.list(orgId).subscribe({
      next: list => {
        this.roles = list || [];
        this.roleNameById = Object.fromEntries((this.roles || []).map(r => [String(r.id), String(r.nombre || '')]));
        this.hydrateRoleAssignments();
      },
      error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar roles')
    });
  }

  private autoSelectFromQuery() {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) { this.usuarioId = id; this.onUserChange(); }
  }

  // Cuando cambia el usuario seleccionado, cargar sus roles y roles de su organización
  onUserChange() {
    this.loadUserRoles();
    const orgFromUser = this.selectedUser?.orgId || this.orgId;
    this.loadRolesForOrg(orgFromUser || null);
  }

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

  getRoleName(ru: UserRoleAssignment | null | undefined): string {
    if (!ru) return '';
    return (ru.rolNombre || ru.rol?.nombre || this.roleNameById[ru.rolId] || ru.rolId || '').toString();
  }

  /** Hidrata las asignaciones con la entidad RoleEntity según rolId para asegurar que haya nombre disponible */
  private hydrateRoleAssignments(): void {
    if (!this.rolesUsuario || this.rolesUsuario.length === 0) return;
    if (!this.roles || this.roles.length === 0) return;
    const byId = new Map(this.roles.map(r => [String(r.id), r] as const));
    this.rolesUsuario = this.rolesUsuario.map(ru => {
      if (!ru.rol) {
        const r = byId.get(String(ru.rolId));
        if (r) return { ...ru, rol: r };
      }
      return ru;
    });
  }

  loadUserRoles() {
    if (!this.usuarioId) { this.rolesUsuario = []; return; }
    this.rolesSrv.listUserRoles(this.usuarioId).subscribe({ next: list => this.rolesUsuario = list, error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar roles del usuario') });
  }

  assignRole() {
    if (!this.usuarioId || !this.rolSeleccionado) return;
    this.saving = true;
    // Preferir asignación por rolId (UUID del rol de la organización)
    const role = this.roles.find(r => String(r.id) === String(this.rolSeleccionado));
    this.users.asignarRol(this.usuarioId, { rolId: this.rolSeleccionado }).subscribe({
      next: _dto => {
        this.saving = false;
        this.notify.success('Éxito', 'Rol asignado');
        this.loadUserRoles();
      },
      error: e => {
        const msg = e?.error?.message || (typeof e?.error === 'string' ? e.error : 'No se pudo asignar el rol');
        const is400 = e?.status === 400;
        const needsOrg = /organización|organizacion|org/i.test(String(msg || ''));
        const orgFromUser = this.selectedUser?.orgId || this.orgId;
        // Fallback: si es 400 por organización y tenemos nombre y orgId, reintentar por rolNombre+orgId del usuario
        if (is400 && needsOrg && role?.nombre && orgFromUser) {
          this.users.asignarRol(this.usuarioId!, { rolNombre: role.nombre, orgId: orgFromUser }).subscribe({
            next: _dto2 => {
              this.saving = false;
              this.notify.success('Éxito', 'Rol asignado');
              this.loadUserRoles();
            },
            error: e2 => {
              this.saving = false;
              const msg2 = e2?.error?.message || (typeof e2?.error === 'string' ? e2.error : 'No se pudo asignar el rol');
              this.notify.error('Error', msg2);
            }
          });
          return;
        }
        this.saving = false;
        this.notify.error('Error', msg);
      }
    });
  }

  unassignRole(rolUsuarioId: string) {
    if (!this.usuarioId) return;
    this.confirm.confirm({
      header: 'Confirmación',
      message: '¿Deseas quitar este rol del usuario seleccionado?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.rolesSrv.unassignUserRole(this.usuarioId!, rolUsuarioId).subscribe({
          next: res => { this.notify.success('Éxito', res.message || 'Rol quitado'); this.loadUserRoles(); },
          error: e => this.notify.error('Error', e?.error?.message || 'No se pudo quitar el rol')
        });
      }
    });
  }
}
