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
import { SeccionEntity, SeccionService, UpdateSeccionRequest } from '../../service/seccion.service';
import { OrgContextService } from '../../service/org-context.service';
import { OrganizationService } from '../../service/organization.service';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-seccion-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, InputTextModule, TagModule, FormsModule, TooltipModule, InputSwitchModule, ConfirmDialogModule],
  templateUrl: './seccion-list.component.html',
  styleUrls: ['./seccion-list.component.scss']
})
export class SeccionListComponent implements OnInit, OnDestroy {
  orgId: string | null = null;
  orgName: string | null = null;
  loading = false;
  saving = false;
  error: string | null = null;

  items: SeccionEntity[] = [];
  filtered: SeccionEntity[] = [];
  filter = '';

  // Inline add/edit state
  adding = false;
  newDraft: SeccionEntity = this.blank();
  editingId: string | null = null;
  editDraft: SeccionEntity | null = null;
  flashRowId: string | null = null;

  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: SeccionService,
    private orgCtx: OrgContextService,
    private orgService: OrganizationService,
    private confirm: ConfirmationService,
    private messages: MessageService
  ) {}

  ngOnInit(): void {
    // Resolver id desde params o query y escuchar cambios
    this.sub = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([pm, qm]) => {
      const pId = pm.get('id');
      const qId = qm.get('id');
      const stored = localStorage.getItem('currentOrgId');
      const next = this.orgCtx.ensureFromQuery(pId || qId || stored);
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
    this.filtered = this.items.filter(s => (s.nombre || '').toLowerCase().includes(f) || (s.descripcion || '').toLowerCase().includes(f));
  }

  // Draft helpers
  private blank(): SeccionEntity { return { id: '', nombre: '', descripcion: '', estado: 'ACTIVA', autonomiaConfigurada: false, seccionPadreId: null }; }

  // Add flow
  startAdd() {
    if (this.editingId) return;
    this.adding = true;
    this.newDraft = this.blank();
  }
  cancelAdd() {
    this.adding = false;
    this.newDraft = this.blank();
  }
  saveAdd() {
    if (!this.orgId) return;
    const err = this.validate(this.newDraft);
    if (err) { this.toastWarn('Validación', err); return; }
    const body = {
      nombre: (this.newDraft.nombre || '').trim(),
      descripcion: (this.newDraft.descripcion || '').trim() || undefined,
      seccionPadreId: this.newDraft.seccionPadreId ?? null,
      autonomiaConfigurada: !!this.newDraft.autonomiaConfigurada
    };
    this.saving = true;
    this.svc.create(this.orgId, body).subscribe({
      next: (res) => {
        const created = res.seccion;
        this.items.push(created);
        this.applyFilter();
        this.saving = false;
        this.adding = false;
        this.newDraft = this.blank();
        this.flash(created.id);
        this.toastSuccess('Sección creada', res.message || 'Creada correctamente');
      },
      error: (e) => {
        this.saving = false;
        this.toastError('Error', e?.error?.message || 'No se pudo crear la sección');
      }
    });
  }

  // Edit flow
  startEdit(row: SeccionEntity) {
    if (this.adding) return;
    this.editingId = row.id;
    this.editDraft = { ...row };
  }
  cancelEdit() {
    this.editingId = null;
    this.editDraft = null;
  }
  saveEdit() {
    if (!this.orgId || !this.editDraft || !this.editingId) return;
    const err = this.validate(this.editDraft);
    if (err) { this.toastWarn('Validación', err); return; }
    const body: UpdateSeccionRequest = {
      nombre: (this.editDraft.nombre || '').trim(),
      descripcion: (this.editDraft.descripcion || '').trim() || null,
      idSeccionPadre: this.editDraft.seccionPadreId ?? null,
      autonomiaConfigurada: !!this.editDraft.autonomiaConfigurada
    };
    const optimistic: Partial<SeccionEntity> = {
      nombre: body.nombre!,
      descripcion: (body.descripcion ?? undefined) as any,
      seccionPadreId: body.idSeccionPadre ?? null,
      autonomiaConfigurada: body.autonomiaConfigurada
    };
    this.saving = true;
    this.svc.update(this.orgId, this.editingId, body).subscribe({
      next: (res) => {
        const idx = this.items.findIndex(i => i.id === this.editingId);
        if (idx >= 0) {
          // Primero aplicar lo editado (optimista) y luego datos del backend
          this.items[idx] = { ...this.items[idx], ...optimistic, ...res.seccion } as SeccionEntity;
        }
        this.applyFilter();
        const flashId = this.editingId;
        this.cancelEdit();
        this.saving = false;
        if (flashId) this.flash(flashId);
        this.toastSuccess('Sección actualizada', res.message || 'Actualizada correctamente');
      },
      error: (e) => {
        this.saving = false;
        this.toastError('Error', e?.error?.message || 'No se pudo actualizar la sección');
      }
    });
  }

  // Remove (logical: set estado INACTIVA)
  remove(row: SeccionEntity) {
    if (!this.orgId || !row.id) return;
    this.confirm.confirm({
      header: 'Confirmación',
      message: `¿Eliminar la sección "${row.nombre}"? (se marcará como INACTIVA)`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.svc.changeState(this.orgId!, row.id, 'INACTIVA').subscribe({
          next: (res) => {
            const idx = this.items.findIndex(i => i.id === row.id);
            if (idx >= 0) this.items[idx] = { ...this.items[idx], ...res.seccion };
            this.applyFilter();
            this.toastSuccess('Sección eliminada', res.message || 'Se marcó como INACTIVA');
          },
          error: (e) => this.toastError('Error', e?.error?.message || 'No se pudo eliminar la sección')
        });
      }
    });
  }

  reactivate(row: SeccionEntity) {
    if (!this.orgId || !row.id) return;
    this.svc.changeState(this.orgId, row.id, 'ACTIVA').subscribe({
      next: (res) => {
        const idx = this.items.findIndex(i => i.id === row.id);
        if (idx >= 0) this.items[idx] = { ...this.items[idx], ...res.seccion };
        this.applyFilter();
        this.toastSuccess('Sección reactivada', res.message || 'Se marcó como ACTIVA');
      },
      error: (e) => this.toastError('Error', e?.error?.message || 'No se pudo reactivar la sección')
    });
  }

  // Utils
  validate(model: SeccionEntity): string | null {
    if (!model.nombre || model.nombre.trim().length < 3) return 'El nombre es requerido (mín. 3 caracteres)';
    if (model.descripcion && model.descripcion.length > 160) return 'La descripción excede 160 caracteres';
    return null;
  }
  flash(id: string) { this.flashRowId = id; setTimeout(() => this.flashRowId = null, 1200); }
  toastSuccess(summary: string, detail?: string) { this.messages.add({ severity: 'success', summary, detail, life: 3500 }); }
  toastWarn(summary: string, detail?: string) { this.messages.add({ severity: 'warn', summary, detail, life: 3500 }); }
  toastError(summary: string, detail?: string) { this.messages.add({ severity: 'error', summary, detail, life: 4500 }); }

  get rows(): SeccionEntity[] {
    return this.adding ? [this.newDraft, ...this.filtered] : this.filtered;
  }

  onEditChange<K extends keyof SeccionEntity>(key: K, value: SeccionEntity[K]) {
    if (this.editDraft) {
      (this.editDraft as any)[key] = value as any;
    }
  }
}
