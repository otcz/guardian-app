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
      <!-- Header del Módulo -->
      <div class="module-header">
        <div class="header-content">
          <div class="header-icon">
            <i class="pi pi-shield"></i>
          </div>
          <div class="header-text">
            <h1>Validación de Acceso</h1>
            <p>Verificar identidad y permisos de ingreso de usuarios</p>
          </div>
        </div>
      </div>

      <!-- Panel de Búsqueda -->
      <div class="search-panel">
        <p-card>
          <div class="search-section">
            <div class="search-header">
              <i class="pi pi-search"></i>
              <span>Búsqueda por Identificación</span>
            </div>

            <div class="search-form">
              <div class="form-group">
                <label for="identificacion">
                  Número de Identificación <span class="required">*</span>
                </label>
                <div class="input-wrapper">
                  <span class="p-input-icon-left" style="width: 100%;">
                    <i class="pi pi-id-card"></i>
                    <input
                      pInputText
                      id="identificacion"
                      [(ngModel)]="identificacion"
                      placeholder="Ingrese cédula, pasaporte, DNI..."
                      (keyup.enter)="validarAcceso()"
                      [disabled]="buscando"
                      class="w-full"
                      autofocus
                    />
                  </span>
                </div>
                <small class="help-text">
                  <i class="pi pi-info-circle"></i>
                  Presione Enter o haga clic en "Validar" para buscar
                </small>
              </div>

              <div class="button-group">
                <button
                  pButton
                  type="button"
                  class="p-button-primary search-btn"
                  [label]="buscando ? 'Validando...' : 'Validar Acceso'"
                  [icon]="buscando ? 'pi pi-spin pi-spinner' : 'pi pi-check-circle'"
                  (click)="validarAcceso()"
                  [loading]="buscando"
                  [disabled]="!identificacion.trim() || buscando"
                ></button>
                <button
                  pButton
                  type="button"
                  class="p-button-outlined p-button-secondary clear-btn"
                  icon="pi pi-times"
                  label="Limpiar"
                  (click)="limpiar()"
                  [disabled]="buscando"
                ></button>
              </div>
            </div>
          </div>
        </p-card>
      </div>

      <!-- Resultados de Validación -->
      <div class="results-container" *ngIf="validacion || buscando">

        <!-- Usuario NO encontrado -->
        <div *ngIf="validacion && !validacion.existe" class="result-card not-found">
          <p-card>
            <div class="result-content">
              <div class="result-icon error">
                <i class="pi pi-times-circle"></i>
              </div>
              <div class="result-info">
                <h3>Usuario No Encontrado</h3>
                <p>No existe registro con la identificación: <strong>{{ identificacion }}</strong></p>
                <div class="result-actions">
                  <button
                    pButton
                    type="button"
                    class="p-button-text"
                    icon="pi pi-refresh"
                    label="Intentar nuevamente"
                    (click)="limpiar()"
                  ></button>
                </div>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Usuario ENCONTRADO -->
        <div *ngIf="validacion && validacion.existe" class="result-card found">
          <p-card>

            <!-- Status Header -->
            <div class="status-header"
                 [ngClass]="{
                   'status-approved': puedeAcceder(),
                   'status-denied': !validacion.activo,
                   'status-warning': validacion.activo && validacion.tieneEntradaAbierta
                 }">
              <div class="status-icon">
                <i class="pi"
                   [ngClass]="{
                     'pi-check-circle': puedeAcceder(),
                     'pi-ban': !validacion.activo,
                     'pi-exclamation-triangle': validacion.activo && validacion.tieneEntradaAbierta
                   }">
                </i>
              </div>
              <div class="status-text">
                <h3>
                  <span *ngIf="puedeAcceder()">Acceso Autorizado</span>
                  <span *ngIf="!validacion.activo">Acceso Denegado</span>
                  <span *ngIf="validacion.activo && validacion.tieneEntradaAbierta">Entrada Pendiente</span>
                </h3>
                <p>
                  <span *ngIf="puedeAcceder()">El usuario puede ingresar sin restricciones</span>
                  <span *ngIf="!validacion.activo">Usuario inactivo en el sistema</span>
                  <span *ngIf="validacion.activo && validacion.tieneEntradaAbierta">Debe registrar salida primero</span>
                </p>
              </div>
              <p-tag
                [value]="validacion.activo ? 'ACTIVO' : 'INACTIVO'"
                [severity]="validacion.activo ? 'success' : 'danger'"
              ></p-tag>
            </div>

            <!-- Usuario Info -->
            <div class="user-info-section">
              <div class="user-profile">
                <div class="user-avatar">
                  <i class="pi pi-user"></i>
                </div>
                <div class="user-details">
                  <h4>{{ validacion.nombreCompleto }}</h4>
                  <span class="user-username">
                    <i class="pi pi-at"></i> {{ validacion.username }}
                  </span>
                </div>
              </div>

              <div class="info-grid">
                <div class="info-item" *ngIf="validacion.tipoIdentificacion && validacion.identificacion">
                  <div class="info-label">
                    <i class="pi pi-id-card"></i>
                    <span>Identificación</span>
                  </div>
                  <div class="info-value">
                    <p-chip
                      [label]="validacion.tipoIdentificacion + ': ' + validacion.identificacion"
                      styleClass="id-chip">
                    </p-chip>
                  </div>
                </div>

                <div class="info-item">
                  <div class="info-label">
                    <i class="pi pi-sitemap"></i>
                    <span>Sección</span>
                  </div>
                  <div class="info-value">
                    <strong>{{ validacion.seccion || 'Sin asignar' }}</strong>
                  </div>
                </div>

                <div class="info-item" *ngIf="validacion.vehiculos && validacion.vehiculos.length > 0">
                  <div class="info-label">
                    <i class="pi pi-car"></i>
                    <span>Vehículos ({{ validacion.vehiculos.length }})</span>
                  </div>
                  <div class="info-value">
                    <div class="tags-container">
                      <p-tag
                        *ngFor="let vehiculo of validacion.vehiculos"
                        [value]="vehiculo.placa"
                        severity="info"
                        icon="pi pi-car"
                      ></p-tag>
                    </div>
                  </div>
                </div>

                <div class="info-item" *ngIf="validacion.restricciones && validacion.restricciones.length > 0">
                  <div class="info-label">
                    <i class="pi pi-ban"></i>
                    <span>Restricciones ({{ validacion.restricciones.length }})</span>
                  </div>
                  <div class="info-value">
                    <div class="tags-container">
                      <p-tag
                        *ngFor="let restriccion of validacion.restricciones"
                        [value]="restriccion"
                        severity="danger"
                        icon="pi pi-exclamation-triangle"
                      ></p-tag>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Alertas Detalladas -->
            <div class="alerts-section" *ngIf="!validacion.activo || validacion.tieneEntradaAbierta">

              <div class="alert-box alert-danger" *ngIf="!validacion.activo">
                <div class="alert-icon">
                  <i class="pi pi-ban"></i>
                </div>
                <div class="alert-content">
                  <strong>Usuario Inactivo</strong>
                  <p>Este usuario no tiene permisos activos para ingresar. Contacte al administrador para más información.</p>
                </div>
              </div>

              <div class="alert-box alert-warning" *ngIf="validacion.tieneEntradaAbierta && validacion.entradaAbierta">
                <div class="alert-icon">
                  <i class="pi pi-clock"></i>
                </div>
                <div class="alert-content">
                  <strong>Entrada Abierta Detectada</strong>
                  <p>
                    <strong>Hora de Entrada:</strong> {{ validacion.entradaAbierta.fechaEntrada | date:'dd/MM/yyyy HH:mm' }}
                  </p>
                  <p>
                    <strong>Guardia:</strong> {{ validacion.entradaAbierta.guardiaNombre }}
                  </p>
                  <p *ngIf="validacion.entradaAbierta.vehiculoPlaca">
                    <strong>Vehículo:</strong> {{ validacion.entradaAbierta.vehiculoPlaca }}
                  </p>
                  <p class="mb-0">
                    Debe registrar la salida antes de permitir un nuevo ingreso.
                  </p>
                </div>
              </div>
            </div>

            <!-- Botón de Acción -->
            <div class="action-section" *ngIf="puedeAcceder()">
              <button
                pButton
                type="button"
                class="p-button-success p-button-lg action-button"
                icon="pi pi-check-circle"
                label="Autorizar Ingreso"
                (click)="permitirAcceso()"
              ></button>
            </div>

          </p-card>
        </div>
      </div>

      <!-- Estado Inicial (Empty State) -->
      <div class="empty-state" *ngIf="!validacion && !buscando">
        <div class="empty-icon">
          <i class="pi pi-search"></i>
        </div>
        <h3>Esperando búsqueda</h3>
        <p>Ingrese el número de identificación del usuario para comenzar la validación de acceso</p>
      </div>

    </div>
  `,
  styles: [`
    /* Container Principal */
    .validar-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    /* Module Header */
    .module-header {
      background: var(--surface);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      border: 1px solid var(--border);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .header-icon {
      width: 70px;
      height: 70px;
      border-radius: 16px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-600) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 2rem;
      box-shadow: 0 4px 12px rgba(79, 140, 255, 0.3);
    }

    .header-text h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text);
    }

    .header-text p {
      margin: 0;
      color: var(--muted);
      font-size: 1rem;
    }

    /* Search Panel */
    .search-panel {
      margin-bottom: 1.5rem;
    }

    .search-panel ::ng-deep .p-card {
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .search-section {
      padding: 1rem;
    }

    .search-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid var(--border);
    }

    .search-header i {
      font-size: 1.5rem;
      color: var(--primary);
    }

    .search-header span {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--text);
    }

    /* Form Styles */
    .search-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-weight: 600;
      color: var(--text);
      font-size: 0.95rem;
    }

    .required {
      color: var(--danger);
      margin-left: 0.25rem;
    }

    .input-wrapper {
      width: 100%;
    }

    .input-wrapper ::ng-deep input {
      height: 48px;
      font-size: 1rem;
      padding-left: 3rem !important;
    }

    .help-text {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--muted);
      font-size: 0.875rem;
    }

    .button-group {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.75rem;
    }

    .search-btn {
      height: 48px;
      font-weight: 600;
    }

    .clear-btn {
      height: 48px;
      min-width: 120px;
    }

    /* Results Container */
    .results-container {
      margin-top: 1.5rem;
    }

    .result-card ::ng-deep .p-card {
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    /* Not Found State */
    .result-card.not-found ::ng-deep .p-card {
      border-left: 4px solid var(--danger);
    }

    .result-content {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1rem;
    }

    .result-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      flex-shrink: 0;
    }

    .result-icon.error {
      background: rgba(229, 62, 62, 0.1);
      color: var(--danger);
    }

    .result-info h3 {
      margin: 0 0 0.5rem 0;
      color: var(--text);
      font-size: 1.3rem;
    }

    .result-info p {
      margin: 0 0 1rem 0;
      color: var(--muted);
    }

    .result-actions {
      margin-top: 1rem;
    }

    /* Status Header */
    .status-header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      border-left: 4px solid;
    }

    .status-approved {
      background: var(--success-100);
      border-left-color: var(--success);
    }

    .status-denied {
      background: var(--danger-100);
      border-left-color: var(--danger);
    }

    .status-warning {
      background: #fef3c7;
      border-left-color: #f59e0b;
    }

    .status-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      flex-shrink: 0;
    }

    .status-approved .status-icon {
      background: var(--success);
      color: white;
    }

    .status-denied .status-icon {
      background: var(--danger);
      color: white;
    }

    .status-warning .status-icon {
      background: #f59e0b;
      color: white;
    }

    .status-text {
      flex: 1;
    }

    .status-text h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text);
    }

    .status-text p {
      margin: 0;
      color: var(--muted);
      font-size: 0.95rem;
    }

    /* User Info Section */
    .user-info-section {
      padding: 1.5rem;
      background: var(--surface-alt);
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding-bottom: 1.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid var(--border);
    }

    .user-avatar {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-600) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 2rem;
      box-shadow: 0 4px 12px rgba(79, 140, 255, 0.3);
    }

    .user-details h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text);
    }

    .user-username {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--muted);
      font-size: 1rem;
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      gap: 1.25rem;
    }

    .info-item {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 1rem;
      align-items: start;
    }

    .info-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--muted);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .info-label i {
      color: var(--primary);
    }

    .info-value {
      color: var(--text);
    }

    .info-value strong {
      font-weight: 600;
    }

    .info-value ::ng-deep .id-chip {
      background: rgba(79, 140, 255, 0.1);
      color: var(--primary);
      font-family: 'Courier New', monospace;
      font-weight: 600;
      border: 1px solid rgba(79, 140, 255, 0.2);
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    /* Alerts Section */
    .alerts-section {
      margin-bottom: 1.5rem;
    }

    .alert-box {
      display: flex;
      gap: 1rem;
      padding: 1.25rem;
      border-radius: 8px;
      border-left: 4px solid;
      margin-bottom: 1rem;
    }

    .alert-box:last-child {
      margin-bottom: 0;
    }

    .alert-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .alert-content strong {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 1.05rem;
    }

    .alert-content p {
      margin: 0.25rem 0;
      line-height: 1.6;
    }

    .alert-danger {
      background: var(--danger-100);
      border-left-color: var(--danger);
    }

    .alert-danger .alert-icon {
      background: var(--danger);
      color: white;
    }

    .alert-danger .alert-content {
      color: #991b1b;
    }

    .alert-warning {
      background: #fef3c7;
      border-left-color: #f59e0b;
    }

    .alert-warning .alert-icon {
      background: #f59e0b;
      color: white;
    }

    .alert-warning .alert-content {
      color: #92400e;
    }

    /* Action Section */
    .action-section {
      padding: 1.5rem;
      background: var(--surface-alt);
      border-radius: 8px;
    }

    .action-button {
      width: 100%;
      height: 56px;
      font-size: 1.1rem;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: var(--surface);
      border-radius: 12px;
      border: 2px dashed var(--border);
    }

    .empty-icon {
      width: 100px;
      height: 100px;
      margin: 0 auto 1.5rem;
      border-radius: 50%;
      background: var(--surface-alt);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-icon i {
      font-size: 3rem;
      color: var(--muted);
    }

    .empty-state h3 {
      margin: 0 0 0.75rem 0;
      font-size: 1.5rem;
      color: var(--text);
    }

    .empty-state p {
      margin: 0;
      color: var(--muted);
      font-size: 1.05rem;
      max-width: 500px;
      margin: 0 auto;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .validar-container {
        padding: 1rem;
      }

      .header-content {
        gap: 1rem;
      }

      .header-icon {
        width: 50px;
        height: 50px;
        font-size: 1.5rem;
      }

      .header-text h1 {
        font-size: 1.3rem;
      }

      .header-text p {
        font-size: 0.9rem;
      }

      .button-group {
        grid-template-columns: 1fr;
      }

      .info-item {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .result-content {
        flex-direction: column;
        text-align: center;
      }

      .status-header {
        flex-direction: column;
        text-align: center;
      }

      .user-profile {
        flex-direction: column;
        text-align: center;
      }
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
