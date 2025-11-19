import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import * as XLSX from 'xlsx';
import { LugarTipo } from '../../models/lugar.models';

interface LugarImport {
  nombre: string;
  tipo: LugarTipo;
  valid: boolean;
  error?: string;
}

@Component({
  selector: 'app-lugares-import-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TableModule, FileUploadModule, MessageModule],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [style]="{width: '800px'}"
      [closable]="!processing"
      (onHide)="onClose()"
      header="Importar Lugares desde Excel"
    >
      <div class="import-container">
        <!-- Instrucciones -->
        <div class="instructions" *ngIf="lugares.length === 0">
          <p-message severity="info" text="Sube un archivo Excel (.xlsx, .xls) con las columnas: NOMBRE y TIPO"></p-message>

          <div class="format-info">
            <h4>📋 Formato del archivo:</h4>
            <ul>
              <li><strong>Columna A (NOMBRE):</strong> Nombre del lugar (ej: B-52, Parque Central)</li>
              <li><strong>Columna B (TIPO):</strong> Tipo de lugar</li>
            </ul>

            <h4>✅ Tipos válidos:</h4>
            <div class="tipos-grid">
              <span class="tipo-badge" *ngFor="let tipo of tiposValidos">{{ tipo }}</span>
            </div>

            <p class="note">
              <i class="pi pi-info-circle"></i>
              <strong>Nota:</strong> Los nombres se convertirán automáticamente a MAYÚSCULAS y los tipos deben coincidir con los válidos.
            </p>
          </div>
        </div>

        <!-- Upload -->
        <div class="upload-section" *ngIf="lugares.length === 0">
          <input
            type="file"
            #fileInput
            accept=".xlsx,.xls"
            (change)="onFileSelected($event)"
            style="display: none"
          />
          <button
            pButton
            label="Seleccionar archivo Excel"
            icon="pi pi-file-excel"
            class="p-button-outlined"
            (click)="fileInput.click()"
          ></button>
        </div>

        <!-- Preview Table -->
        <div class="preview-section" *ngIf="lugares.length > 0">
          <p-message
            [severity]="allValid ? 'success' : 'warn'"
            [text]="allValid ? 'Todos los registros son válidos' : 'Algunos registros tienen errores'"
          ></p-message>

          <p-table [value]="lugares" [scrollable]="true" scrollHeight="400px">
            <ng-template pTemplate="header">
              <tr>
                <th style="width: 50px">Estado</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Error</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-lugar>
              <tr [ngClass]="{'invalid-row': !lugar.valid}">
                <td>
                  <i class="pi" [ngClass]="lugar.valid ? 'pi-check-circle text-success' : 'pi-times-circle text-danger'"></i>
                </td>
                <td>{{ lugar.nombre }}</td>
                <td>
                  <span class="badge-tipo" [ngClass]="{'invalid': !lugar.valid}">{{ lugar.tipo }}</span>
                </td>
                <td>
                  <span class="error-text" *ngIf="lugar.error">{{ lugar.error }}</span>
                </td>
              </tr>
            </ng-template>
          </p-table>

          <div class="stats">
            <span class="stat-item valid">
              <i class="pi pi-check-circle"></i>
              Válidos: <strong>{{ validCount }}</strong>
            </span>
            <span class="stat-item invalid">
              <i class="pi pi-times-circle"></i>
              Inválidos: <strong>{{ invalidCount }}</strong>
            </span>
            <span class="stat-item total">
              <i class="pi pi-list"></i>
              Total: <strong>{{ lugares.length }}</strong>
            </span>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button
          pButton
          label="Cancelar"
          icon="pi pi-times"
          class="p-button-text"
          (click)="onCancel()"
          [disabled]="processing"
        ></button>
        <button
          pButton
          label="Nuevo Archivo"
          icon="pi pi-refresh"
          class="p-button-secondary"
          (click)="reset()"
          *ngIf="lugares.length > 0"
          [disabled]="processing"
        ></button>
        <button
          pButton
          [label]="'Importar ' + validCount + ' lugares'"
          icon="pi pi-upload"
          class="p-button-success"
          (click)="onImport()"
          *ngIf="lugares.length > 0 && validCount > 0"
          [loading]="processing"
          [disabled]="processing"
        ></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .import-container {
      padding: 1rem 0;
    }

    .instructions {
      margin-bottom: 1.5rem;
    }

    .format-info {
      margin-top: 1.5rem;
      padding: 1rem;
      background: var(--surface-alt);
      border-radius: 8px;

      h4 {
        margin: 0 0 0.75rem 0;
        color: var(--text);
        font-size: 1rem;
      }

      ul {
        margin: 0 0 1rem 0;
        padding-left: 1.5rem;

        li {
          margin: 0.5rem 0;
          color: var(--text);
        }
      }

      .note {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        margin-top: 1rem;
        padding: 0.75rem;
        background: rgba(79, 140, 255, 0.1);
        border-left: 3px solid var(--primary);
        border-radius: 4px;
        font-size: 0.9rem;

        i {
          color: var(--primary);
          margin-top: 2px;
        }
      }
    }

    .tipos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .tipo-badge {
      display: inline-block;
      padding: 0.4rem 0.75rem;
      background: var(--primary);
      color: white;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      text-align: center;
    }

    .upload-section {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }

    .preview-section {
      margin-top: 1rem;
    }

    .invalid-row {
      background: rgba(231, 76, 60, 0.05);
    }

    .badge-tipo {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: var(--success);
      color: white;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;

      &.invalid {
        background: var(--danger);
      }
    }

    .text-success {
      color: var(--success);
      font-size: 1.2rem;
    }

    .text-danger {
      color: var(--danger);
      font-size: 1.2rem;
    }

    .error-text {
      color: var(--danger);
      font-size: 0.85rem;
    }

    .stats {
      display: flex;
      gap: 1.5rem;
      margin-top: 1rem;
      padding: 1rem;
      background: var(--surface-alt);
      border-radius: 8px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.95rem;

        &.valid i {
          color: var(--success);
        }

        &.invalid i {
          color: var(--danger);
        }

        &.total i {
          color: var(--primary);
        }

        strong {
          font-size: 1.1rem;
        }
      }
    }
  `]
})
export class LugaresImportDialogComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() import = new EventEmitter<LugarImport[]>();

  lugares: LugarImport[] = [];
  processing = false;

  tiposValidos: LugarTipo[] = ['APARTAMENTO', 'CASA', 'ALMACEN', 'AULA', 'BODEGA', 'DEPOSITO', 'LOCAL', 'OFICINA', 'SALON', 'OTRO'];

  get validCount(): number {
    return this.lugares.filter(l => l.valid).length;
  }

  get invalidCount(): number {
    return this.lugares.filter(l => !l.valid).length;
  }

  get allValid(): boolean {
    return this.lugares.length > 0 && this.lugares.every(l => l.valid);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Obtener la primera hoja
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        this.parseRows(rows);
      } catch (error) {
        console.error('Error al leer el archivo:', error);
        alert('Error al leer el archivo Excel. Verifica el formato.');
      }
    };

    reader.readAsArrayBuffer(file);
  }

  private parseRows(rows: any[][]) {
    this.lugares = [];

    // Saltar la primera fila si es el encabezado
    const startIndex = rows[0] && (
      String(rows[0][0]).toLowerCase().includes('nombre') ||
      String(rows[0][0]).toLowerCase().includes('name')
    ) ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue; // Saltar filas vacías

      const nombreRaw = String(row[0] || '').trim();
      const tipoRaw = String(row[1] || '').trim().toUpperCase();

      if (!nombreRaw) continue;

      const lugar: LugarImport = {
        nombre: nombreRaw.toUpperCase(),
        tipo: tipoRaw as LugarTipo,
        valid: true
      };

      // Validar nombre
      if (lugar.nombre.length < 3) {
        lugar.valid = false;
        lugar.error = 'El nombre debe tener al menos 3 caracteres';
      } else if (lugar.nombre.length > 200) {
        lugar.valid = false;
        lugar.error = 'El nombre no puede superar 200 caracteres';
      }

      // Validar tipo
      if (!this.tiposValidos.includes(lugar.tipo)) {
        lugar.valid = false;
        lugar.error = (lugar.error ? lugar.error + '; ' : '') + `Tipo "${tipoRaw}" no es válido`;
      }

      this.lugares.push(lugar);
    }
  }

  onImport() {
    const validLugares = this.lugares.filter(l => l.valid);
    this.import.emit(validLugares);
  }

  onCancel() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.reset();
  }

  onClose() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  reset() {
    this.lugares = [];
  }
}

