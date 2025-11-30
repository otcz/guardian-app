import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { OrgContextService } from '../../service/org-context.service';
import { UsersService, UserEntity } from '../../service/users.service';
import { GuardiaService } from '../../service/guardia.service';
import { CrearGuardiaConGestorDTO } from '../../models/guardia.models';

/**
 * Componente para crear un Punto de Control (Guardia) con gestor asignado
 */
@Component({
  selector: 'app-punto-control-crear',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    InputTextarea,
    DropdownModule,
    MessageModule,
    ToastModule,
    ProgressSpinnerModule,
    TooltipModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './punto-control-crear.component.html',
  styleUrls: ['./punto-control-crear.component.scss']
})
export class PuntoControlCrearComponent implements OnInit, OnDestroy {
  // Formulario
  formulario!: FormGroup;

  // Estado del componente
  loading = false;
  guardando = false;
  verificandoCodigo = false;
  codigoExiste = false;

  // Contexto
  organizacionId: string | null = null;
  seccionId: string | null = null;
  nombreOrganizacion: string | null = null;
  nombreSeccion: string | null = null;

  // Datos para dropdown
  usuariosGuardia: UserEntity[] = [];

  // Subject para destruir subscripciones
  private destroy$ = new Subject<void>();

  // Límites de caracteres
  readonly MAX_CODIGO = 100;
  readonly MAX_NOMBRE = 200;
  readonly MAX_DESCRIPCION = 500;
  readonly MAX_UBICACION = 300;
  readonly MAX_OBSERVACIONES = 500;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private orgContext: OrgContextService,
    private usersService: UsersService,
    private guardiaService: GuardiaService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    try {
      this.inicializarContexto();
      this.inicializarFormulario();
      this.configurarValidacionCodigo();
      this.cargarUsuariosGuardia();
    } catch (error) {
      this.mostrarError('Error al inicializar el componente: ' + error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializar contexto de organización y sección
   */
  private inicializarContexto(): void {
    this.organizacionId = this.orgContext.value;
    this.nombreOrganizacion = localStorage.getItem('currentOrgName') || 'Organización';

    this.seccionId =
      this.orgContext.seccion ||
      localStorage.getItem('loginSeccionImmutable') ||
      localStorage.getItem('seccionPrincipalId') ||
      null;

    this.nombreSeccion = localStorage.getItem('currentSectionName') || 'Sección';

    if (!this.organizacionId) {
      this.mostrarError('⚠️ No se pudo determinar la organización actual');
      setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      return;
    }

    if (!this.seccionId) {
      this.mostrarError('⚠️ No se pudo determinar la sección actual. Debe tener una sección asignada.');
      setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      return;
    }
  }

  /**
   * Inicializar formulario reactivo
   */
  private inicializarFormulario(): void {
    this.formulario = this.fb.group({
      codigo: ['', [
        Validators.required,
        Validators.maxLength(this.MAX_CODIGO),
        Validators.pattern(/^[A-Z0-9_-]+$/)
      ]],
      nombre: ['', [
        Validators.required,
        Validators.maxLength(this.MAX_NOMBRE)
      ]],
      descripcion: ['', [Validators.maxLength(this.MAX_DESCRIPCION)]],
      ubicacion: ['', [Validators.maxLength(this.MAX_UBICACION)]],
      usuarioGestorId: [null, Validators.required],
      observaciones: ['', [Validators.maxLength(this.MAX_OBSERVACIONES)]]
    });
  }

  /**
   * Configurar validación en tiempo real del código
   */
  private configurarValidacionCodigo(): void {
    this.formulario.get('codigo')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(codigo => {
        if (codigo && codigo.length >= 3 && this.organizacionId) {
          this.verificarCodigoDisponible(codigo);
        } else {
          this.codigoExiste = false;
        }
      });
  }

  /**
   * Transformar código a mayúsculas mientras se escribe
   */
  onCodigoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorOriginal = input.value;
    const valorMayusculas = valorOriginal.toUpperCase();

    if (valorOriginal !== valorMayusculas) {
      this.formulario.patchValue({ codigo: valorMayusculas }, { emitEvent: false });

      // Mantener la posición del cursor
      const selectionStart = input.selectionStart || 0;
      setTimeout(() => {
        input.setSelectionRange(selectionStart, selectionStart);
      }, 0);
    }
  }

  /**
   * Verificar si el código ya existe
   */
  private verificarCodigoDisponible(codigo: string): void {
    if (!this.organizacionId) return;

    this.verificandoCodigo = true;

    this.guardiaService.existeCodigo(this.organizacionId, codigo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.codigoExiste = response.existe;
          this.verificandoCodigo = false;

          if (this.codigoExiste) {
            this.formulario.get('codigo')?.setErrors({ codigoDuplicado: true });
          }
        },
        error: () => {
          this.verificandoCodigo = false;
        }
      });
  }

  /**
   * Cargar usuarios con rol GUARDIA de la sección
   */
  private cargarUsuariosGuardia(): void {
    console.log('🔵 Iniciando carga de usuarios GUARDIA');
    console.log('   - Organización ID:', this.organizacionId);
    console.log('   - Sección ID:', this.seccionId);

    if (!this.organizacionId || !this.seccionId) {
      console.warn('⚠️ No hay organización o sección, no se pueden cargar usuarios');
      return;
    }

    this.loading = true;

    this.usersService.list(this.organizacionId, { seccionId: this.seccionId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usuarios: UserEntity[]) => {
          console.log('✅ Usuarios recibidos del backend:', usuarios.length);

          // Filtrar usuarios con rol GUARDIA
          this.usuariosGuardia = usuarios.filter(u => {
            const rolesStr = (u.rolNombres || []).join(',').toUpperCase();
            const tieneRol = rolesStr.includes('GUARDIA') || u.rolNombre?.toUpperCase() === 'GUARDIA';
            if (tieneRol) {
              console.log('   ✓ Usuario con rol GUARDIA encontrado:', u.username, u.nombreCompleto);
            }
            return tieneRol;
          });

          console.log('🟢 Total usuarios con rol GUARDIA:', this.usuariosGuardia.length);
          this.loading = false;

          if (this.usuariosGuardia.length === 0) {
            console.warn('⚠️ No hay usuarios con rol GUARDIA en esta sección');
            this.mostrarAdvertencia(
              '⚠️ No hay usuarios con rol GUARDIA en esta sección. ' +
              'Debe crear usuarios con rol GUARDIA antes de crear puntos de control.'
            );
          }
        },
        error: (err) => {
          console.error('❌ Error al cargar usuarios:', err);
          this.loading = false;
          this.mostrarError('Error al cargar usuarios: ' + (err?.error?.message || 'Error desconocido'));
        }
      });
  }


  /**
   * Enviar formulario
   */
  onSubmit(): void {
    // Marcar todos los campos como touched para mostrar errores
    this.marcarCamposComoTocados();

    // Validar formulario
    if (this.formulario.invalid) {
      this.mostrarError('Por favor, complete todos los campos obligatorios correctamente');
      return;
    }

    // Verificar que no haya código duplicado
    if (this.codigoExiste) {
      this.mostrarError('El código ingresado ya existe. Por favor, use otro código');
      return;
    }

    // Confirmar creación con diálogo personalizado
    this.confirmationService.confirm({
      message: `¿Está seguro que desea crear este punto de control?<br><br>
                <strong>Código:</strong> ${this.formulario.value.codigo}<br>
                <strong>Nombre:</strong> ${this.formulario.value.nombre}<br>
                <strong>Gestor:</strong> ${this.obtenerNombreGestorSeleccionado()}`,
      header: 'Confirmar Creación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, crear',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.crearPuntoControl();
      }
    });
  }

  /**
   * Crear punto de control con gestor
   */
  private crearPuntoControl(): void {
    if (!this.organizacionId || !this.seccionId) return;

    this.guardando = true;

    const dto: CrearGuardiaConGestorDTO = {
      organizacionId: this.organizacionId,
      seccionId: this.seccionId,
      codigo: this.formulario.value.codigo.trim(),
      nombre: this.formulario.value.nombre.trim(),
      descripcion: this.formulario.value.descripcion?.trim() || undefined,
      ubicacion: this.formulario.value.ubicacion?.trim() || undefined,
      usuarioGestorId: this.formulario.value.usuarioGestorId,
      observaciones: this.formulario.value.observaciones?.trim() || undefined
    };

    this.guardiaService.crearConGestor(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (guardiaCreada) => {
          this.guardando = false;
          this.mostrarExito(
            `✅ Punto de control "${guardiaCreada.nombre}" creado exitosamente con gestor asignado`
          );

          // Redirigir después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/gestion-de-secciones/administrar-guardias-por-usuario']);
          }, 2000);
        },
        error: (err) => {
          this.guardando = false;
          this.manejarError(err);
        }
      });
  }

  /**
   * Manejar errores de la API
   */
  private manejarError(error: any): void {
    const status = error?.status;
    const mensaje = error?.error?.message || error?.message || 'Error desconocido';

    switch (status) {
      case 400:
        this.mostrarError(`❌ Validación fallida: ${mensaje}`);
        break;
      case 403:
        this.mostrarError('❌ No tiene permisos para realizar esta acción');
        break;
      case 404:
        this.mostrarError(`❌ Recurso no encontrado: ${mensaje}`);
        break;
      case 409:
        this.mostrarError(`❌ Conflicto: ${mensaje}`);
        this.codigoExiste = true;
        this.formulario.get('codigo')?.setErrors({ codigoDuplicado: true });
        break;
      case 500:
        this.mostrarError('❌ Error interno del servidor. Por favor, intente nuevamente');
        break;
      default:
        this.mostrarError(`❌ Error: ${mensaje}`);
    }
  }

  /**
   * Cancelar y volver
   */
  onCancelar(): void {
    if (this.formulario.dirty) {
      this.confirmationService.confirm({
        message: '¿Está seguro que desea cancelar? Se perderán los cambios no guardados.',
        header: 'Confirmar Cancelación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, cancelar',
        rejectLabel: 'No, continuar editando',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => {
          this.router.navigate(['/gestion-de-secciones/administrar-guardias-por-usuario']);
        }
      });
    } else {
      this.router.navigate(['/gestion-de-secciones/administrar-guardias-por-usuario']);
    }
  }

  /**
   * Marcar todos los campos como touched para mostrar errores de validación
   */
  private marcarCamposComoTocados(): void {
    Object.keys(this.formulario.controls).forEach(key => {
      this.formulario.get(key)?.markAsTouched();
    });
  }

  /**
   * Obtener nombre del gestor seleccionado
   */
  private obtenerNombreGestorSeleccionado(): string {
    const gestorId = this.formulario.value.usuarioGestorId;
    const gestor = this.usuariosGuardia.find(u => u.id === gestorId);
    return gestor ? `${gestor.nombreCompleto || gestor.username} (${gestor.username})` : 'No seleccionado';
  }

  // ============================================
  // GETTERS - Acceso a controles del formulario
  // ============================================

  get codigo() {
    return this.formulario.get('codigo');
  }

  get nombre() {
    return this.formulario.get('nombre');
  }

  get descripcion() {
    return this.formulario.get('descripcion');
  }

  get ubicacion() {
    return this.formulario.get('ubicacion');
  }

  get usuarioGestorId() {
    return this.formulario.get('usuarioGestorId');
  }

  get observaciones() {
    return this.formulario.get('observaciones');
  }

  // ============================================
  // GETTERS - Contadores de caracteres
  // ============================================

  get caracteresRestantesCodigo(): number {
    return this.MAX_CODIGO - (this.codigo?.value?.length || 0);
  }

  get caracteresRestantesNombre(): number {
    return this.MAX_NOMBRE - (this.nombre?.value?.length || 0);
  }

  get caracteresRestantesDescripcion(): number {
    return this.MAX_DESCRIPCION - (this.descripcion?.value?.length || 0);
  }

  get caracteresRestantesUbicacion(): number {
    return this.MAX_UBICACION - (this.ubicacion?.value?.length || 0);
  }

  get caracteresRestantesObservaciones(): number {
    return this.MAX_OBSERVACIONES - (this.observaciones?.value?.length || 0);
  }

  // ============================================
  // MÉTODOS DE MENSAJES
  // ============================================

  private mostrarError(mensaje: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: mensaje,
      life: 5000
    });
  }

  private mostrarAdvertencia(mensaje: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Advertencia',
      detail: mensaje,
      life: 5000
    });
  }

  private mostrarExito(mensaje: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: mensaje,
      life: 3000
    });
  }

  private mostrarInfo(mensaje: string): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Información',
      detail: mensaje,
      life: 3000
    });
  }
}

