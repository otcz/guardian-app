// filepath: c:\Users\OTCZ\WebstormProjects\guardian-app\src\app\shared\section-invite-dialog.component.ts
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { NotificationService } from '../service/notification.service';
import { InvitacionesService, InvitationDto } from '../service/invitaciones.service';
import { SeccionService, SeccionEntity } from '../service/seccion.service';
import { RolesService, RoleEntity } from '../service/roles.service';

@Component({
  selector: 'app-section-invite-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, CalendarModule, InputNumberModule, TooltipModule, TagModule, DropdownModule],
  templateUrl: './section-invite-dialog.component.html',
  styleUrls: ['./section-invite-dialog.component.scss']
})
export class SectionInviteDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() orgId: string | null = null;
  @Input() seccionId: string | null = null;
  @Input() defaultTtlMinutes = 30;
  @Output() visibleChange = new EventEmitter<boolean>();

  secciones: SeccionEntity[] = [];
  roles: RoleEntity[] = [];
  filteredRoles: RoleEntity[] = [];

  // Form model
  ttlMinutes: number | null = null;
  // Eliminados: expiraEnDate y usosMaximos
  rolContextualId: string | null = null;
  emailDestino: string | null = null;
  notas: string | null = null;

  // Result
  invite: InvitationDto | null = null;
  shareUrl: string | null = null;

  // UI state
  saving = false;

  ttlChips = [15, 30, 120, 1440];

  constructor(private invites: InvitacionesService, private notify: NotificationService, private seccionesSvc: SeccionService, private rolesSvc: RolesService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.reset();
      this.ensureSecciones();
      this.ensureRoles();
    }
  }

  private ensureRoles() {
    if (!this.orgId) { this.roles = []; this.filteredRoles = []; return; }
    this.rolesSvc.list(this.orgId).subscribe({
      next: (list) => {
        this.roles = Array.isArray(list) ? list : [];
        // Excluir roles con nombre que contenga 'ADMIN'
        this.filteredRoles = this.roles.filter(r => !String(r?.nombre || '').toUpperCase().includes('ADMIN'));
      },
      error: () => { this.roles = []; this.filteredRoles = []; }
    });
  }

  private ensureSecciones() {
    if (!this.orgId) return;
    if (!this.seccionId) {
      this.seccionesSvc.list(this.orgId).subscribe({
        next: (list) => this.secciones = list || [],
        error: () => this.secciones = []
      });
    }
  }

  reset() {
    this.ttlMinutes = null; this.rolContextualId = null; this.emailDestino = null; this.notas = null; this.invite = null; this.shareUrl = null;
  }

  applyTtlChip(v: number) { this.ttlMinutes = v; }

  get canSubmit(): boolean {
    if (!this.orgId || !this.seccionId) return false;
    if (this.ttlMinutes != null && this.ttlMinutes <= 0) return false;
    return true;
  }

  create() {
    if (!this.seccionId) { this.notify.warn('Falta sección', 'Selecciona la Sección para emitir la invitación.'); return; }
    if (!this.orgId) { this.notify.warn('Falta organización', 'No se detectó organización activa.'); return; }
    if (!this.canSubmit) return;

    const body: any = {};
    if (this.rolContextualId) body.rolContextualId = this.rolContextualId;
    if (this.ttlMinutes && this.ttlMinutes > 0) body.ttlMinutes = this.ttlMinutes;
    if (this.emailDestino) body.emailDestino = this.emailDestino;
    if (this.notas) body.notas = this.notas;

    this.saving = true;
    this.invites.crear(this.orgId!, this.seccionId!, body).subscribe(
      (resp: any) => {
        this.saving = false;
        const data = resp && resp.data ? resp.data : null;
        this.invite = data as InvitationDto;
        const preferred = (this.invite as any)?.inviteUrl || (this.invite as any)?.frontJoinUrl || null;
        this.shareUrl = preferred || (this.invite ? this.invites.buildShareUrl(this.invite.joinUrl) : null);
      },
      (e: any) => {
        this.saving = false;
        const msg = e && e.error && e.error.message ? e.error.message : 'No se pudo crear la invitación';
        this.notify.error('Error', msg);
      }
    );
  }

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  copyLink() {
    const t = (this.shareUrl || '').toString();
    if (!t) return;
    try { navigator.clipboard.writeText(t); this.notify.info('Copiado', 'Enlace copiado.'); } catch {}
  }
}
