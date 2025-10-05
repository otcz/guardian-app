import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FormsModule } from '@angular/forms';
import { OrganizationService, Organization, OrgParam, OrgParamValue } from '../../service/organization.service';
import { forkJoin } from 'rxjs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

interface GlobalParamValue { id?: string; codigo: string; descripcion: string; valor: string; activo: boolean; valorId?: string; }
interface FieldConfig { key: keyof GlobalParamValue; label: string; type: 'text' | 'switch'; required?: boolean; minLength?: number; maxLength?: number; }

@Component({
  selector: 'app-organization-params',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CardModule, InputTextModule, InputSwitchModule, ButtonModule, ProgressSpinnerModule, ConfirmDialogModule, ToastModule],
  templateUrl: './organization-params.component.html',
  styleUrls: ['./organization-params.component.scss']
})
export class OrganizationParamsComponent implements OnInit {
  orgId: string | null = null;
  org: Organization | null = null;
  loadingOrg = false;
  loadingParams = false;
  saving = false;
  error: string | null = null;
  success: string | null = null;

  params: GlobalParamValue[] = [];
  filtered: GlobalParamValue[] = [];
  filter = '';

  fieldConfig: FieldConfig[] = [
    { key: 'codigo', label: 'Código', type: 'text', required: true, minLength: 3, maxLength: 64 },
    { key: 'descripcion', label: 'Descripción', type: 'text', maxLength: 160 },
    { key: 'valor', label: 'Valor', type: 'text', required: true, maxLength: 120 },
    { key: 'activo', label: 'Activo', type: 'switch' }
  ];

  adding = false;
  newDraft: GlobalParamValue = this.blankParam();
  editingCode: string | null = null;
  editDraft: GlobalParamValue | null = null;

  constructor(private route: ActivatedRoute, private router: Router, private orgService: OrganizationService, private confirmationService: ConfirmationService, private messageService: MessageService) {}

  ngOnInit(): void {
    this.orgId = this.route.snapshot.queryParamMap.get('id') || localStorage.getItem('currentOrgId');
    if (!this.orgId) { this.error = 'No se ha seleccionado organización'; return; }
    this.loadOrg();
    this.loadParams();
  }

  loadOrg() {
    if (!this.orgId) return; this.loadingOrg = true; this.orgService.get(this.orgId).subscribe({
      next: o => { this.org = o; this.loadingOrg = false; },
      error: e => { this.error = e?.error?.message || 'Error cargando organización'; this.loadingOrg = false; }
    });
  }

  loadParams() {
    if (!this.orgId) return; this.loadingParams = true; this.error = null; this.success = null;
    this.orgService.listOrgParams(this.orgId).subscribe({
      next: (list: OrgParam[]) => {
        // Inicial: mapear parámetros sin valor
        const base: GlobalParamValue[] = (list || []).map(p => ({ id: p.id, codigo: p.codigo, descripcion: p.descripcion || '', valor: '', activo: true }));
        if (base.length === 0) { this.params = []; this.applyFilter(); this.loadingParams = false; return; }
        // Cargar valores DEFAULT para cada parámetro
        const calls = base.map(p => this.orgService.listOrgParamValues(this.orgId!, p.id!));
        forkJoin(calls).subscribe({
          next: (valuesLists: OrgParamValue[][]) => {
            this.params = base.map((p, idx) => {
              const values = valuesLists[idx] || [];
              const def = values.find(v => v.codigo === 'DEFAULT') || values[0];
              return { ...p, valor: def?.valor || '', activo: def?.activo ?? true, valorId: def?.id };
            });
            this.applyFilter(); this.loadingParams = false;
          },
          error: (e: any) => { this.error = e?.error?.message || 'No se pudieron cargar valores de parámetros'; this.params = base; this.applyFilter(); this.loadingParams = false; }
        });
      },
      error: (e: any) => { this.error = e?.error?.message || 'No se pudieron listar parámetros'; this.loadingParams = false; }
    });
  }

