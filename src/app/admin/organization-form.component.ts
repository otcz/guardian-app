// filepath: c:\Users\oscar.carrillo\WebstormProjects\guardian-app\src\app\admin\organization-form.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Organization, OrganizationService } from '../service/organization.service';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InputSwitchModule } from 'primeng/inputswitch';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-organization-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, InputTextModule, ButtonModule, InputSwitchModule, CardModule, ProgressSpinnerModule],
  templateUrl: './organization-form.component.html'
})
export class OrganizationFormComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  saving = false;
  error: string | null = null;
  success: string | null = null;
  orgId: string | null = null;
  orgLoaded: Organization | null = null;

  constructor(private fb: FormBuilder, private orgService: OrganizationService, private route: ActivatedRoute, public router: Router) {
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

  submit() {
    this.error = null; this.success = null;
    if (this.form.invalid) { this.error = 'Formulario inválido'; return; }
    const value = this.form.value as { nombre: string; activa: boolean };
    this.saving = true;
    if (this.isEdit()) {
      this.orgService.update(this.orgId!, { nombre: value.nombre, activa: value.activa }).subscribe({
        next: (org) => { this.success = 'Organización actualizada'; this.saving = false; this.orgLoaded = org; },
        error: (e) => { this.error = e?.error?.message || 'Error al actualizar'; this.saving = false; }
      });
    } else {
      this.orgService.create({ nombre: value.nombre, activa: value.activa }).subscribe({
        next: (org) => { this.success = 'Organización creada'; this.saving = false; this.orgLoaded = org; this.orgId = org.id || null; },
        error: (e) => { this.error = e?.error?.message || 'Error al crear'; this.saving = false; }
      });
    }
  }

  goNew() { this.router.navigate(['/crear-organizacion']); }

  backList() { this.router.navigate(['/listar-organizaciones']); }
}
