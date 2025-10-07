import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription, combineLatest } from 'rxjs';
import { RolesService, RoleEntity, UpdateRoleRequest } from '../../service/roles.service';
import { OrgContextService } from '../../service/org-context.service';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, InputTextModule, TagModule, FormsModule, TooltipModule, InputSwitchModule, ConfirmDialogModule],
  templateUrl: './roles-list.component.html',
  styleUrls: ['./roles-list.component.scss']
})
export class RolesListComponent implements OnInit, OnDestroy {
  orgId: string | null = null;
  loading = false;
  saving = false;
  error: string | null = null;

  items: RoleEntity[] = [];
  filtered: RoleEntity[] = [];
  filter = '';

  adding = false;
  newDraft: RoleEntity = this.blank();
  editingId: string | null = null;
  editDraft: RoleEntity | null = null;
  flashRowId: string | null = null;

  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: RolesService,
    private orgCtx: OrgContextService,
    private confirm: ConfirmationService,
    private messages: MessageService
  ) {}

  ngOnInit(): void {
    this.sub = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([pm, qm]) => {
      const pId = pm.get('id');
      const qId = qm.get('id');
      const stored = localStorage.getItem('currentOrgId');
      const next = this.orgCtx.ensureFromQuery(pId || qId || stored);
      if (next && next !== this.orgId) {
        this.orgId = next;
        this.load();
      }
    });
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private blank(): RoleEntity { return { id: '', nombre: '', descripcion: '', estado: 'ACTIVO' }; }

  load() {
    if (!this.orgId) return;
    this.loading = true;
    this.error = null;
    this.svc.list(this.orgId).subscribe({
      next: (data) => { this.items = data || []; this.applyFilter(); this.loading = false; },
      error: (e) => { this.error = e?.error?.message || 'Error al cargar roles'; this.loading = false; }
    });
  }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    if (!f) { this.filtered = [...this.items]; return; }
    this.filtered = this.items.filter(s => (s.nombre || '').toLowerCase().includes(f) || (s.descripcion || '').toLowerCase().includes(f));
  }

  // Add
  startAdd() { if (this.editingId) return; this.adding = true; this.newDraft = this.blank(); }
  cancelAdd() { this.adding = false; this.newDraft = this.blank(); }
  saveAdd() {
    if (!this.orgId) return;
    const err = this.validate(this.newDraft);
    if (err) { this.toastWarn(err); return; }
    const body = { nombre: (this.newDraft.nombre || '').trim(), descripcion: (this.newDraft.descripcion || '').trim() || null };
    this.saving = true;
    this.svc.create(this.orgId, body).subscribe({
      next: (res) => {
        const created = res.role; this.items.push(created); this.applyFilter();
        this.saving = false; this.adding = false; this.newDraft = this.blank(); this.flash(created.id);
        this.toastSuccess(res.message || '');
      },
      error: (e) => { this.saving = false; this.toastError(e?.error?.message || e?.message || ''); }
    });
  }

  // Edit
  startEdit(row: RoleEntity) { if (this.adding) return; this.editingId = row.id; this.editDraft = { ...row }; }
  cancelEdit() { this.editingId = null; this.editDraft = null; }
  saveEdit() {
    if (!this.orgId || !this.editDraft || !this.editingId) return;
    const err = this.validate(this.editDraft);
    if (err) { this.toastWarn(err); return; }
    const body: UpdateRoleRequest = { nombre: (this.editDraft.nombre || '').trim(), descripcion: (this.editDraft.descripcion || '').trim() || null };
    const optimistic: Partial<RoleEntity> = { nombre: body.nombre!, descripcion: (body.descripcion ?? undefined) as any };
    this.saving = true;
    this.svc.update(this.orgId, this.editingId, body).subscribe({
      next: (res) => {
        const idx = this.items.findIndex(i => i.id === this.editingId);
        if (idx >= 0) this.items[idx] = { ...this.items[idx], ...optimistic, ...res.role } as RoleEntity;
        this.applyFilter(); const flashId = this.editingId; this.cancelEdit(); this.saving = false; if (flashId) this.flash(flashId);
        this.toastSuccess(res.message || '');
      },
      error: (e) => { this.saving = false; this.toastError(e?.error?.message || e?.message || ''); }
    });
  }

  // Delete
  remove(row: RoleEntity) {
    if (!this.orgId || !row.id) return;
    this.confirm.confirm({
      header: 'Confirmación',
      message: `¿Eliminar permanentemente el rol "${row.nombre}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        // Cerrar el diálogo inmediatamente para evitar que quede abierto
        try { this.confirm.close(); } catch {}
        this.saving = true;
        this.svc.delete(this.orgId!, row.id).subscribe({
          next: (res) => {
            this.items = this.items.filter(i => i.id !== row.id);
            this.applyFilter(); this.saving = false;
            this.toastSuccess(res?.message || '');
          },
          error: (e) => { this.saving = false; this.toastError(e?.error?.message || e?.message || ''); }
        });
      },
      reject: () => {
        // Asegurar cierre también en cancelación
        try { this.confirm.close(); } catch {}
      }
    });
  }

  // State toggle
  onToggleEstado(row: RoleEntity, checked: boolean) {
    if (!this.orgId) return;
    const target = checked ? 'ACTIVO' : 'INACTIVO';
    const prev = row.estado;
    row.estado = target;
    this.svc.changeState(this.orgId, row.id, target as any).subscribe({
      next: (res) => {
        const idx = this.items.findIndex(i => i.id === row.id);
        if (idx >= 0) this.items[idx] = { ...this.items[idx], ...res.role };
        this.applyFilter(); this.toastSuccess(res.message || '');
      },
      error: (e) => { row.estado = prev; this.toastError(e?.error?.message || e?.message || ''); }
    });
  }

  // Utils
  validate(model: RoleEntity): string | null {
    if (!model.nombre || model.nombre.trim().length < 3) return 'EL NOMBRE ES REQUERIDO (MÍN. 3 CARACTERES)';
    if (model.descripcion && model.descripcion.length > 160) return 'LA DESCRIPCIÓN EXCEDE 160 CARACTERES';
    return null;
  }
  flash(id: string) { this.flashRowId = id; setTimeout(() => this.flashRowId = null, 1200); }
  toastSuccess(summary: string) { if (summary) this.messages.add({ severity: 'success', summary, life: 3500 }); }
  toastWarn(summary: string) { if (summary) this.messages.add({ severity: 'warn', summary, life: 3500 }); }
  toastError(summary: string) { if (summary) this.messages.add({ severity: 'error', summary, life: 4500 }); }

  get rows(): RoleEntity[] { return this.adding ? [this.newDraft, ...this.filtered] : this.filtered; }
  onEditChange<K extends keyof RoleEntity>(key: K, value: RoleEntity[K]) { if (this.editDraft) (this.editDraft as any)[key] = value as any; }
}
