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
import { ValidacionVehiculoDTO } from '../../../models/guardia.models';
import { MENSAJES_ERROR, LABELS } from '../../constants/mensajes.constants';

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
  validacion: ValidacionVehiculoDTO | null = null;
  buscando = false;

  readonly LABELS = LABELS;

  constructor(
    private movimientoService: MovimientoGuardiaService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {}

  buscarVehiculo(): void {
    if (!this.placa.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debe ingresar una placa',
        life: 3000
      });
      return;
    }

    this.buscando = true;
    console.log('Validando vehículo:', this.placa);

    this.movimientoService.validarVehiculo(this.placa).subscribe({
      next: (validacion) => {
        console.log('Validación recibida:', validacion);
        this.validacion = validacion;
        this.buscando = false;

        if (!validacion.existe) {
          this.messageService.add({
            severity: 'error',
            summary: 'No encontrado',
            detail: 'Vehículo no encontrado en el sistema',
            life: 3000
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Vehículo encontrado',
            detail: `Validación completada para ${validacion.placa}`,
            life: 3000
          });
        }
      },
      error: (error) => {
        console.error('Error al validar vehículo:', error);
        this.buscando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al validar vehículo: ' + (error.error?.message || error.message),
          life: 5000
        });
      }
    });
  }

  getSeverityEstado(estado: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (estado.toUpperCase()) {
      case 'ACTIVO':
        return 'success';
      case 'BLOQUEADO':
        return 'danger';
      case 'INACTIVO':
        return 'warn';
      default:
        return 'warn';
    }
  }

  getDescripcionEstado(estado: string): string {
    switch (estado.toUpperCase()) {
      case 'ACTIVO':
        return 'El vehículo está activo y puede ingresar';
      case 'BLOQUEADO':
        return 'El vehículo está bloqueado y no puede ingresar';
      case 'INACTIVO':
        return 'El vehículo está inactivo';
      default:
        return `Estado del vehículo: ${estado}`;
    }
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
}

