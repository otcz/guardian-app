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
  // Índice id -> nombre de sección para mostrar nombres en UI
  private seccionIndex: Record<string, string> = {};

  // --- Estado para Transferir Usuario ---
  seccionDestinoId: string | null = null; // sección destino de transferencia

  constructor(
    private orgCtx: OrgContextService,
    private users: UsersService,
    private seccionesSrv: SeccionService,
    private notify: NotificationService,
    private router: Router,
    private confirm: ConfirmationService,
    private route: ActivatedRoute,
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
    this.users.list(this.orgId).subscribe({ next: list => {
      this.usuarios = list;
      // Si ya hay un usuario seleccionado (por query param), preseleccionar su sección actual (pertenencia)
      if (this.usuarioId) {
        const u = this.usuarios.find(us => String(us.id) === String(this.usuarioId));
        this.seccionId = (u as any)?.seccionId ?? null;
        // Por defecto, limpiar selección de destino de transferencia
        this.seccionDestinoId = null;
      }
    }, error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar usuarios') });
    this.seccionesSrv.list(this.orgId).subscribe({ next: list => { this.secciones = list; this.seccionIndex = Object.fromEntries((list || []).map(s => [s.id, s.nombre || s.id])); }, error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar secciones') });
  }

  // Helper para obtener el nombre de la sección por id
  getSeccionNombre(id?: string | null): string {
    if (!id) return '—';
    return this.seccionIndex[id] || id;
  }

  assign() {
    if (!this.orgId || !this.usuarioId || !this.seccionId) return;
    this.saving = true;
    this.seccionesSrv.asignarUsuario(this.orgId, this.seccionId, this.usuarioId).subscribe({
      next: res => { this.saving = false; this.notify.success('Éxito', res.message || 'USUARIO ASIGNADO A LA SECCIÓN.'); },
      error: e => { this.saving = false; this.notify.error('Error', e?.error?.message || 'No se pudo asignar la sección'); }
    });
  }
  onUserChange(id: string) {
    this.usuarioId = id;
    // Preseleccionar la sección actual del usuario (pertenencia)
    const user = this.selectedUser;
    this.seccionId = (user as any)?.seccionId ?? null;
    // reset de transferencia
    this.seccionDestinoId = null;
  }

  // Transferir usuario de la sección actual a una sección destino (manteniendo rol contextual)
  transfer() {
    if (!this.orgId) { this.notify.warn('Atención', 'Seleccione una organización'); return; }
    if (!this.usuarioId) { this.notify.warn('Falta usuario', 'Seleccione un usuario'); return; }
    const origenId = (this.selectedUser as any)?.seccionId || null;
    if (!origenId) { this.notify.warn('No permitido', 'El usuario no tiene una sección de origen'); return; }
    if (!this.seccionDestinoId) { this.notify.warn('Falta destino', 'Seleccione la sección destino'); return; }
    if (String(origenId) === String(this.seccionDestinoId)) { this.notify.warn('Sin cambios', 'La sección destino es igual a la actual'); return; }

    const body = {
      usuarioId: this.usuarioId!,
      seccionDestinoId: this.seccionDestinoId!,
      mantenerRolContextual: true,
      nuevoRolContextualId: null
    } as any;

    this.saving = true;
    this.seccionesSrv.transferirUsuario(this.orgId, origenId, body).subscribe({
      next: (resp) => {
        this.saving = false;
        // Actualizar sección de pertenencia del usuario en la lista local
        const idx = this.usuarios.findIndex(u => String(u.id) === String(this.usuarioId));
        if (idx >= 0) {
          (this.usuarios[idx] as any) = { ...this.usuarios[idx], seccionId: this.seccionDestinoId } as any;
        }
        this.notify.success('Transferido', resp.message || `Usuario movido a ${this.getSeccionNombre(this.seccionDestinoId)}`);
      },
      error: (e) => {
        this.saving = false;
        const code = e?.error?.code;
        const msg = e?.error?.message || 'No se pudo transferir el usuario';
        // Mensajes comunes
        if (code === 'ROL_INCOMPATIBLE') this.notify.warn('Rol incompatible', msg);
        else if (code === 'SECCION_INVALIDA') this.notify.warn('Sección inválida', msg);
        else this.notify.error('Error', msg);
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
