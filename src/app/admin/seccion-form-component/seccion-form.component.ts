import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ButtonModule } from 'primeng/button';
import { SeccionService, CreateSeccionRequest } from '../../service/seccion.service';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-seccion-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, CardModule, InputTextModule, InputSwitchModule, ButtonModule],
  templateUrl: './seccion-form.component.html',
  styleUrls: ['./seccion-form.component.scss']
})
export class SeccionFormComponent {
  orgId: string | null;
  loading = false;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private svc: SeccionService,
    private notify: NotificationService
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: [''],
      seccionPadreId: [''],
      autonomiaConfigurada: [false]
    });

    this.orgId = this.route.snapshot.queryParamMap.get('id') || localStorage.getItem('currentOrgId');
    if (!this.orgId) {
      this.notify.warn('Falta organización', 'No se ha seleccionado organización');
    }
  }

  get f() { return this.form.controls; }

  submit() {
    if (!this.orgId) {
      this.notify.error('Sin organización', 'Selecciona una organización antes de crear una sección.');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warn('Validación', 'Completa los campos requeridos.');
      return;
    }
    const v = this.form.value as any;
    const body: CreateSeccionRequest = {
      nombre: (v.nombre || '').trim(),
      descripcion: (v.descripcion || '').trim() || undefined,
      seccionPadreId: (v.seccionPadreId || '').trim() || null,
      autonomiaConfigurada: !!v.autonomiaConfigurada
    };

    this.loading = true;
    this.svc.create(this.orgId!, body).subscribe({
      next: (res) => {
        this.loading = false;
        this.notify.success('Sección creada', res.message || 'SECCIÓN CREADA CORRECTAMENTE.');
        this.router.navigate(['/gestionar-organizacion'], { queryParams: { id: this.orgId } });
      },
      error: (e) => {
        this.loading = false;
        const msg = e?.error?.message || 'No se pudo crear la sección';
        this.notify.error('Error', msg);
      }
    });
  }

  cancel() {
    const id = this.orgId || localStorage.getItem('currentOrgId');
    this.router.navigate(['/gestionar-organizacion'], { queryParams: id ? { id } : undefined });
  }
}
