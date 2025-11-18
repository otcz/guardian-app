import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { OrgContextService } from '../../service/org-context.service';
import { NotificationService } from '../../service/notification.service';
import { LugarService } from '../../service/lugar.service';
import { LugarTipo } from '../../models/lugar.models';

@Component({
  selector: 'app-lugar-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, CardModule, InputTextModule, DropdownModule, ButtonModule],
  templateUrl: './lugar-form.component.html',
  styleUrls: ['./lugar-form.component.scss']
})
export class LugarFormComponent {
  loading = false;
  orgId: string | null = null;
  tipos: LugarTipo[] = ['APARTAMENTO', 'CASA', 'ALMACEN', 'AULA', 'BODEGA', 'DEPOSITO', 'LOCAL', 'OFICINA', 'SALON', 'OTRO'];
  tiposOptions = this.tipos.map(t => ({ label: t, value: t }));

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private orgCtx: OrgContextService,
    private notify: NotificationService,
    private svc: LugarService
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      tipoLugar: ['CASA', [Validators.required]]
    });
    const byQuery = this.route.snapshot.queryParamMap.get('id');
    this.orgId = this.orgCtx.ensureFromQuery(byQuery);
    if (!this.orgId) this.notify.warn('Falta organización', 'Selecciona una organización');
  }

  submit() {
    if (!this.orgId) { this.notify.error('Sin organización', 'Selecciona una organización.'); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); this.notify.warn('Validación', 'Completa los campos.'); return; }
    const v = this.form.value as any;
    this.loading = true;
    this.svc.create(this.orgId, { nombre: String(v.nombre).trim(), tipoLugar: v.tipoLugar as any }).subscribe({
      next: (res) => { this.loading = false; this.notify.success('LUGAR CREADO', res.message || 'OK'); this.router.navigate(['/listar-lugares'], { queryParams: { id: this.orgId } }); },
      error: (e) => { this.loading = false; this.notify.error('ERROR', e?.error?.message || 'No se pudo crear'); }
    });
  }

  cancel() {
    const id = this.orgId || localStorage.getItem('currentOrgId');
    this.router.navigate(['/listar-lugares'], { queryParams: id ? { id } : undefined });
  }
}
