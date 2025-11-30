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

// Servicios
import { MovimientoGuardiaService } from '../../../service/movimiento-guardia.service';

// Modelos
import { ValidacionUsuarioDTO } from '../../../models/guardia.models';
import { MENSAJES_ERROR, LABELS } from '../../constants/mensajes.constants';

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
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast position="top-right"></p-toast>

    <div class="validar-container">
      <p-card>
        <ng-template pTemplate="header">
          <div class="card-header">
            <h2><i class="pi pi-user-plus"></i> Validar Usuario</h2>
            <p class="subtitle">Solo lectura - No registra movimientos</p>
          </div>
        </ng-template>

        <!-- Formulario de Búsqueda -->
        <div class="p-field">
          <label for="identificador">{{ LABELS.DOCUMENTO_USERNAME }}</label>
          <div class="p-inputgroup">
            <input
              pInputText
              id="identificador"
              [(ngModel)]="identificador"
              placeholder="Documento o Username"
              (keyup.enter)="buscarUsuario()"
              [disabled]="buscando"
            />
            <button
              pButton
              type="button"
              label="Buscar"
              icon="pi pi-search"
              (click)="buscarUsuario()"
              [loading]="buscando"
            ></button>
          </div>
        </div>

        <!-- Panel de Resultados -->
        <div *ngIf="validacion" class="resultado-panel">
          <div class="usuario-header">
            <h3>{{ validacion.nombreCompleto }}</h3>
            <p-tag
              [value]="validacion.activo ? 'ACTIVO' : 'INACTIVO'"
              [severity]="validacion.activo ? 'success' : 'danger'"
            ></p-tag>
          </div>

          <div class="usuario-info">
            <div class="info-row">
              <label>Documento:</label>
              <strong>{{ validacion.documento }}</strong>
            </div>
            <div class="info-row">
              <label>Sección:</label>
              <strong>{{ validacion.seccion }}</strong>
            </div>

            <!-- Restricciones -->
            <div *ngIf="validacion.restricciones.length > 0" class="info-row">
              <label>Restricciones Activas:</label>
              <div class="restricciones-list">
                <p-tag
                  *ngFor="let restriccion of validacion.restricciones"
                  [value]="restriccion"
                  severity="danger"
                  icon="pi pi-ban"
                ></p-tag>
              </div>
            </div>

            <!-- Vehículos -->
            <div *ngIf="validacion.vehiculos.length > 0" class="info-row">
              <label>Vehículos Asociados:</label>
              <div class="vehiculos-list">
                <p-tag
                  *ngFor="let vehiculo of validacion.vehiculos"
                  [value]="vehiculo"
                  severity="info"
                  icon="pi pi-car"
                ></p-tag>
              </div>
            </div>

            <!-- Entrada Abierta -->
            <div *ngIf="validacion.tieneEntradaAbierta" class="info-row">
              <p-message
                severity="info"
                text="El usuario tiene una entrada abierta"
                [closable]="false"
              ></p-message>
            </div>

            <div *ngIf="!validacion.tieneEntradaAbierta" class="info-row">
              <p-message
                severity="success"
                text="El usuario no tiene entradas abiertas"
                [closable]="false"
              ></p-message>
            </div>
          </div>
        </div>

        <div *ngIf="!validacion && !buscando && identificador" class="empty-state">
          <p-message
            severity="info"
            text="Ingrese un documento o username y presione Enter"
            [closable]="false"
          ></p-message>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .validar-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .card-header {
      padding: 1.5rem;
    }

    .card-header h2 {
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .subtitle {
      margin: 0;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .resultado-panel {
      margin-top: 1.5rem;
      padding: 1rem;
      background-color: #f8f9fa;
      border-radius: 6px;
    }

    .usuario-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #dee2e6;
    }

    .usuario-header h3 {
      margin: 0;
    }

    .usuario-info .info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e9ecef;
    }

    .usuario-info .info-row:last-child {
      border-bottom: none;
    }

    .usuario-info .info-row label {
      color: #6c757d;
      font-weight: 500;
      margin: 0;
    }

    .restricciones-list,
    .vehiculos-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
    }
  `]
})
export class ValidarUsuarioComponent implements OnInit {
  identificador: string = '';
  validacion: ValidacionUsuarioDTO | null = null;
  buscando = false;

  readonly LABELS = LABELS;

  constructor(
    private movimientoService: MovimientoGuardiaService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {}

  buscarUsuario(): void {
    if (!this.identificador.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: MENSAJES_ERROR.IDENTIFICADOR_REQUERIDO,
        life: 3000
      });
      return;
    }

    this.buscando = true;

    this.movimientoService.validarUsuario(this.identificador).subscribe({
      next: (validacion) => {
        this.validacion = validacion;
        this.buscando = false;

        if (!validacion.existe) {
          this.messageService.add({
            severity: 'error',
            summary: 'No encontrado',
            detail: MENSAJES_ERROR.USUARIO_NO_ENCONTRADO,
            life: 3000
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Usuario encontrado',
            detail: `Validación completada para ${validacion.nombreCompleto}`,
            life: 3000
          });
        }
      },
      error: (error) => {
        this.buscando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al validar usuario: ' + (error.error?.message || error.message),
          life: 5000
        });
      }
    });
  }
}

