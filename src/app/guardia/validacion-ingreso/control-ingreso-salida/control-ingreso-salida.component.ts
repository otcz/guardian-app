import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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

// Servicios
import { GuardiaService } from '../../../service/guardia.service';
import { MovimientoGuardiaService } from '../../../service/movimiento-guardia.service';
import { GuardiaUsuarioService } from '../../../service/guardia-usuario.service';

// Modelos
import {
  Guardia,
  ValidacionUsuarioDTO,
  RegistrarEntradaDTO,
  RegistrarSalidaDTO,
  Vehiculo
} from '../../../models/guardia.models';
import {
  MENSAJES_ERROR,
  MENSAJES_EXITO,
  MENSAJES_ADVERTENCIA,
  MENSAJES_INFO,
  LABELS
} from '../../constants/mensajes.constants';

type EstadoFormulario = 'INICIAL' | 'USUARIO_ENCONTRADO' | 'REGISTRANDO';
type TipoAccion = 'ENTRADA' | 'SALIDA' | 'BLOQUEADO';

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
    MessagesModule
  ],
  templateUrl: './control-ingreso-salida.component.html',
  styleUrls: ['./control-ingreso-salida.component.scss']
})
export class ControlIngresoSalidaComponent implements OnInit {
  @ViewChild('identificadorInput') identificadorInput!: ElementRef;

  // Estado del formulario
  estado: EstadoFormulario = 'INICIAL';
  tipoAccion: TipoAccion | null = null;

  // Datos del formulario
  guardiaId: string = '';
  identificador: string = '';
  observaciones: string = '';
  incluirVehiculo = false;
  vehiculoId: string = '';

  // Datos cargados
  guardias: Guardia[] = [];
  guardiaSeleccionada: Guardia | null = null;
  validacionUsuario: ValidacionUsuarioDTO | null = null;
  vehiculos: Vehiculo[] = [];

  // UI
  buscando = false;
  registrando = false;

  readonly LABELS = LABELS;
  readonly MENSAJES_INFO = MENSAJES_INFO;

  constructor(
    private guardiaService: GuardiaService,
    private movimientoService: MovimientoGuardiaService,
    private guardiaUsuarioService: GuardiaUsuarioService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.cargarGuardias();
    this.cargarGuardiaSeleccionada();
  }

  cargarGuardias(): void {
    // TODO: Obtener seccionId del usuario autenticado
    const seccionId = localStorage.getItem('seccionId') || '';

    this.guardiaService.listarActivasPorSeccion(seccionId).subscribe({
      next: guardias => {
        this.guardias = guardias;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las guardias'
        });
      }
    });
  }

  cargarGuardiaSeleccionada(): void {
    const guardiaIdGuardada = localStorage.getItem('guardia_seleccionada');
    if (guardiaIdGuardada) {
      this.guardiaId = guardiaIdGuardada;
    }
  }

  onGuardiaChange(): void {
    localStorage.setItem('guardia_seleccionada', this.guardiaId);
    this.guardiaSeleccionada = this.guardias.find(g => g.id === this.guardiaId) || null;
    this.limpiarFormulario();
  }

  buscarUsuario(): void {
    if (!this.guardiaId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: MENSAJES_ERROR.GUARDIA_NO_SELECCIONADA
      });
      return;
    }

    if (!this.identificador.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: MENSAJES_ERROR.IDENTIFICADOR_REQUERIDO
      });
      return;
    }

    this.buscando = true;

    this.movimientoService.validarUsuario(this.identificador).subscribe({
      next: validacion => {
        this.validacionUsuario = validacion;
        this.buscando = false;

        if (!validacion.existe) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: MENSAJES_ERROR.USUARIO_NO_ENCONTRADO
          });
          return;
        }

        this.estado = 'USUARIO_ENCONTRADO';
        this.determinarTipoAccion();
      },
      error: () => {
        this.buscando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: MENSAJES_ERROR.ERROR_GENERICO
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
    } else {
      this.tipoAccion = 'ENTRADA';
      // Mostrar mensaje por defecto si tiene vehículos
      if (this.validacionUsuario.vehiculos.length > 0) {
        this.mostrarMensajeVehiculos();
      }
    }
  }

  mostrarMensajeVehiculos(): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Vehículos Disponibles',
      detail: MENSAJES_ADVERTENCIA.USUARIO_CON_VEHICULOS,
      life: 5000
    });
  }

  registrarEntrada(): void {
    if (!this.validarRegistro()) return;

    this.registrando = true;

    const adminGuardiaId = localStorage.getItem('userId') || '';
    const dto: RegistrarEntradaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.identificador,
      adminGuardiaId,
      observaciones: this.observaciones || undefined,
      vehiculoId: this.incluirVehiculo ? this.vehiculoId : undefined
    };

    this.movimientoService.registrarEntrada(dto).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: MENSAJES_EXITO.ENTRADA_REGISTRADA,
          life: 3000
        });
        this.registrando = false;
        this.limpiarYEnfocar();
      },
      error: error => {
        this.registrando = false;
        this.manejarError(error);
      }
    });
  }

  registrarSalida(): void {
    if (!this.validarRegistro()) return;

    this.registrando = true;

    const adminGuardiaId = localStorage.getItem('userId') || '';
    const dto: RegistrarSalidaDTO = {
      guardiaId: this.guardiaId,
      usuarioId: this.identificador,
      adminGuardiaId,
      observaciones: this.observaciones || undefined,
      vehiculoId: this.incluirVehiculo ? this.vehiculoId : undefined
    };

    this.movimientoService.registrarSalida(dto).subscribe({
      next: movimiento => {
        const minutos = movimiento.permanenciaMinutos || 0;
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: MENSAJES_EXITO.SALIDA_REGISTRADA(minutos),
          life: 3000
        });
        this.registrando = false;
        this.limpiarYEnfocar();
      },
      error: error => {
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
        detail: MENSAJES_ERROR.GUARDIA_NO_SELECCIONADA
      });
      return false;
    }

    if (!this.validacionUsuario) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: MENSAJES_ERROR.USUARIO_NO_ENCONTRADO
      });
      return false;
    }

    if (this.incluirVehiculo && !this.vehiculoId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debe seleccionar un vehículo'
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
    const mensaje = error?.error?.message || MENSAJES_ERROR.ERROR_GENERICO;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: mensaje
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

    const entrada = new Date(this.validacionUsuario.entradaAbierta.timestampMovimiento);
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

