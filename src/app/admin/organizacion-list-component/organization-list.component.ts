// filepath: c:\Users\oscar.carrillo\WebstormProjects\guardian-app\src\app\admin\organization-list.component.ts
import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterModule, ActivatedRoute} from '@angular/router';
import {Organization, OrganizationService} from '../../service/organization.service';
import {TableModule} from 'primeng/table';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TagModule} from 'primeng/tag';
import {FormsModule} from '@angular/forms';
import {TooltipModule} from 'primeng/tooltip';
import { OrgContextService } from '../../service/org-context.service';
import { MessageService } from 'primeng/api';
import { InputSwitchModule } from 'primeng/inputswitch';
import { AuthService } from '../../service/auth.service';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { UsersService, UserEntity } from '../../service/users.service';
import { OpcionesService, OpcionEntity } from '../../service/opciones.service';

@Component({
  selector: 'app-organization-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, InputTextModule, TagModule, FormsModule, TooltipModule, InputSwitchModule, DialogModule, DropdownModule],
  templateUrl: './organization-list.component.html',
  styleUrls: ['./organization-list.component.scss']
})
export class OrganizationListComponent implements OnInit {
  loading = false;
  orgs: Organization[] = [];
  filtered: Organization[] = [];
  filter = '';
  error: string | null = null;
  private returnUrl: string | null = null;

  // Edición / creación en línea
  adding = false;
  saving = false;
  newDraft: Organization = this.blank();
  editingId: string | null = null;
  editDraft: Organization | null = null;
  flashRowId: string | null = null;

  // ==== Modal Asignar Admin ====
  showAdminDialog = false;
  adminOrgId: string | null = null;
  adminOrgNombre: string | null = null;
  adminUsers: UserEntity[] = [];
  adminLoadingUsers = false;
  adminLoadingOptions = false;
  adminSelectedUserId: string | null = null;
  adminSaving = false;
  adminError: string | null = null;
  adminOptionId: string | null = null;

  constructor(private orgService: OrganizationService, private router: Router, private orgCtx: OrgContextService, private route: ActivatedRoute, private messages: MessageService, private auth: AuthService,
              private usersSvc: UsersService, private opcionesSvc: OpcionesService) {
  }

  get isSysadmin(): boolean { return this.auth.hasRole('SYSADMIN'); }

  ngOnInit() {
    // Preferir navigation state, con fallback a query param (legacy)
    const stateReturn: string | null = (this.router.getCurrentNavigation()?.extras?.state as any)?.returnUrl ?? (history && (history.state as any)?.returnUrl) ?? null;
    const qpReturn = this.route.snapshot.queryParamMap.get('returnUrl');
    this.returnUrl = stateReturn || qpReturn || null;
    // Limpiar la URL si venía por query param legacy
    if (qpReturn) {
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
    this.load(true);
  }

  load(silent: boolean = false) {
    this.loading = true;
    this.error = null;
    this.orgService.list().subscribe({
      next: (data) => {
        this.orgs = data || [];
        this.applyFilter();
        this.loading = false;
        if (!silent) {
          const count = this.orgs.length;
          this.messages.add({ severity: 'success', summary: 'Actualizado', detail: `Datos actualizados (${count})`, life: 2500 });
        }
      },
      error: (e) => {
        this.error = e?.error?.message || 'Error al cargar organizaciones';
        this.loading = false;
        const msg = this.error || 'Error al cargar organizaciones';
        this.messages.add({ severity: 'error', summary: 'Error', detail: msg, life: 4500 });
      }
    });
  }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    if (!f) {
      this.filtered = [...this.orgs];
      return;
    }
    this.filtered = this.orgs.filter(o => (o.nombre || '').toLowerCase().includes(f));
  }

  // ====== Inline Add / Edit ======
  private blank(): Organization { return { id: '', nombre: '', activa: true }; }

  get rows(): Organization[] { return this.adding ? [this.newDraft, ...this.filtered] : this.filtered; }

  startAdd() { if (this.editingId) return; this.adding = true; this.newDraft = this.blank(); }
  cancelAdd() { this.adding = false; this.newDraft = this.blank(); }
  saveAdd() {
    const err = this.validate(this.newDraft);
    if (err) { this.messages.add({ severity: 'warn', summary: 'Validación', detail: err, life: 3500 }); return; }
    this.saving = true;
    const body = { nombre: (this.newDraft.nombre || '').trim(), activa: !!this.newDraft.activa };
    this.orgService.create(body).subscribe({
      next: (res) => {
        const created = res.org; this.orgs.push(created); this.applyFilter();
        this.saving = false; this.adding = false; this.newDraft = this.blank();
        this.flash(created.id);
        const msg = res?.message || 'Organización creada';
        this.messages.add({ severity: 'success', summary: 'Creado', detail: msg, life: 3500 });
      },
      error: (e) => {
        const msg = e?.error?.message || 'Error al crear organización';
        this.saving = false;
        this.messages.add({ severity: 'error', summary: 'Error', detail: msg, life: 4500 });
      }
    });
  }

