import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

// Servicios
import { MovimientoGuardiaService } from '../../../service/movimiento-guardia.service';

// Modelos
import { UsuarioDentroDTO } from '../../../models/guardia.models';
import { LABELS } from '../../constants/mensajes.constants';

/**
 * Interface para representar el estado de un usuario en la UI
 */
interface EstadoUsuario {
  usuarioId: string;
  nombreCompleto: string;
  identificacion: string;
  tipoIdentificacion: string;
  telefono: string;
  email: string;
  seccionNombre: string;
  activo: boolean;
  guardiaNombre: string;
  fechaHoraMovimiento: string;
  tiempoTranscurrido: string;
  observaciones?: string;
  tipoMovimiento: 'ENTRADA' | 'SALIDA';
  permanenciaMinutos?: number | null;
  // Mantener compatibilidad con código existente
  ultimoMovimiento?: any;
}

@Component({
  selector: 'app-entradas-abiertas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    CardModule,
    TooltipModule,
    TabViewModule,
    DialogModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule
  ],
  providers: [MessageService],
  templateUrl: './entradas-abiertas.component.html',
  styleUrls: ['./entradas-abiertas.component.css']
})
export class EntradasAbiertasComponent implements OnInit {
  usuariosDentro: EstadoUsuario[] = [];
  usuariosFuera: EstadoUsuario[] = [];
  loading = false;
  displayDetalle = false;
  usuarioSeleccionado: EstadoUsuario | null = null;

  // Filtros globales
  searchValueDentro: string = '';
  searchValueFuera: string = '';

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
    this.usuariosDentro = [];
    this.usuariosFuera = [];

    // Contador para saber cuándo terminaron ambas peticiones
    let peticionesCompletadas = 0;
    const totalPeticiones = 2;

