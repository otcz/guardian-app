import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { OrgContextService } from '../service/org-context.service';
import { DashboardService, DashboardHomeDto } from '../service/dashboard.service';
import { NotificationService } from '../service/notification.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, CardModule, TagModule, ProgressSpinnerModule],
  templateUrl: './dashboard-home.component.html'
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  loading = false;
  orgId: string | null = null;

  data: DashboardHomeDto | null = null;
  qrDataUrl: string | null = null;

  private destroyed = false;

  constructor(
    private orgCtx: OrgContextService,
    private dashboard: DashboardService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) return; // OrgRequiredGuard ya protege
    this.load();
  }

  ngOnDestroy(): void { this.destroyed = true; }

  private load() {
    if (!this.orgId) return;
    this.loading = true;
    this.dashboard.getHome(this.orgId).subscribe({
      next: async (d) => {
        if (this.destroyed) return;
        this.data = d || null;
        this.loading = false;
        // Generar QR solo si backend envió string (presentación)
        const qrStr = (d as any)?.qrString ?? (typeof (d as any)?.qr === 'string' ? (d as any)?.qr : null);
        if (qrStr) {
          try { this.qrDataUrl = await QRCode.toDataURL(String(qrStr), { margin: 1, width: 200 }); }
          catch { this.qrDataUrl = null; }
        } else {
          this.qrDataUrl = null;
        }
      },
      error: (e) => {
        if (this.destroyed) return;
        this.loading = false;
        this.notify.error('Inicio', e?.error?.message || 'No se pudo cargar el resumen');
      }
    });
  }

  // Helpers de UI
  get usuarioNombre(): string {
    const u = this.data?.usuario as any;
    return (u?.nombreCompleto ?? u?.nombre ?? '') || '';
  }
  get usuarioDoc(): string {
    const u = this.data?.usuario as any;
    return (u?.documentoIdentidad ?? '') || '';
  }
}
