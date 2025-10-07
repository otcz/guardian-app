import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { ChipModule } from 'primeng/chip';
import { OrgContextService } from '../../service/org-context.service';
import { UsersService, UserEntity } from '../../service/users.service';
import { NotificationService } from '../../service/notification.service';
import { ConfirmationService } from 'primeng/api';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';

@Component({
  selector: 'app-usuarios-listar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, ButtonModule, TableModule, TagModule, TooltipModule, AvatarModule, ChipModule],
  templateUrl: './usuarios-listar.component.html',
  styleUrls: ['./usuarios-listar.component.scss']
})
export class UsuariosListarComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  usuarios: UserEntity[] = [];
  filtered: UserEntity[] = [];
  filter = '';
  secciones: SeccionEntity[] = [];

  constructor(private orgCtx: OrgContextService, private users: UsersService, private notify: NotificationService, private router: Router, private confirm: ConfirmationService, private seccionSvc: SeccionService) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }
    this.load();
    // Cargar secciones para mostrar el nombre
    this.seccionSvc.list(this.orgId).subscribe({
      next: list => this.secciones = list || [],
      error: () => this.secciones = []
    });
  }

  load() {
    if (!this.orgId) return;
    this.loading = true;
    this.users.list(this.orgId).subscribe({
      next: list => { this.usuarios = list; this.applyFilter(); this.loading = false; },
      error: e => { this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudieron listar usuarios'); }
    });
  }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    if (!f) { this.filtered = [...this.usuarios]; return; }
    this.filtered = this.usuarios.filter(u => [u.username, u.nombreCompleto, u.email, u.scopeNivel].some(v => (v || '').toString().toLowerCase().includes(f)));
  }

  toggle(u: UserEntity) {
    if (!this.orgId) return;
    const next = !u.activo;
    const actionLabel = next ? 'activar' : 'desactivar';
    this.confirm.confirm({
      header: 'Confirmación',
      message: `¿Deseas ${actionLabel} el usuario "${u.username}"?`,
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.users.setActive(this.orgId!, u.id, next).subscribe({
          next: res => {
            u.activo = next;
            this.notify.success('Éxito', res.message || (next ? 'USUARIO ACTIVADO.' : 'USUARIO DESACTIVADO.'));
          },
          error: e => this.notify.error('Error', e?.error?.message || 'No se pudo cambiar el estado')
        });
      }
    });
  }

  userInitial(u: UserEntity): string {
    const src = (u?.nombreCompleto || u?.username || '').trim();
    if (!src) return 'U';
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src[0].toUpperCase();
  }

  sectionName(u: UserEntity): string {
    if (!u?.seccionPrincipalId) return '-';
    const found = this.secciones.find(s => String(s.id) === String(u.seccionPrincipalId));
    return found?.nombre || String(u.seccionPrincipalId);
  }
}