  startEdit(row: Organization) { if (this.adding) return; this.editingId = row.id || null; this.editDraft = { ...row }; }
  cancelEdit() { this.editingId = null; this.editDraft = null; }
  saveEdit() {
    if (!this.editDraft || !this.editingId) return;
    const err = this.validate(this.editDraft);
    if (err) { this.messages.add({ severity: 'warn', summary: 'Validación', detail: err, life: 3500 }); return; }
    this.saving = true;
    const desiredName = (this.editDraft.nombre || '').trim();
    const desiredActive = !!this.editDraft.activa;
    const original = this.orgs.find(o => o.id === this.editingId);
    const nameChanged = original ? (desiredName !== (original.nombre || '').trim()) : true;
    const activeChanged = original ? (desiredActive !== !!original.activa) : true;

    if (!nameChanged && activeChanged) {
      // Solo cambia 'activa' -> usar endpoint dedicado ?value=...
      this.orgService.setOrgActive(this.editingId, desiredActive).subscribe({
        next: (res) => {
          const idx = this.orgs.findIndex(o => o.id === this.editingId);
          if (idx >= 0) {
            const resp: any = (res as any)?.org || {};
            const newActiva = (typeof resp.activa === 'boolean') ? resp.activa : desiredActive;
            this.orgs[idx] = { ...this.orgs[idx], ...resp, activa: newActiva } as Organization;
          }
          this.applyFilter();
          const flashId = this.editingId;
          this.cancelEdit();
          this.saving = false;
          if (flashId) this.flash(flashId);
          const msg = res?.message || 'Estado actualizado';
          this.messages.add({ severity: 'success', summary: 'Actualizado', detail: msg, life: 3000 });
        },
        error: (e) => {
          const msg = e?.error?.message || 'Error al actualizar estado';
          this.saving = false;
          this.messages.add({ severity: 'error', summary: 'Error', detail: msg, life: 4500 });
        }
      });
      return;
    }

    // Nombre cambiado (con o sin activa) -> PATCH unificado
    const body = { nombre: desiredName, activa: desiredActive };
    this.orgService.update(this.editingId, body).subscribe({
      next: (res) => {
        const idx = this.orgs.findIndex(o => o.id === this.editingId);
        if (idx >= 0) {
          const resp: any = (res as any)?.org || {};
          const newActiva = (typeof resp.activa === 'boolean') ? resp.activa : desiredActive;
          this.orgs[idx] = { ...this.orgs[idx], ...resp, activa: newActiva } as Organization;
        }
        this.applyFilter();
        const flashId = this.editingId;
        this.cancelEdit();
        this.saving = false;
        if (flashId) this.flash(flashId);
        const msg = res?.message || 'Organización actualizada';
        this.messages.add({ severity: 'success', summary: 'Actualizado', detail: msg, life: 3500 });
      },
      error: (e) => {
        const msg = e?.error?.message || 'Error al actualizar organización';
        this.saving = false;
        this.messages.add({ severity: 'error', summary: 'Error', detail: msg, life: 4500 });
      }
    });
  }

  validate(model: Organization): string | null {
    const name = (model?.nombre || '').trim();
    if (!name || name.length < 3) return 'EL NOMBRE ES REQUERIDO (MÍN. 3 CARACTERES)';
    return null;
  }

  onEditChange<K extends keyof Organization>(key: K, value: Organization[K]) { if (this.editDraft) (this.editDraft as any)[key] = value as any; }
  onKeyAdd(ev: KeyboardEvent) { if (ev.key === 'Enter') this.saveAdd(); if (ev.key === 'Escape') this.cancelAdd(); }
  onKeyEdit(ev: KeyboardEvent) { if (ev.key === 'Enter') this.saveEdit(); if (ev.key === 'Escape') this.cancelEdit(); }

  private flash(id: string | undefined | null) { if (!id) return; this.flashRowId = id; setTimeout(() => this.flashRowId = null, 1200); }

  goCreate() {
    this.router.navigate(['/crear-organizacion']);
  }

