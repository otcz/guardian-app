import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

// Servicios
import { GuardiaService } from '../../../service/guardia.service';
import { GuardiaUsuarioService } from '../../../service/guardia-usuario.service';
import { UsersService } from '../../../service/users.service';

// Modelos
import { Guardia, GuardiaCheckbox, EstadoGuardiaUsuario } from '../../../models/guardia.models';
import { MENSAJES_ERROR, MENSAJES_EXITO, LABELS } from '../../constants/mensajes.constants';
import { forkJoin } from 'rxjs';

interface Usuario {
  id: string;
  username: string;
  nombreCompleto: string;
  email: string;
}

@Component({
  selector: 'app-administrar-guardias-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    AutoCompleteModule,
    CheckboxModule,
    InputTextModule,
    InputTextareaModule,
    ProgressSpinnerModule,
    MessageModule
  ],
  templateUrl: './administrar-guardias-usuario.component.html',
  styleUrls: ['./administrar-guardias-usuario.component.scss']
})
export class AdministrarGuardiasUsuarioComponent implements OnInit {
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  usuarioSeleccionado: Usuario | null = null;

  guardias: GuardiaCheckbox[] = [];
  loading = false;
  guardando = false;

  readonly LABELS = LABELS;

  constructor(
    private guardiaService: GuardiaService,
    private guardiaUsuarioService: GuardiaUsuarioService,
    private usersService: UsersService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    // TODO: Obtener seccionId y organizacionId del contexto/auth
    const seccionId = localStorage.getItem('seccionId') || '';
    const organizacionId = localStorage.getItem('organizacionId') || '';

    this.usersService.list(organizacionId, { seccionId }).subscribe({
      next: (usuarios: any[]) => {
        this.usuarios = usuarios.map(u => ({
          id: u.id,
          username: u.username,
          nombreCompleto: u.nombreCompleto || u.username,
          email: u.email
        }));
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar usuarios'
        });
      }
    });
  }

  buscarUsuario(event: any): void {
    const query = event.query.toLowerCase();
    this.usuariosFiltrados = this.usuarios.filter(
      u =>
        u.nombreCompleto.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
  }

  onUsuarioSeleccionado(usuario: Usuario): void {
    this.usuarioSeleccionado = usuario;
    this.cargarGuardiasDeUsuario();
  }

  cargarGuardiasDeUsuario(): void {
    if (!this.usuarioSeleccionado) return;

    this.loading = true;
    const seccionId = localStorage.getItem('seccionId') || '';

    // Cargar guardias de la sección y las asignaciones/restricciones del usuario
    forkJoin({
      guardias: this.guardiaService.listarPorSeccion(seccionId),
      disponibles: this.guardiaUsuarioService.listarDisponiblesPorUsuario(
        this.usuarioSeleccionado.id
      ),
      restringidas: this.guardiaUsuarioService.listarRestringidasPorUsuario(
        this.usuarioSeleccionado.id
      )
    }).subscribe({
      next: ({ guardias, disponibles, restringidas }) => {
        this.guardias = guardias.map(g => {
          const esDisponible = disponibles.some(d => d.guardiaId === g.id && d.asignada);
          const esRestringida = restringidas.some(r => r.guardiaId === g.id && r.restringida);

          let estado: EstadoGuardiaUsuario = 'SIN_ASIGNAR';
          let motivoRestriccion = '';

          if (esRestringida) {
            estado = 'RESTRINGIDA';
            const restriccion = restringidas.find(r => r.guardiaId === g.id);
            motivoRestriccion = restriccion?.motivoRestriccion || '';
          } else if (esDisponible) {
            estado = 'ASIGNADA';
          }

          return {
            guardiaId: g.id,
            nombre: g.nombre,
            codigo: g.codigo,
            estado,
            motivoRestriccion,
            estadoAnterior: estado
          };
        });

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
  }

  onCheckAsignar(guardia: GuardiaCheckbox, checked: boolean): void {
    if (checked) {
      guardia.estado = 'ASIGNADA';
      guardia.motivoRestriccion = '';
    } else {
      if (guardia.estado === 'ASIGNADA') {
        guardia.estado = 'SIN_ASIGNAR';
      }
    }
  }

  onCheckRestringir(guardia: GuardiaCheckbox, checked: boolean): void {
    if (checked) {
      guardia.estado = 'RESTRINGIDA';
    } else {
      if (guardia.estado === 'RESTRINGIDA') {
        guardia.estado = 'SIN_ASIGNAR';
        guardia.motivoRestriccion = '';
      }
    }
  }

  isAsignada(guardia: GuardiaCheckbox): boolean {
    return guardia.estado === 'ASIGNADA';
  }

  isRestringida(guardia: GuardiaCheckbox): boolean {
    return guardia.estado === 'RESTRINGIDA';
  }

  async guardarCambios(): Promise<void> {
    if (!this.usuarioSeleccionado) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debe seleccionar un usuario'
      });
      return;
    }

    // Validar motivos de restricción
    const restriccionesSinMotivo = this.guardias.filter(
      g => g.estado === 'RESTRINGIDA' && !g.motivoRestriccion?.trim()
    );

    if (restriccionesSinMotivo.length > 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: MENSAJES_ERROR.MOTIVO_RESTRICCION_REQUERIDO
      });
      return;
    }

    this.guardando = true;

    try {
      for (const g of this.guardias) {
        if (g.estado !== g.estadoAnterior) {
          await this.procesarCambio(g);
        }
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: MENSAJES_EXITO.CAMBIOS_GUARDADOS
      });

      // Recargar estado actual
      this.cargarGuardiasDeUsuario();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: MENSAJES_ERROR.ERROR_GENERICO
      });
    } finally {
      this.guardando = false;
    }
  }

  private async procesarCambio(guardia: GuardiaCheckbox): Promise<void> {
    const usuarioId = this.usuarioSeleccionado!.id;
    const guardiaId = guardia.guardiaId;

    if (guardia.estado === 'ASIGNADA' && guardia.estadoAnterior !== 'ASIGNADA') {
      // Asignar
      await this.guardiaUsuarioService.asignar(guardiaId, usuarioId).toPromise();
    } else if (guardia.estado === 'RESTRINGIDA' && guardia.estadoAnterior !== 'RESTRINGIDA') {
      // Restringir
      await this.guardiaUsuarioService
        .restringir(guardiaId, usuarioId, {
          motivoRestriccion: guardia.motivoRestriccion || ''
        })
        .toPromise();
    } else if (guardia.estado === 'SIN_ASIGNAR' && guardia.estadoAnterior !== 'SIN_ASIGNAR') {
      // Revocar
      await this.guardiaUsuarioService.revocar(guardiaId, usuarioId).toPromise();
    }
  }

  cancelar(): void {
    this.usuarioSeleccionado = null;
    this.guardias = [];
  }
}

