import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DividerModule } from 'primeng/divider';

// Servicios
import { GuardiaService } from '../../../service/guardia.service';
import { MovimientoGuardiaService } from '../../../service/movimiento-guardia.service';
import { OrgContextService } from '../../../service/org-context.service';

// Modelos
import {
  Guardia,
  ValidacionUsuarioDTO,
  RegistrarEntradaDTO,
  RegistrarSalidaDTO
} from '../../../models/guardia.models';
import {
  MENSAJES_ERROR,
  MENSAJES_EXITO,
  MENSAJES_INFO,
  LABELS
} from '../../constants/mensajes.constants';

type EstadoFormulario = 'INICIAL' | 'USUARIO_ENCONTRADO' | 'REGISTRANDO';
type TipoAccion = 'ENTRADA' | 'SALIDA' | 'BLOQUEADO';
type MetodoValidacion = 'BIOMETRICO' | 'FACE_CAM' | 'PLACA_CAM' | 'MANUAL';
type TipoMovimiento = 'ENTRADA' | 'SALIDA';

@Component({
  selector: 'app-control-ingreso-salida',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputTextarea,
    DropdownModule,
    CheckboxModule,
    TagModule,
    MessageModule,
    MessagesModule,
    ToastModule,
    DialogModule,
    RadioButtonModule,
    DividerModule
  ],
  providers: [MessageService],
  templateUrl: './control-ingreso-salida.component.html',
  styleUrls: ['./control-ingreso-salida.component.scss']
})
export class ControlIngresoSalidaComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('identificadorInput') identificadorInput!: ElementRef;

  // ⚙️ CONFIGURACIÓN DE VALIDACIÓN
  metodoValidacion: MetodoValidacion = 'MANUAL';
  tipoMovimientoConfig: TipoMovimiento = 'ENTRADA';

  // Estado del formulario
  estado: EstadoFormulario = 'INICIAL';
  tipoAccion: TipoAccion | null = null;

  // 🚗 Modal de selección de vehículo
  mostrarModalVehiculo = false;
  vehiculoSeleccionado: string = '';
  tiempoRestante = 15;
  private intervalTimer: any = null;

  // 📊 Modal de confirmación de registro
  mostrarModalConfirmacion = false;
  datosRegistroExitoso: any = null;

  // Datos del formulario
  guardiaId: string = '';
  identificador: string = '';
  observaciones: string = '';
  incluirVehiculo = false;
  vehiculoId: string = '';

  // Datos cargados
  guardias: Guardia[] = [];
  validacionUsuario: ValidacionUsuarioDTO | null = null;
  nombreGuardiaUsuario: string = ''; // Nombre del usuario que es la guardia

  // UI
  buscando = false;
  registrando = false;
  cargandoGuardias = false;

  // Contexto del usuario
  private organizacionId: string = '';
  private seccionId: string = '';
  private usuarioId: string = '';

  readonly LABELS = LABELS;
  readonly MENSAJES_INFO = MENSAJES_INFO;

  constructor(
    private guardiaService: GuardiaService,
    private movimientoService: MovimientoGuardiaService,
    private orgContextService: OrgContextService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.inicializarContexto();
    this.cargarGuardiaUsuario(); // Carga automática
  }

  ngAfterViewInit(): void {
    // Enfocar el input después de cargar la guardia
    setTimeout(() => {
      this.enfocarInput();
    }, 500);
  }

  ngOnDestroy(): void {
    // Limpiar temporizador al destruir componente
    this.clearTimer();
  }

  private inicializarContexto(): void {
    // Obtener datos del contexto y localStorage con múltiples fallbacks
    this.organizacionId = this.orgContextService.value || localStorage.getItem('currentOrgId') || '';

    // Intentar obtener seccionId de múltiples fuentes
    this.seccionId = this.orgContextService.seccion
      || localStorage.getItem('seccionPrincipalId')
      || localStorage.getItem('seccionId')
      || '';

    this.usuarioId = localStorage.getItem('userId') || localStorage.getItem('usuarioId') || '';

    // Obtener el nombre del usuario logueado (la guardia física)
    this.nombreGuardiaUsuario = localStorage.getItem('username')
      || localStorage.getItem('nombreCompleto')
      || localStorage.getItem('nombre')
      || 'GUARDIA';


    if (!this.usuarioId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Sesión',
        detail: 'No se pudo determinar el usuario autenticado. Por favor, vuelva a iniciar sesión.',
        life: 8000
      });
    }
  }

  /**
   * Configura el componente - El usuario logueado ES la guardia
   */
  cargarGuardiaUsuario(): void {
    // El guardiaId es el userId porque el usuario logueado ES la guardia
    this.guardiaId = this.usuarioId;


    // Mostrar mensaje de bienvenida
    this.messageService.add({
      severity: 'success',
      summary: 'Bienvenido',
      detail: `Guardia: ${this.nombreGuardiaUsuario}`,
      life: 2000
    });
  }


  buscarUsuario(): void {
    if (!this.guardiaId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: MENSAJES_ERROR.GUARDIA_NO_SELECCIONADA,
        life: 3000
      });
      return;
    }

    if (!this.identificador.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: MENSAJES_ERROR.IDENTIFICADOR_REQUERIDO,
        life: 3000
      });
      return;
    }

    this.buscando = true;
    console.log('Buscando usuario:', this.identificador);

    this.movimientoService.validarUsuario(this.identificador).subscribe({
      next: (validacion) => {
        console.log('Validación recibida:', validacion);
        this.validacionUsuario = validacion;
        this.buscando = false;

        if (!validacion.existe) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: MENSAJES_ERROR.USUARIO_NO_ENCONTRADO,
            life: 3000
          });
          return;
        }

        this.estado = 'USUARIO_ENCONTRADO';
        this.determinarTipoAccion();
      },
      error: (error) => {
        this.buscando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al validar usuario: ' + (error.error?.message || error.message),
          life: 5000
        });
      }
    });
  }

  determinarTipoAccion(): void {
    if (!this.validacionUsuario) return;

    // Verificar si está activo
    if (!this.validacionUsuario.activo) {
      this.tipoAccion = 'BLOQUEADO';
      return;
    }

    // Verificar si tiene restricción en esta guardia
    const tieneRestriccion = this.validacionUsuario.restricciones.some(r =>
      r.includes(this.guardiaId)
    );

    if (tieneRestriccion) {
      this.tipoAccion = 'BLOQUEADO';
      return;
    }

    // Determinar si es entrada o salida según si tiene entrada abierta
    if (this.validacionUsuario.tieneEntradaAbierta) {
      this.tipoAccion = 'SALIDA';

      // Mostrar info de entrada abierta
      if (this.validacionUsuario.entradaAbierta) {
        const tiempo = this.calcularTiempoTranscurrido();
        this.messageService.add({
          severity: 'info',
          summary: 'Entrada Abierta',
          detail: `El usuario tiene una entrada abierta desde hace ${tiempo.horas}h ${tiempo.minutos}m`,
          life: 5000
        });
      }

      // 🚀 REGISTRO AUTOMÁTICO DE SALIDA con modal
      this.registrarSalidaConModal();

    } else {
      this.tipoAccion = 'ENTRADA';

      const tieneVehiculos = (this.validacionUsuario.vehiculos?.length ?? 0) > 0;

      if (tieneVehiculos) {
        // 🚗 Mostrar modal de selección de vehículo con temporizador de 15 segundos
        this.mostrarModalSeleccionVehiculo();
      } else {
        // 🚀 REGISTRO AUTOMÁTICO DE ENTRADA con modal (sin vehículos)
        this.registrarEntradaConModal();
      }
    }
  }

  /**
   * 🚗 MOSTRAR MODAL DE SELECCIÓN DE VEHÍCULO CON TEMPORIZADOR
   */
  mostrarModalSeleccionVehiculo(): void {
    this.mostrarModalVehiculo = true;
    this.vehiculoSeleccionado = '';
    this.tiempoRestante = 15;

    // Iniciar cuenta regresiva
    this.intervalTimer = setInterval(() => {
      this.tiempoRestante--;

      if (this.tiempoRestante <= 0) {
        this.clearTimer();
        // Registrar entrada SIN vehículo automáticamente
        this.registrarEntradaConModal();
      }
    }, 1000);
  }

  /**
   * Limpiar temporizador
   */
  clearTimer(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.mostrarModalVehiculo = false;
  }

  /**
   * Confirmar selección de vehículo
   */
  confirmarVehiculo(): void {
    this.clearTimer();

    if (this.vehiculoSeleccionado) {
      // Registrar CON vehículo
      this.registrarEntradaConModal(this.vehiculoSeleccionado);
    } else {
      // Registrar SIN vehículo
      this.registrarEntradaConModal();
    }
  }

  /**
   * Cancelar modal de vehículo (registrar sin vehículo)
   */
  cancelarModalVehiculo(): void {
    this.clearTimer();
    this.registrarEntradaConModal();
  }

  /**
   * 🚀 REGISTRO AUTOMÁTICO DE ENTRADA CON MODAL DE CONFIRMACIÓN
   */
  registrarEntradaConModal(vehiculoId?: string): void {
    if (!this.usuarioId) {
      console.error('No hay usuarioId para registro automático');
      return;
    }

    this.registrando = true;

    const dto: RegistrarEntradaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.identificador,
      adminGuardiaId: this.usuarioId,
      observaciones: this.observaciones || undefined,
      vehiculoId: vehiculoId
    };

    console.log('🚀 Registrando entrada:', dto);

    this.movimientoService.registrarEntrada(dto).subscribe({
      next: (movimiento) => {
        console.log('✅ Entrada registrada:', movimiento);

        // Guardar datos y mostrar modal de confirmación
        this.datosRegistroExitoso = {
          ...movimiento,
          usuario: this.validacionUsuario,
          tipo: 'ENTRADA',
          vehiculo: vehiculoId ? this.validacionUsuario?.vehiculos.find(v => v.id === vehiculoId) : null
        };

        this.mostrarModalConfirmacion = true;
        this.registrando = false;

        // Auto cerrar después de 5 segundos
        setTimeout(() => {
          this.cerrarModalConfirmacion();
        }, 5000);
      },
      error: (error) => {
        console.error('❌ Error en registro de entrada:', error);
        this.registrando = false;
        this.manejarError(error);
        this.estado = 'USUARIO_ENCONTRADO';
      }
    });
  }

  /**
   * 🚀 REGISTRO AUTOMÁTICO DE SALIDA CON MODAL
   */
  registrarSalidaConModal(): void {
    if (!this.usuarioId) {
      console.error('No hay usuarioId para registro automático');
      return;
    }

    this.registrando = true;

    const dto: RegistrarSalidaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.identificador,
      adminGuardiaId: this.usuarioId,
      observaciones: this.observaciones || undefined,
      vehiculoId: undefined // Sin vehículo en salidas
    };

    console.log('🚀 Registrando salida:', dto);

    this.movimientoService.registrarSalida(dto).subscribe({
      next: (movimiento) => {
        console.log('✅ Salida registrada:', movimiento);

        // Guardar datos y mostrar modal de confirmación
        this.datosRegistroExitoso = {
          ...movimiento,
          usuario: this.validacionUsuario,
          tipo: 'SALIDA'
        };

        this.mostrarModalConfirmacion = true;
        this.registrando = false;

        // Auto cerrar después de 5 segundos
        setTimeout(() => {
          this.cerrarModalConfirmacion();
        }, 5000);
      },
      error: (error) => {
        console.error('❌ Error en registro de salida:', error);
        this.registrando = false;
        this.manejarError(error);
        this.estado = 'USUARIO_ENCONTRADO';
      }
    });
  }

  /**
   * Cerrar modal de confirmación y limpiar
   */
  cerrarModalConfirmacion(): void {
    this.mostrarModalConfirmacion = false;
    this.datosRegistroExitoso = null;
    this.limpiarYEnfocar();
  }

  /**
   * 🚀 REGISTRO AUTOMÁTICO DE ENTRADA (DEPRECADO - mantener por compatibilidad)
   */
  registrarEntradaAutomatica(): void {
    if (!this.usuarioId) {
      console.error('No hay usuarioId para registro automático');
      return;
    }

    this.registrando = true;

    const dto: RegistrarEntradaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.identificador,
      adminGuardiaId: this.usuarioId,
      observaciones: this.observaciones || undefined,
      vehiculoId: undefined // Sin vehículo en registro automático
    };

    console.log('🚀 Registrando entrada automáticamente:', dto);

    this.movimientoService.registrarEntrada(dto).subscribe({
      next: (movimiento) => {
        console.log('✅ Entrada registrada automáticamente:', movimiento);
        this.messageService.add({
          severity: 'success',
          summary: '✅ Entrada Registrada',
          detail: `${this.validacionUsuario?.nombreCompleto || 'Usuario'} - Entrada registrada automáticamente`,
          life: 3000
        });
        this.registrando = false;
        this.limpiarYEnfocar();
      },
      error: (error) => {
        console.error('❌ Error en registro automático de entrada:', error);
        this.registrando = false;
        this.manejarError(error);
        // Mantener el estado para que el usuario pueda reintentar manualmente
        this.estado = 'USUARIO_ENCONTRADO';
      }
    });
  }

  /**
   * 🚀 REGISTRO AUTOMÁTICO DE SALIDA
   */
  registrarSalidaAutomatica(): void {
    if (!this.usuarioId) {
      console.error('No hay usuarioId para registro automático');
      return;
    }

    this.registrando = true;

    const dto: RegistrarSalidaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.identificador,
      adminGuardiaId: this.usuarioId,
      observaciones: this.observaciones || undefined,
      vehiculoId: undefined // Sin vehículo en salidas
    };

    console.log('🚀 Registrando salida automáticamente:', dto);

    this.movimientoService.registrarSalida(dto).subscribe({
      next: (movimiento) => {
        console.log('✅ Salida registrada automáticamente:', movimiento);
        const minutos = movimiento.permanenciaMinutos || 0;
        this.messageService.add({
          severity: 'success',
          summary: '✅ Salida Registrada',
          detail: `${this.validacionUsuario?.nombreCompleto || 'Usuario'} - Permanencia: ${minutos} minutos`,
          life: 3000
        });
        this.registrando = false;
        this.limpiarYEnfocar();
      },
      error: (error) => {
        console.error('❌ Error en registro automático de salida:', error);
        this.registrando = false;
        this.manejarError(error);
        // Mantener el estado para que el usuario pueda reintentar manualmente
        this.estado = 'USUARIO_ENCONTRADO';
      }
    });
  }

  /**
   * Registro MANUAL de entrada (cuando el usuario selecciona vehículo)
   */
  registrarEntrada(): void {
    if (!this.validarRegistro()) return;

    if (!this.usuarioId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el ID del usuario autenticado',
        life: 3000
      });
      return;
    }

    this.registrando = true;

    const dto: RegistrarEntradaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.identificador,
      adminGuardiaId: this.usuarioId,
      observaciones: this.observaciones || undefined,
      vehiculoId: this.incluirVehiculo ? this.vehiculoId : undefined
    };

    console.log('Registrando entrada manualmente:', dto);

    this.movimientoService.registrarEntrada(dto).subscribe({
      next: (movimiento) => {
        console.log('Entrada registrada:', movimiento);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: MENSAJES_EXITO.ENTRADA_REGISTRADA,
          life: 3000
        });
        this.registrando = false;
        this.limpiarYEnfocar();
      },
      error: (error) => {
        console.error('Error al registrar entrada:', error);
        this.registrando = false;
        this.manejarError(error);
      }
    });
  }

  validarRegistro(): boolean {
    if (!this.guardiaId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: MENSAJES_ERROR.GUARDIA_NO_SELECCIONADA,
        life: 3000
      });
      return false;
    }

    if (!this.validacionUsuario) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: MENSAJES_ERROR.USUARIO_NO_ENCONTRADO,
        life: 3000
      });
      return false;
    }

    if (this.incluirVehiculo && !this.vehiculoId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debe seleccionar un vehículo',
        life: 3000
      });
      return false;
    }

    return true;
  }

  cancelar(): void {
    this.limpiarFormulario();
    this.enfocarInput();
  }

  limpiarYEnfocar(): void {
    this.limpiarFormulario();
    this.enfocarInput();
  }

  limpiarFormulario(): void {
    this.identificador = '';
    this.observaciones = '';
    this.incluirVehiculo = false;
    this.vehiculoId = '';
    this.validacionUsuario = null;
    this.estado = 'INICIAL';
    this.tipoAccion = null;
  }

  enfocarInput(): void {
    setTimeout(() => {
      if (this.identificadorInput) {
        this.identificadorInput.nativeElement.focus();
      }
    }, 100);
  }

  manejarError(error: any): void {
    const mensaje = error?.error?.message || error?.message || MENSAJES_ERROR.ERROR_GENERICO;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: mensaje,
      life: 5000
    });
  }

  // Métodos auxiliares para la UI

  get puedeRegistrarEntrada(): boolean {
    return this.tipoAccion === 'ENTRADA' && !this.registrando;
  }

  get puedeRegistrarSalida(): boolean {
    return this.tipoAccion === 'SALIDA' && !this.registrando;
  }

  get estaBloqueado(): boolean {
    return this.tipoAccion === 'BLOQUEADO';
  }

  get motivoBloqueo(): string {
    if (!this.validacionUsuario) return '';

    if (!this.validacionUsuario.activo) {
      return MENSAJES_INFO.USUARIO_INACTIVO;
    }

    const restriccion = this.validacionUsuario.restricciones.find(r =>
      r.includes(this.guardiaId)
    );
    return MENSAJES_INFO.GUARDIA_RESTRINGIDA(restriccion);
  }

  calcularTiempoTranscurrido(): { horas: number; minutos: number } {
    if (!this.validacionUsuario?.entradaAbierta) {
      return { horas: 0, minutos: 0 };
    }

    const timestamp = this.validacionUsuario.entradaAbierta.timestampMovimiento;
    if (!timestamp) {
      return { horas: 0, minutos: 0 };
    }

    const entrada = new Date(timestamp);
    const ahora = new Date();
    const diff = ahora.getTime() - entrada.getTime();
    const minutosTotales = Math.floor(diff / 60000);
    const horas = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;

    return { horas, minutos };
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onEnterIdentificador(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter') {
      this.buscarUsuario();
    }
  }
}

