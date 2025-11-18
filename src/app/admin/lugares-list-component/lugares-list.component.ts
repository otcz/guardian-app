import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subscription, combineLatest } from 'rxjs';
import { OrgContextService } from '../../service/org-context.service';
import { OrganizationService } from '../../service/organization.service';
import { LugarEntity, LugarTipo } from '../../models/lugar.models';
import { LugarService } from '../../service/lugar.service';

@Component({
  selector: 'app-lugares-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, InputTextModule, FormsModule, DropdownModule, ReactiveFormsModule, ConfirmDialogModule],
  templateUrl: './lugares-list.component.html',
  styleUrls: ['./lugares-list.component.scss']
})
export class LugaresListComponent implements OnInit, OnDestroy {
  orgId: string | null = null;
  orgName: string | null = null;
  loading = false;
  saving = false;

  items: LugarEntity[] = [];
  filtered: LugarEntity[] = [];
  filter = '';

  adding = false;
  draft: { nombre: string; tipoLugar: LugarTipo } = { nombre: '', tipoLugar: 'CASA' };
  editingId: string | null = null;
  editDraft: { nombre: string; tipoLugar: LugarTipo } = { nombre: '', tipoLugar: 'CASA' };

  tipos: LugarTipo[] = ['APARTAMENTO', 'CASA', 'ALMACEN', 'AULA', 'BODEGA', 'DEPOSITO', 'LOCAL', 'OFICINA', 'SALON', 'OTRO'];
  tiposOptions = this.tipos.map(t => ({ label: t, value: t }));

  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgCtx: OrgContextService,
    private orgService: OrganizationService,
    private svc: LugarService,
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
        this.orgId = next; this.loadOrgName(next); this.load();
      }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private loadOrgName(id: string) {
    this.orgName = null;
    this.orgService.get(id).subscribe({ next: (o) => this.orgName = o?.nombre || null, error: () => this.orgName = null });
  }

  load() {
    if (!this.orgId) return;
    this.loading = true;
    this.svc.list(this.orgId).subscribe({
      next: (data) => { this.items = data || []; this.applyFilter(); this.loading = false; },
      error: (e) => { this.toastError('ERROR', e?.error?.message || 'No se pudieron obtener los lugares'); this.loading = false; }
    });
  }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    this.filtered = !f ? [...this.items] : this.items.filter(i => i.nombre.toLowerCase().includes(f));
  }

  startAdd() { if (this.editingId) return; this.adding = true; this.draft = { nombre: '', tipoLugar: 'CASA' }; }
  cancelAdd() { this.adding = false; this.draft = { nombre: '', tipoLugar: 'CASA' }; }
  saveAdd() {
    if (!this.orgId) return;
    const nombre = (this.draft.nombre || '').trim();
    if (nombre.length < 3) { this.toastWarn('VALIDACIÓN', 'NOMBRE MÍN. 3 CARACTERES'); return; }
    const seccionId = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search).get('seccionId') : null;
    if (!seccionId) { this.toastWarn('VALIDACIÓN', 'Selecciona una sección desde el hub antes de crear'); return; }
    this.saving = true;
    this.svc.create(this.orgId, { nombre, tipoLugar: this.draft.tipoLugar, seccionId }).subscribe({
      next: (res) => { this.items.push(res.lugar); this.applyFilter(); this.saving = false; this.adding = false; this.toastSuccess('LUGAR CREADO', res.message || 'OK'); },
      error: (e) => { this.saving = false; this.toastError('ERROR', e?.error?.message || 'No se pudo crear'); }
    });
  }

  startEdit(row: LugarEntity) { if (this.adding) return; this.editingId = row.id; this.editDraft = { nombre: row.nombre, tipoLugar: row.tipoLugar }; }
  cancelEdit() { this.editingId = null; this.editDraft = { nombre: '', tipoLugar: 'CASA' }; }
  saveEdit() {
    if (!this.orgId || !this.editingId) return;
    const nombre = (this.editDraft.nombre || '').trim();
    if (nombre.length < 3) { this.toastWarn('VALIDACIÓN', 'NOMBRE MÍN. 3 CARACTERES'); return; }
    this.saving = true;
    this.svc.update(this.orgId, this.editingId, { nombre, tipoLugar: this.editDraft.tipoLugar }).subscribe({
      next: (res) => { const idx = this.items.findIndex(i => i.id === this.editingId); if (idx>=0) this.items[idx] = res.lugar; this.applyFilter(); this.saving = false; this.cancelEdit(); this.toastSuccess('LUGAR ACTUALIZADO', res.message || 'OK'); },
      error: (e) => { this.saving = false; this.toastError('ERROR', e?.error?.message || 'No se pudo actualizar'); }
    });
  }

  remove(row: LugarEntity) {
    if (!this.orgId) return;
    this.confirm.confirm({
      header: 'Confirmación',
      message: `¿Eliminar el lugar "${row.nombre}"?`,
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        try { this.confirm.close(); } catch {}
        this.saving = true;
        this.svc.delete(this.orgId!, row.id).subscribe({
          next: (res) => { this.items = this.items.filter(i => i.id !== row.id); this.applyFilter(); this.saving = false; this.toastSuccess('LUGAR ELIMINADO', res?.message || 'OK'); },
          error: (e) => { this.saving = false; this.toastError('ERROR', e?.error?.message || 'No se pudo eliminar'); }
        });
      },
      reject: () => { try { this.confirm.close(); } catch {} }
    });
  }

  // Toast helpers
  private toastSuccess(summary: string, detail?: string) { this.messages.add({ severity: 'success', summary, detail, life: 3000 }); }
  private toastWarn(summary: string, detail?: string) { this.messages.add({ severity: 'warn', summary, detail, life: 3500 }); }
  private toastError(summary: string, detail?: string) { this.messages.add({ severity: 'error', summary, detail, life: 4500 }); }
}