  // Utilidades
  blankParam(): GlobalParamValue { return { codigo: '', descripcion: '', valor: '', activo: true }; }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    if (!f) { this.filtered = [...this.params]; return; }
    this.filtered = this.params.filter(p => [p.codigo, p.descripcion, p.valor].some(v => (v||'').toLowerCase().includes(f)));
  }

  isDuplicateCode(code: string, excludeOriginal?: string | null): boolean {
    const c = code.trim().toUpperCase();
    return this.params.some(p => p.codigo.toUpperCase() === c && p.codigo !== (excludeOriginal || '')); }

  validate(record: GlobalParamValue, excludeOriginal?: string | null): string | null {
    for (const f of this.fieldConfig) {
      const val = String(record[f.key] ?? '').trim();
      if (f.required && !val) return `El campo ${f.label} es requerido`;
      if (f.minLength && val.length < f.minLength) return `${f.label} requiere mínimo ${f.minLength} caracteres`;
      if (f.maxLength && val.length > f.maxLength) return `${f.label} excede ${f.maxLength} caracteres`;
    }
    if (!record.codigo.match(/^[A-Z0-9_]+$/i)) return 'Código solo debe contener letras, números o _';
    return null;
  }

  // Agregar
  startAdd() { if (this.editingCode) return; this.adding = true; this.newDraft = this.blankParam(); this.error = null; this.success = null; }
  cancelAdd() { this.adding = false; this.newDraft = this.blankParam(); }
  saveAdd() {
    if (!this.orgId) return; const err = this.validate(this.newDraft, null);
    if (err) { this.error = err; return; }
    const payload = { codigo: this.newDraft.codigo.trim().toUpperCase(), descripcion: (this.newDraft.descripcion || '').trim() };
    this.saving = true;
    this.orgService.createOrgParam(this.orgId, payload).subscribe({
      next: res => {
        const created = res.param;
        // Crear valor DEFAULT si se proporcionó
        this.orgService.createOrgParamValue(this.orgId!, created.id, { codigo: 'DEFAULT', valor: this.newDraft.valor, activo: this.newDraft.activo }).subscribe({
          next: vres => {
            this.success = (res.message ?? vres.message) ?? null; this.error = null; this.saving = false;
            const detailMsg = this.success || 'Parámetro creado correctamente';
            this.messageService.add({ severity: 'success', summary: 'Creado', detail: detailMsg });
            this.params.push({ id: created.id, codigo: created.codigo, descripcion: created.descripcion || '', valor: vres.value.valor, activo: vres.value.activo, valorId: vres.value.id });
            this.applyFilter(); this.adding = false; this.newDraft = this.blankParam();
          },
          error: (e2: any) => {
            // Si falla crear valor, igual mantenemos el parámetro y mostramos el mensaje
            this.success = res.message ?? null; this.error = e2?.error?.message || 'Parámetro creado pero el valor no se pudo agregar'; this.saving = false;
            if (this.success) this.messageService.add({ severity: 'success', summary: 'Creado', detail: this.success });
            this.params.push({ id: created.id, codigo: created.codigo, descripcion: created.descripcion || '', valor: '', activo: true });
            this.applyFilter(); this.adding = false; this.newDraft = this.blankParam();
          }
        });
      },
      error: (e: any) => { this.error = e?.error?.message || e?.message || 'No se pudo crear el parámetro'; this.saving = false; }
    });
  }

  // Editar
  startEdit(p: GlobalParamValue) { if (this.adding) return; this.editingCode = p.codigo; this.editDraft = { ...p }; this.error = null; this.success = null; }
  cancelEdit() { this.editingCode = null; this.editDraft = null; }
  saveEdit() {
    if (!this.orgId || !this.editDraft) return;
    const err = this.validate(this.editDraft, this.editingCode);
    if (err) { this.error = err; return; }
    const paramId = this.editDraft.id!;
    const body: any = { descripcion: (this.editDraft.descripcion || '').trim(), codigo: this.editDraft.codigo.trim().toUpperCase() };
    this.saving = true;
    this.orgService.updateOrgParam(this.orgId, paramId, body).subscribe({
      next: pres => {
        const applyValueUpdate = () => {
          // Actualizar o crear valor DEFAULT
          const upsert = (valorId?: string) => {
            if (valorId) {
              this.orgService.updateOrgParamValue(this.orgId!, valorId, { valor: this.editDraft!.valor, activo: this.editDraft!.activo }).subscribe({
                next: vres => { this.success = (pres.message ?? vres.message) ?? null; this.error = null; this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: this.success || 'Parámetro actualizado correctamente' }); this.postEditCommit(); },
                error: (e2: any) => { this.error = e2?.error?.message || 'No se pudo actualizar el valor'; this.postEditCommit(true); }
              });
            } else {
              this.orgService.createOrgParamValue(this.orgId!, paramId, { codigo: 'DEFAULT', valor: this.editDraft!.valor, activo: this.editDraft!.activo }).subscribe({
                next: vres => { this.success = (pres.message ?? vres.message) ?? null; this.error = null; this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: this.success || 'Parámetro actualizado correctamente' }); this.postEditCommit(); },
                error: (e3: any) => { this.error = e3?.error?.message || 'Parámetro actualizado, pero no se pudo crear el valor'; this.postEditCommit(true); }
              });
            }
          };
          if (this.editDraft!.valorId) { upsert(this.editDraft!.valorId); }
          else {
            this.orgService.listOrgParamValues(this.orgId!, paramId).subscribe({
              next: vals => { const def = (vals||[]).find(v => v.codigo === 'DEFAULT'); upsert(def?.id); },
              error: () => upsert(undefined)
            });
          }
        };
        applyValueUpdate();
      },
      error: (e: any) => { this.error = e?.error?.message || e?.message || 'No se pudo actualizar el parámetro'; this.saving = false; }
    });
  }

  private postEditCommit(partialError = false) {
    // Actualizar fila y UI
    if (this.editDraft && this.editingCode) {
      const idx = this.params.findIndex(p => p.id === this.editDraft!.id);
      if (idx >= 0) this.params[idx] = { ...this.editDraft };
      this.applyFilter();
    }
    this.saving = false;
    if (!partialError) { this.editingCode = null; this.editDraft = null; }
  }

  // Eliminar
  remove(p: GlobalParamValue) {
    if (!this.orgId || !p.id) return;
    this.error = null; this.success = null;
    this.confirmationService.confirm({
      header: 'Confirmación',
      message: `¿Deseas eliminar el parámetro "${p.codigo}"? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.saving = true;
        this.orgService.deleteOrgParam(this.orgId!, p.id!).subscribe({
          next: res => { const msg = res.message ?? 'Parámetro eliminado correctamente'; this.success = msg; this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: msg }); this.params = this.params.filter(x => x !== p); this.applyFilter(); this.saving = false; if (this.editingCode === p.codigo) this.cancelEdit(); },
          error: (e: any) => { this.error = e?.error?.message || e?.message || 'No se pudo eliminar el parámetro'; this.saving = false; }
        });
      }
    });
  }

  // Atajos teclado
  onKeyAdd(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.saveAdd(); } else if (e.key === 'Escape') { e.preventDefault(); this.cancelAdd(); } }
  onKeyEdit(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.saveEdit(); } else if (e.key === 'Escape') { e.preventDefault(); this.cancelEdit(); } }

  back() { this.router.navigate(['/listar-organizaciones']); }
}