  manage(org: Organization) {
    if (org.id) {
      localStorage.setItem('currentOrgId', org.id);
      this.orgCtx.set(org.id);
    }
    this.messages.add({ severity: 'success', summary: 'Organización seleccionada', detail: org.nombre, life: 2200 });
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }
    // Bloquear inmediatamente tras la primera selección y navegar
    this.orgCtx.lock({ orgId: org.id ? String(org.id) : null, scopeNivel: this.orgCtx.scope, seccionPrincipalId: this.orgCtx.seccion });
    this.router.navigate(['/gestionar-organizacion'], { queryParams: { id: org.id } });
  }

  // Nuevo: Abrir modal para asignar Administrador de la Organización (solo SYSADMIN)
  assignAdmin(org: Organization) {
    if (!this.isSysadmin) { return; }
    this.adminOrgId = org.id ? String(org.id) : null;
    this.adminOrgNombre = org.nombre || null;
    this.adminSelectedUserId = null;
    this.showAdminDialog = true;
    this.adminError = null;
    // Mantener contexto como antes
    if (org.id) {
      localStorage.setItem('currentOrgId', org.id);
      this.orgCtx.set(org.id);
    }
    // Cargar datos necesarios (usuarios y opción admin)
    this.loadAdminDialogData();
  }

  private loadAdminDialogData() {
    const orgId = this.adminOrgId;
    if (!orgId) { this.adminUsers = []; this.adminOptionId = null; return; }
    // Usuarios
    this.adminLoadingUsers = true;
    this.usersSvc.list(orgId).subscribe({
      next: list => { this.adminUsers = list || []; this.adminLoadingUsers = false; },
      error: e => { this.adminUsers = []; this.adminLoadingUsers = false; this.adminError = e?.error?.message || 'No se pudieron listar usuarios'; }
    });
    // Resolver opcionId de Administrador de Organización
    this.adminLoadingOptions = true;
    this.opcionesSvc.listOrgOptions(orgId).subscribe({
      next: (ops: OpcionEntity[]) => {
        this.adminLoadingOptions = false;
        this.adminOptionId = this.resolveAdminOptionId(ops);
        if (!this.adminOptionId) {
          this.adminError = 'No se encontró la opción de Administrador de Organización en el catálogo de opciones.';
        }
      },
      error: (e) => {
        this.adminLoadingOptions = false;
        this.adminOptionId = null;
        this.adminError = e?.error?.message || 'No se pudieron cargar las opciones de la organización';
      }
    });
  }

  private resolveAdminOptionId(ops: OpcionEntity[]): string | null {
    if (!Array.isArray(ops) || ops.length === 0) return null;
    // Buscar por códigos comunes
    const candidates = ['ORGADMIN', 'ORG_ADMIN', 'ADMIN_ORG', 'ADMIN_ORGANIZACION', 'ADMINISTRADOR_ORGANIZACION', 'ORG:ADMIN', 'ADMIN:ORG'];
    const byCode = ops.find(o => (o.codigo || '').toUpperCase() && candidates.includes((o.codigo || '').toUpperCase()));
    if (byCode?.id) return byCode.id;
    // Heurística por nombre
    const byName = ops.find(o => {
      const n = (o.nombre || '').toUpperCase();
      return n.includes('ADMIN') && (n.includes('ORGANIZ') || n.includes('ORG'));
    });
    return byName?.id || null;
  }

  closeAdminDialog() {
    this.showAdminDialog = false;
    this.adminSelectedUserId = null;
    this.adminUsers = [];
    this.adminError = null;
    this.adminOptionId = null;
  }

  confirmAssignAdmin() {
    if (!this.adminOrgId) { this.messages.add({ severity: 'warn', summary: 'Organización', detail: 'Falta organización', life: 3000 }); return; }
    if (!this.adminSelectedUserId) { this.messages.add({ severity: 'warn', summary: 'Usuario', detail: 'Seleccione usuario', life: 3000 }); return; }
    this.adminSaving = true;
    if (this.adminOptionId) {
      // Preferir asignación por opción si está disponible
      this.opcionesSvc.assignOptionToUser(this.adminOrgId, this.adminSelectedUserId, this.adminOptionId, null, true).subscribe({
        next: () => {
          this.adminSaving = false;
          this.messages.add({ severity: 'success', summary: 'Asignado', detail: 'Administrador asignado a la organización', life: 3000 });
          this.closeAdminDialog();
        },
        error: (e) => {
          this.adminSaving = false;
          const status = e?.status;
          if (status === 403) this.messages.add({ severity: 'warn', summary: 'No autorizado', detail: 'Requiere SYSADMIN u ORGADMIN en la organización', life: 4000 });
          else this.messages.add({ severity: 'error', summary: 'Error', detail: e?.error?.message || 'No se pudo asignar el administrador', life: 4000 });
        }
      });
      return;
    }

    // Fallback: si no existe la opción en el catálogo, usar el endpoint directo de organización
    this.orgService.assignOrgAdmin(this.adminOrgId, this.adminSelectedUserId).subscribe({
      next: (res) => {
        this.adminSaving = false;
        const msg = (res && (res as any).message) || 'Administrador asignado a la organización';
        this.messages.add({ severity: 'success', summary: 'Asignado', detail: msg, life: 3000 });
        this.closeAdminDialog();
      },
      error: (e) => {
        this.adminSaving = false;
        const status = e?.status;
        if (status === 403) this.messages.add({ severity: 'warn', summary: 'No autorizado', detail: 'Requiere SYSADMIN u ORGADMIN en la organización', life: 4000 });
        else this.messages.add({ severity: 'error', summary: 'Error', detail: e?.error?.message || 'No se pudo asignar el administrador', life: 4000 });
      }
    });
  }
}
