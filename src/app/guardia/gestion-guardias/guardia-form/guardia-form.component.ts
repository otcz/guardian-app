import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';

// Servicios
import { GuardiaService } from '../../../service/guardia.service';
import { SeccionService } from '../../../service/seccion.service';

// Modelos
import { Guardia, CrearGuardiaDTO, ActualizarGuardiaDTO } from '../../../models/guardia.models';
import { MENSAJES_ERROR, MENSAJES_EXITO, LABELS, AYUDA } from '../../constants/mensajes.constants';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

interface Seccion {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-guardia-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    CheckboxModule,
    ProgressSpinnerModule,
    TooltipModule
  ],
  templateUrl: './guardia-form.component.html',
  styleUrls: ['./guardia-form.component.scss']
})
export class GuardiaFormComponent implements OnInit {
  form!: FormGroup;
  secciones: Seccion[] = [];
  guardiaId: string | null = null;
  modoEdicion = false;
  loading = false;
  guardiaActual: Guardia | null = null;

  readonly LABELS = LABELS;
  readonly AYUDA = AYUDA;

  codigoVerificando = false;
  codigoValido = true;

  constructor(
    private fb: FormBuilder,
    private guardiaService: GuardiaService,
    private seccionService: SeccionService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarSecciones();
    this.configurarValidacionCodigo();

    // Verificar si estamos en modo edición
    this.route.params.subscribe(params => {
      this.guardiaId = params['id'];
      if (this.guardiaId) {
        this.modoEdicion = true;
        this.cargarGuardia();
      }
    });
  }

  inicializarFormulario(): void {
    this.form = this.fb.group({
      seccionId: ['', Validators.required],
      codigo: [
        '',
        [Validators.required, Validators.maxLength(100), Validators.pattern(/^[A-Z0-9_-]+$/)]
      ],
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      descripcion: ['', Validators.maxLength(500)],
      ubicacion: ['', Validators.maxLength(300)],
      permiteEntrada: [true],
      permiteSalida: [true]
    });
  }

  configurarValidacionCodigo(): void {
    this.form
      .get('codigo')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(codigo => {
          if (!codigo || this.modoEdicion) {
            return of(true);
          }

          this.codigoVerificando = true;
          const organizacionId = localStorage.getItem('organizacionId') || '';
          return this.guardiaService.verificarCodigoUnico(codigo, organizacionId);
        })
      )
      .subscribe({
        next: esUnico => {
          this.codigoValido = esUnico;
          this.codigoVerificando = false;

          if (!esUnico && !this.modoEdicion) {
            this.form.get('codigo')?.setErrors({ codigoDuplicado: true });
          }
        },
        error: () => {
          this.codigoVerificando = false;
        }
      });
  }

  cargarSecciones(): void {
    const organizacionId = localStorage.getItem('organizacionId') || '';
    this.seccionService.list(organizacionId).subscribe({
      next: (secciones: any[]) => {
        this.secciones = secciones.map(s => ({ id: s.id, nombre: s.nombre }));
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las secciones'
        });
      }
    });
  }

  cargarGuardia(): void {
    if (!this.guardiaId) return;

    this.loading = true;
    this.guardiaService.obtenerPorId(this.guardiaId).subscribe({
      next: guardia => {
        this.guardiaActual = guardia;
        this.form.patchValue({
          nombre: guardia.nombre,
          descripcion: guardia.descripcion,
          ubicacion: guardia.ubicacion,
          permiteEntrada: guardia.permiteEntrada,
          permiteSalida: guardia.permiteSalida
        });

        // Desactivar campos no editables
        this.form.get('seccionId')?.disable();
        this.form.get('codigo')?.disable();

        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: MENSAJES_ERROR.ERROR_GENERICO
        });
        this.loading = false;
        this.volver();
      }
    });
  }

  onCodigoInput(event: any): void {
    const valor = event.target.value.toUpperCase();
    this.form.get('codigo')?.setValue(valor, { emitEvent: false });
    event.target.value = valor;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: MENSAJES_ERROR.CAMPOS_REQUERIDOS
      });
      return;
    }

    if (!this.codigoValido && !this.modoEdicion) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: MENSAJES_ERROR.CODIGO_DUPLICADO
      });
      return;
    }

    this.loading = true;

    if (this.modoEdicion) {
      this.actualizar();
    } else {
      this.crear();
    }
  }

  crear(): void {
    const organizacionId = localStorage.getItem('organizacionId') || '';
    const dto: CrearGuardiaDTO = {
      organizacionId,
      ...this.form.value
    };

    this.guardiaService.crear(dto).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: MENSAJES_EXITO.GUARDIA_CREADA
        });
        this.loading = false;
        this.volver();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: MENSAJES_ERROR.ERROR_GENERICO
        });
        this.loading = false;
      }
    });
  }

  actualizar(): void {
    if (!this.guardiaId) return;

    const dto: ActualizarGuardiaDTO = {
      nombre: this.form.get('nombre')?.value,
      descripcion: this.form.get('descripcion')?.value,
      ubicacion: this.form.get('ubicacion')?.value,
      permiteEntrada: this.form.get('permiteEntrada')?.value,
      permiteSalida: this.form.get('permiteSalida')?.value
    };

    this.guardiaService.actualizar(this.guardiaId, dto).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: MENSAJES_EXITO.GUARDIA_ACTUALIZADA
        });
        this.loading = false;
        this.volver();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: MENSAJES_ERROR.ERROR_GENERICO
        });
        this.loading = false;
      }
    });
  }

  volver(): void {
    this.router.navigate(['/guardia/gestion']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['minlength'])
      return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    if (field.errors['maxlength'])
      return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    if (field.errors['pattern']) return 'Solo mayúsculas, números y guiones';
    if (field.errors['codigoDuplicado']) return MENSAJES_ERROR.CODIGO_DUPLICADO;

    return '';
  }
}

