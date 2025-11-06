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
import { OrganizationService, Organization } from '../../service/organization.service';
import { OrgContextService } from '../../service/org-context.service';
import { MessageService } from 'primeng/api';
import { UsersService, UserEntity } from '../../service/users.service';
import { ViewportScroller } from '@angular/common';
import { HttpResponse } from '@angular/common/http';

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

  // usuarios de la organización para asignar como admin
  usuarios: UserEntity[] = [];
  loadingUsers = false;
  selectedUserId: string | null = null;
  savingAdmin = false;

  // foco a sección asignar admin si viene por query param
  private shouldFocusAssignAdmin = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgSvc: OrganizationService,
    private messageService: MessageService,
    private orgCtx: OrgContextService,
    private usersSvc: UsersService,
    private scroller: ViewportScroller
  ) {}

  ngOnInit(): void {
    const locked = this.orgCtx.isLocked;
    const qp = this.route.snapshot.queryParamMap;
    const resolved = qp.get('id') || localStorage.getItem('currentOrgId') || '';
    this.shouldFocusAssignAdmin = (qp.get('focus') === 'assign-admin');
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
      // Cargar usuarios de la organización para asignar admin
      this.loadUsers();
      // Intentar foco si fue solicitado
      this.tryFocusAssignAdmin();
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
    this.selectedUserId = null;
    this.loadUsers();
    this.tryFocusAssignAdmin();
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

  private tryFocusAssignAdmin() {
    if (!this.shouldFocusAssignAdmin) return;
    setTimeout(() => this.scroller.scrollToAnchor('assign-admin-section'), 50);
  }

  private loadUsers() {
    if (!this.orgId) { this.usuarios = []; return; }
    this.loadingUsers = true;
    this.usersSvc.list(this.orgId).subscribe({
      next: (list) => { this.usuarios = list || []; this.loadingUsers = false; this.tryFocusAssignAdmin(); },
      error: () => { this.usuarios = []; this.loadingUsers = false; this.tryFocusAssignAdmin(); }
    });
  }

  assignAdmin() {
    if (!this.orgId) { this.messageService.add({ severity: 'warn', summary: 'Organización', detail: 'Seleccione organización', life: 3000 }); return; }
    if (!this.selectedUserId) { this.messageService.add({ severity: 'warn', summary: 'Usuario', detail: 'Seleccione usuario', life: 3000 }); return; }
    this.savingAdmin = true;
    this.orgSvc.assignOrgAdmin(this.orgId, this.selectedUserId, true).subscribe({
      next: (resp: any) => {
        // Si recibimos HttpResponse (observeResponse = true)
        if (resp instanceof HttpResponse) {
          console.log('[ORG CONFIG] assignOrgAdmin HttpResponse status:', resp.status);
          console.log('[ORG CONFIG] assignOrgAdmin HttpResponse headers:', resp.headers ? resp.headers.keys().map(k => ({ [k]: resp.headers.get(k) })) : {});
          console.log('[ORG CONFIG] assignOrgAdmin HttpResponse body:', resp.body);
        } else {
          console.log('[ORG CONFIG] assignOrgAdmin mapped response:', resp);
        }
        // Mantener compatibilidad: mensaje original (intentar extraer message cuando exista)
        this.savingAdmin = false;
        const msg = (resp && (resp as any).body && (resp as any).body.message) || (resp && (resp as any).message) || 'Administrador asignado';
        this.messageService.add({ severity: 'success', summary: 'Asignado', detail: msg, life: 3000 });
        // Verificación adicional: consultar candidatos y confirmar que el usuario aparece
        this.orgSvc.listAdminCandidates(this.orgId).subscribe({
          next: (cands) => {
            console.log('[ORG CONFIG] listAdminCandidates response:', cands);
            const found = Array.isArray(cands) && cands.some((u: any) => String(u?.id ?? u?._id ?? u?.usuarioId ?? u?.userId) === String(this.selectedUserId));
            if (!found) {
              this.messageService.add({ severity: 'warn', summary: 'Verificación', detail: 'La API respondió ok pero no se encontró al usuario en la lista de administradores; revise el backend.', life: 6000 });
              // intentar recargar usuarios para reflejar estado real
              this.loadUsers();
            } else {
              // Recargar usuarios para reflejar cambios en UI
              this.loadUsers();
            }
          },
          error: (err) => {
            console.error('[ORG CONFIG] listAdminCandidates error:', err);
            // Si falla la verificación, al menos recargar usuarios
            this.loadUsers();
          }
        });
        this.shouldFocusAssignAdmin = false;
      },
      error: (e) => {
        console.error('[ORG CONFIG] assignOrgAdmin error:', e);
        this.savingAdmin = false;
        const status = e?.status;
        if (status === 403) this.messageService.add({ severity: 'warn', summary: 'No autorizado', detail: 'Solo SYSADMIN puede asignar administrador.', life: 4000 });
        else this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.error?.message || 'No se pudo asignar el administrador', life: 4000 });
      }
    });
  }

  back() {
    this.router.navigate(['/listar-organizaciones']);
  }
}
