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
import { OrganizationService, GovernanceStrategy, Organization } from '../../service/organization.service';

@Component({
  selector: 'app-organization-config',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CardModule, DropdownModule, ButtonModule, MessageModule, TagModule, ProgressSpinnerModule],
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
  selectedStrategyId: string | null = null;
  selectedStrategy: GovernanceStrategy | null = null;
  associating = false;

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
      next: o => { this.org = o; this.loadStrategies(); this.loadCurrentStrategy(); },
      error: e => { this.error = e?.error?.message || 'No se pudo cargar la organización'; this.loading = false; }
    });
  }

  private loadStrategies() {
    this.orgSvc.listOrgGovernanceStrategies(this.orgId).subscribe({
      next: list => { this.strategies = list || []; },
      error: e => { this.error = e?.error?.message || 'No se pudo cargar estrategias'; }
    });
  }

  private loadCurrentStrategy() {
    this.orgSvc.getCurrentOrgStrategyAuto(this.orgId).subscribe({
      next: s => { this.selectedStrategyId = s?.id || null; this.selectedStrategy = s; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  onStrategyChange() {
    this.selectedStrategy = (this.strategies || []).find(s => s.id === this.selectedStrategyId) || null;
  }

  associateStrategy() {
    if (!this.selectedStrategyId) return;
    this.associating = true; this.error = null; this.success = null;
    this.orgSvc.update(this.orgId, { estrategia: this.selectedStrategyId } as any).subscribe({
      next: o => { this.org = o; this.success = 'Estrategia asociada a la organización'; this.associating = false; this.loadCurrentStrategy(); },
      error: e => { this.error = e?.error?.message || 'No se pudo asociar la estrategia'; this.associating = false; }
    });
  }

  disassociateStrategy() {
    this.associating = true; this.error = null; this.success = null;
    this.orgSvc.update(this.orgId, { estrategia: null } as any).subscribe({
      next: o => { this.org = o; this.selectedStrategyId = null; this.selectedStrategy = null; this.success = 'Estrategia desasociada'; this.associating = false; },
      error: e => { this.error = e?.error?.message || 'No se pudo desasociar la estrategia'; this.associating = false; }
    });
  }

  back() { this.router.navigate(['/listar-organizaciones']); }
}
