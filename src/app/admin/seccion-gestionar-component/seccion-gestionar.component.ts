import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { OrgContextService } from '../../service/org-context.service';
import { NotificationService } from '../../service/notification.service';
import { Subscription } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-seccion-gestionar',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, ButtonModule, TagModule, TooltipModule, ProgressSpinnerModule],
  templateUrl: './seccion-gestionar.component.html',
  styleUrls: ['./seccion-gestionar.component.scss']
})
export class SeccionGestionarComponent implements OnInit, OnDestroy {
  orgId: string | null = null;
  seccionId: string | null = null;
  seccion: SeccionEntity | null = null;
  loading = false;
  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private secciones: SeccionService,
    private orgCtx: OrgContextService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.sub = this.route.queryParamMap.subscribe(q => {
      const qOrg = q.get('id');
      this.orgId = this.orgCtx.ensureFromQuery(qOrg);
      this.seccionId = q.get('seccionId');
      if (!this.orgId) {
        this.notify.warn('Falta organización', 'Selecciona una organización');
        this.router.navigate(['/listar-organizaciones']);
        return;
      }
      if (this.seccionId) this.load();
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  load() {
    if (!this.orgId || !this.seccionId) return;
    this.loading = true;
    this.secciones.get(this.orgId, this.seccionId).subscribe({
      next: (s) => { this.seccion = s; this.loading = false; },
      error: (e) => { this.notify.error('Error', e?.error?.message || 'No se pudo cargar la sección'); this.loading = false; }
    });
  }

  crearLugar() {
    if (!this.orgId) return;
    this.router.navigate(['/crear-lugar'], { queryParams: { id: this.orgId, seccionId: this.seccionId } });
  }

  listarLugares() {
    if (!this.orgId) return;
    this.router.navigate(['/listar-lugares'], { queryParams: { id: this.orgId } });
  }

  asignarAdmin() {
  }

  volver() { this.router.navigate(['/listar-secciones'], { queryParams: this.orgId ? { id: this.orgId } : undefined }); }
}
