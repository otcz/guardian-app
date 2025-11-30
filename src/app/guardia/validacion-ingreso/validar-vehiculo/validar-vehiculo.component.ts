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
  template: `
    <p-toast position="top-right"></p-toast>

    <div class="validar-container">
      <p-card>
        <ng-template pTemplate="header">
          <div class="card-header">
            <h2><i class="pi pi-car"></i> Validar Vehículo</h2>
            <p class="subtitle">Solo lectura - No registra movimientos</p>
          </div>
        </ng-template>

        <!-- Formulario de Búsqueda -->
        <div class="p-field">
          <label for="placa">{{ LABELS.PLACA_VEHICULO }}</label>
          <div class="p-inputgroup">
            <input
              pInputText
              id="placa"
              [(ngModel)]="placa"
              placeholder="Placa del vehículo"
              (keyup.enter)="buscarVehiculo()"
              [disabled]="buscando"
              style="text-transform: uppercase"
            />
            <button
              pButton
              type="button"
              label="Buscar"
              icon="pi pi-search"
              (click)="buscarVehiculo()"
              [loading]="buscando"
            ></button>
          </div>
        </div>

        <!-- Panel de Resultados -->
        <div *ngIf="validacion" class="resultado-panel">
          <div class="vehiculo-header">
            <h3>{{ validacion.placa }}</h3>
            <p-tag
              [value]="validacion.estado"
              [severity]="getSeverityEstado(validacion.estado)"
            ></p-tag>
          </div>

          <div class="vehiculo-info">
            <div class="info-row">
              <label>Usuario Asociado:</label>
              <strong>{{ validacion.usuarioAsociado || 'N/A' }}</strong>
            </div>

            <div *ngIf="validacion.ultimaActividad" class="info-row">
              <label>Última Actividad:</label>
              <strong>{{ formatearFecha(validacion.ultimaActividad) }}</strong>
            </div>

            <div class="info-row">
              <p-message
                [severity]="validacion.estado === 'ACTIVO' ? 'success' : 'warn'"
                [text]="getDescripcionEstado(validacion.estado)"
                [closable]="false"
              ></p-message>
            </div>
          </div>
        </div>

        <div *ngIf="!validacion && !buscando && placa" class="empty-state">
          <p-message
            severity="info"
            text="Ingrese una placa y presione Enter"
            [closable]="false"
          ></p-message>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .validar-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .card-header {
      padding: 1.5rem;
    }

    .card-header h2 {
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .subtitle {
      margin: 0;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .resultado-panel {
      margin-top: 1.5rem;
      padding: 1rem;
      background-color: #f8f9fa;
      border-radius: 6px;
    }

    .vehiculo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #dee2e6;
    }

    .vehiculo-header h3 {
      margin: 0;
      font-family: monospace;
      font-size: 1.5rem;
    }

    .vehiculo-info .info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e9ecef;
    }

    .vehiculo-info .info-row:last-child {
      border-bottom: none;
    }

    .vehiculo-info .info-row label {
      color: #6c757d;
      font-weight: 500;
      margin: 0;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
    }
  `]
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

