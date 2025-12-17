import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/inputtextarea';
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
  ValidacionManualDTO,
  VehiculoConUsuariosDTO,
  UsuarioAsignadoDTO,
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
    Textarea,
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

  // Datos cargados
  guardias: Guardia[] = [];
  validacionUsuario: ValidacionUsuarioDTO | null = null;
  nombreGuardiaUsuario: string = ''; // Nombre del usuario que es la guardia

  // 🆕 Validación manual unificada
  resultadoValidacion: ValidacionManualDTO | null = null;
  usuarioSeleccionadoId: string = ''; // Para cuando se busca por placa

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
      return;
    }

    this.cargandoGuardias = true;

    this.guardiaUsuarioService.listarDisponiblesPorUsuario(this.usuarioId).subscribe({
      next: (guardiasUsuario) => {
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


  /**
   * 🆕 Buscar por documento de usuario O placa de vehículo (validación unificada)
   * El backend detecta automáticamente si es un documento o una placa
   */
  buscarUsuario(): void {
    if (!this.guardiaId) {
      this.tituloError = 'Error';
      this.mensajeError = MENSAJES_ERROR.GUARDIA_NO_SELECCIONADA;
      this.mostrarModalError = true;
      return;
    }

    if (!this.identificador.trim()) {
      this.tituloError = 'Error';
      this.mensajeError = 'Ingrese un documento o placa para buscar';
      this.mostrarModalError = true;
      return;
    }

    this.buscando = true;
    this.resultadoValidacion = null;
    this.usuarioSeleccionadoId = '';

    // 🆕 Usar endpoint de validación manual unificada
    this.movimientoService.validarManual(this.identificador).subscribe({
      next: (validacion: ValidacionManualDTO) => {
        this.resultadoValidacion = validacion;
        this.buscando = false;

        this.procesarResultadoValidacion(validacion);
      },
      error: (error) => {
        this.buscando = false;
        this.manejarError(error);
      }
    });
  }

  /**
   * 🆕 Procesar resultado de validación manual según el tipo de búsqueda
   */
  procesarResultadoValidacion(validacion: ValidacionManualDTO): void {
    switch (validacion.tipoBusqueda) {
      case 'USUARIO':
        // Se encontró un usuario por documento
        if (validacion.usuario) {
          this.validacionUsuario = validacion.usuario;
          this.estado = 'USUARIO_ENCONTRADO';
          this.procesarAccionBackend(validacion.usuario);
        }
        break;

      case 'VEHICULO':
        // Se encontró un vehículo por placa
        if (validacion.vehiculoDetalle) {
          if (validacion.vehiculoDetalle.usuariosAsignados.length === 0) {
            this.tituloError = 'Vehículo Sin Usuarios';
            this.mensajeError = `El vehículo ${validacion.vehiculoDetalle.placa} no tiene usuarios asignados. Contacte al administrador.`;
            this.mostrarModalError = true;
          } else {
            // Mostrar el selector de usuario (se maneja en el template)
            this.estado = 'USUARIO_ENCONTRADO';
          }
        }
        break;

      case 'NO_ENCONTRADO':
        this.tituloError = 'No Encontrado';
        this.mensajeError = `No se encontró ningún usuario ni vehículo con: ${this.identificador}`;
        this.mostrarModalError = true;
        break;
    }
  }

  /**
   * 🆕 Confirmar selección de usuario (cuando se buscó por placa)
   */
  confirmarUsuarioVehiculo(): void {
    if (!this.usuarioSeleccionadoId) {
      this.tituloError = 'Error';
      this.mensajeError = 'Debe seleccionar quién conduce el vehículo';
      this.mostrarModalError = true;
      return;
    }

    if (!this.resultadoValidacion?.vehiculoDetalle) {
      return;
    }

    // Buscar el usuario seleccionado
    const usuarioSeleccionado = this.resultadoValidacion.vehiculoDetalle.usuariosAsignados
      .find(u => u.id === this.usuarioSeleccionadoId);

    if (!usuarioSeleccionado) {
      return;
    }

    // Validar que el usuario esté activo
    if (!usuarioSeleccionado.activo) {
      this.tituloError = 'Usuario Inactivo';
      this.mensajeError = `El usuario ${usuarioSeleccionado.nombreCompleto} no está activo. No puede registrar movimientos.`;
      this.mostrarModalError = true;
      return;
    }

    // Construir ValidacionUsuarioDTO a partir del usuario seleccionado
    this.validacionUsuario = {
      id: usuarioSeleccionado.id,
      existe: true,
      activo: usuarioSeleccionado.activo,
      nombreCompleto: usuarioSeleccionado.nombreCompleto,
      username: usuarioSeleccionado.identificacion,
      tipoIdentificacion: usuarioSeleccionado.tipoIdentificacion,
      identificacion: usuarioSeleccionado.identificacion,
      seccion: null,
      restricciones: [],
      vehiculos: [{
        id: this.resultadoValidacion.vehiculoDetalle.id,
        placa: this.resultadoValidacion.vehiculoDetalle.placa,
        marca: this.resultadoValidacion.vehiculoDetalle.marca,
        modelo: this.resultadoValidacion.vehiculoDetalle.modelo,
        color: this.resultadoValidacion.vehiculoDetalle.color,
        tipo: this.resultadoValidacion.vehiculoDetalle.tipo,
        estado: 'ACTIVO'
      }],
      // ⚠️ NOTA: tieneEntradaAbierta puede estar desactualizado del backend
      // El frontend NO toma decisiones basado en este campo
      // Solo se envía la petición según el check configurado y el backend valida
      tieneEntradaAbierta: usuarioSeleccionado.tieneEntradaAbierta,
      entradaAbierta: null
    };

    // Registrar con el vehículo automáticamente
    const vehiculoId = this.resultadoValidacion.vehiculoDetalle.id;

    // ✅ Registrar directamente según la configuración del check (sin mostrar modal de vehículo)
    if (this.tipoMovimientoConfig === 'ENTRADA') {
      this.registrarEntradaConModal(vehiculoId);
    } else if (this.tipoMovimientoConfig === 'SALIDA') {
      this.registrarSalidaConModal();
    }
  }

  /**
   * ✅ Procesa según la configuración del check del usuario
   * Sin validaciones - el backend es quien valida
   */
  procesarAccionBackend(validacion: ValidacionUsuarioDTO): void {
    // ✅ Usar el campo accionPermitida si el backend lo envía (futuro)
    const accion = (validacion as any).accionPermitida;

    // Si el backend no envía accionPermitida, usar el check del usuario
    if (!accion) {
      this.determinarTipoAccionTemporal();
      return;
    }

    // Si el backend envía que está bloqueado, mostrar error
    if (accion === 'BLOQUEADO') {
      const motivo = (validacion as any).motivoBloqueo || 'Usuario no autorizado';
      this.tituloError = 'Acceso Bloqueado';
      this.mensajeError = motivo;
      this.mostrarModalError = true;
      this.tipoAccion = 'BLOQUEADO';
      return;
    }

    // Si el backend dice que puede hacer la acción, proceder
    this.tipoAccion = accion;

    if (accion === 'SALIDA') {
      this.registrarSalidaConModal();
    } else if (accion === 'ENTRADA') {
      const tieneVehiculos = (validacion.vehiculos?.length ?? 0) > 0;
      if (tieneVehiculos) {
        this.mostrarModalSeleccionVehiculo();
      } else {
        this.registrarEntradaConModal();
      }
    }
  }

  /**
   * ✅ SIN VALIDACIONES - El frontend solo envía la petición según el check
   * El backend es quien valida y responde con éxito o error
   */
  determinarTipoAccionTemporal(): void {
    if (!this.validacionUsuario) return;

    // ✅ USAR LA CONFIGURACIÓN DEL CHECK (tipoMovimientoConfig)
    // Sin validar nada - solo enviar la petición
    const tipoConfigurado = this.tipoMovimientoConfig;

    if (tipoConfigurado === 'ENTRADA') {
      // ✅ Intentar registrar entrada - el backend validará
      this.tipoAccion = 'ENTRADA';
      const tieneVehiculos = (this.validacionUsuario.vehiculos?.length ?? 0) > 0;

      if (tieneVehiculos) {
        this.mostrarModalSeleccionVehiculo();
      } else {
        this.registrarEntradaConModal();
      }

    } else if (tipoConfigurado === 'SALIDA') {
      // ✅ Intentar registrar salida - el backend validará
      this.tipoAccion = 'SALIDA';
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
      usuarioId: this.validacionUsuario.id,
      vehiculoId: vehiculoId || null,
      adminGuardiaId: this.usuarioId,
      observaciones: this.observaciones || null
    };

    // 🔍 DEBUG: Logs detallados
    console.log('🔵 === REGISTRO DE ENTRADA ===');
    console.log('🔵 guardiaId:', this.guardiaId);
    console.log('🔵 usuarioId:', this.validacionUsuario.id);
    console.log('🔵 vehiculoId:', vehiculoId);
    console.log('🔵 adminGuardiaId:', this.usuarioId);
    console.log('🔵 tipoMovimientoConfig:', this.tipoMovimientoConfig);
    console.log('🔵 DTO completo:', dto);
    console.log('🔵 Endpoint: POST /api/movimientos-guardia/entrada');

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
        this.registrando = false;
        this.buscando = false; // ✅ Desbloquear botón de búsqueda
        this.manejarError(error);
        // ✅ Limpiar formulario para permitir nueva búsqueda
        this.limpiarFormulario();
      }
    });
  }

  /**
   * 🚀 REGISTRO AUTOMÁTICO DE SALIDA CON MODAL
   */
  registrarSalidaConModal(): void {
    if (!this.usuarioId) {
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

    const dto: RegistrarSalidaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.validacionUsuario.id,
      vehiculoId: null,
      adminGuardiaId: this.usuarioId,
      observaciones: this.observaciones || null
    };

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
        this.registrando = false;
        this.buscando = false; // ✅ Desbloquear botón de búsqueda
        this.manejarError(error);
        // ✅ Limpiar formulario para permitir nueva búsqueda
        this.limpiarFormulario();
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
   *  REGISTRO AUTOMÁTICO DE ENTRADA (DEPRECADO - mantener por compatibilidad)
   */
  registrarEntradaAutomatica(): void {
    if (!this.usuarioId) {
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
        this.registrando = false;
        this.buscando = false; // ✅ Desbloquear botón de búsqueda
        this.manejarError(error);
        // ✅ Limpiar formulario para permitir nueva búsqueda
        this.limpiarFormulario();
      }
    });
  }

  /**
   * 🚀 REGISTRO AUTOMÁTICO DE SALIDA
   */
  registrarSalidaAutomatica(): void {
    if (!this.usuarioId) {
      return;
    }

    if (!this.validacionUsuario?.id) {
      return;
    }

    this.registrando = true;

    const dto: RegistrarSalidaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.validacionUsuario.id,
      adminGuardiaId: this.usuarioId,
      observaciones: this.observaciones || undefined
    };

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
        this.registrando = false;
        this.buscando = false; // ✅ Desbloquear botón de búsqueda
        this.manejarError(error);
        // ✅ Limpiar formulario para permitir nueva búsqueda
        this.limpiarFormulario();
      }
    });
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
    this.validacionUsuario = null;
    this.resultadoValidacion = null;
    this.usuarioSeleccionadoId = '';
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
    // ✅ Usar el mensaje del backend directamente
    let mensaje = error?.error?.message || error?.message || MENSAJES_ERROR.ERROR_GENERICO;

    // Si el backend devuelve un objeto con errores, intentar extraerlos
    if (error?.error?.errors) {
      mensaje = Object.values(error.error.errors).join(', ');
    }

    // Si el backend devuelve texto plano
    if (typeof error?.error === 'string') {
      mensaje = error.error;
    }

    const status = error?.status || error?.error?.status;

    // Determinar título según el tipo de error
    let titulo = 'Error';
    if (status === 400) {
      titulo = 'Error de Validación';
    } else if (status === 404) {
      titulo = 'No Encontrado';
    } else if (status === 500) {
      titulo = 'Error del Servidor';
    }

    // Mostrar en modal
    this.tituloError = titulo;
    this.mensajeError = mensaje;
    this.mostrarModalError = true;
  }

  // Métodos auxiliares para la UI


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

  /**
   * Obtener nombre legible del método de validación
   */
  obtenerNombreMetodo(): string {
    const metodos: Record<MetodoValidacion, string> = {
      'BIOMETRICO': 'Biométrico (Huella)',
      'FACE_CAM': 'Face CAM',
      'PLACA_CAM': 'Placa CAM',
      'MANUAL': 'Manual'
    };
    return metodos[this.metodoValidacion] || this.metodoValidacion;
  }
}

