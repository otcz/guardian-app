import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UppercaseDirective } from '../../shared/formatting.directives';
import { OrgContextService } from '../../service/org-context.service';
import { UsersService, UserEntity, UpdateUserRequest } from '../../service/users.service';
import { NotificationService } from '../../service/notification.service';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
// Agregados para mejoras visuales
import { ToolbarModule } from 'primeng/toolbar';
import { SkeletonModule } from 'primeng/skeleton';
import { ChipModule } from 'primeng/chip';

@Component({
  selector: 'app-usuario-gestionar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, ButtonModule, ProgressSpinnerModule, UppercaseDirective, TagModule, DividerModule, TooltipModule, AvatarModule, ToolbarModule, SkeletonModule, ChipModule],
  templateUrl: './usuario-gestionar.component.html',
  styleUrls: ['./usuario-gestionar.component.scss']
})
export class UsuarioGestionarComponent implements OnInit {
  orgId: string | null = null;
  userId: string | null = null;
  user: UserEntity | null = null;
  loading = true;
  editing = false;
  saving = false;
  draft: UpdateUserRequest = {};
  principalSeccionNombre: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router, private orgCtx: OrgContextService, private users: UsersService, private notify: NotificationService, private secciones: SeccionService) {}

  get userInitial(): string {
    const src = (this.user?.nombreCompleto || this.user?.username || '').trim();
    if (!src) return '?';
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src[0].toUpperCase();
  }

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) { this.notify.warn('Atención', 'Seleccione una organización'); this.router.navigate(['/listar-organizaciones']); return; }
    this.route.queryParamMap.subscribe(qm => {
      const id = qm.get('id');
      if (!id) { this.notify.warn('Atención', 'Seleccione un usuario'); this.router.navigate(['/gestion-de-usuarios/listar-usuarios']); return; }
      this.userId = id; this.load();
    });
  }

  private loadSeccionNombreIfNeeded() {
    this.principalSeccionNombre = null;
    if (!this.orgId || !this.user?.seccionPrincipalId) return;
    this.secciones.list(this.orgId).subscribe({
      next: (list: SeccionEntity[]) => {
        const found = list.find(s => String(s.id) === String(this.user!.seccionPrincipalId));
        this.principalSeccionNombre = found ? found.nombre : null;
      },
      error: () => { this.principalSeccionNombre = null; }
    });
  }

  load() {
    if (!this.orgId || !this.userId) return;
    this.loading = true;
    this.users.get(this.orgId, this.userId).subscribe({
      next: u => { this.user = u; this.loading = false; this.loadSeccionNombreIfNeeded(); },
      error: e => { this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudo obtener el usuario'); }
    });
  }

  toggleEdit() {
    if (!this.user) return;
    this.editing = true;
    this.draft = { username: this.user.username, nombreCompleto: this.user.nombreCompleto || '', email: this.user.email || '' };
  }

  cancel() { this.editing = false; this.draft = {}; }

  save() {
    if (!this.orgId || !this.userId) return;
    this.saving = true;
    const body: UpdateUserRequest = {
      username: (this.draft.username || '').toString().trim().toUpperCase() || undefined,
      nombreCompleto: (this.draft.nombreCompleto || '').toString().trim() || undefined,
      email: (this.draft.email || '').toString().trim() || undefined
    };
    this.users.update(this.orgId, this.userId, body).subscribe({
      next: res => { this.user = res.user; this.saving = false; this.editing = false; this.notify.success('Éxito', res.message || 'USUARIO ACTUALIZADO CORRECTAMENTE.'); this.loadSeccionNombreIfNeeded(); },
      error: e => { this.saving = false; this.notify.error('Error', e?.error?.message || 'No se pudo actualizar el usuario'); }
    });
  }

  toggleActive() {
    if (!this.orgId || !this.user) return;
    const value = !this.user.activo;
    this.users.setActive(this.orgId, this.user.id, value).subscribe({
      next: res => { this.user!.activo = value; this.notify.success('Éxito', res.message || (value ? 'USUARIO ACTIVADO.' : 'USUARIO DESACTIVADO.')); },
      error: e => this.notify.error('Error', e?.error?.message || 'No se pudo cambiar el estado')
    });
  }

  copy(text?: string | null) {
    const t = (text || '').toString();
    if (!t) return;
    try { navigator.clipboard.writeText(t); this.notify.info('Copiado', 'Texto copiado al portapapeles'); } catch {}
  }

  openEmail(email?: string | null) {
    const e = (email || '').toString().trim();
    if (!e) return;
    window.location.href = `mailto:${e}`;
  }
}
