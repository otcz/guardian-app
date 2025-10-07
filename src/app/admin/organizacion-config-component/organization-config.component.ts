import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {CardModule} from 'primeng/card';
import {DropdownModule} from 'primeng/dropdown';
import {ButtonModule} from 'primeng/button';
import {MessageModule} from 'primeng/message';
import {TagModule} from 'primeng/tag';
import {ProgressSpinnerModule} from 'primeng/progressspinner';
import {MultiSelectModule} from 'primeng/multiselect';
import {forkJoin, Observable} from 'rxjs';
import {OrganizationService, GovernanceStrategy, Organization} from '../../service/organization.service';
import {MessageService} from 'primeng/api';

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

  // Catálogo global (para seleccionar la vigente)
  catalogStrategies: GovernanceStrategy[] = [];
  // Estrategias propias de la organización (para habilitar/deshabilitar)
  orgStrategies: GovernanceStrategy[] = [];

  // Vigente (única)
  selectedStrategyId: string | null = null;
  selectedStrategy: GovernanceStrategy | null = null;
  // Habilitadas (múltiples)
  activeIds: string[] = [];

  savingVigente = false;
  savingActivas = false;

  // NUEVO: listado y carga de organizaciones para selector
  orgs: Organization[] = [];
  loadingOrgs = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgSvc: OrganizationService,
    private messageService: MessageService
  ) {
  }

  ngOnInit(): void {
    const resolved = this.route.snapshot.queryParamMap.get('id') || localStorage.getItem('currentOrgId') || '';
    if (!resolved) {
      // Si no hay id, cargar listado y seleccionar por defecto
      this.loadOrganizations(true);
    } else {
      this.orgId = resolved;
      localStorage.setItem('currentOrgId', this.orgId);
      this.loadAll();
      // Precargar listado en segundo plano
      this.loadOrganizations(false);
    }
  }

  private loadOrganizations(selectFirst: boolean) {
    this.loadingOrgs = true;
    this.orgSvc.list().subscribe({
      next: (list) => {
        this.orgs = list || [];
        this.loadingOrgs = false;
        if (selectFirst && this.orgs.length > 0) {
          const first = this.orgs.find(o => o.activa) || this.orgs[0];
          if (first?.id) this.onOrgChanged(first.id);
        }
      },
      error: () => { this.loadingOrgs = false; }
    });
  }

  onOrgChanged(newId: string) {
    if (!newId) return;
    this.orgId = newId;
    localStorage.setItem('currentOrgId', this.orgId);
    this.loadAll();
  }

  private loadAll() {
    this.loading = true;
    this.error = null;
    this.success = null;
    this.orgSvc.get(this.orgId).subscribe({
      next: (o: Organization) => {
        this.org = o;
        this.selectedStrategyId = o?.id_estrategia_gobernanza || null;
        this.loadStrategies();
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'No se pudo cargar la organización';
        this.loading = false;
      }
    });
  }

  private loadStrategies() {
    // Cargar catálogo global y estrategias de la organización en paralelo
    forkJoin({
      catalog: this.orgSvc.listCatalogGovernanceStrategies(),
      byOrg: this.orgSvc.listOrgGovernanceStrategies(this.orgId)
    }).subscribe({
      next: ({catalog, byOrg}) => {
        this.catalogStrategies = catalog || [];
        this.orgStrategies = byOrg || [];
        // Active IDs provienen de byOrg
        this.activeIds = (this.orgStrategies.filter(s => !!s.activa).map(s => s.id!).filter(Boolean) as string[]);
        // Si no hay vigente seleccionada aún, intenta usar la de la org o primera del catálogo
        if (!this.selectedStrategyId) {
          this.selectedStrategyId = this.org?.id_estrategia_gobernanza || (this.catalogStrategies[0]?.id ?? null);
        }
        this.onStrategyChange();
        this.loading = false;
      },
      error: (e: any) => {
        // Si falla cualquiera, intentar al menos catálogo global para permitir selección
        this.orgSvc.listCatalogGovernanceStrategies().subscribe({
          next: (catalog) => {
            this.catalogStrategies = catalog || [];
            if (!this.selectedStrategyId) this.selectedStrategyId = this.org?.id_estrategia_gobernanza || (this.catalogStrategies[0]?.id ?? null);
            this.onStrategyChange();
            this.loading = false;
          },
          error: (e2) => {
            this.error = e2?.error?.message || 'No se pudieron cargar estrategias';
            this.loading = false;
          }
        });
      }
    });
  }

  onStrategyChange() {
    this.selectedStrategy = (this.catalogStrategies || []).find(s => s.id === this.selectedStrategyId) || null;
  }

  // Guardar vigente (FK id_estrategia_gobernanza)
  saveVigente() {
    if (!this.selectedStrategyId) {
      this.error = 'Seleccione una estrategia';
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Seleccione una estrategia',
        life: 3500
      });
      return;
    }
    this.savingVigente = true;
    this.error = null;
    this.success = null;
    // Aplicar como actual vía endpoint dedicado (POST /aplicar)
    this.orgSvc.applyOrgStrategy(this.orgId, this.selectedStrategyId).subscribe({
      next: (res) => {
        const msg = res?.message || 'Estrategia aplicada correctamente';
        this.success = msg;
        this.messageService.add({severity: 'success', summary: 'Aplicada', detail: msg, life: 3500});
        // Refrescar organización para reflejar vigente
        this.orgSvc.get(this.orgId).subscribe({
          next: (o) => {
            this.org = o;
            this.savingVigente = false;
          }, error: () => {
            this.savingVigente = false;
          }
        });
      },
      error: (e: any) => {
        const msg = e?.error?.message || 'No se pudo aplicar la estrategia';
        this.error = msg;
        this.messageService.add({severity: 'error', summary: 'Error', detail: msg, life: 4500});
        this.savingVigente = false;
      }
    });
  }

  // Guardar habilitadas (múltiples)
  saveActivas() {
    this.savingActivas = true;
    this.error = null;
    this.success = null;
    const desired = new Set(this.activeIds || []);
    const ops: Observable<any>[] = [];
    for (const s of this.orgStrategies) {
      if (!s.id) continue;
      const shouldBe = desired.has(s.id);
      if (!!s.activa !== shouldBe) {
        ops.push(this.orgSvc.setOrgGovernanceStrategyActive(this.orgId, s.id, shouldBe));
      }
    }
    if (ops.length === 0) {
      const msg = 'No hay cambios en estrategias habilitadas';
      this.success = msg;
      this.savingActivas = false;
      this.messageService.add({severity: 'info', summary: 'Sin cambios', detail: msg, life: 3000});
      return;
    }
    forkJoin(ops).subscribe({
      next: () => {
        const msg = 'Estrategias habilitadas actualizadas';
        this.success = msg;
        this.savingActivas = false;
        this.messageService.add({severity: 'success', summary: 'Actualizado', detail: msg, life: 3500});
        // recargar solo estrategias por org para actualizar estados
        this.orgSvc.listOrgGovernanceStrategies(this.orgId).subscribe({
          next: (byOrg) => {
            this.orgStrategies = byOrg || [];
            this.activeIds = (this.orgStrategies.filter(s => !!s.activa).map(s => s.id!).filter(Boolean) as string[]);
          },
          error: () => {
          }
        });
      },
      error: (e: any) => {
        const msg = e?.error?.message || 'No se pudieron actualizar las estrategias habilitadas';
        this.error = msg;
        this.messageService.add({severity: 'error', summary: 'Error', detail: msg, life: 4500});
        this.savingActivas = false;
      }
    });
  }

  back() {
    this.router.navigate(['/listar-organizaciones']);
  }
}
