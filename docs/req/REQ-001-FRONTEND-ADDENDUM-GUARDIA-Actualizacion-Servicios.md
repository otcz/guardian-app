# REQ-001-FRONTEND-ADDENDUM: Actualización Módulo Guardia - Búsqueda por Identificación

## 📋 Información del Requerimiento

| Campo | Valor |
|-------|-------|
| **ID Requerimiento** | REQ-001-FRONTEND-ADDENDUM-GUARDIA |
| **Requerimiento Base** | REQ-001 + REQ-001-ADDENDUM-GUARDIA |
| **Título** | Actualizar servicios de frontend para consumir búsqueda de usuario por identificación en Módulo Guardia |
| **Fecha de Disponibilidad Backend** | 12 de diciembre de 2025 |
| **Prioridad** | Alta |
| **Estado Backend** | ✅ Implementado y Disponible |
| **Módulo Afectado** | Módulo Guardia - Control de Acceso |
| **Responsable Backend** | backend@guardian.com |

---

## 🎯 Resumen Ejecutivo

El backend ha implementado una **nueva funcionalidad crítica** en el módulo de guardia:

### ¿Qué cambió?
- ✅ **Nuevo endpoint**: Validar usuario por número de identificación
- ✅ **Endpoint actualizado**: Validar usuario ahora retorna campos de identificación
- ✅ **DTO ampliado**: `ValidacionUsuarioDTO` incluye tipo y número de identificación

### ¿Por qué es importante?
Los guardias de seguridad ahora pueden validar el acceso de usuarios usando su **documento de identidad físico** (cédula, pasaporte, etc.) en lugar del username o UUID del sistema.

### ¿Qué debe hacer el frontend?
1. Actualizar interface `ValidacionUsuarioDTO`
2. Agregar método en el servicio de guardia
3. Crear/actualizar componente de validación de acceso
4. Implementar input para búsqueda por identificación

---

## 📡 Cambios en API REST

### 1. Nuevo Endpoint: Validar Usuario por Identificación

**URL:** `GET /api/movimientos-guardia/validar-usuario-identificacion/{identificacion}`

**Descripción:** Busca y valida un usuario usando su número de identificación (documento físico).

**Parámetros:**
- `identificacion` (path param): Número de identificación del usuario (ej: "1234567890")

**Headers Requeridos:**
```http
Authorization: Bearer {token}
```

**Permisos Requeridos:**
- `ITEM_VALIDAR_USUARIOS` O
- `ITEM_CONTROL_DE_INGRESO_Y_SALIDA`

---

#### Request Example

```http
GET /api/movimientos-guardia/validar-usuario-identificacion/1234567890
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

#### Response Success (Usuario Existe)

**HTTP 200 OK**

```json
{
  "existe": true,
  "activo": true,
  "nombreCompleto": "Juan Pérez González",
  "username": "jperez",
  "tipoIdentificacion": "CEDULA",
  "identificacion": "1234567890",
  "seccion": "Edificio Torre A",
  "restricciones": [],
  "vehiculos": ["ABC123", "XYZ789"],
  "tieneEntradaAbierta": false,
  "entradaAbierta": null
}
```

---

#### Response Success (Usuario No Existe)

**HTTP 200 OK**

```json
{
  "existe": false,
  "activo": false,
  "nombreCompleto": null,
  "username": null,
  "tipoIdentificacion": null,
  "identificacion": null,
  "seccion": null,
  "restricciones": null,
  "vehiculos": null,
  "tieneEntradaAbierta": false,
  "entradaAbierta": null
}
```

---

#### Response (Usuario con Entrada Abierta)

**HTTP 200 OK**

```json
{
  "existe": true,
  "activo": true,
  "nombreCompleto": "María López Díaz",
  "username": "mlopez",
  "tipoIdentificacion": "PASAPORTE",
  "identificacion": "AB123456",
  "seccion": "Edificio Torre B - Piso 3",
  "restricciones": [],
  "vehiculos": [],
  "tieneEntradaAbierta": true,
  "entradaAbierta": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tipoMovimiento": "ENTRADA",
    "timestampMovimiento": "2025-12-12T08:30:00Z",
    "guardiaEntity": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "nombre": "Entrada Principal"
    },
    "observaciones": "Ingreso normal"
  }
}
```

---

### 2. Endpoint Actualizado: Validar Usuario por UUID

**URL:** `GET /api/movimientos-guardia/validar-usuario/{usuarioId}`

**Cambio:** El response ahora incluye los campos de identificación.

**Response Actualizado:**

```json
{
  "existe": true,
  "activo": true,
  "nombreCompleto": "Juan Pérez",
  "username": "jperez",              // ⬅️ ACTUALIZADO: antes era 'documento'
  "tipoIdentificacion": "CEDULA",    // ⬅️ NUEVO
  "identificacion": "1234567890",    // ⬅️ NUEVO
  "seccion": "Torre A",
  "restricciones": [],
  "vehiculos": ["ABC123"],
  "tieneEntradaAbierta": false,
  "entradaAbierta": null
}
```

**⚠️ Breaking Change:**
- El campo `documento` fue renombrado a `username`
- Si tu código usa `response.documento`, debes cambiarlo a `response.username`

---

## 🎨 Interfaces TypeScript Actualizadas

### ValidacionUsuarioDTO (Actualizada)

```typescript
/**
 * DTO de validación de usuario en módulo guardia
 * @version 2.0 - Actualizado con campos de identificación
 */
