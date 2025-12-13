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
  template: `
    <p-toast position="top-right"></p-toast>

    <div class="validar-container">
      <p-card>
        <ng-template pTemplate="header">
          <div class="card-header">
            <h2><i class="pi pi-shield"></i> Validar Acceso de Usuario</h2>
            <p class="subtitle">Búsqueda por Identificación (Cédula, Pasaporte, DNI, etc.)</p>
          </div>
        </ng-template>

        <!-- Formulario de Búsqueda -->
        <div class="p-field">
          <label for="identificacion">
            Número de Identificación:
            <span class="required">*</span>
          </label>
          <div class="p-inputgroup">
            <input
              pInputText
              id="identificacion"
              [(ngModel)]="identificacion"
              placeholder="Ej: 1234567890, AB123456..."
              (keyup.enter)="validarAcceso()"
              [disabled]="buscando"
              autofocus
            />
            <button
              pButton
              type="button"
              label="{{ buscando ? 'Validando...' : 'Validar' }}"
              icon="{{ buscando ? 'pi pi-spin pi-spinner' : 'pi pi-search' }}"
              (click)="validarAcceso()"
              [loading]="buscando"
              [disabled]="!identificacion.trim()"
            ></button>
            <button
              pButton
              type="button"
              class="p-button-secondary"
              icon="pi pi-times"
              label="Limpiar"
              (click)="limpiar()"
              [disabled]="buscando"
            ></button>
          </div>
          <small class="help-text">
            <i class="pi pi-info-circle"></i>
            Ingrese el número de cédula, pasaporte u otro documento y presione Enter
          </small>
        </div>

        <!-- Usuario NO encontrado -->
        <div *ngIf="validacion && !validacion.existe" class="alert alert-danger">
          <div class="alert-header">
            <i class="pi pi-times-circle"></i>
            <h4>Usuario No Encontrado</h4>
          </div>
          <p>No existe ningún usuario registrado con la identificación: <strong>{{ identificacion }}</strong></p>
          <p class="mb-0">Verifique el número ingresado o contacte al administrador.</p>
        </div>

        <!-- Usuario ENCONTRADO -->
        <div *ngIf="validacion && validacion.existe" class="resultado-panel"
             [ngClass]="{
               'panel-success': puedeAcceder(),
               'panel-danger': !validacion.activo,
               'panel-warning': validacion.activo && validacion.tieneEntradaAbierta
             }">

          <!-- Header del Usuario -->
          <div class="usuario-header">
            <div class="usuario-avatar">
              <i class="pi pi-user"></i>
            </div>
            <div class="usuario-title">
              <h3>{{ validacion.nombreCompleto }}</h3>
              <span class="username">{{ validacion.username }}</span>
            </div>
            <p-tag
              [value]="validacion.activo ? 'ACTIVO' : 'INACTIVO'"
              [severity]="validacion.activo ? 'success' : 'danger'"
              [icon]="validacion.activo ? 'pi pi-check' : 'pi pi-ban'"
            ></p-tag>
          </div>

          <!-- Información del Usuario -->
          <div class="usuario-info">
            <div class="info-row">
              <label><i class="pi pi-user"></i> Username:</label>
              <strong>{{ validacion.username }}</strong>
            </div>

            <div class="info-row" *ngIf="validacion.tipoIdentificacion && validacion.identificacion">
              <label><i class="pi pi-id-card"></i> Identificación:</label>
              <div class="identificacion-badge">
                <p-chip
                  [label]="validacion.tipoIdentificacion + ': ' + validacion.identificacion"
                  icon="pi pi-id-card"
                  styleClass="custom-chip">
                </p-chip>
              </div>
            </div>

            <div class="info-row">
              <label><i class="pi pi-sitemap"></i> Sección:</label>
              <strong>{{ validacion.seccion || 'Sin asignar' }}</strong>
            </div>

            <!-- Vehículos -->
            <div class="info-row" *ngIf="validacion.vehiculos && validacion.vehiculos.length > 0">
              <label><i class="pi pi-car"></i> Vehículos Asociados:</label>
              <div class="vehiculos-list">
                <p-tag
                  *ngFor="let vehiculo of validacion.vehiculos"
                  [value]="vehiculo"
                  severity="info"
                  icon="pi pi-car"
                ></p-tag>
              </div>
            </div>

            <!-- Restricciones -->
            <div class="info-row" *ngIf="validacion.restricciones && validacion.restricciones.length > 0">
              <label><i class="pi pi-ban"></i> Restricciones Activas:</label>
              <div class="restricciones-list">
                <p-tag
                  *ngFor="let restriccion of validacion.restricciones"
                  [value]="restriccion"
                  severity="danger"
                  icon="pi pi-exclamation-triangle"
                ></p-tag>
              </div>
            </div>
          </div>

          <!-- Alertas de Estado -->
          <div class="alertas-estado">
            <!-- Usuario INACTIVO -->
            <div class="alert alert-danger" *ngIf="!validacion.activo">
              <i class="pi pi-ban"></i>
              <strong>ACCESO DENEGADO:</strong> El usuario está INACTIVO en el sistema. No se permite el ingreso.
            </div>

            <!-- Entrada ABIERTA -->
            <div class="alert alert-warning" *ngIf="validacion.tieneEntradaAbierta && validacion.entradaAbierta">
              <i class="pi pi-exclamation-triangle"></i>
              <strong>ADVERTENCIA:</strong> El usuario tiene una entrada abierta desde
              {{ validacion.entradaAbierta.timestampMovimiento | date:'short' }}
              <span *ngIf="validacion.entradaAbierta.guardia">
                en {{ validacion.entradaAbierta.guardia.nombre }}
              </span>
              <p class="mt-2 mb-0">Debe registrar la salida antes de permitir nueva entrada.</p>
            </div>

            <!-- PUEDE ACCEDER -->
            <div class="alert alert-success" *ngIf="puedeAcceder()">
              <i class="pi pi-check-circle"></i>
              <strong>ACCESO PERMITIDO:</strong> El usuario puede ingresar sin restricciones.
            </div>
          </div>

          <!-- Acciones -->
          <div class="acciones" *ngIf="puedeAcceder()">
            <button
              pButton
              type="button"
              class="p-button-success p-button-lg"
              icon="pi pi-check"
              label="Permitir Acceso"
              (click)="permitirAcceso()"
              style="width: 100%;"
            ></button>
          </div>
        </div>

        <!-- Estado inicial -->
        <div *ngIf="!validacion && !buscando" class="empty-state">
          <i class="pi pi-search" style="font-size: 3rem; color: #dee2e6;"></i>
          <p>Ingrese un número de identificación para validar el acceso del usuario</p>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .validar-container {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .card-header {
      padding: 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .card-header h2 {
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.5rem;
    }

    .subtitle {
      margin: 0;
      opacity: 0.9;
      font-size: 0.95rem;
    }

    .p-field {
      margin-bottom: 1rem;
    }

    .p-field label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #495057;
    }

    .required {
      color: #ef4444;
    }

    .help-text {
      display: block;
      margin-top: 0.5rem;
      color: #6c757d;
      font-size: 0.875rem;
    }

    .help-text i {
      margin-right: 0.25rem;
    }

    /* Alertas */
    .alert {
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
      border-left: 4px solid;
    }

    .alert i {
      margin-right: 0.5rem;
    }

    .alert-danger {
      background-color: #fee2e2;
      border-left-color: #dc2626;
      color: #991b1b;
    }

    .alert-danger .alert-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .alert-danger h4 {
      margin: 0;
      font-size: 1.1rem;
    }

    .alert-warning {
      background-color: #fef3c7;
      border-left-color: #f59e0b;
      color: #92400e;
    }

    .alert-success {
      background-color: #d1fae5;
      border-left-color: #10b981;
      color: #065f46;
    }

    /* Panel de resultados */
    .resultado-panel {
      margin-top: 1.5rem;
      padding: 1.5rem;
      background-color: #f8f9fa;
      border-radius: 12px;
      border: 2px solid;
    }

    .panel-success {
      border-color: #10b981;
      background-color: #f0fdf4;
    }

    .panel-danger {
      border-color: #dc2626;
      background-color: #fef2f2;
    }

    .panel-warning {
      border-color: #f59e0b;
      background-color: #fffbeb;
    }

    .usuario-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #dee2e6;
    }

    .usuario-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.8rem;
    }

    .usuario-title {
      flex: 1;
    }

    .usuario-title h3 {
      margin: 0 0 0.25rem 0;
      color: #1f2937;
      font-size: 1.4rem;
    }

    .username {
      color: #6b7280;
      font-size: 0.95rem;
    }

    .usuario-info .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e9ecef;
    }

    .usuario-info .info-row:last-child {
      border-bottom: none;
    }

    .usuario-info .info-row label {
      color: #6c757d;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .identificacion-badge ::ng-deep .custom-chip {
      background: rgba(79, 140, 255, 0.1);
      color: var(--primary-color);
      font-family: 'Courier New', monospace;
      font-weight: 600;
    }

    .vehiculos-list,
    .restricciones-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .alertas-estado {
      margin-top: 1rem;
    }

    .acciones {
      margin-top: 1.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #6c757d;
    }

    .empty-state p {
      margin-top: 1rem;
      font-size: 1.1rem;
    }
  `]
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
        severity: 'warn',
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

    // TODO: Implementar lógica de registro de entrada
    console.log('Permitir acceso a:', this.validacion?.nombreCompleto);

    // Limpiar después de permitir
    // this.limpiar();
  }
}
