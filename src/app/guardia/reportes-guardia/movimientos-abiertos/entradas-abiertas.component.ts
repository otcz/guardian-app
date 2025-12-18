import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';

// Servicios
import { MovimientoGuardiaService } from '../../../service/movimiento-guardia.service';

// Modelos
import { MovimientoGuardia } from '../../../models/guardia.models';
import { LABELS } from '../../constants/mensajes.constants';

@Component({
  selector: 'app-movimientos-abiertos',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    CardModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './entradas-abiertas.component.html',
  styleUrls: ['./entradas-abiertas.component.css']
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

