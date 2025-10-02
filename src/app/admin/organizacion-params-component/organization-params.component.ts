import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FormsModule } from '@angular/forms';
import { OrganizationService, Organization } from '../../service/organization.service';

interface GlobalParamValue { codigo: string; descripcion: string; valor: string; activo: boolean; }
interface FieldConfig { key: keyof GlobalParamValue; label: string; type: 'text' | 'switch'; required?: boolean; minLength?: number; maxLength?: number; }

@Component({
  selector: 'app-organization-params',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CardModule, InputTextModule, InputSwitchModule, ButtonModule, ProgressSpinnerModule],
  templateUrl: './organization-params.component.html',
  styleUrls: ['./organization-params.component.scss']
})
export class OrganizationParamsComponent implements OnInit {
  orgId: string | null = null;
  org: Organization | null = null;
  loadingOrg = false;
  saving = false;
  error: string | null = null;
  success: string | null = null;

  params: GlobalParamValue[] = [];
  filtered: GlobalParamValue[] = [];
  filter = '';

  // Config dinámica (permite centralizar validaciones y ajustar UI)
  fieldConfig: FieldConfig[] = [
    { key: 'codigo', label: 'Código', type: 'text', required: true, minLength: 3, maxLength: 64 },
    { key: 'descripcion', label: 'Descripción', type: 'text', maxLength: 160 },
    { key: 'valor', label: 'Valor', type: 'text', required: true, maxLength: 120 },
    { key: 'activo', label: 'Activo', type: 'switch' }
  ];

  // Estado inline
  adding = false;
  newDraft: GlobalParamValue = this.blankParam();
  editingCode: string | null = null;
  editDraft: GlobalParamValue | null = null;

  constructor(private route: ActivatedRoute, private router: Router, private orgService: OrganizationService) {}

  ngOnInit(): void {
    this.orgId = this.route.snapshot.queryParamMap.get('id') || localStorage.getItem('currentOrgId');
    if (!this.orgId) { this.error = 'No se ha seleccionado organización'; return; }
    this.loadOrg();
    this.loadParamsMock();
  }

  loadOrg() {
    if (!this.orgId) return; this.loadingOrg = true; this.orgService.get(this.orgId).subscribe({
      next: o => { this.org = o; this.loadingOrg = false; },
      error: e => { this.error = e?.error?.message || 'Error cargando organización'; this.loadingOrg = false; }
    });
  }

  loadParamsMock() {
    this.params = [
      { codigo: 'MAX_VISITANTES_DIA', descripcion: 'Límite de visitantes por día', valor: '100', activo: true },
      { codigo: 'TIEMPO_EXPIRACION_INVITADO_HORAS', descripcion: 'Horas para expirar invitado', valor: '48', activo: true }
    ];
    this.applyFilter();
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
    if (this.isDuplicateCode(record.codigo, excludeOriginal)) return 'Código duplicado';
    return null;
  }

  // Agregar
  startAdd() { if (this.editingCode) return; this.adding = true; this.newDraft = this.blankParam(); this.error = null; this.success = null; }
  cancelAdd() { this.adding = false; this.newDraft = this.blankParam(); }
  saveAdd() {
    const err = this.validate(this.newDraft, null);
    if (err) { this.error = err; return; }
    this.params.push({ ...this.newDraft, codigo: this.newDraft.codigo.trim().toUpperCase() });
    this.adding = false; this.newDraft = this.blankParam();
    this.success = 'Parámetro agregado'; this.error = null; this.applyFilter();
  }

  // Editar
  startEdit(p: GlobalParamValue) { if (this.adding) return; this.editingCode = p.codigo; this.editDraft = { ...p }; this.error = null; this.success = null; }
  cancelEdit() { this.editingCode = null; this.editDraft = null; }
  saveEdit() {
    if (!this.editDraft) return; const err = this.validate(this.editDraft, this.editingCode);
    if (err) { this.error = err; return; }
    const idx = this.params.findIndex(p => p.codigo === this.editingCode);
    if (idx >= 0) this.params[idx] = { ...this.editDraft, codigo: this.editDraft.codigo.trim().toUpperCase() };
    this.success = 'Parámetro actualizado'; this.error = null; this.editingCode = null; this.editDraft = null; this.applyFilter();
  }

  // Eliminar
  remove(p: GlobalParamValue) { this.params = this.params.filter(x => x !== p); this.applyFilter(); this.success = 'Parámetro eliminado'; if (this.editingCode === p.codigo) this.cancelEdit(); }

  // Atajos teclado
  onKeyAdd(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.saveAdd(); } else if (e.key === 'Escape') { e.preventDefault(); this.cancelAdd(); } }
  onKeyEdit(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.saveEdit(); } else if (e.key === 'Escape') { e.preventDefault(); this.cancelEdit(); } }

  back() { this.router.navigate(['/listar-organizaciones']); }
}
