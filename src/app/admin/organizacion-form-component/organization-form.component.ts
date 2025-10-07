// filepath: c:\Users\oscar.carrillo\WebstormProjects\guardian-app\src\app\admin\organization-form.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Organization, OrganizationService } from '../../service/organization.service';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-organization-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, InputTextModule, ButtonModule, CardModule, ProgressSpinnerModule],
  templateUrl: './organization-form.component.html',
  styleUrls: ['./organization-form.component.scss']
})
export class OrganizationFormComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  saving = false;
  error: string | null = null;
  success: string | null = null;
  orgId: string | null = null;
  orgLoaded: Organization | null = null;

  constructor(private fb: FormBuilder, private orgService: OrganizationService, private route: ActivatedRoute, public router: Router, private messages: MessageService) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      activa: [true]
    });
  }

  ngOnInit() {
    this.orgId = this.route.snapshot.queryParamMap.get('id');
    if (this.orgId) {
      this.load();
    }
  }

  load() {
    if (!this.orgId) return; this.loading = true; this.error = null;
    this.orgService.get(this.orgId).subscribe({
      next: (o) => { this.orgLoaded = o; this.form.patchValue({ nombre: o.nombre, activa: o.activa }); this.loading = false; },
      error: (e) => { this.error = e?.error?.message || 'No se pudo cargar la organización'; this.loading = false; }
    });
  }

  isEdit() { return !!this.orgId; }

  private validateForm(): string | null {
    const nombreCtrl = this.form.get('nombre');
    if (!nombreCtrl) return 'Formulario inválido';
    const nombre = (nombreCtrl.value || '').toString().trim();
    if (!nombre) return 'EL NOMBRE ES REQUERIDO (MÍN. 3 CARACTERES)';
    if (nombre.length < 3) return 'EL NOMBRE ES REQUERIDO (MÍN. 3 CARACTERES)';
    return null;
  }

  submit() {
    this.error = null; this.success = null;
    const validation = this.validateForm();
    if (validation) {
      this.error = validation;
      this.messages.add({ severity: 'warn', summary: 'Validación', detail: validation, life: 3500 });
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value as { nombre: string; activa: boolean };
    this.saving = true;
    if (this.isEdit()) {
      this.orgService.update(this.orgId!, { nombre: value.nombre, activa: value.activa }).subscribe({
        next: (res) => {
          this.success = res?.message || 'Organización actualizada';
          this.saving = false;
          this.orgLoaded = res.org;
          this.messages.add({ severity: 'success', summary: 'Actualizado', detail: this.success, life: 3500 });
        },
        error: (e) => {
          const msg = e?.error?.message || 'Error al actualizar';
          this.error = msg;
          this.saving = false;
          this.messages.add({ severity: 'error', summary: 'Error', detail: msg, life: 4500 });
        }
      });
    } else {
      this.orgService.create({ nombre: value.nombre, activa: value.activa }).subscribe({
        next: (res) => {
          this.success = res?.message || 'Organización creada';
          this.saving = false;
          this.orgLoaded = res.org;
          this.orgId = res.org.id || null;
          this.messages.add({ severity: 'success', summary: 'Creado', detail: this.success, life: 3500 });
        },
        error: (e) => {
          const msg = e?.error?.message || 'Error al crear';
          this.error = msg;
          this.saving = false;
          this.messages.add({ severity: 'error', summary: 'Error', detail: msg, life: 4500 });
        }
      });
    }
  }

  goNew() { this.router.navigate(['/crear-organizacion']); }

  backList() { this.router.navigate(['/listar-organizaciones']); }
}
