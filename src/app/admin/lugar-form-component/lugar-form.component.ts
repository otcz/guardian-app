import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { OrgContextService } from '../../service/org-context.service';
import { NotificationService } from '../../service/notification.service';
import { LugarService } from '../../service/lugar.service';
import { LugarTipo } from '../../models/lugar.models';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';

@Component({
  selector: 'app-lugar-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, CardModule, InputTextModule, DropdownModule, ButtonModule],
  templateUrl: './lugar-form.component.html',
  styleUrls: ['./lugar-form.component.scss']
})
export class LugarFormComponent {
  loading = false;
  orgId: string | null = null;
  seccionId: string | null = null;
  seccionIdFixed: string | null = null; // Sección fija desde parámetros
  showSeccionError = false;
  secciones: { id: string; nombre: string }[] = [];
  seccionOptions: { label: string; value: string }[] = [];
  tipos: LugarTipo[] = ['APARTAMENTO', 'CASA', 'ALMACEN', 'AULA', 'BODEGA', 'DEPOSITO', 'LOCAL', 'OFICINA', 'SALON', 'OTRO'];
  tiposOptions = this.tipos.map(t => ({ label: t, value: t }));

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private orgCtx: OrgContextService,
    private notify: NotificationService,
    private svc: LugarService,
    private seccionesSvc: SeccionService
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      tipoLugar: ['CASA', [Validators.required]]
    });
    const byQuery = this.route.snapshot.queryParamMap.get('id');
    this.orgId = this.orgCtx.ensureFromQuery(byQuery);
    const seccionParam = this.route.snapshot.queryParamMap.get('seccionId');

    if (seccionParam) {
      this.seccionId = seccionParam;
      this.seccionIdFixed = seccionParam; // Marcar como fija
    }

    if (!this.orgId) {
      this.notify.warn('Falta organización', 'Selecciona una organización');
    }

    // Cargar secciones solo si no hay una fija
    if (!this.seccionIdFixed) {
      this.loadSecciones();
    } else {
      // Cargar secciones de todas formas para mostrar el nombre
      this.loadSecciones();
    }
  }

  private loadSecciones() {
    if (!this.orgId) return;
    this.seccionesSvc.list(this.orgId).subscribe({
      next: (arr: SeccionEntity[]) => {
        this.secciones = (arr || []).map(s => ({ id: String((s as any).id), nombre: String((s as any).nombre) }));
        this.seccionOptions = this.secciones.map(s => ({ label: s.nombre, value: s.id }));
      },
      error: () => { this.secciones = []; this.seccionOptions = []; }
    });
  }

  submit() {
    // Validar organización
    if (!this.orgId) {
      this.notify.error('Sin organización', 'Selecciona una organización.');
      return;
    }

    // Validar formulario
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warn('Validación', 'Por favor, completa todos los campos obligatorios correctamente.');
      return;
    }

    // Validar sección
    const seccionId = this.seccionId;
    if (!seccionId) {
      this.showSeccionError = true;
      this.notify.warn('Validación', 'Debes seleccionar una sección para crear el lugar');
      return;
    }

    this.showSeccionError = false;
    const v = this.form.value as any;
    this.loading = true;

    this.svc.create(this.orgId, {
      nombre: String(v.nombre).trim(),
      tipoLugar: v.tipoLugar as any,
      seccionId
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.notify.success('¡Lugar creado!', res.message || 'El lugar se ha creado exitosamente');

        // Navegar a gestionar sección si tenemos seccionId
        if (this.seccionIdFixed) {
          this.router.navigate(['/gestion-de-secciones/gestionar-seccion'], {
            queryParams: { id: this.orgId, seccionId }
          });
        } else {
          this.router.navigate(['/listar-lugares'], {
            queryParams: { id: this.orgId }
          });
        }
      },
      error: (e) => {
        this.loading = false;
        const errorMsg = e?.error?.message || 'No se pudo crear el lugar. Intenta de nuevo.';
        this.notify.error('Error al crear', errorMsg);
      }
    });
  }

  cancel() {
    const id = this.orgId || localStorage.getItem('currentOrgId');

    // Si venimos de una sección específica, volver a gestionar sección
    if (this.seccionIdFixed) {
      this.router.navigate(['/gestion-de-secciones/gestionar-seccion'], {
        queryParams: { id, seccionId: this.seccionIdFixed }
      });
    } else {
      this.router.navigate(['/listar-lugares'], {
        queryParams: id ? { id } : undefined
      });
    }
  }

  /**
   * Obtiene el nombre de una sección por su ID
   */
  getSeccionNombre(seccionId: string): string {
    const seccion = this.secciones.find(s => s.id === seccionId);
    return seccion?.nombre || 'Sección seleccionada';
  }
}
