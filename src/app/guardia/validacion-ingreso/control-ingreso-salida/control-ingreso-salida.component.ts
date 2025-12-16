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
import { GuardiaUsuarioService } from '../../../service/guardia-usuario.service';
import { MovimientoGuardiaService } from '../../../service/movimiento-guardia.service';
import { OrgContextService } from '../../../service/org-context.service';

// Modelos
import {
  Guardia,
  GuardiaUsuario,
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

  // ❌ Modal de error
  mostrarModalError = false;
  mensajeError: string = '';
  tituloError: string = 'Error';

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
    private guardiaUsuarioService: GuardiaUsuarioService,
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
   * Carga las guardias asignadas al usuario logueado
   */
  cargarGuardiaUsuario(): void {
    if (!this.usuarioId) {
      console.error('No hay usuarioId para cargar guardias');
      return;
    }

    this.cargandoGuardias = true;

    this.guardiaUsuarioService.listarDisponiblesPorUsuario(this.usuarioId).subscribe({
      next: (guardiasUsuario) => {
        console.log('✅ Guardias recibidas del backend:', guardiasUsuario);

        // ✅ SIN FILTROS - El backend ya envía solo las guardias válidas
        if (guardiasUsuario.length === 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'Sin Guardias Asignadas',
            detail: 'No tienes guardias activas asignadas. Contacta al administrador.',
            life: 5000
          });
          this.cargandoGuardias = false;
          return;
        }

        // Si solo tiene una guardia, seleccionarla automáticamente
        if (guardiasUsuario.length === 1) {
          this.guardiaId = guardiasUsuario[0].guardiaId;
          const nombreGuardia = guardiasUsuario[0].guardia?.nombre || 'Guardia';
          console.log('✅ Guardia seleccionada automáticamente:', this.guardiaId);

          this.messageService.add({
            severity: 'success',
            summary: 'Bienvenido',
            detail: `${this.nombreGuardiaUsuario} - ${nombreGuardia}`,
            life: 3000
          });
        } else {
          // ✅ Mapeo directo - Sin transformación, el backend envía estructura consistente
          // Filtrar undefined por seguridad (el backend DEBE enviar siempre guardia)
          this.guardias = guardiasUsuario
            .map(gu => gu.guardia)
            .filter((g): g is Guardia => g !== undefined);

          console.log('✅ Guardias para selector:', this.guardias);

          this.messageService.add({
            severity: 'info',
            summary: 'Múltiples Guardias',
            detail: `Tienes ${guardiasUsuario.length} guardias asignadas. Por favor selecciona una.`,
            life: 5000
          });
        }

        this.cargandoGuardias = false;
      },
      error: (error) => {
        console.error('Error al cargar guardias del usuario:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar guardias asignadas: ' + (error.error?.message || error.message),
          life: 5000
        });
        this.cargandoGuardias = false;
      }
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

    // ✅ Enviar guardiaId al backend para que determine la acción permitida
    this.movimientoService.validarUsuario(this.identificador, this.guardiaId).subscribe({
      next: (validacion) => {
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

        // ✅ El backend ya decidió qué acción hacer - Solo mostramos
        this.procesarAccionBackend(validacion);
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

  /**
   * ✅ Procesa la acción que el backend determinó
   * Frontend SOLO muestra lo que el backend envía
   */
  procesarAccionBackend(validacion: ValidacionUsuarioDTO): void {
    // ✅ Usar el campo accionPermitida que el backend envía
    const accion = (validacion as any).accionPermitida;

    // Si el backend no envía accionPermitida, usar la lógica temporal
    // TODO: Eliminar esto cuando el backend implemente accionPermitida
    if (!accion) {
      console.warn('⚠️ Backend no envía accionPermitida - usando lógica temporal');
      this.determinarTipoAccionTemporal();
      return;
    }

    this.tipoAccion = accion;

    switch (accion) {
      case 'BLOQUEADO':
        const motivo = (validacion as any).motivoBloqueo || 'Usuario no autorizado';
        this.messageService.add({
          severity: 'error',
          summary: 'Acceso Bloqueado',
          detail: motivo,
          life: 5000
        });
        break;

      case 'SALIDA':
        if (validacion.entradaAbierta) {
          const permanencia = (validacion.entradaAbierta as any).permanenciaActual;
          if (permanencia) {
            this.messageService.add({
              severity: 'info',
              summary: 'Entrada Abierta',
              detail: `El usuario tiene una entrada abierta desde hace ${permanencia.horas}h ${permanencia.minutos}m`,
              life: 5000
            });
          }
        }
        this.registrarSalidaConModal();
        break;

      case 'ENTRADA':
        const tieneVehiculos = (validacion.vehiculos?.length ?? 0) > 0;
        if (tieneVehiculos) {
          this.mostrarModalSeleccionVehiculo();
        } else {
          this.registrarEntradaConModal();
        }
        break;
    }
  }

  /**
   * ✅ LÓGICA BASADA EN CONFIGURACIÓN MANUAL DEL USUARIO
   * El módulo respeta el check seleccionado (ENTRADA o SALIDA)
   * y valida que la operación sea posible según el estado del usuario.
   */
  determinarTipoAccionTemporal(): void {
    if (!this.validacionUsuario) return;

    // ✅ USAR LA CONFIGURACIÓN DEL CHECK (tipoMovimientoConfig)
    // No automático, sino según lo que el operador configuró
    const tipoConfigurado = this.tipoMovimientoConfig;

    // Validar si la operación configurada es posible
    if (tipoConfigurado === 'ENTRADA') {
      // Validar: ¿Puede registrar entrada?
      if (this.validacionUsuario.tieneEntradaAbierta) {
        // ❌ NO puede registrar entrada porque ya tiene una abierta
        const tiempo = this.calcularTiempoTranscurrido();
        this.messageService.add({
          severity: 'error',
          summary: '❌ Entrada No Permitida',
          detail: `El usuario ya tiene una entrada abierta desde hace ${tiempo.horas}h ${tiempo.minutos}m. Cambie el check a SALIDA o registre la salida primero.`,
          life: 8000
        });
        this.tipoAccion = 'BLOQUEADO';
        return;
      }

      // ✅ Puede registrar entrada
      this.tipoAccion = 'ENTRADA';
      const tieneVehiculos = (this.validacionUsuario.vehiculos?.length ?? 0) > 0;

      if (tieneVehiculos) {
        this.mostrarModalSeleccionVehiculo();
      } else {
        this.registrarEntradaConModal();
      }

    } else if (tipoConfigurado === 'SALIDA') {
      // Validar: ¿Puede registrar salida?
      if (!this.validacionUsuario.tieneEntradaAbierta) {
        // ❌ NO puede registrar salida porque no tiene entrada abierta
        this.messageService.add({
          severity: 'error',
          summary: '❌ Salida No Permitida',
          detail: 'El usuario NO tiene ninguna entrada abierta. Cambie el check a ENTRADA o registre una entrada primero.',
          life: 8000
        });
        this.tipoAccion = 'BLOQUEADO';
        return;
      }

      // ✅ Puede registrar salida
      this.tipoAccion = 'SALIDA';

      // Mostrar info de entrada abierta
      if (this.validacionUsuario.entradaAbierta) {
        const tiempo = this.calcularTiempoTranscurrido();
        this.messageService.add({
          severity: 'info',
          summary: 'Entrada Abierta Detectada',
          detail: `El usuario tiene una entrada abierta desde hace ${tiempo.horas}h ${tiempo.minutos}m`,
          life: 5000
        });
      }

      this.registrarSalidaConModal();
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
      console.error('No hay usuarioId (adminGuardiaId) para registro automático');
      return;
    }

    if (!this.validacionUsuario?.id) {
      console.error('No hay validacionUsuario.id disponible');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el UUID del usuario. Intente buscar nuevamente.',
        life: 3000
      });
      return;
    }

    this.registrando = true;

    const dto: RegistrarEntradaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.validacionUsuario.id,
      vehiculoId: vehiculoId || null,
      adminGuardiaId: this.usuarioId,
      observaciones: this.observaciones || null
    };

    console.log(`🔵 Endpoint: POST /api/movimientos-guardia/entrada | Check: ${this.tipoMovimientoConfig}`);

    this.movimientoService.registrarEntrada(dto).subscribe({
      next: (movimiento) => {
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
      console.error('No hay usuarioId (adminGuardiaId) para registro automático');
      return;
    }

    if (!this.validacionUsuario?.id) {
      console.error('No hay validacionUsuario.id disponible');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el UUID del usuario. Intente buscar nuevamente.',
        life: 3000
      });
      return;
    }

    this.registrando = true;

    const dto: RegistrarSalidaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.validacionUsuario.id,
      vehiculoId: null,
      adminGuardiaId: this.usuarioId,
      observaciones: this.observaciones || null
    };

    console.log(`🟠 Endpoint: POST /api/movimientos-guardia/salida | Check: ${this.tipoMovimientoConfig}`);

    this.movimientoService.registrarSalida(dto).subscribe({
      next: (movimiento) => {

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
      console.error('No hay usuarioId (adminGuardiaId) para registro automático');
      return;
    }

    if (!this.validacionUsuario?.id) {
      console.error('No hay validacionUsuario.id disponible');
      return;
    }

    this.registrando = true;

    const dto: RegistrarEntradaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.validacionUsuario.id,
      adminGuardiaId: this.usuarioId,
      observaciones: this.observaciones || null,
      vehiculoId: null
    };

    console.log(`🔵 Endpoint: POST /api/movimientos-guardia/entrada | Check: ${this.tipoMovimientoConfig}`);

    this.movimientoService.registrarEntrada(dto).subscribe({
      next: (movimiento) => {
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
      console.error('No hay usuarioId (adminGuardiaId) para registro automático');
      return;
    }

    if (!this.validacionUsuario?.id) {
      console.error('No hay validacionUsuario.id disponible');
      return;
    }

    this.registrando = true;

    const dto: RegistrarSalidaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.validacionUsuario.id,
      adminGuardiaId: this.usuarioId,
      observaciones: this.observaciones || undefined
    };

    console.log(`🟠 Endpoint: POST /api/movimientos-guardia/salida | Check: ${this.tipoMovimientoConfig}`);

    this.movimientoService.registrarSalida(dto).subscribe({
      next: (movimiento) => {
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

    if (!this.validacionUsuario?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el UUID del usuario. Intente buscar nuevamente.',
        life: 3000
      });
      return;
    }

    this.registrando = true;

    const dto: RegistrarEntradaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.validacionUsuario.id,  // ✅ USA UUID del DTO
      adminGuardiaId: this.usuarioId,
      ...(this.observaciones && { observaciones: this.observaciones }),  // ✅ Solo incluir si tiene valor
      ...(this.incluirVehiculo && this.vehiculoId && { vehiculoId: this.vehiculoId })  // ✅ Solo incluir si existe
    };

    console.log(`🔵 Endpoint: POST /api/movimientos-guardia/entrada | Check: ${this.tipoMovimientoConfig}`);

    this.movimientoService.registrarEntrada(dto).subscribe({
      next: (movimiento) => {
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
    // ✅ NO resetear tipoMovimientoConfig - mantener la configuración del operador
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

  /**
   * Cerrar modal de error
   */
  cerrarModalError(): void {
    this.mostrarModalError = false;
    this.mensajeError = '';
    this.tituloError = 'Error';
  }

  /**
   * Obtener nombre de la guardia actual
   */
  obtenerNombreGuardia(): string {
    if (this.guardias.length === 1) {
      return this.guardias[0].nombre || 'Guardia';
    }
    const guardiaActual = this.guardias.find(g => g.id === this.guardiaId);
    return guardiaActual?.nombre || 'Guardia';
  }
}

