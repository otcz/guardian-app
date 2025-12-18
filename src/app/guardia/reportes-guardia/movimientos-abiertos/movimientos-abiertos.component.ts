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
import { TabViewModule } from 'primeng/tabview';
import { DialogModule } from 'primeng/dialog';

// Servicios
import { MovimientoGuardiaService } from '../../../service/movimiento-guardia.service';

// Modelos
import { MovimientoGuardia } from '../../../models/guardia.models';
import { LABELS } from '../../constants/mensajes.constants';

/**
 * Interface para representar el estado de un usuario
 */
interface EstadoUsuario {
  usuarioId: string;
  nombreCompleto: string;
  telefono?: string;
  guardiaNombre: string;
  fechaHoraMovimiento: string;
  tiempoTranscurrido: string;
  observaciones?: string;
  ultimoMovimiento: MovimientoGuardia;
}

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
    TooltipModule,
    TabViewModule,
    DialogModule
  ],
  providers: [MessageService],
  templateUrl: './movimientos-abiertos.component.html',
  styleUrls: ['./movimientos-abiertos.component.css']
})
export class MovimientosAbiertosComponent implements OnInit {
  usuariosDentro: EstadoUsuario[] = [];
  usuariosFuera: EstadoUsuario[] = [];
  loading = false;
  displayDetalle = false;
  usuarioSeleccionado: EstadoUsuario | null = null;

  readonly LABELS = LABELS;

  constructor(
    private movimientoService: MovimientoGuardiaService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.cargarEstadosUsuarios();
  }

  cargarEstadosUsuarios(): void {
    this.loading = true;

    this.movimientoService.listarTodasEntradasAbiertas().subscribe({
      next: (movimientos) => {
        // Procesar movimientos y separar por tipo
        this.procesarMovimientos(movimientos);
        this.loading = false;
        console.log('Usuarios dentro:', this.usuariosDentro.length);
        console.log('Usuarios fuera:', this.usuariosFuera.length);

        // Mostrar mensaje informativo
        const totalEntradas = this.usuariosDentro.length;
        const totalSalidas = this.usuariosFuera.length;

        if (totalEntradas > 0 || totalSalidas > 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Estados Cargados',
            detail: `${totalEntradas} usuario(s) dentro, ${totalSalidas} usuario(s) fuera`,
            life: 3000
          });
        }
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar estados: ' + (error.error?.message || error.message),
          life: 5000
        });
      }
    });
  }

  /**
   * Procesa los movimientos y los separa en usuarios dentro y fuera
   */
  private procesarMovimientos(movimientos: MovimientoGuardia[]): void {
    const usuariosDentroMap = new Map<string, EstadoUsuario>();
    const usuariosFueraMap = new Map<string, EstadoUsuario>();

    // Agrupar por usuario y determinar su último movimiento
    movimientos.forEach(mov => {
      const tipoMovimiento = mov.tipoMovimiento || mov.tipo;
      const fechaHora = mov.fechaHora || mov.timestampMovimiento || '';

      const estado: EstadoUsuario = {
        usuarioId: mov.usuarioId,
        nombreCompleto: mov.usuarioNombre || mov.usuario?.nombreCompleto || 'N/A',
        telefono: undefined, // El backend no proporciona teléfono en este endpoint
        guardiaNombre: mov.guardiaNombre || mov.guardia?.nombre || 'N/A',
        fechaHoraMovimiento: fechaHora,
        tiempoTranscurrido: this.calcularTiempoTranscurrido(fechaHora),
        observaciones: mov.observaciones,
        ultimoMovimiento: mov
      };

      // Separar por tipo de movimiento
      if (tipoMovimiento === 'ENTRADA') {
        usuariosDentroMap.set(mov.usuarioId, estado);
      } else if (tipoMovimiento === 'SALIDA') {
        usuariosFueraMap.set(mov.usuarioId, estado);
      }
    });

    this.usuariosDentro = Array.from(usuariosDentroMap.values());
    this.usuariosFuera = Array.from(usuariosFueraMap.values());
  }


  calcularTiempoTranscurrido(timestampEntrada: string): string {
    if (!timestampEntrada) return '-';

    const entrada = new Date(timestampEntrada);
    const ahora = new Date();
    const diff = ahora.getTime() - entrada.getTime();

    const dias = Math.floor(diff / 86400000);
    const horas = Math.floor((diff % 86400000) / 3600000);
    const minutos = Math.floor((diff % 3600000) / 60000);

    if (dias > 0) {
      return `${dias}d ${horas}h ${minutos}m`;
    }
    return `${horas}h ${minutos}m`;
  }

  getSeverityTiempo(timestampEntrada: string): 'success' | 'warn' | 'danger' | 'info' {
    if (!timestampEntrada) return 'info';

    const entrada = new Date(timestampEntrada);
    const ahora = new Date();
    const horasTranscurridas = (ahora.getTime() - entrada.getTime()) / 3600000;

    if (horasTranscurridas < 12) return 'success';
    if (horasTranscurridas < 24) return 'warn';
    return 'danger';
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';

    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  verDetalle(estado: EstadoUsuario): void {
    this.usuarioSeleccionado = estado;
    this.displayDetalle = true;
  }

  cerrarDetalle(): void {
    this.displayDetalle = false;
    this.usuarioSeleccionado = null;
  }
}


