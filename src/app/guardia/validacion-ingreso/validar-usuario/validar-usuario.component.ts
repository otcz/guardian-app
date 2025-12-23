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
import { ChipModule } from 'primeng/chip';

// Servicios
import { MovimientoGuardiaService } from '../../../service/movimiento-guardia.service';

// Modelos
import { ValidacionUsuarioDTO } from '../../../models/guardia.models';
import { LABELS } from '../../constants/mensajes.constants';

@Component({
  selector: 'app-validar-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    MessageModule,
    ToastModule,
    ChipModule
  ],
  providers: [MessageService],
  templateUrl: './validar-usuario.component.html',
  styleUrls: ['./validar-usuario.component.scss']
})
export class ValidarUsuarioComponent implements OnInit {
  identificacion: string = '';
  validacion: ValidacionUsuarioDTO | null = null;
  buscando = false;

  readonly LABELS = LABELS;

  constructor(
    private movimientoService: MovimientoGuardiaService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {}

  /**
   * Valida el acceso del usuario por su identificación
   */
  validarAcceso(): void {
    if (!this.identificacion.trim()) {
      this.messageService.add({
        severity: 'warning',
        summary: 'Atención',
        detail: 'Debe ingresar un número de identificación',
        life: 3000
      });
      return;
    }

    this.buscando = true;
    this.validacion = null;

    // Usar el nuevo método de búsqueda por identificación
    this.movimientoService.validarUsuarioPorIdentificacion(this.identificacion).subscribe({
      next: (validacion) => {
        this.validacion = validacion;
        this.buscando = false;

        if (!validacion.existe) {
          this.messageService.add({
            severity: 'error',
            summary: 'Usuario No Encontrado',
            detail: `No existe ningún usuario con la identificación ${this.identificacion}`,
            life: 4000
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Usuario Encontrado',
            detail: `Validación completada para ${validacion.nombreCompleto}`,
            life: 3000
          });
        }
      },
      error: (error) => {
        this.buscando = false;
        this.validacion = null;

        const mensajeError = error.error?.message || error.message || 'Error desconocido';

        this.messageService.add({
          severity: 'error',
          summary: 'Error de Validación',
          detail: `Error al validar usuario: ${mensajeError}`,
          life: 5000
        });

        console.error('Error al validar usuario:', error);
      }
    });
  }

  /**
   * Limpia el formulario y resultados
   */
  limpiar(): void {
    this.identificacion = '';
    this.validacion = null;
  }

  /**
   * Verifica si el usuario puede acceder
   */
  puedeAcceder(): boolean {
    return !!(
      this.validacion?.existe &&
      this.validacion?.activo &&
      !this.validacion?.tieneEntradaAbierta
    );
  }

  /**
   * Acción para permitir el acceso
   */
  permitirAcceso(): void {
    if (!this.puedeAcceder()) return;

    this.messageService.add({
      severity: 'info',
      summary: 'Acción Requerida',
      detail: 'Funcionalidad de registro de entrada pendiente de implementación',
      life: 3000
    });

  }
}
