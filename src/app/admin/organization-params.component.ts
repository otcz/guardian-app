import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, FormGroup, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { OrganizationService, Organization } from '../service/organization.service';

/*
  Componente para CONFIGURAR PARÁMETROS GLOBALES de la organización.
  Estrategia: inicialmente es un placeholder con algunos parámetros simulados hasta que el backend
  de parámetros globales se exponga. Luego se reemplaza por servicio real (parametro / valor_parametro).
*/

interface GlobalParamFormValue { codigo: string; descripcion: string; valor: string; activo: boolean; }

@Component({
  selector: 'app-organization-params',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, CardModule, InputTextModule, InputSwitchModule, ButtonModule, ProgressSpinnerModule],
  templateUrl: './organization-params.component.html'
})
export class OrganizationParamsComponent implements OnInit {
  orgId: string | null = null;
  org: Organization | null = null;
  loadingOrg = false;
  saving = false;
  error: string | null = null;
  success: string | null = null;

  // Simulación de parámetros cargados (TODO: integrar con servicio real de parámetros)
  params: GlobalParamFormValue[] = [];
  editingIndex: number | null = null;
  form!: FormGroup;

  constructor(private route: ActivatedRoute, private router: Router, private fb: FormBuilder, private orgService: OrganizationService) {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      valor: ['', Validators.required],
      activo: [true]
    });
  }

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
    // Placeholder de valores (este bloque se eliminará cuando exista endpoint real)
    this.params = [
      { codigo: 'MAX_VISITANTES_DIA', descripcion: 'Límite de visitantes por día', valor: '100', activo: true },
      { codigo: 'TIEMPO_EXPIRACION_INVITADO_HORAS', descripcion: 'Horas para expirar invitado', valor: '48', activo: true }
    ];
  }

  edit(p: GlobalParamFormValue, idx: number) {
    this.editingIndex = idx; this.form.reset(p);
  }

  newParam() { this.editingIndex = null; this.form.reset({ codigo: '', descripcion: '', valor: '', activo: true }); }

  remove(idx: number) { this.params.splice(idx, 1); this.success = 'Parámetro eliminado (local)'; }

  save() {
    if (this.form.invalid) { this.error = 'Formulario inválido'; return; }
    const v = this.form.value as GlobalParamFormValue;
    if (this.editingIndex != null) { this.params[this.editingIndex] = { ...v }; this.success = 'Parámetro actualizado (local)'; }
    else { this.params.push({ ...v }); this.success = 'Parámetro agregado (local)'; }
    this.form.markAsPristine(); this.editingIndex = null;
  }

  back() { this.router.navigate(['/listar-organizaciones']); }
}

