import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription } from 'rxjs';
import { SeccionEntity, SeccionService } from '../../service/seccion.service';
import { OrgContextService } from '../../service/org-context.service';
import { OrganizationService } from '../../service/organization.service';

@Component({
  selector: 'app-seccion-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, InputTextModule, TagModule, FormsModule, TooltipModule],
  templateUrl: './seccion-list.component.html',
  styleUrls: ['./seccion-list.component.scss']
})
export class SeccionListComponent implements OnInit, OnDestroy {
  orgId: string | null = null;
  orgName: string | null = null;
  loading = false;
  error: string | null = null;

  items: SeccionEntity[] = [];
  filtered: SeccionEntity[] = [];
  filter = '';

  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: SeccionService,
    private orgCtx: OrgContextService,
    private orgService: OrganizationService
  ) {}

  ngOnInit(): void {
    // Obtener id de organización desde query o contexto
    this.orgId = this.orgCtx.ensureFromQuery(this.route.snapshot.queryParamMap.get('id'));
    if (!this.orgId) { this.router.navigate(['/listar-organizaciones']); return; }
    this.loadOrgName(this.orgId);
    this.load();

    // Escuchar cambios del id de organización en la URL
    this.sub = this.route.queryParamMap.subscribe(qp => {
      const next = this.orgCtx.ensureFromQuery(qp.get('id'));
      if (next && next !== this.orgId) {
        this.orgId = next;
        this.loadOrgName(this.orgId);
        this.load();
      }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private loadOrgName(id: string) {
    this.orgName = null;
    this.orgService.get(id).subscribe({ next: (org) => this.orgName = org?.nombre || null, error: () => this.orgName = null });
  }

  load() {
    if (!this.orgId) return;
    this.loading = true;
    this.error = null;
    this.svc.list(this.orgId).subscribe({
      next: (data) => {
        this.items = data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Error al cargar secciones';
        this.loading = false;
      }
    });
  }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    if (!f) { this.filtered = [...this.items]; return; }
    this.filtered = this.items.filter(s =>
      (s.nombre || '').toLowerCase().includes(f) || (s.descripcion || '').toLowerCase().includes(f)
    );
  }

  goCreate() {
    // Navega al formulario de crear sección manteniendo el id de organización
    const queryParams = this.orgId ? { id: this.orgId } : undefined;
    this.router.navigate(['/crear-seccion'], { queryParams });
  }
}

