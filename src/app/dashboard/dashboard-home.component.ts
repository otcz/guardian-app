import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { OrgContextService } from '../service/org-context.service';
import { NotificationService } from '../service/notification.service';
import * as QRCode from 'qrcode';
import { AuthService } from '../service/auth.service';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, CardModule, TagModule, ProgressSpinnerModule, DialogModule, TooltipModule, SkeletonModule],
  templateUrl: './dashboard-home.component.html'
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  loading = false;
  orgId: string | null = null;
  data: any = null; // mantener por compatibilidad de template (vacío)
  qrDataUrl: string | null = null;
  lastQrString: string | null = null;
  showQrDialog = false;
  animIngresos = 0;
  animSalidas = 0;
  private animTimer: any;
  private destroyed = false;

  // Banderas de vista
  isSysAdmin = false;
  canViewGlobal = false;
  canViewOrgWide = false;
  canViewSectionWide = false;
  canViewSelfOnly = true;

  constructor(
    private orgCtx: OrgContextService,
    private notify: NotificationService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) return;
    this.isSysAdmin = this.auth.hasRole('SYSADMIN');
    const currentOrgName = (() => { try { return localStorage.getItem('currentOrgName'); } catch { return null; } })();
    const isDefaultOrg = (currentOrgName || '').toUpperCase() === 'DEFAULT_ORG';
    const hasOrgAdmin = this.auth.hasAnyRole('ORGADMIN', 'ADMIN_ORG', 'ADMIN');
    const hasSectionAdmin = this.auth.hasAnyRole('SECTION_ADMIN', 'SECCION_ADMIN', 'ADMIN_SECCION');
    this.canViewGlobal = this.isSysAdmin && isDefaultOrg;
    this.canViewOrgWide = !this.canViewGlobal && (this.isSysAdmin || hasOrgAdmin);
    this.canViewSectionWide = !this.canViewGlobal && !this.canViewOrgWide && hasSectionAdmin;
    this.canViewSelfOnly = !this.canViewGlobal && !this.canViewOrgWide && !this.canViewSectionWide;
    this.load();
  }

  private async load() {
    // Ya no se llama al backend; solo generar QR local y marcar loading en false.
    this.loading = true;
    try {
      const doc = this.getDocFromLocal();
      if (doc && this.orgId) {
        const qrStr = `GDQR|DOC|${doc}|ORG|${this.orgId}`;
        await this.buildQr(qrStr);
      } else {
        this.qrDataUrl = null;
      }
      this.startCounters(0, 0); // valores base (sin backend)
    } catch (e: any) {
      this.notify.error('Inicio', e?.message || 'No se pudo generar el QR local');
    } finally {
      if (!this.destroyed) this.loading = false;
    }
  }

  private async buildQr(str: string) {
    try { this.qrDataUrl = await QRCode.toDataURL(String(str), { margin: 1, width: 200 }); this.lastQrString = str; }
    catch { this.qrDataUrl = null; this.lastQrString = null; }
  }

  private getDocFromLocal(): string | null {
    try {
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username');
      const payload = token ? this.decodeJwtPayload(token) : null;
      const candidates = [
        payload?.documentoIdentidad,
        payload?.documento,
        payload?.doc,
        payload?.dni,
        payload?.idNumber,
        payload?.identificacion,
        payload?.numeroIdentificacion,
        payload?.cedula,
        username
      ];
      for (const c of candidates) if (typeof c === 'string' && c.trim()) return c.trim();
    } catch {}
    return null;
  }

  private decodeJwtPayload(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(json);
    } catch { return null; }
  }

  // Fallback de nombre desde JWT/localStorage
  private getNameFromLocal(): string | null {
    try {
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username');
      const p = token ? this.decodeJwtPayload(token) : null;
      const fullByFields = (
        (p?.nombreCompleto && String(p.nombreCompleto)) ||
        ((p?.nombres || p?.given_name) && (p?.apellidos || p?.family_name) ? `${p?.nombres || p?.given_name} ${p?.apellidos || p?.family_name}` : null) ||
        (p?.name && String(p.name)) ||
        (p?.preferred_username && String(p.preferred_username)) ||
        null
      );
      return (fullByFields || username || '').trim() || null;
    } catch { return null; }
  }

  get usuarioNombre(): string {
    const u = this.data?.usuario as any;
    return ((u?.nombreCompleto ?? u?.nombre) || this.getNameFromLocal() || '') as string;
  }
  get usuarioDoc(): string {
    const u = this.data?.usuario as any;
    return (u?.documentoIdentidad ?? this.getDocFromLocal() ?? '') as string;
  }
  get scopeBadge(): { text: string; severity: 'info' | 'success' | 'warn' | 'secondary' } {
    if (this.canViewGlobal) return { text: 'Vista global (sistema)', severity: 'info' };
    if (this.canViewOrgWide) return { text: 'Alcance: organización', severity: 'success' };
    if (this.canViewSectionWide) return { text: 'Alcance: secciones asignadas', severity: 'warn' };
    return { text: 'Alcance: personal', severity: 'secondary' };
  }

  refresh() { this.load(); }
  openQrDialog() { this.showQrDialog = true; }
  closeQrDialog() { this.showQrDialog = false; }
  copyQr() {
    const text = this.lastQrString || this.getDocFromLocal() || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => this.notify.info('QR', 'Copiado')).catch(() => this.notify.warn('QR', 'No se pudo copiar'));
  }
  downloadQr() {
    if (!this.qrDataUrl) return;
    const a = document.createElement('a');
    a.href = this.qrDataUrl;
    a.download = 'qr_usuario.png';
    a.click();
  }

  private startCounters(targetIngresos: number, targetSalidas: number) {
    this.stopCounters();
    const dur = 600; // ms
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      this.animIngresos = Math.round(targetIngresos * p);
      this.animSalidas = Math.round(targetSalidas * p);
      if (p < 1) this.animTimer = requestAnimationFrame(step);
    };
    this.animTimer = requestAnimationFrame(step);
  }
  private stopCounters() { if (this.animTimer) cancelAnimationFrame(this.animTimer); }
  ngOnDestroy(): void { this.destroyed = true; this.stopCounters(); }
}
