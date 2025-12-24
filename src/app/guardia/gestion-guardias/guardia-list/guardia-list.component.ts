import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

// Servicios
import { GuardiaService } from '../../../service/guardia.service';
import { SeccionService } from '../../../service/seccion.service';
import { MovimientoGuardiaService } from '../../../service/movimiento-guardia.service';

// Modelos
import { Guardia } from '../../../models/guardia.models';
import { MENSAJES_ERROR, MENSAJES_EXITO, MENSAJES_ADVERTENCIA, LABELS } from '../../constants/mensajes.constants';

interface Seccion {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-guardia-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './guardia-list.component.html',
  styleUrls: ['./guardia-list.component.scss']
})
export class GuardiaListComponent implements OnInit {
  guardias: Guardia[] = [];
  guardiasFiltered: Guardia[] = [];
  secciones: Seccion[] = [];
  loading = false;

  // Filtros
  filtroSeccion: string | null = null;
  filtroEstado: string | null = null;
  filtroBusqueda = '';

  estadoOptions = [
    { label: 'Todas', value: null },
    { label: 'Activas', value: 'ACTIVA' },
    { label: 'Inactivas', value: 'INACTIVA' }
  ];

  readonly LABELS = LABELS;

  constructor(
    private guardiaService: GuardiaService,
    private seccionService: SeccionService,
    private movimientoService: MovimientoGuardiaService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    // TODO: Obtener organizacionId del contexto/auth
    const organizacionId = localStorage.getItem('organizacionId') || '';

    this.guardiaService.listarPorOrganizacion(organizacionId).subscribe({
      next: (guardias) => {
        this.guardias = guardias;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: MENSAJES_ERROR.ERROR_GENERICO
        });
        this.loading = false;
      }
    });

    // Cargar secciones para filtro
    this.seccionService.list(organizacionId).subscribe({
      next: (secciones) => {
        this.secciones = secciones.map((s: any) => ({ id: s.id, nombre: s.nombre }));
      }
    });
  }

  aplicarFiltros(): void {
    let resultado = [...this.guardias];

    // Filtro por sección
    if (this.filtroSeccion) {
      resultado = resultado.filter(g => g.seccionId === this.filtroSeccion);
    }

    // Filtro por estado
    if (this.filtroEstado === 'ACTIVA') {
      resultado = resultado.filter(g => g.activa);
    } else if (this.filtroEstado === 'INACTIVA') {
      resultado = resultado.filter(g => !g.activa);
    }

    // Filtro por búsqueda (nombre o código)
    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      resultado = resultado.filter(
        g =>
          g.nombre.toLowerCase().includes(busqueda) ||
          g.codigo.toLowerCase().includes(busqueda)
      );
    }

    this.guardiasFiltered = resultado;
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  nuevaGuardia(): void {
    this.router.navigate(['/guardia/gestion/nuevo']);
  }

  verGuardia(guardia: Guardia): void {
    this.router.navigate(['/guardia/gestion', guardia.id]);
  }

  editarGuardia(guardia: Guardia): void {
    this.router.navigate(['/guardia/gestion', guardia.id, 'editar']);
  }

  toggleActivar(guardia: Guardia): void {
    if (guardia.activa) {
      this.desactivarGuardia(guardia);
    } else {
      this.activarGuardia(guardia);
    }
  }

  activarGuardia(guardia: Guardia): void {
    this.confirmationService.confirm({
      message: MENSAJES_ADVERTENCIA.CONFIRMAR_ACTIVAR,
      header: 'Confirmar Activación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.guardiaService.activar(guardia.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: MENSAJES_EXITO.GUARDIA_ACTIVADA
            });
            this.cargarDatos();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: MENSAJES_ERROR.ERROR_GENERICO
            });
          }
        });
      }
    });
  }

  desactivarGuardia(guardia: Guardia): void {
    this.confirmationService.confirm({
      message: MENSAJES_ADVERTENCIA.CONFIRMAR_DESACTIVAR,
      header: 'Confirmar Desactivación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.guardiaService.desactivar(guardia.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: MENSAJES_EXITO.GUARDIA_DESACTIVADA
            });
            this.cargarDatos();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: MENSAJES_ERROR.ERROR_GENERICO
            });
          }
        });
      }
    });
  }

  eliminarGuardia(guardia: Guardia): void {
    this.confirmationService.confirm({
      message: MENSAJES_ADVERTENCIA.CONFIRMAR_ELIMINAR,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        // Verificar si tiene movimientos
        this.movimientoService.listarPorGuardia(guardia.id).subscribe({
          next: (movimientos) => {
            if (movimientos.length > 0) {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: MENSAJES_ERROR.GUARDIA_CON_MOVIMIENTOS
              });
              return;
            }

            // Proceder con eliminación
            this.guardiaService.eliminar(guardia.id).subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Éxito',
                  detail: MENSAJES_EXITO.GUARDIA_ELIMINADA
                });
                this.cargarDatos();
              },
              error: () => {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: MENSAJES_ERROR.ERROR_GENERICO
                });
              }
            });
          }
        });
      }
    });
  }

  /**
   * Toggle del permiso de entrada
   */
  togglePermiteEntrada(guardia: Guardia): void {
    const nuevoEstado = !guardia.permiteEntrada;
    const mensaje = nuevoEstado
      ? '¿Desea habilitar las entradas en esta guardia?'
      : '¿Desea bloquear las entradas en esta guardia? Los usuarios no podrán registrar ingresos.';

    this.confirmationService.confirm({
      message: mensaje,
      header: nuevoEstado ? 'Habilitar Entradas' : 'Bloquear Entradas',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.guardiaService.modificarPermiteEntrada(guardia.id, nuevoEstado).subscribe({
          next: (guardiaActualizada) => {
            // Actualización optimista
            guardia.permiteEntrada = guardiaActualizada.permiteEntrada;
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: nuevoEstado
                ? 'Entradas habilitadas correctamente'
                : 'Entradas bloqueadas correctamente'
            });
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err?.error?.message || MENSAJES_ERROR.ERROR_GENERICO
            });
          }
        });
      }
    });
  }

  /**
   * Toggle del permiso de salida
   */
  togglePermiteSalida(guardia: Guardia): void {
    const nuevoEstado = !guardia.permiteSalida;
    const mensaje = nuevoEstado
      ? '¿Desea habilitar las salidas en esta guardia?'
      : '¿Desea bloquear las salidas en esta guardia? Los usuarios no podrán registrar egresos.';

    this.confirmationService.confirm({
      message: mensaje,
      header: nuevoEstado ? 'Habilitar Salidas' : 'Bloquear Salidas',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.guardiaService.modificarPermiteSalida(guardia.id, nuevoEstado).subscribe({
          next: (guardiaActualizada) => {
            // Actualización optimista
            guardia.permiteSalida = guardiaActualizada.permiteSalida;
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: nuevoEstado
                ? 'Salidas habilitadas correctamente'
                : 'Salidas bloqueadas correctamente'
            });
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err?.error?.message || MENSAJES_ERROR.ERROR_GENERICO
            });
          }
        });
      }
    });
  }

  getSeverity(activa: boolean): 'success' | 'secondary' {
    return activa ? 'success' : 'secondary';
  }

  getEstadoLabel(activa: boolean): string {
    return activa ? 'Activa' : 'Inactiva';
  }
}

