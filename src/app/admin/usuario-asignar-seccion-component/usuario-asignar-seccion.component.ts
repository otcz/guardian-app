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

@Component({
  selector: 'app-usuario-asignar-seccion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, DropdownModule, ButtonModule, AvatarModule, ChipModule, TagModule, TooltipModule],
  templateUrl: './usuario-asignar-seccion.component.html',
  styleUrls: ['./usuario-asignar-seccion.component.scss']
})
export class UsuarioAsignarSeccionComponent implements OnInit {
  orgId: string | null = null;
  usuarios: UserEntity[] = [];
  secciones: SeccionEntity[] = [];
  usuarioId: string | null = null;
  seccionId: string | null = null;
  saving = false;

  constructor(private orgCtx: OrgContextService, private users: UsersService, private seccionesSrv: SeccionService, private notify: NotificationService, private router: Router, private confirm: ConfirmationService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) { this.notify.warn('Atención', 'Seleccione una organización'); this.router.navigate(['/listar-organizaciones']); return; }
    this.load();
    this.route.queryParamMap.subscribe(qm => { const id = qm.get('id'); if (id) this.usuarioId = id; });
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

  load() {
    if (!this.orgId) return;
    this.users.list(this.orgId).subscribe({ next: list => { this.usuarios = list; }, error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar usuarios') });
    this.seccionesSrv.list(this.orgId).subscribe({ next: list => this.secciones = list, error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar secciones') });
  }

  assign() {
    if (!this.orgId || !this.usuarioId || !this.seccionId) return;
    this.saving = true;
    this.users.assignMainSection(this.orgId, this.usuarioId, this.seccionId).subscribe({
      next: res => { this.saving = false; this.notify.success('Éxito', res.message || 'SECCIÓN PRINCIPAL ASIGNADA.'); },
      error: e => { this.saving = false; this.notify.error('Error', e?.error?.message || 'No se pudo asignar la sección'); }
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