    const finalizarCarga = () => {
      peticionesCompletadas++;
      if (peticionesCompletadas === totalPeticiones) {
        this.loading = false;

        const totalDentro = this.usuariosDentro.length;
        const totalFuera = this.usuariosFuera.length;


        if (totalDentro > 0 || totalFuera > 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Estados Cargados',
            detail: `${totalDentro} usuario(s) dentro, ${totalFuera} usuario(s) fuera`,
            life: 3000
          });
        }
      }
    };

    // 1️⃣ Cargar usuarios DENTRO
    this.movimientoService.getUsuariosDentro().subscribe({
      next: (usuarios) => {
        this.usuariosDentro = usuarios.map(u => this.mapearUsuarioDentro(u));
        finalizarCarga();
      },
      error: (error) => {
        console.error('Error al cargar usuarios DENTRO:', error);
        // 🔄 FALLBACK: Intentar con el endpoint antiguo
        this.cargarUsuariosDentroFallback(finalizarCarga);
      }
    });

    // 2️⃣ Cargar usuarios FUERA
    this.movimientoService.getUsuariosFuera().subscribe({
      next: (usuarios) => {
        this.usuariosFuera = usuarios.map(u => this.mapearUsuarioFuera(u));
        finalizarCarga();
      },
      error: (error) => {
        console.error('Error al cargar usuarios FUERA:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar usuarios fuera: ' + (error.error?.message || error.message),
          life: 5000
        });
        finalizarCarga();
      }
    });
  }

  /**
   * 🔄 FALLBACK: Cargar usuarios DENTRO usando el endpoint antiguo /entradas-abiertas
   * Este método se usa solo si el nuevo endpoint /usuarios-dentro falla
   */
  private cargarUsuariosDentroFallback(finalizarCarga: () => void): void {
    this.movimientoService.listarTodasEntradasAbiertas().subscribe({
      next: (movimientos) => {
        // Filtrar solo las ENTRADAS (usuarios dentro)
        const entradasAbiertas = movimientos.filter(m => m.tipo === 'ENTRADA' || m.tipoMovimiento === 'ENTRADA');

        // Mapear movimientos a EstadoUsuario (con datos limitados)
        this.usuariosDentro = entradasAbiertas.map(mov => this.mapearMovimientoAEstado(mov, 'ENTRADA'));

        finalizarCarga();
      },
      error: (errorFallback) => {
        console.error('Error crítico - Ambos endpoints fallaron:', errorFallback);
        this.messageService.add({
          severity: 'error',
          summary: 'Error crítico',
          detail: 'No se pudieron cargar usuarios dentro. Ambos endpoints fallaron.',
          life: 8000
        });
        finalizarCarga();
      }
    });
  }

  /**
   * Mapea un MovimientoGuardia (endpoint antiguo) a EstadoUsuario
   * Usado solo en el fallback cuando el nuevo endpoint falla
   */
  private mapearMovimientoAEstado(mov: any, tipoMovimiento: 'ENTRADA' | 'SALIDA'): EstadoUsuario {
    const fechaMovimiento = mov.timestampMovimiento || mov.fechaHora || '';

    return {
      usuarioId: mov.usuarioId,
      nombreCompleto: mov.usuarioNombre || 'N/A',
      identificacion: mov.usuarioIdentificacion || 'Sin identificación',
      tipoIdentificacion: 'CEDULA', // Valor por defecto
      telefono: (mov as any).usuarioTelefono || 'Sin teléfono',
      email: 'No disponible', // ❌ No está en el endpoint antiguo
      seccionNombre: mov.seccionNombre || 'Sin sección', // ❌ Puede no estar disponible
      activo: true, // ❌ No está en el endpoint antiguo, asumimos true
      guardiaNombre: mov.guardiaNombre || 'N/A',
      fechaHoraMovimiento: fechaMovimiento,
      tiempoTranscurrido: this.calcularTiempoTranscurrido(fechaMovimiento),
      observaciones: mov.observaciones || undefined,
      tipoMovimiento: tipoMovimiento,
      permanenciaMinutos: mov.permanenciaMinutos || null,
      ultimoMovimiento: mov
    };
  }

  /**
   * Mapea un UsuarioDentroDTO a EstadoUsuario (para usuarios DENTRO)
   */
  private mapearUsuarioDentro(dto: UsuarioDentroDTO): EstadoUsuario {
    const ultimoMov = dto.ultimoMovimiento;
    const fechaMovimiento = ultimoMov?.fechaMovimiento || '';

    return {
      usuarioId: dto.id,
      nombreCompleto: dto.nombreCompleto,
      identificacion: dto.identificacion,
      tipoIdentificacion: dto.tipoIdentificacion,
      telefono: dto.telefono,
      email: dto.email,
      seccionNombre: dto.seccionNombre,
      activo: dto.activo,
      guardiaNombre: ultimoMov?.guardiaNombre || 'N/A',
      fechaHoraMovimiento: fechaMovimiento,
      tiempoTranscurrido: this.calcularTiempoTranscurrido(fechaMovimiento),
      observaciones: ultimoMov?.observaciones || undefined,
      tipoMovimiento: 'ENTRADA',
      permanenciaMinutos: ultimoMov?.permanenciaMinutos || null,
      ultimoMovimiento: ultimoMov
    };
  }

  /**
   * Mapea un UsuarioDentroDTO a EstadoUsuario (para usuarios FUERA)
   */
  private mapearUsuarioFuera(dto: UsuarioDentroDTO): EstadoUsuario {
    const ultimoMov = dto.ultimoMovimiento;
    const fechaMovimiento = ultimoMov?.fechaMovimiento || '';

    return {
      usuarioId: dto.id,
      nombreCompleto: dto.nombreCompleto,
      identificacion: dto.identificacion,
      tipoIdentificacion: dto.tipoIdentificacion,
      telefono: dto.telefono,
      email: dto.email,
      seccionNombre: dto.seccionNombre,
      activo: dto.activo,
      guardiaNombre: ultimoMov?.guardiaNombre || 'N/A',
      fechaHoraMovimiento: fechaMovimiento,
      tiempoTranscurrido: this.calcularTiempoTranscurrido(fechaMovimiento),
      observaciones: ultimoMov?.observaciones || undefined,
      tipoMovimiento: 'SALIDA',
      permanenciaMinutos: ultimoMov?.permanenciaMinutos || null,
      ultimoMovimiento: ultimoMov
    };
  }

  /**
   * Calcula el tiempo transcurrido desde una fecha hasta ahora
   */
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

  getSeverityTiempo(timestampEntrada: string): 'success' | 'warning' | 'danger' | 'info' {
    if (!timestampEntrada) return 'info';

    const entrada = new Date(timestampEntrada);
    const ahora = new Date();
    const horasTranscurridas = (ahora.getTime() - entrada.getTime()) / 3600000;

    if (horasTranscurridas < 12) return 'success';
    if (horasTranscurridas < 24) return 'warning';
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

  /**
   * Filtro global para tabla de usuarios dentro
   */
  onGlobalFilterDentro(table: any, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    table.filterGlobal(inputElement.value, 'contains');
  }

  /**
   * Filtro global para tabla de usuarios fuera
   */
  onGlobalFilterFuera(table: any, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    table.filterGlobal(inputElement.value, 'contains');
  }

  /**
   * Limpia el filtro de búsqueda
   */
  clearFilter(table: any, searchType: 'dentro' | 'fuera'): void {
    if (searchType === 'dentro') {
      this.searchValueDentro = '';
    } else {
      this.searchValueFuera = '';
    }
    table.clear();
  }
}