export interface ValidacionUsuarioDTO {
  existe: boolean;
  activo: boolean;
  nombreCompleto: string | null;
  
  // ⚠️ ACTUALIZADO: 'documento' renombrado a 'username'
  username: string | null;
  
  // ✨ NUEVO: Campos de identificación
  tipoIdentificacion: TipoIdentificacion | null;
  identificacion: string | null;
  
  seccion: string | null;
  restricciones: string[];
  vehiculos: string[];
  tieneEntradaAbierta: boolean;
  entradaAbierta: MovimientoGuardia | null;
}
```

---

### TipoIdentificacion (Enum)

```typescript
/**
 * Tipos de documento de identidad soportados por el sistema
 */
export enum TipoIdentificacion {
  CEDULA = 'CEDULA',       // Cédula de ciudadanía/identidad
  PASAPORTE = 'PASAPORTE', // Pasaporte internacional
  DNI = 'DNI',             // Documento Nacional de Identidad
  RUC = 'RUC',             // Registro Único de Contribuyentes
  LICENCIA = 'LICENCIA',   // Licencia de conducir
  OTRO = 'OTRO'            // Otro tipo de documento
}

/**
 * Función helper para obtener el label en español
 */
export function getTipoIdentificacionLabel(tipo: TipoIdentificacion | null): string {
  if (!tipo) return 'Sin definir';
  
  const labels: Record<TipoIdentificacion, string> = {
    [TipoIdentificacion.CEDULA]: 'Cédula',
    [TipoIdentificacion.PASAPORTE]: 'Pasaporte',
    [TipoIdentificacion.DNI]: 'DNI',
    [TipoIdentificacion.RUC]: 'RUC',
    [TipoIdentificacion.LICENCIA]: 'Licencia',
    [TipoIdentificacion.OTRO]: 'Otro'
  };
  
  return labels[tipo];
}
```

---

### MovimientoGuardia (Interface de Entrada Abierta)

```typescript
export interface MovimientoGuardia {
  id: string;
  tipoMovimiento: 'ENTRADA' | 'SALIDA';
  timestampMovimiento: string; // ISO 8601 date
  guardiaEntity: {
    id: string;
    nombre: string;
  };
  observaciones?: string;
}
```

---

## 🛠️ Actualización de Servicios

### Angular Service (Completo)

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface ValidacionUsuarioDTO {
  existe: boolean;
  activo: boolean;
  nombreCompleto: string | null;
  username: string | null;
  tipoIdentificacion: string | null;
  identificacion: string | null;
  seccion: string | null;
  restricciones: string[];
  vehiculos: string[];
  tieneEntradaAbierta: boolean;
  entradaAbierta: any | null;
}

@Injectable({
  providedIn: 'root'
})
export class GuardiaService {
  private readonly baseUrl = `${environment.apiUrl}/movimientos-guardia`;

  constructor(private http: HttpClient) {}

  /**
   * Validar usuario por UUID (método existente - ACTUALIZADO)
   * @param usuarioId UUID del usuario
   * @returns Observable con información de validación (incluye identificación ahora)
   */
  validarUsuario(usuarioId: string): Observable<ValidacionUsuarioDTO> {
    return this.http.get<ValidacionUsuarioDTO>(
      `${this.baseUrl}/validar-usuario/${usuarioId}`
    );
  }

  /**
   * Validar usuario por número de identificación (NUEVO)
   * @param identificacion Número de documento (cédula, pasaporte, etc.)
   * @returns Observable con información de validación
   */
  validarUsuarioPorIdentificacion(identificacion: string): Observable<ValidacionUsuarioDTO> {
    // Limpiar espacios
    const identificacionLimpia = identificacion.trim();
    
    return this.http.get<ValidacionUsuarioDTO>(
      `${this.baseUrl}/validar-usuario-identificacion/${identificacionLimpia}`
    );
  }

  /**
   * Registrar entrada de usuario
   */
  registrarEntrada(data: {
    guardiaId: string;
    usuarioId: string;
    vehiculoId?: string;
    adminGuardiaId: string;
    observaciones?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/entrada`, data);
  }

  /**
   * Registrar salida de usuario
   */
  registrarSalida(data: {
    guardiaId: string;
    usuarioId: string;
    vehiculoId?: string;
    adminGuardiaId: string;
    observaciones?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/salida`, data);
  }
}
```

---

### React/TypeScript Service (Fetch)

```typescript
// services/guardia.service.ts
import { ValidacionUsuarioDTO, TipoIdentificacion } from '@/types/guardia.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

class GuardiaService {
  private baseUrl = `${API_BASE_URL}/movimientos-guardia`;

  /**
   * Obtiene los headers con el token de autenticación
   */
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  /**
   * Validar usuario por UUID (método existente - ACTUALIZADO)
   */
  async validarUsuario(usuarioId: string): Promise<ValidacionUsuarioDTO> {
    const response = await fetch(
      `${this.baseUrl}/validar-usuario/${usuarioId}`,
      {
        method: 'GET',
        headers: this.getHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Validar usuario por número de identificación (NUEVO)
   */
  async validarUsuarioPorIdentificacion(identificacion: string): Promise<ValidacionUsuarioDTO> {
    // Limpiar espacios
    const identificacionLimpia = identificacion.trim();

    const response = await fetch(
      `${this.baseUrl}/validar-usuario-identificacion/${identificacionLimpia}`,
      {
        method: 'GET',
        headers: this.getHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Registrar entrada
   */
  async registrarEntrada(data: {
    guardiaId: string;
    usuarioId: string;
    vehiculoId?: string;
    adminGuardiaId: string;
    observaciones?: string;
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/entrada`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Registrar salida
   */
  async registrarSalida(data: {
    guardiaId: string;
    usuarioId: string;
    vehiculoId?: string;
    adminGuardiaId: string;
    observaciones?: string;
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/salida`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

export const guardiaService = new GuardiaService();
```

---

## 🎨 Componentes de UI

### Componente Angular: Validación de Acceso

```typescript
// validar-acceso.component.ts
import { Component, OnInit } from '@angular/core';
import { GuardiaService, ValidacionUsuarioDTO } from '@services/guardia.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-validar-acceso',
  templateUrl: './validar-acceso.component.html',
  styleUrls: ['./validar-acceso.component.scss']
})
export class ValidarAccesoComponent implements OnInit {
  formulario: FormGroup;
  validacion: ValidacionUsuarioDTO | null = null;
  cargando = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private guardiaService: GuardiaService
  ) {
    this.formulario = this.fb.group({
      identificacion: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  /**
   * Valida el acceso del usuario por su identificación
   */
  validarAcceso(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const identificacion = this.formulario.get('identificacion')?.value;
    this.cargando = true;
    this.error = null;
    this.validacion = null;

    this.guardiaService.validarUsuarioPorIdentificacion(identificacion)
      .subscribe({
        next: (response) => {
          this.validacion = response;
          this.cargando = false;
          
          // Log para debugging
          console.log('Validación exitosa:', response);
        },
        error: (err) => {
          this.error = 'Error al validar usuario. Intente nuevamente.';
          this.cargando = false;
          console.error('Error:', err);
        }
      });
  }

  /**
   * Limpia el formulario y resultados
   */
  limpiar(): void {
    this.formulario.reset();
    this.validacion = null;
    this.error = null;
  }

  /**
   * Permite el acceso del usuario
   */
  permitirAcceso(): void {
    if (!this.validacion || !this.validacion.existe) return;
    
    // TODO: Implementar lógica de registro de entrada
    console.log('Permitir acceso a:', this.validacion.nombreCompleto);
    
    // Limpiar después de permitir
    this.limpiar();
  }

  /**
   * Verifica si el usuario puede acceder
   */
  puedeAcceder(): boolean {
    return !!(this.validacion?.existe && this.validacion?.activo && !this.validacion?.tieneEntradaAbierta);
  }
}
```

---

### Template Angular

```html
<!-- validar-acceso.component.html -->
<div class="validacion-acceso-container">
  <div class="card">
    <div class="card-header">
      <h3>
        <i class="pi pi-shield"></i>
        Validar Acceso de Usuario
      </h3>
    </div>

    <div class="card-body">
      <!-- Formulario de búsqueda -->
      <form [formGroup]="formulario" (ngSubmit)="validarAcceso()">
        <div class="form-group">
          <label for="identificacion">
            Número de Identificación:
            <span class="text-danger">*</span>
          </label>
          <div class="input-group">
            <input
              type="text"
              id="identificacion"
              class="form-control"
              formControlName="identificacion"
              placeholder="Ej: 1234567890"
              [class.is-invalid]="formulario.get('identificacion')?.invalid && formulario.get('identificacion')?.touched"
              (keyup.enter)="validarAcceso()"
              autofocus
            />
            <div class="input-group-append">
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="cargando || formulario.invalid"
              >
                <i class="pi pi-search" *ngIf="!cargando"></i>
                <i class="pi pi-spin pi-spinner" *ngIf="cargando"></i>
                {{ cargando ? 'Validando...' : 'Validar' }}
              </button>
              <button
                type="button"
                class="btn btn-secondary"
                (click)="limpiar()"
                [disabled]="cargando"
              >
                <i class="pi pi-times"></i>
                Limpiar
              </button>
            </div>
          </div>
          <small class="form-text text-muted">
            Ingrese el número de cédula, pasaporte u otro documento
          </small>
          <div class="invalid-feedback" *ngIf="formulario.get('identificacion')?.invalid && formulario.get('identificacion')?.touched">
            Identificación requerida (mínimo 6 caracteres)
          </div>
        </div>
      </form>

      <!-- Error general -->
      <div class="alert alert-danger mt-3" *ngIf="error">
        <i class="pi pi-exclamation-triangle"></i>
        {{ error }}
      </div>

      <!-- Resultado de validación -->
      <div class="resultado-validacion mt-4" *ngIf="validacion">
        
        <!-- Usuario NO existe -->
        <div class="alert alert-danger" *ngIf="!validacion.existe">
          <h5>
            <i class="pi pi-times-circle"></i>
            Usuario No Encontrado
          </h5>
          <p>No existe ningún usuario registrado con la identificación: <strong>{{ formulario.get('identificacion')?.value }}</strong></p>
          <p class="mb-0">Verifique el número ingresado o contacte al administrador.</p>
        </div>

        <!-- Usuario EXISTE -->
        <div *ngIf="validacion.existe">
          <div class="card" [ngClass]="{
            'border-success': puedeAcceder(),
            'border-danger': !validacion.activo,
            'border-warning': validacion.activo && validacion.tieneEntradaAbierta
          }">
            <div class="card-body">
              
              <!-- Información del usuario -->
              <div class="usuario-info">
                <h4>
                  <i class="pi pi-user"></i>
                  {{ validacion.nombreCompleto }}
                </h4>

                <div class="row mt-3">
                  <div class="col-md-6">
                    <p><strong>Usuario:</strong> {{ validacion.username }}</p>
                    <p><strong>Tipo ID:</strong> {{ validacion.tipoIdentificacion }}</p>
                    <p><strong>Número ID:</strong> {{ validacion.identificacion }}</p>
                  </div>
                  <div class="col-md-6">
                    <p><strong>Sección:</strong> {{ validacion.seccion || 'Sin asignar' }}</p>
                    <p>
                      <strong>Estado:</strong>
                      <span class="badge" [ngClass]="{
                        'badge-success': validacion.activo,
                        'badge-danger': !validacion.activo
                      }">
                        {{ validacion.activo ? 'ACTIVO' : 'INACTIVO' }}
                      </span>
                    </p>
                  </div>
                </div>

                <!-- Vehículos -->
                <div class="vehiculos-info mt-3" *ngIf="validacion.vehiculos && validacion.vehiculos.length > 0">
                  <strong>Vehículos Asociados:</strong>
                  <span class="badge badge-info ml-2" *ngFor="let vehiculo of validacion.vehiculos">
                    {{ vehiculo }}
                  </span>
                </div>
              </div>

              <!-- Alertas de estado -->
              <div class="alertas-estado mt-3">
                
                <!-- Usuario INACTIVO -->
                <div class="alert alert-danger" *ngIf="!validacion.activo">
                  <i class="pi pi-ban"></i>
                  <strong>ACCESO DENEGADO:</strong> El usuario está INACTIVO en el sistema.
                </div>

                <!-- Entrada ABIERTA -->
                <div class="alert alert-warning" *ngIf="validacion.tieneEntradaAbierta">
                  <i class="pi pi-exclamation-triangle"></i>
                  <strong>ADVERTENCIA:</strong> El usuario tiene una entrada abierta desde
                  {{ validacion.entradaAbierta?.timestampMovimiento | date:'short' }}
                  <span *ngIf="validacion.entradaAbierta?.guardiaEntity">
                    en {{ validacion.entradaAbierta.guardiaEntity.nombre }}
                  </span>
                </div>

                <!-- PUEDE ACCEDER -->
                <div class="alert alert-success" *ngIf="puedeAcceder()">
                  <i class="pi pi-check-circle"></i>
                  <strong>ACCESO PERMITIDO:</strong> El usuario puede ingresar.
                </div>
              </div>

              <!-- Acciones -->
              <div class="acciones mt-3" *ngIf="puedeAcceder()">
                <button
                  type="button"
                  class="btn btn-success btn-lg btn-block"
                  (click)="permitirAcceso()"
                >
                  <i class="pi pi-check"></i>
                  Permitir Acceso
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

### Estilos SCSS (Opcional)

```scss
// validar-acceso.component.scss
.validacion-acceso-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;

  .card {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border-radius: 8px;

    .card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;

      h3 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;

        i {
          margin-right: 10px;
        }
      }
    }

    .card-body {
      padding: 30px;
    }
  }

  .input-group {
    .form-control {
      font-size: 1.1rem;
      height: 48px;
    }

    .btn {
      height: 48px;
      min-width: 120px;
    }
  }

  .resultado-validacion {
    .usuario-info {
      h4 {
        color: #333;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #eee;

        i {
          margin-right: 10px;
          color: #667eea;
        }
      }

      p {
        margin-bottom: 8px;
        font-size: 1rem;
      }

      .badge {
        font-size: 0.9rem;
        padding: 6px 12px;
      }
    }

    .vehiculos-info {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 4px;

      .badge {
        margin-right: 8px;
      }
    }

    .alertas-estado {
      .alert {
        font-size: 1rem;
        border-left: 4px solid;

        i {
          margin-right: 10px;
        }
      }

      .alert-danger {
        border-left-color: #dc3545;
      }

      .alert-warning {
        border-left-color: #ffc107;
      }

      .alert-success {
        border-left-color: #28a745;
      }
    }

    .acciones {
      .btn-lg {
        font-size: 1.2rem;
        padding: 15px;
        font-weight: 600;
      }
    }
  }
}
```

---

### Componente React/TypeScript

```tsx
// ValidarAcceso.tsx
import React, { useState } from 'react';
import { guardiaService } from '@/services/guardia.service';
import { ValidacionUsuarioDTO, getTipoIdentificacionLabel } from '@/types/guardia.types';
import './ValidarAcceso.css';

const ValidarAcceso: React.FC = () => {
  const [identificacion, setIdentificacion] = useState('');
  const [validacion, setValidacion] = useState<ValidacionUsuarioDTO | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validarAcceso = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!identificacion.trim()) {
      setError('Debe ingresar un número de identificación');
      return;
    }

    setCargando(true);
    setError(null);
    setValidacion(null);

    try {
      const response = await guardiaService.validarUsuarioPorIdentificacion(identificacion);
      setValidacion(response);
    } catch (err) {
      setError('Error al validar usuario. Intente nuevamente.');
      console.error('Error:', err);
    } finally {
      setCargando(false);
    }
  };

  const limpiar = () => {
    setIdentificacion('');
    setValidacion(null);
    setError(null);
  };

  const puedeAcceder = (): boolean => {
    return !!(validacion?.existe && validacion?.activo && !validacion?.tieneEntradaAbierta);
  };

  const permitirAcceso = () => {
    if (!puedeAcceder()) return;
    
    console.log('Permitir acceso a:', validacion?.nombreCompleto);
    // TODO: Implementar registro de entrada
    limpiar();
  };

  return (
    <div className="validacion-acceso-container">
      <div className="card">
        <div className="card-header">
          <h3>
            <i className="pi pi-shield"></i>
            Validar Acceso de Usuario
          </h3>
        </div>

        <div className="card-body">
          {/* Formulario */}
          <form onSubmit={validarAcceso}>
            <div className="form-group">
              <label htmlFor="identificacion">
                Número de Identificación: <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  type="text"
                  id="identificacion"
                  className="form-control"
                  value={identificacion}
                  onChange={(e) => setIdentificacion(e.target.value)}
                  placeholder="Ej: 1234567890"
                  disabled={cargando}
                  autoFocus
                />
                <div className="input-group-append">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={cargando || !identificacion.trim()}
                  >
                    {cargando ? 'Validando...' : 'Validar'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={limpiar}
                    disabled={cargando}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
              <small className="form-text text-muted">
                Ingrese el número de cédula, pasaporte u otro documento
              </small>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="alert alert-danger mt-3">
              <i className="pi pi-exclamation-triangle"></i> {error}
            </div>
          )}

          {/* Resultado */}
          {validacion && (
            <div className="resultado-validacion mt-4">
              {!validacion.existe ? (
                <div className="alert alert-danger">
                  <h5>
                    <i className="pi pi-times-circle"></i>
                    Usuario No Encontrado
                  </h5>
                  <p>No existe ningún usuario con la identificación: <strong>{identificacion}</strong></p>
                </div>
              ) : (
                <div className={`card border-${puedeAcceder() ? 'success' : !validacion.activo ? 'danger' : 'warning'}`}>
                  <div className="card-body">
                    {/* Info usuario */}
                    <div className="usuario-info">
                      <h4>
                        <i className="pi pi-user"></i>
                        {validacion.nombreCompleto}
                      </h4>

                      <div className="row mt-3">
                        <div className="col-md-6">
                          <p><strong>Usuario:</strong> {validacion.username}</p>
                          <p><strong>Tipo ID:</strong> {getTipoIdentificacionLabel(validacion.tipoIdentificacion as any)}</p>
                          <p><strong>Número ID:</strong> {validacion.identificacion}</p>
                        </div>
                        <div className="col-md-6">
                          <p><strong>Sección:</strong> {validacion.seccion || 'Sin asignar'}</p>
                          <p>
                            <strong>Estado:</strong>
                            <span className={`badge badge-${validacion.activo ? 'success' : 'danger'} ml-2`}>
                              {validacion.activo ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {validacion.vehiculos && validacion.vehiculos.length > 0 && (
                        <div className="vehiculos-info mt-3">
                          <strong>Vehículos:</strong>
                          {validacion.vehiculos.map((v, i) => (
                            <span key={i} className="badge badge-info ml-2">{v}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Alertas */}
                    <div className="alertas-estado mt-3">
                      {!validacion.activo && (
                        <div className="alert alert-danger">
                          <strong>ACCESO DENEGADO:</strong> Usuario INACTIVO
                        </div>
                      )}

                      {validacion.tieneEntradaAbierta && (
                        <div className="alert alert-warning">
                          <strong>ADVERTENCIA:</strong> Tiene entrada abierta
                        </div>
                      )}

                      {puedeAcceder() && (
                        <div className="alert alert-success">
                          <strong>ACCESO PERMITIDO</strong>
                        </div>
                      )}
                    </div>

                    {/* Acción */}
                    {puedeAcceder() && (
                      <div className="acciones mt-3">
                        <button
                          className="btn btn-success btn-lg btn-block"
                          onClick={permitirAcceso}
                        >
                          Permitir Acceso
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidarAcceso;
```

---

## 🧪 Testing

### Tests Unitarios (Jest + Angular)

```typescript
// validar-acceso.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ValidarAccesoComponent } from './validar-acceso.component';
import { GuardiaService } from '@services/guardia.service';

describe('ValidarAccesoComponent', () => {
  let component: ValidarAccesoComponent;
  let fixture: ComponentFixture<ValidarAccesoComponent>;
  let guardiaService: jasmine.SpyObj<GuardiaService>;

  beforeEach(async () => {
    const guardiaServiceSpy = jasmine.createSpyObj('GuardiaService', [
      'validarUsuarioPorIdentificacion'
    ]);

    await TestBed.configureTestingModule({
      declarations: [ValidarAccesoComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: GuardiaService, useValue: guardiaServiceSpy }
      ]
    }).compileComponents();

    guardiaService = TestBed.inject(GuardiaService) as jasmine.SpyObj<GuardiaService>;
    fixture = TestBed.createComponent(ValidarAccesoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate user successfully', (done) => {
    const mockResponse = {
      existe: true,
      activo: true,
      nombreCompleto: 'Juan Pérez',
      username: 'jperez',
      tipoIdentificacion: 'CEDULA',
      identificacion: '1234567890',
      seccion: 'Torre A',
      restricciones: [],
      vehiculos: ['ABC123'],
      tieneEntradaAbierta: false,
      entradaAbierta: null
    };

    guardiaService.validarUsuarioPorIdentificacion.and.returnValue(of(mockResponse));

    component.formulario.patchValue({ identificacion: '1234567890' });
    component.validarAcceso();

    expect(guardiaService.validarUsuarioPorIdentificacion).toHaveBeenCalledWith('1234567890');
    
    setTimeout(() => {
      expect(component.validacion).toEqual(mockResponse);
      expect(component.cargando).toBeFalse();
      expect(component.error).toBeNull();
      done();
    }, 100);
  });

  it('should handle user not found', (done) => {
    const mockResponse = {
      existe: false,
      activo: false,
      nombreCompleto: null,
      username: null,
      tipoIdentificacion: null,
      identificacion: null,
      seccion: null,
      restricciones: null,
      vehiculos: null,
      tieneEntradaAbierta: false,
      entradaAbierta: null
    };

    guardiaService.validarUsuarioPorIdentificacion.and.returnValue(of(mockResponse));

    component.formulario.patchValue({ identificacion: '9999999999' });
    component.validarAcceso();

    setTimeout(() => {
      expect(component.validacion?.existe).toBeFalse();
      done();
    }, 100);
  });

  it('should handle error', (done) => {
    guardiaService.validarUsuarioPorIdentificacion.and.returnValue(
      throwError({ status: 500, message: 'Server error' })
    );

    component.formulario.patchValue({ identificacion: '1234567890' });
    component.validarAcceso();

    setTimeout(() => {
      expect(component.error).toBeTruthy();
      expect(component.cargando).toBeFalse();
      done();
    }, 100);
  });

  it('should determine if user can access', () => {
    // Usuario puede acceder
    component.validacion = {
      existe: true,
      activo: true,
      tieneEntradaAbierta: false,
      nombreCompleto: 'Test',
      username: 'test',
      tipoIdentificacion: 'CEDULA',
      identificacion: '123',
      seccion: 'A',
      restricciones: [],
      vehiculos: [],
      entradaAbierta: null
    };
    expect(component.puedeAcceder()).toBeTrue();

    // Usuario inactivo
    component.validacion.activo = false;
    expect(component.puedeAcceder()).toBeFalse();

    // Usuario con entrada abierta
    component.validacion.activo = true;
    component.validacion.tieneEntradaAbierta = true;
    expect(component.puedeAcceder()).toBeFalse();
  });
});
```

---

## 📋 Checklist de Implementación

### Actualización de Servicios
- [ ] Actualizar interface `ValidacionUsuarioDTO`
- [ ] Crear enum `TipoIdentificacion`
- [ ] Agregar método `validarUsuarioPorIdentificacion()` al servicio
- [ ] Actualizar método `validarUsuario()` para manejar nuevos campos
- [ ] Agregar función helper `getTipoIdentificacionLabel()`

### Componentes UI
- [ ] Crear componente de validación de acceso
- [ ] Implementar input de búsqueda por identificación
- [ ] Mostrar información completa del usuario
- [ ] Implementar lógica de acceso permitido/denegado
- [ ] Agregar alertas visuales según estado
- [ ] Estilos CSS/SCSS

### Testing
- [ ] Tests unitarios del servicio
- [ ] Tests unitarios del componente
- [ ] Tests E2E de flujo completo
- [ ] Tests de manejo de errores

### Integración
- [ ] Actualizar rutas/navegación
- [ ] Permisos de acceso al módulo
- [ ] Documentar cambios en changelog
- [ ] Actualizar manual de usuario

---

## 🔍 Validación y Debugging

### Verificar Endpoint en Consola del Browser

```javascript
// Abrir DevTools > Console
const token = 'YOUR_JWT_TOKEN';

fetch('http://localhost:8080/api/movimientos-guardia/validar-usuario-identificacion/1234567890', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err));
```

### Verificar con Postman

```
GET http://localhost:8080/api/movimientos-guardia/validar-usuario-identificacion/1234567890
Headers:
  Authorization: Bearer {token}
```

---

## ⚠️ Breaking Changes y Migraciones

### Campo Renombrado: `documento` → `username`

**Si tu código actual usa:**
```typescript
// ❌ ANTES (va a fallar)
const documento = response.documento;
```

**Debes cambiarlo a:**
```typescript
// ✅ AHORA
const username = response.username;
```

### Script de Migración

```typescript
// migration-script.ts
// Buscar y reemplazar en todos los archivos

// Patrón a buscar:
// response.documento
// validacion.documento
// usuario.documento

// Reemplazar por:
// response.username
// validacion.username
// usuario.username
```

---

## 🚨 Manejo de Errores

### Códigos de Error Comunes

| Código HTTP | Causa | Acción Frontend |
|-------------|-------|-----------------|
| `200` con `existe: false` | Usuario no encontrado | Mostrar mensaje "Usuario no existe" |
| `401` | Token inválido/expirado | Redirigir a login |
| `403` | Sin permisos | Mostrar "Sin permisos para validar usuarios" |
| `500` | Error interno del servidor | Mostrar "Error del sistema. Intente más tarde" |

### Ejemplo de Manejo de Errores

```typescript
validarUsuarioPorIdentificacion(identificacion: string): Observable<ValidacionUsuarioDTO> {
  return this.http.get<ValidacionUsuarioDTO>(
    `${this.baseUrl}/validar-usuario-identificacion/${identificacion}`
  ).pipe(
    catchError((error: HttpErrorResponse) => {
      let mensajeError = 'Error desconocido';
      
      switch (error.status) {
        case 401:
          mensajeError = 'Sesión expirada. Por favor inicie sesión nuevamente';
          // Redirigir a login
          break;
        case 403:
          mensajeError = 'No tiene permisos para validar usuarios';
          break;
        case 404:
          mensajeError = 'Servicio no disponible';
          break;
        case 500:
          mensajeError = 'Error interno del servidor';
          break;
        default:
          mensajeError = `Error ${error.status}: ${error.message}`;
      }
      
      return throwError(() => new Error(mensajeError));
    })
  );
}
```

---

## 📊 Casos de Uso Completos

### Caso 1: Validación Exitosa - Usuario Activo

**Flujo:**
1. Guardia recibe a Juan con cédula 1234567890
2. Ingresa el número en el input
3. Presiona "Validar"
4. Sistema muestra: ✅ ACTIVO, puede ingresar
5. Guardia presiona "Permitir Acceso"
6. Sistema registra entrada (TODO: implementar)

**Request:**
```
GET /api/movimientos-guardia/validar-usuario-identificacion/1234567890
```

**Response:**
```json
{
  "existe": true,
  "activo": true,
  "nombreCompleto": "Juan Pérez González",
  "username": "jperez",
  "tipoIdentificacion": "CEDULA",
  "identificacion": "1234567890",
  "seccion": "Torre A",
  "tieneEntradaAbierta": false
}
```

---

### Caso 2: Usuario No Encontrado

**Flujo:**
1. Guardia ingresa identificación 9999999999
2. Sistema busca y no encuentra
3. Muestra: ❌ Usuario no encontrado
4. Guardia contacta administrador

**Response:**
```json
{
  "existe": false
}
```

---

### Caso 3: Usuario con Entrada Abierta

**Flujo:**
1. Usuario intenta ingresar nuevamente
2. Sistema detecta entrada sin salida
3. Muestra: ⚠️ Tiene entrada abierta
4. Guardia debe registrar salida primero

**Response:**
```json
{
  "existe": true,
  "activo": true,
  "tieneEntradaAbierta": true,
  "entradaAbierta": {
    "id": "uuid",
    "timestampMovimiento": "2025-12-12T08:30:00Z"
  }
}
```

---

## 📞 Soporte y Contacto

### Backend Support
- **Email:** backend@guardian.com
- **Slack:** #guardian-backend
- **JIRA:** REQ-001-FRONTEND-ADDENDUM-GUARDIA

### Preguntas Frecuentes

**P: ¿El endpoint está disponible ahora?**  
R: Sí, está implementado y funcional desde el 12 de diciembre de 2025.

**P: ¿Es obligatorio migrar `documento` a `username`?**  
R: Sí, es un breaking change. El campo `documento` ya no existe.

**P: ¿Qué pasa si envío identificación vacía?**  
R: El backend retorna `existe: false`.

**P: ¿Puedo buscar por pasaporte?**  
R: Sí, cualquier tipo de identificación funciona.

**P: ¿El endpoint require autenticación?**  
R: Sí, requiere JWT token y permisos específicos.

---

## 🎉 Beneficios para el Usuario Final

### Antes:
- ❌ Guardia pregunta: "¿Cuál es tu usuario?"
- ❌ Usuario: "No recuerdo"
- ❌ Proceso manual y lento

### Ahora:
- ✅ Guardia: "Tu cédula, por favor"
- ✅ Usuario muestra cédula física
- ✅ Guardia ingresa número
- ✅ Sistema valida instantáneamente
- ✅ Proceso rápido y eficiente

---

## ✅ Estado Final

**Backend:** ✅ Implementado y disponible  
**Documentación:** ✅ Completa  
**Frontend:** ⏳ Pendiente de implementación  

**Prioridad:** ALTA - Funcionalidad crítica para operación de guardia

---

**Fecha de Generación:** 12 de diciembre de 2025  
**Versión:** 1.0  
**Autor:** Equipo Backend - Guardian V3

---

*Este documento contiene toda la información necesaria para que el equipo de frontend implemente exitosamente la integración con el nuevo endpoint de validación por identificación en el módulo de guardia.*

