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
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-organization-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, InputTextModule, TagModule, FormsModule, TooltipModule, InputSwitchModule, DialogModule, DropdownModule, CardModule],
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
  adminSelectedUserId: string | null = null;
  adminSaving = false;
  adminError: string | null = null;

  constructor(private orgService: OrganizationService, private router: Router, private orgCtx: OrgContextService, private route: ActivatedRoute, private messages: MessageService, private auth: AuthService,
              private usersSvc: UsersService) {
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
    if (err) { this.messages.add({ severity: 'warning', summary: 'Validación', detail: err, life: 3500 }); return; }
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
    if (err) { this.messages.add({ severity: 'warning', summary: 'Validación', detail: err, life: 3500 }); return; }
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
        const idx = this.orgs.findIndex((o: Organization) => o.id === this.editingId);
        if (idx >= 0) {
          const resp: any = (res as any)?.org || {};
          const newActiva = (typeof resp.activa === 'boolean') ? resp.activa : desiredActive;
          // corregido thisorgs -> this.orgs
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
    if (!this.isSysadmin) {
      // Comportamiento original para roles no SYSADMIN: cambia contexto activo
      if (org.id) {
        localStorage.setItem('currentOrgId', org.id);
        this.orgCtx.set(org.id);
      }
    }
    // Para SYSADMIN: NO modificar contexto de login (inmutable). Solo preparar datos locales.
    this.adminOrgId = org.id ? String(org.id) : null;
    this.adminOrgNombre = org.nombre || null;
    this.adminSelectedUserId = null;
    this.showAdminDialog = true;
    this.adminError = null;
    this.loadAdminDialogData();
  }

  private loadAdminDialogData() {
    const orgId = this.adminOrgId;
    if (!orgId) { this.adminUsers = []; return; }
    this.adminLoadingUsers = true;
    this.usersSvc.list(orgId).subscribe({
      next: list => { this.adminUsers = list || []; this.adminLoadingUsers = false; },
      error: e => { this.adminUsers = []; this.adminLoadingUsers = false; this.adminError = e?.error?.message || 'No se pudieron listar usuarios'; }
    });
  }

  closeAdminDialog() {
    this.showAdminDialog = false;
    this.adminSelectedUserId = null;
    this.adminUsers = [];
    this.adminError = null;
  }

  confirmAssignAdmin() {
    if (!this.adminOrgId) { this.messages.add({ severity: 'warning', summary: 'Organización', detail: 'Falta organización', life: 3000 }); return; }
    if (!this.adminSelectedUserId) { this.messages.add({ severity: 'warning', summary: 'Usuario', detail: 'Seleccione usuario', life: 3000 }); return; }
    this.adminSaving = true;

    this.orgService.assignOrgAdmin(this.adminOrgId!, this.adminSelectedUserId!).subscribe({
      next: (res) => {
        this.adminSaving = false;
        const m = (res && (res as any).message) || 'Administrador asignado a la organización';
        this.messages.add({ severity: 'success', summary: 'Asignado', detail: m, life: 3000 });
        this.closeAdminDialog();
        // Recargar la lista para mostrar el administrador asignado
        this.load(true);
      },
      error: (e) => {
        this.adminSaving = false;
        const st = e?.status;
        const msg = e?.error?.message || e?.message || '';
        if (st === 401) return this.messages.add({ severity: 'warning', summary: 'No autenticado', detail: 'Inicie sesión para continuar', life: 4000 });
        if (st === 403) return this.messages.add({ severity: 'warning', summary: 'No autorizado', detail: 'Solo SYSADMIN puede asignar administrador', life: 4500 });
        if (st === 404) return this.messages.add({ severity: 'error', summary: 'No encontrado', detail: msg || 'Organización o usuario no encontrado', life: 5000 });
        if (st === 400) return this.messages.add({ severity: 'warning', summary: 'Solicitud inválida', detail: msg || 'Datos de entrada inválidos', life: 4500 });
        this.messages.add({ severity: 'error', summary: 'Error', detail: msg || 'No se pudo asignar el administrador', life: 5000 });
      }
    });
  }

  removeAdmin() {
    if (!this.adminOrgId) { this.messages.add({ severity: 'warning', summary: 'Organización', detail: 'Falta organización', life: 3000 }); return; }
    this.adminSaving = true;
    this.orgService.removeOrgAdmin(this.adminOrgId!).subscribe({
      next: (res) => {
        this.adminSaving = false;
        const m = (res && (res as any).message) || 'Administrador removido de la organización';
        this.messages.add({ severity: 'success', summary: 'Removido', detail: m, life: 3000 });
        this.closeAdminDialog();
        // Recargar la lista para reflejar el cambio
        this.load(true);
      },
      error: (e) => {
        this.adminSaving = false;
        const st = e?.status;
        const msg = e?.error?.message || e?.message || '';
        if (st === 401) return this.messages.add({ severity: 'warning', summary: 'No autenticado', detail: 'Inicie sesión para continuar', life: 4000 });
        if (st === 403) return this.messages.add({ severity: 'warning', summary: 'No autorizado', detail: 'Solo SYSADMIN puede remover administrador', life: 4500 });
        if (st === 404) {
          // Idempotente: si ya no existía, tratar como éxito suave
          this.messages.add({ severity: 'info', summary: 'Sin cambios', detail: 'La organización no tiene administrador asignado', life: 3500 });
          this.closeAdminDialog();
          // Recargar para asegurarnos que está actualizado
          this.load(true);
          return;
        }
        this.messages.add({ severity: 'error', summary: 'Error', detail: msg || 'No se pudo remover el administrador', life: 5000 });
      }
    });
  }
}
