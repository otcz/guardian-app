import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';

// Servicios
import { MovimientoGuardiaService } from '../../../service/movimiento-guardia.service';

// Modelos
import { MovimientoGuardia } from '../../../models/guardia.models';
import { LABELS } from '../../constants/mensajes.constants';

@Component({
  selector: 'app-entradas-abiertas',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    CardModule
  ],
  providers: [MessageService],
  template: `
    <p-toast position="top-right"></p-toast>

    <div class="entradas-container">
      <p-card>
        <ng-template pTemplate="header">
          <div class="card-header">
            <div>
              <h2><i class="pi pi-exclamation-triangle"></i> Entradas Abiertas</h2>
              <p class="subtitle">Detectar inconsistencias y usuarios sin salida registrada</p>
            </div>
            <p-button
              label="Actualizar"
              icon="pi pi-refresh"
              (onClick)="cargarEntradasAbiertas()"
              [loading]="loading"
            ></p-button>
          </div>
        </ng-template>

        <!-- Tabla -->
        <p-table
          [value]="entradasAbiertas"
          [loading]="loading"
          [paginator]="true"
          [rows]="20"
          [rowsPerPageOptions]="[20, 50, 100]"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} entradas abiertas"
          styleClass="p-datatable-striped"
          responsiveLayout="scroll"
        >
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="timestampMovimiento">
                Fecha/Hora Entrada <p-sortIcon field="timestampMovimiento"></p-sortIcon>
              </th>
              <th>Usuario</th>
              <th>Guardia</th>
              <th>Tiempo Transcurrido</th>
              <th>Admin que Registró</th>
              <th>Observaciones</th>
              <th style="width: 150px">Acciones</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-movimiento>
            <tr>
              <td>{{ formatearFecha(movimiento.timestampMovimiento) }}</td>
              <td>
                <div class="usuario-info">
                  <strong>{{ movimiento.usuario?.nombreCompleto || 'N/A' }}</strong>
                  <small>{{ movimiento.usuario?.username || (movimiento.usuario?.identificacion ? (movimiento.usuario?.tipoIdentificacion + ': ' + movimiento.usuario?.identificacion) : '') }}</small>
                </div>
              </td>
              <td>{{ movimiento.guardia?.nombre || 'N/A' }}</td>
              <td>
                <p-tag
                  [value]="calcularTiempoTranscurrido(movimiento.timestampMovimiento)"
                  [severity]="getSeverityTiempo(movimiento.timestampMovimiento)"
                ></p-tag>
              </td>
              <td>{{ movimiento.adminGuardia?.nombreCompleto || 'N/A' }}</td>
              <td>
                <small>{{ movimiento.observaciones || '-' }}</small>
              </td>
              <td>
                <p-button
                  icon="pi pi-eye"
                  [outlined]="true"
                  severity="info"
                  size="small"
                  (onClick)="verDetalle(movimiento)"
                  pTooltip="Ver detalle"
                ></p-button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" style="text-align: center; padding: 2rem;">
                <i class="pi pi-check-circle" style="font-size: 3rem; color: #4caf50"></i>
                <p style="margin-top: 1rem; font-size: 1.1rem;">
                  ✅ No hay entradas abiertas. Todo en orden.
                </p>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
  `,
  styles: [`
    .entradas-container {
      padding: 1.5rem;
    }

    .card-header {
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .card-header h2 {
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #ff9800;
    }

    .subtitle {
      margin: 0;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .usuario-info {
      display: flex;
      flex-direction: column;
    }

    .usuario-info strong {
      color: #495057;
    }

    .usuario-info small {
      color: #6c757d;
      font-size: 0.875rem;
    }

    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background-color: #f8f9fa;
      color: #495057;
      font-weight: 600;
    }
  `]
})
export class EntradasAbiertasComponent implements OnInit {
  entradasAbiertas: MovimientoGuardia[] = [];
  loading = false;

  readonly LABELS = LABELS;

  constructor(
    private movimientoService: MovimientoGuardiaService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.cargarEntradasAbiertas();
  }

  cargarEntradasAbiertas(): void {
    this.loading = true;

    this.movimientoService.listarTodasEntradasAbiertas().subscribe({
      next: (entradas) => {
        this.entradasAbiertas = entradas;
        this.loading = false;
        console.log('Entradas abiertas cargadas:', entradas.length);

        if (entradas.length > 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Atención',
            detail: `Se encontraron ${entradas.length} entrada(s) abierta(s)`,
            life: 3000
          });
        }
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar entradas abiertas: ' + (error.error?.message || error.message),
          life: 5000
        });
      }
    });
  }

  calcularTiempoTranscurrido(timestampEntrada: string): string {
    const entrada = new Date(timestampEntrada);
    const ahora = new Date();
    const diff = ahora.getTime() - entrada.getTime();

    const horas = Math.floor(diff / 3600000);
    const minutos = Math.floor((diff % 3600000) / 60000);

    return `${horas}h ${minutos}m`;
  }

  getSeverityTiempo(timestampEntrada: string): 'success' | 'warn' | 'danger' | 'info' {
    const entrada = new Date(timestampEntrada);
    const ahora = new Date();
    const horasTranscurridas = (ahora.getTime() - entrada.getTime()) / 3600000;

    if (horasTranscurridas < 12) return 'success';
    if (horasTranscurridas < 24) return 'warn';
    return 'danger';
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

  verDetalle(movimiento: MovimientoGuardia): void {
    // TODO: Implementar modal con detalle completo
    this.messageService.add({
      severity: 'info',
      summary: 'Detalle',
      detail: `Movimiento ID: ${movimiento.id}`,
      life: 3000
    });
  }
}

