import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Servicios
import { MovimientoGuardiaService } from '../../../service/movimiento-guardia.service';

// Modelos
import { VehiculoCompletoDTO } from '../../../models/guardia.models';
import { LABELS } from '../../constants/mensajes.constants';

/**
 * Componente para validar vehículos en el sistema
 *
 * @description
 * Permite buscar y validar vehículos por su placa.
 * Muestra información completa: datos del vehículo, usuarios asignados y último movimiento.
 * Solo lectura - NO registra movimientos de entrada/salida.
 *
 * @endpoint GET /api/movimientos-guardia/vehiculo/placa/{placa}
 * @permission ITEM_CONTROL_DE_INGRESO_Y_SALIDA o ITEM_VER_MOVIMIENTOS_GUARDIA
 *
 * @author Sistema Guardian
 * @version 3.0 - Búsqueda por placa con información completa
 * @date 2025-12-17
 */
@Component({
  selector: 'app-validar-vehiculo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    MessageModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './validar-vehiculo.component.html',
  styleUrls: ['./validar-vehiculo.component.scss']
})
export class ValidarVehiculoComponent implements OnInit {
  placa: string = '';
  validacion: VehiculoCompletoDTO | null = null;
  buscando = false;

  readonly LABELS = LABELS;

  constructor(
    private movimientoService: MovimientoGuardiaService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {}

  /**
   * Busca y valida un vehículo por su placa
   *
   * @description
   * Utiliza el nuevo endpoint que retorna información completa del vehículo.
   * Incluye: datos del vehículo, usuarios asignados y último movimiento.
   * Solo consulta información - NO registra movimientos.
   *
   * @endpoint GET /api/movimientos-guardia/vehiculo/placa/{placa}
   * @returns VehiculoCompletoDTO con información completa del vehículo
   *
   * Estados posibles:
   * - activo: true, bloqueado: false -> Vehículo autorizado
   * - activo: false -> Vehículo inactivo
   * - bloqueado: true -> Vehículo bloqueado (NO puede ingresar)
   */
  buscarVehiculo(): void {
    if (!this.placa.trim()) {
      this.messageService.add({
        severity: 'warning',
        summary: 'Campo Requerido',
        detail: 'Debe ingresar una placa de vehículo',
        life: 3000
      });
      return;
    }

    this.buscando = true;
    const placaBusqueda = this.placa.trim().toUpperCase();
    console.log('🔍 Buscando vehículo con placa:', placaBusqueda);

    // Usar el nuevo endpoint que busca por placa
    this.movimientoService.buscarVehiculoPorPlaca(placaBusqueda).subscribe({
      next: (vehiculo: VehiculoCompletoDTO) => {
        console.log('✅ Vehículo encontrado:', vehiculo);
        this.buscando = false;
        this.validacion = vehiculo;

        // Determinar el estado del vehículo
        const estado = this.obtenerEstado(vehiculo);

        this.messageService.add({
          severity: estado === 'BLOQUEADO' ? 'error' : 'success',
          summary: 'Vehículo Encontrado',
          detail: `Placa: ${vehiculo.placa} - ${this.getDescripcionEstado(estado)}`,
          life: 4000
        });
      },
      error: (error) => {
        console.error('❌ Error al buscar vehículo:', error);
        this.buscando = false;
        this.validacion = null;

        // Error 404 - Vehículo no encontrado
        if (error.status === 404) {
          this.messageService.add({
            severity: 'error',
            summary: 'No Encontrado',
            detail: `No existe ningún vehículo con la placa ${placaBusqueda}`,
            life: 4000
          });
        } else {
          // Otros errores
          const mensajeError = error.error?.message || error.message || 'Error al conectar con el servidor';

          this.messageService.add({
            severity: 'error',
            summary: 'Error de Búsqueda',
            detail: mensajeError,
            life: 5000
          });
        }
      }
    });
  }

  /**
   * Obtiene el estado del vehículo basado en sus propiedades
   * @param vehiculo Vehículo completo
   * @returns Estado: ACTIVO, BLOQUEADO o INACTIVO
   */
  obtenerEstado(vehiculo: VehiculoCompletoDTO): string {
    if (vehiculo.bloqueado) {
      return 'BLOQUEADO';
    }
    if (!vehiculo.activo) {
      return 'INACTIVO';
    }
    return 'ACTIVO';
  }

  /**
   * Obtiene el severity de PrimeNG según el estado del vehículo
   * @param estado Estado calculado (ACTIVO, INACTIVO, BLOQUEADO)
   * @returns Severity para el componente p-tag
   */
  getSeverityEstado(estado: string): 'success' | 'warning' | 'danger' | 'info' {
    if (!estado) return 'info';

    switch (estado.toUpperCase()) {
      case 'ACTIVO':
        return 'success';
      case 'BLOQUEADO':
        return 'danger';
      case 'INACTIVO':
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Obtiene el severity basado en el vehículo completo
   * @param vehiculo Vehículo completo
   * @returns Severity para el componente p-tag
   */
  getSeverityVehiculo(vehiculo: VehiculoCompletoDTO): 'success' | 'warning' | 'danger' | 'info' {
    const estado = this.obtenerEstado(vehiculo);
    return this.getSeverityEstado(estado);
  }

  /**
   * Obtiene la descripción del estado del vehículo
   * @param estado Estado del vehículo
   * @returns Descripción legible del estado
   */
  getDescripcionEstado(estado: string): string {
    if (!estado) return 'Estado desconocido';

    switch (estado.toUpperCase()) {
      case 'ACTIVO':
        return 'El vehículo está activo y autorizado para ingresar';
      case 'BLOQUEADO':
        return 'El vehículo está bloqueado y NO puede ingresar';
      case 'INACTIVO':
        return 'El vehículo está inactivo en el sistema';
      default:
        return `Estado del vehículo: ${estado}`;
    }
  }

  /**
   * Formatea una fecha ISO a formato legible
   * @param fecha Fecha en formato ISO string
   * @returns Fecha formateada en español (dd/MM/yyyy HH:mm)
   */
  formatearFecha(fecha: string): string {
    if (!fecha || fecha === 'Sin registros') return fecha;

    try {
      return new Date(fecha).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return fecha;
    }
  }
}

