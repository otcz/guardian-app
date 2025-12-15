import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MessageService } from 'primeng/api';

// Servicios
import { MovimientoGuardiaService } from '../../../service/movimiento-guardia.service';
import { GuardiaService } from '../../../service/guardia.service';

// Modelos
import { MovimientoGuardia, Guardia } from '../../../models/guardia.models';
import { LABELS } from '../../constants/mensajes.constants';

@Component({
  selector: 'app-movimientos-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    CalendarModule,
    DropdownModule,
    AutoCompleteModule
  ],
  templateUrl: './movimientos-list.component.html',
  styleUrls: ['./movimientos-list.component.scss']
})
export class MovimientosListComponent implements OnInit {
  movimientos: MovimientoGuardia[] = [];
  movimientosFiltered: MovimientoGuardia[] = [];
  guardias: Guardia[] = [];
  loading = false;

  // Filtros
  filtroGuardia: string | null = null;
  filtroTipo: string | null = null;
  rangeFechas: Date[] = [];

  tipoOptions = [
    { label: 'Todos', value: null },
    { label: 'Entrada', value: 'ENTRADA' },
    { label: 'Salida', value: 'SALIDA' }
  ];

  readonly LABELS = LABELS;

  constructor(
    private movimientoService: MovimientoGuardiaService,
    private guardiaService: GuardiaService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.cargarGuardias();
    this.cargarMovimientos();
  }

  cargarGuardias(): void {
    const seccionId = localStorage.getItem('seccionId') || '';
    this.guardiaService.listarPorSeccion(seccionId).subscribe({
      next: guardias => {
        this.guardias = guardias;
      }
    });
  }

  cargarMovimientos(): void {
    this.loading = true;
    const seccionId = localStorage.getItem('seccionId') || '';

    this.movimientoService.listarPorSeccion(seccionId).subscribe({
      next: movimientos => {
        this.movimientos = movimientos;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los movimientos'
        });
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    let resultado = [...this.movimientos];

    // Filtro por guardia
    if (this.filtroGuardia) {
      resultado = resultado.filter(m => m.guardiaId === this.filtroGuardia);
    }

    // Filtro por tipo
    if (this.filtroTipo) {
      resultado = resultado.filter(m => m.tipo === this.filtroTipo);
    }

    // Filtro por rango de fechas
    if (this.rangeFechas && this.rangeFechas.length === 2 && this.rangeFechas[0] && this.rangeFechas[1]) {
      const desde = this.rangeFechas[0].getTime();
      const hasta = this.rangeFechas[1].getTime();
      resultado = resultado.filter(m => {
        if (!m.timestampMovimiento) return false;
        const fecha = new Date(m.timestampMovimiento).getTime();
        return fecha >= desde && fecha <= hasta;
      });
    }

    this.movimientosFiltered = resultado;
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  getSeverityTipo(tipo: string): 'success' | 'info' {
    return tipo === 'ENTRADA' ? 'success' : 'info';
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

  exportarExcel(): void {
    // TODO: Implementar exportación a Excel
    this.messageService.add({
      severity: 'info',
      summary: 'Exportar',
      detail: 'Funcionalidad en desarrollo'
    });
  }
}

