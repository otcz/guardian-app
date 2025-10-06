import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ButtonModule } from 'primeng/button';
import { SeccionService, CreateSeccionRequest, SeccionEntity } from '../../service/seccion.service';
import { NotificationService } from '../../service/notification.service';
import { DropdownModule } from 'primeng/dropdown';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-seccion-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, CardModule, InputTextModule, InputSwitchModule, ButtonModule, DropdownModule],
  templateUrl: './seccion-form.component.html',
  styleUrls: ['./seccion-form.component.scss']
})
export class SeccionFormComponent {
  orgId: string | null;
  loading = false;

  form: FormGroup;
  secciones: SeccionEntity[] = [];
  private sub?: Subscription;

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
      seccionPadreId: [null],
      autonomiaConfigurada: [false]
    });

    this.orgId = this.route.snapshot.queryParamMap.get('id') || localStorage.getItem('currentOrgId');
    if (!this.orgId) {
      this.notify.warn('Falta organización', 'No se ha seleccionado organización');
    }
  }

  ngOnInit() {
    // Cargar secciones iniciales si hay orgId actual
    if (this.orgId) {
      this.loadSecciones(this.orgId);
    }
    // Reaccionar a cambios en query params (p. ej., navegación interna)
    this.sub = this.route.queryParamMap.subscribe((qp) => {
      const qId = qp.get('id');
      const nextOrgId = qId || localStorage.getItem('currentOrgId');
      if (nextOrgId && nextOrgId !== this.orgId) {
        this.orgId = nextOrgId;
        this.loadSecciones(this.orgId);
      }
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  private loadSecciones(orgId: string) {
    this.svc.list(orgId).subscribe({
      next: (items) => (this.secciones = items || []),
      error: (e) => this.notify.warn('Secciones', e?.error?.message || 'No se pudieron cargar las secciones')
    });
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
