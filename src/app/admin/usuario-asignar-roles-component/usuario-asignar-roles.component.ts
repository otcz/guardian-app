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
import { OrgContextService } from '../../service/org-context.service';
import { UsersService, UserEntity } from '../../service/users.service';
import { RolesService, RoleEntity, UserRoleAssignment } from '../../service/roles.service';
import { NotificationService } from '../../service/notification.service';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-usuario-asignar-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, DropdownModule, ButtonModule, TableModule, AvatarModule, ChipModule, TagModule, TooltipModule],
  templateUrl: './usuario-asignar-roles.component.html',
  styleUrls: ['./usuario-asignar-roles.component.scss']
})
export class UsuarioAsignarRolesComponent implements OnInit {
  orgId: string | null = null;
  usuarios: UserEntity[] = [];
  roles: RoleEntity[] = [];
  rolesUsuario: UserRoleAssignment[] = [];
  usuarioId: string | null = null;
  rolSeleccionado: string | null = null;
  saving = false;

  constructor(private orgCtx: OrgContextService, private users: UsersService, private rolesSrv: RolesService, private notify: NotificationService, private router: Router, private confirm: ConfirmationService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) { this.notify.warn('Atención', 'Seleccione una organización'); this.router.navigate(['/listar-organizaciones']); return; }

    // Cargar catálogos
    this.users.list(this.orgId).subscribe({ next: list => { this.usuarios = list; this.autoSelectFromQuery(); }, error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar usuarios') });
    this.rolesSrv.list(this.orgId).subscribe({ next: list => this.roles = list, error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar roles') });

    // Reaccionar a cambios de query param
    this.route.queryParamMap.subscribe(qm => {
      const id = qm.get('id');
      if (id) { this.usuarioId = id; this.loadUserRoles(); }
    });
  }

  private autoSelectFromQuery() {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) { this.usuarioId = id; this.loadUserRoles(); }
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

  loadUserRoles() {
    if (!this.usuarioId) { this.rolesUsuario = []; return; }
    this.rolesSrv.listUserRoles(this.usuarioId).subscribe({ next: list => this.rolesUsuario = list, error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar roles del usuario') });
  }

  assignRole() {
    if (!this.usuarioId || !this.rolSeleccionado) return;
    this.saving = true;
    this.rolesSrv.assignRoleToUser(this.usuarioId, this.rolSeleccionado).subscribe({
      next: res => { this.saving = false; this.notify.success('Éxito', res.message || 'Rol asignado'); this.loadUserRoles(); },
      error: e => { this.saving = false; this.notify.error('Error', e?.error?.message || 'No se pudo asignar el rol'); }
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
