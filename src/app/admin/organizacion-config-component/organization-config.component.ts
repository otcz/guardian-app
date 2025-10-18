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
import {OrganizationService, Organization} from '../../service/organization.service';
import {MessageService} from 'primeng/api';
import { OrgContextService } from '../../service/org-context.service';

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

  // listado y carga de organizaciones para selector
  orgs: Organization[] = [];
  loadingOrgs = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgSvc: OrganizationService,
    private messageService: MessageService,
    private orgCtx: OrgContextService
  ) {}

  ngOnInit(): void {
    const locked = this.orgCtx.isLocked;
    const resolved = this.route.snapshot.queryParamMap.get('id') || localStorage.getItem('currentOrgId') || '';
    if (!resolved) {
      // Si no hay id, cargar listado y seleccionar por defecto
      this.loadOrganizations(true);
    } else {
      this.orgId = resolved;
      const current = this.orgCtx.value;
      if (locked && current && String(current) !== String(this.orgId)) {
        // No permitir cambiar si está bloqueado; mantener el actual
        this.orgId = current;
      } else {
        // Bloquear si aún no está bloqueado
        if (!locked) this.orgCtx.lock({ orgId: this.orgId, scopeNivel: this.orgCtx.scope, seccionPrincipalId: this.orgCtx.seccion });
      }
      this.loadOrg();
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
    const locked = this.orgCtx.isLocked;
    const current = this.orgCtx.value;
    if (locked && current && String(current) !== String(newId)) {
      // Contexto bloqueado: ignorar cambios
      this.orgId = current;
      return;
    }
    this.orgId = newId;
    if (!locked) this.orgCtx.lock({ orgId: this.orgId, scopeNivel: this.orgCtx.scope, seccionPrincipalId: this.orgCtx.seccion });
    this.loadOrg();
  }

  private loadOrg() {
    this.loading = true;
    this.error = null;
    this.success = null;
    this.orgSvc.get(this.orgId).subscribe({
      next: (o: Organization) => {
        this.org = o;
        this.loading = false;
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'No se pudo cargar la organización';
        this.loading = false;
      }
    });
  }

  back() {
    this.router.navigate(['/listar-organizaciones']);
  }
}
