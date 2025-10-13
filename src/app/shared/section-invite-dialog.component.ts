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
import * as QRCode from 'qrcode';

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
  generatingQr = false;

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

  private extractInvite(payload: any): InvitationDto | null {
    // Busca recursivamente un objeto que luzca como invitación
    const looksLikeInvite = (o: any) => o && typeof o === 'object' && (('codigo' in o) || ('joinUrl' in o) || ('inviteUrl' in o) || ('frontJoinUrl' in o));
    let cur: any = payload;
    let guard = 0;
    while (cur && guard < 4) {
      if (looksLikeInvite(cur)) return cur as InvitationDto;
      cur = (cur && typeof cur === 'object' && 'data' in cur) ? (cur as any).data : null;
      guard++;
    }
    return null;
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
        // Extraer invitación real aunque venga doblemente anidada
        const inv = this.extractInvite(data) || this.extractInvite(resp) || null;
        if (!inv) {
          this.invite = null;
          this.shareUrl = '';
          return;
        }
        this.invite = inv as InvitationDto;
        const rawPref = (inv as any)?.inviteUrl || (inv as any)?.frontJoinUrl || '';
        const pref = typeof rawPref === 'string' ? rawPref.trim() : '';
        const isInvalid = !pref || /(?:^|[\\/])(undefined|null)(?:$|[?#])/i.test(pref);
        const fromJoin = inv ? this.invites.buildShareUrl(inv.joinUrl) : '';
        const fromCode = inv?.codigo ? this.invites.buildFrontInviteUrlFromCode(inv.codigo) : '';
        this.shareUrl = (!isInvalid ? pref : '') || fromJoin || fromCode || '';
        // Si hay rol seleccionado, adjuntarlo en la URL como rolId
        try {
          if (this.shareUrl && this.rolContextualId) {
            const base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
            const u = this.shareUrl.startsWith('http') ? new URL(this.shareUrl) : new URL(this.shareUrl, base || 'http://localhost');
            u.searchParams.set('rolId', this.rolContextualId);
            this.shareUrl = u.toString();
          }
        } catch {}
      },
      (_e: any) => {
        this.saving = false;
        const msg = 'No se pudo crear la invitación';
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

  async downloadQr() {
    const url = (this.shareUrl || '').trim();
    if (!url) { this.notify.warn('Sin enlace', 'Genera primero la invitación.'); return; }
    try {
      this.generatingQr = true;
      const dataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, scale: 6, color: { dark: '#000000', light: '#FFFFFF' } });
      const a = document.createElement('a');
      a.href = dataUrl;
      const code = (this.invite?.codigo || 'invitacion');
      a.download = `invitacion-${code}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      this.notify.info('Descargado', 'QR descargado.');
    } catch (_e) {
      this.notify.error('Error', 'No se pudo generar el QR.');
    } finally {
      this.generatingQr = false;
    }
  }
}
