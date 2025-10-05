import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MultiSelectModule } from 'primeng/multiselect';
import { forkJoin, Observable } from 'rxjs';
import { OrganizationService, GovernanceStrategy, Organization } from '../../service/organization.service';

@Component({
  selector: 'app-organization-config',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CardModule, DropdownModule, ButtonModule, MessageModule, TagModule, ProgressSpinnerModule, MultiSelectModule],
  templateUrl: './organization-config.component.html',
  styleUrls: ['./organization-config.component.scss']
})
export class OrganizationConfigComponent implements OnInit {
  orgId!: string;
  org: Organization | null = null;
  loading = false;
  error: string | null = null;
  success: string | null = null;

  strategies: GovernanceStrategy[] = [];
  // Vigente (única)
  selectedStrategyId: string | null = null;
  selectedStrategy: GovernanceStrategy | null = null;
  // Habilitadas (múltiples)
  activeIds: string[] = [];

  savingVigente = false;
  savingActivas = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgSvc: OrganizationService
  ) {}

  ngOnInit(): void {
    this.orgId = this.route.snapshot.queryParamMap.get('id') || localStorage.getItem('currentOrgId') || '';
    if (!this.orgId) { this.router.navigate(['/listar-organizaciones']); return; }
    localStorage.setItem('currentOrgId', this.orgId);
    this.loadAll();
  }

  private loadAll() {
    this.loading = true; this.error = null; this.success = null;
    this.orgSvc.get(this.orgId).subscribe({
      next: (o: Organization) => {
        this.org = o;
        this.selectedStrategyId = o?.id_estrategia_gobernanza || null;
        this.loadStrategies();
      },
      error: (e: any) => { this.error = e?.error?.message || 'No se pudo cargar la organización'; this.loading = false; }
    });
  }

  private loadStrategies() {
    this.orgSvc.listOrgGovernanceStrategies(this.orgId).subscribe({
      next: (list: GovernanceStrategy[]) => {
        this.strategies = list || [];
        this.activeIds = (this.strategies.filter(s => !!s.activa).map(s => s.id!).filter(Boolean) as string[]);
        if (!this.selectedStrategyId) {
          this.selectedStrategyId = this.org?.id_estrategia_gobernanza || this.activeIds[0] || null;
        }
        this.onStrategyChange();
        this.loading = false;
      },
      error: (e: any) => {
        // Fallback: listar desde catálogo global si el endpoint por organización no existe o devuelve 400/404
        const status = e?.status ?? 0;
        if (status === 400 || status === 404) {
          this.orgSvc.listCatalogGovernanceStrategies().subscribe({
            next: (list: GovernanceStrategy[]) => {
              this.strategies = list || [];
              // en catálogo no hay flags de activa por org; dejamos activeIds vacíos
              this.activeIds = [];
              if (!this.selectedStrategyId) {
                this.selectedStrategyId = this.org?.id_estrategia_gobernanza || null;
              }
              this.onStrategyChange();
              this.loading = false;
            },
            error: (e2: any) => {
              this.error = e2?.error?.message || 'No se pudieron cargar estrategias';
              this.loading = false;
            }
          });
        } else {
          this.error = e?.error?.message || 'No se pudo cargar estrategias';
          this.loading = false;
        }
      }
    });
  }

  onStrategyChange() {
    this.selectedStrategy = (this.strategies || []).find(s => s.id === this.selectedStrategyId) || null;
  }

  // Guardar vigente (FK id_estrategia_gobernanza)
  saveVigente() {
    if (!this.selectedStrategyId) { this.error = 'Seleccione una estrategia'; return; }
    this.savingVigente = true; this.error = null; this.success = null;
    // Guardar directamente en organización (patch)
    this.orgSvc.update(this.orgId, { estrategia: this.selectedStrategyId } as any).subscribe({
      next: (o: Organization) => { this.org = o; this.success = 'Estrategia vigente guardada'; this.savingVigente = false; },
      error: (e: any) => { this.error = e?.error?.message || 'No se pudo guardar la estrategia'; this.savingVigente = false; }
    });
  }

  // Guardar habilitadas (múltiples)
  saveActivas() {
    this.savingActivas = true; this.error = null; this.success = null;
    const desired = new Set(this.activeIds || []);
    const ops: Observable<any>[] = [];
    for (const s of this.strategies) {
      if (!s.id) continue;
      const shouldBe = desired.has(s.id);
      if (!!s.activa !== shouldBe) {
        ops.push(this.orgSvc.setOrgGovernanceStrategyActive(this.orgId, s.id, shouldBe));
      }
    }
    if (ops.length === 0) {
      this.success = 'No hay cambios en estrategias habilitadas';
      this.savingActivas = false; return;
    }
    forkJoin(ops).subscribe({
      next: () => { this.success = 'Estrategias habilitadas actualizadas'; this.savingActivas = false; this.loadStrategies(); },
      error: (e: any) => { this.error = e?.error?.message || 'No se pudieron actualizar las estrategias habilitadas'; this.savingActivas = false; }
    });
  }

  back() { this.router.navigate(['/listar-organizaciones']); }
}
