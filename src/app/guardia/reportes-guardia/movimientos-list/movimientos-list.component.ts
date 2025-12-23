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
import { GuardiaUsuarioService } from '../../../service/guardia-usuario.service';
import { SeccionService } from '../../../service/seccion.service';
import { AuthService } from '../../../service/auth.service';
import { OrgContextService } from '../../../service/org-context.service';

// Modelos
import { MovimientoGuardia, Guardia } from '../../../models/guardia.models';
import { SeccionEntity } from '../../../service/seccion.service';
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
  secciones: SeccionEntity[] = [];
  loading = false;

  // Detectar rol del usuario
  isOrgAdmin = false;
  isSeccionAdmin = false;
  isGuardia = false;

  // Contexto del usuario
  organizacionId: string = '';
  seccionId: string = '';
  guardiaIdAsignada: string = ''; // Para usuario GUARDIA

  // Filtros
  filtroSeccion: string | null = null;
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
    private guardiaUsuarioService: GuardiaUsuarioService,
    private seccionService: SeccionService,
    private authService: AuthService,
    private orgContext: OrgContextService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Limpiar rangeFechas para asegurar que esté vacío
    this.rangeFechas = [];

    this.detectarRolUsuario();
    this.inicializarContexto();
    this.cargarDatosIniciales();
  }

  /**
   * Detectar el rol del usuario autenticado
   */
  detectarRolUsuario(): void {
    // ORGADMIN puede ver todo de la organización
    this.isOrgAdmin = this.authService.hasRole('ORGADMIN');

    // ADMIN puede ver su sección
    this.isSeccionAdmin = this.authService.hasRole('ADMIN') && !this.isOrgAdmin;

    // GUARDIA puede ver solo su guardia
    this.isGuardia = this.authService.hasRole('GUARDIA') && !this.isOrgAdmin && !this.isSeccionAdmin;
  }

  /**
   * Inicializar contexto de organización y sección
   */
  inicializarContexto(): void {
    // Obtener organización del contexto
    this.organizacionId = this.orgContext.value || localStorage.getItem('loginOrgImmutable') || '';

    // Obtener sección si está disponible
    const seccionStorage = localStorage.getItem('seccionPrincipalId') ||
                          localStorage.getItem('loginSeccionImmutable') ||
                          localStorage.getItem('seccionId');

    if (seccionStorage) {
      this.seccionId = seccionStorage;
    }
  }

  /**
   * Cargar datos iniciales según el rol del usuario
   */
  cargarDatosIniciales(): void {
    if (this.isOrgAdmin) {
      // ORGADMIN: cargar secciones de la organización
      this.cargarSecciones();
      // NO cargar movimientos automáticamente
    } else if (this.isSeccionAdmin) {
      // ADMIN: cargar guardias de su sección
      this.cargarGuardias();
      // NO cargar movimientos automáticamente
    } else if (this.isGuardia) {
      // GUARDIA: cargar su guardia asignada
      this.cargarGuardiaAsignada();
      // NO cargar movimientos automáticamente
    }
  }

  /**
   * Cargar secciones de la organización (solo ORGADMIN)
   */
  cargarSecciones(): void {
    if (!this.organizacionId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se pudo determinar la organización'
      });
      return;
    }

    this.seccionService.list(this.organizacionId).subscribe({
      next: secciones => {
        this.secciones = secciones;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las secciones'
        });
      }
    });
  }

  /**
   * Cargar guardias según el filtro de sección
   */
  cargarGuardias(): void {
    const seccionId = this.filtroSeccion || this.seccionId;

    if (!seccionId) {
      this.guardias = [];
      return;
    }

    this.guardiaService.listarPorSeccion(seccionId).subscribe({
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

  /**
   * Cargar guardia asignada al usuario GUARDIA
   */
  cargarGuardiaAsignada(): void {
    const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');

    if (!userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo determinar el usuario actual'
      });
      return;
    }

    this.guardiaUsuarioService.listarDisponiblesPorUsuario(userId).subscribe({
      next: guardiasUsuario => {
        if (guardiasUsuario && guardiasUsuario.length > 0) {
          this.guardiaIdAsignada = guardiasUsuario[0].guardiaId;
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No tienes guardias asignadas. Contacta al administrador.'
          });
        }
      },
      error: (error) => {
        console.error('Error al cargar guardias:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar tus guardias asignadas'
        });
      }
    });
  }

  /**
   * Cargar movimientos según el rol y filtros
   */
  cargarMovimientos(): void {
    this.loading = true;

    // Determinar guardiaId según el rol
    let guardiaIdParaFiltro = this.filtroGuardia;

    // Si es GUARDIA, usar su guardia asignada
    if (this.isGuardia && this.guardiaIdAsignada) {
      guardiaIdParaFiltro = this.guardiaIdAsignada;
    }

    // Preparar parámetros para la consulta (SOLO enviar los que tienen valor)
    const params: any = {
      page: 0,
      size: 1000,
      sort: 'timestampMovimiento,desc' // Ordenamiento por defecto
    };

    // Solo agregar guardiaId si tiene valor
    if (guardiaIdParaFiltro) {
      params.guardiaId = guardiaIdParaFiltro;
    }

    // Solo agregar tipo si tiene valor
    if (this.filtroTipo) {
      params.tipo = this.filtroTipo;
    }

    // Agregar filtro de fechas SOLO si está configurado correctamente
    const tieneFechasValidas = this.rangeFechas &&
                               Array.isArray(this.rangeFechas) &&
                               this.rangeFechas.length === 2 &&
                               this.rangeFechas[0] &&
                               this.rangeFechas[1] &&
                               this.rangeFechas[0] instanceof Date &&
                               this.rangeFechas[1] instanceof Date &&
                               !isNaN(this.rangeFechas[0].getTime()) &&
                               !isNaN(this.rangeFechas[1].getTime());

    if (tieneFechasValidas) {
      // Formato ISO-8601 según documentación del backend
      params.fechaInicio = this.rangeFechas[0].toISOString();
      params.fechaFin = this.rangeFechas[1].toISOString();
    }

    this.movimientoService.listarPaginado(params).subscribe({
      next: response => {
        // El endpoint paginado retorna un objeto con content
        this.movimientos = response.content || response || [];
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (error) => {

        let mensajeError = 'Error al cargar los movimientos';
        if (error.status === 400) {
          mensajeError = 'Parámetros de consulta inválidos. Verifica los filtros seleccionados.';
        } else if (error.status === 403) {
          mensajeError = 'No tienes permisos para ver estos movimientos';
        } else if (error.status === 404) {
          mensajeError = 'No se encontró el endpoint de movimientos';
        } else if (error.status === 401) {
          mensajeError = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: mensajeError
        });
        this.loading = false;
      }
    });
  }

  /**
   * Aplicar filtros locales a los movimientos
   */
  aplicarFiltros(): void {
    let resultado = [...this.movimientos];

    // Filtro por sección (solo para ORGADMIN)
    // Usa el campo seccionId del movimiento (campo plano del backend)
    if (this.isOrgAdmin && this.filtroSeccion) {
      resultado = resultado.filter(m => m.seccionId === this.filtroSeccion);
    }

    // Filtro por guardia
    if (this.filtroGuardia) {
      resultado = resultado.filter(m => m.guardiaId === this.filtroGuardia);
    }

    // Filtro por tipo
    if (this.filtroTipo) {
      resultado = resultado.filter(m => m.tipo === this.filtroTipo);
    }

    // Filtro por rango de fechas (aplicado en el servidor, pero reforzamos aquí)
    if (this.rangeFechas && this.rangeFechas.length === 2 && this.rangeFechas[0] && this.rangeFechas[1]) {
      const desde = this.rangeFechas[0].getTime();
      const hasta = this.rangeFechas[1].getTime();
      resultado = resultado.filter(m => {
        // Priorizar fechaMovimiento sobre timestampMovimiento
        const fechaStr = m.fechaMovimiento || m.timestampMovimiento;
        if (!fechaStr) return false;
        const fecha = new Date(fechaStr).getTime();
        return fecha >= desde && fecha <= hasta;
      });
    }

    this.movimientosFiltered = resultado;
  }

  /**
   * Consultar movimientos (método principal llamado por el botón)
   */
  consultarMovimientos(): void {
    // Validar que el usuario GUARDIA tenga guardia asignada
    if (this.isGuardia && !this.guardiaIdAsignada) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No tienes una guardia asignada. Contacta al administrador.'
      });
      return;
    }

    // Cargar movimientos
    this.cargarMovimientos();
  }

  /**
   * Manejar cambio en el filtro de sección (solo ORGADMIN)
   */
  onSeccionChange(): void {
    // Limpiar filtro de guardia
    this.filtroGuardia = null;

    // Cargar guardias de la sección seleccionada
    if (this.filtroSeccion) {
      this.cargarGuardias();
    } else {
      this.guardias = [];
    }

    // Limpiar movimientos anteriores
    this.movimientos = [];
    this.movimientosFiltered = [];
  }

  getSeverityTipo(tipo: string): 'success' | 'info' {
    return tipo === 'ENTRADA' ? 'success' : 'info';
  }

  formatearFecha(movimiento: MovimientoGuardia): string {
    // Priorizar fechaMovimiento (campo del backend actual), luego timestampMovimiento (legacy)
    const fecha = movimiento.fechaMovimiento || movimiento.timestampMovimiento;

    if (!fecha) {
      return 'N/A';
    }

    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formatea la permanencia de minutos a formato DHM (días, horas, minutos)
   * Ejemplo: 6543 minutos = 4d 13h 3m
   */
  formatearPermanencia(minutos: number | null | undefined): string {
    if (!minutos || minutos === 0) {
      return '-';
    }

    const dias = Math.floor(minutos / 1440); // 1440 minutos = 1 día
    const horas = Math.floor((minutos % 1440) / 60);
    const mins = minutos % 60;

    const partes: string[] = [];

    if (dias > 0) {
      partes.push(`${dias}d`);
    }
    if (horas > 0) {
      partes.push(`${horas}h`);
    }
    if (mins > 0 || partes.length === 0) {
      partes.push(`${mins}m`);
    }

    return partes.join(' ');
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

