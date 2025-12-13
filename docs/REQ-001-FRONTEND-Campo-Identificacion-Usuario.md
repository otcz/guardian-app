# REQ-001: Integración Frontend - Campo de Identificación en Usuario

## 📋 Información para Frontend

| Campo | Valor |
|-------|-------|
| **ID Requerimiento** | REQ-001-FRONTEND |
| **Backend REQ** | REQ-001 |
| **Título** | Consumir campos de identificación de Usuario desde API |
| **Fecha de Disponibilidad** | 12 de diciembre de 2025 |
| **Prioridad** | Alta |
| **Estado Backend** | ✅ Implementado y Disponible |
| **Versión API** | v1 (Guardian V3 - 0.0.1-SNAPSHOT) |
| **Contacto Backend** | backend@guardian.com |

---

## 🎯 Resumen Ejecutivo

El backend ha implementado dos nuevos campos en la gestión de usuarios:
- **`tipoIdentificacion`**: Tipo de documento (enum)
- **`identificacion`**: Número de documento único

Estos campos están **disponibles desde ahora** en todos los endpoints de usuario.

### ⚠️ Importante para Frontend
- ✅ **Campos OPCIONALES**: No son obligatorios, pueden ser `null`
- ✅ **Retrocompatible**: No rompe funcionalidad existente
- ✅ **Validación Backend**: La unicidad de identificación se valida en backend
- ⚠️ **Requiere actualización**: Formularios de creación/edición de usuario

---

## 📡 Cambios en API REST

### 🆕 Nuevos Campos en Responses

Todos los endpoints de usuario ahora incluyen:

```typescript
interface Usuario {
  id: string;
  username: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  
  // 🆕 NUEVOS CAMPOS
  tipoIdentificacion: 'CEDULA' | 'PASAPORTE' | 'DNI' | 'RUC' | 'LICENCIA' | 'OTRO' | null;
  identificacion: string | null;
  
  activo: boolean;
  scopeNivel: 'ORGANIZACION' | 'SECCION';
  // ...resto de campos
}
```

---

## 🔌 Endpoints Actualizados

### 1. POST - Crear Usuario

**Endpoint:** `POST /organizaciones/{orgId}/usuarios`

**Request Body - ANTES:**
```json
{
  "username": "jperez",
  "nombreCompleto": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "+57 3001234567",
  "scopeNivel": "SECCION",
  "seccionId": "uuid-seccion",
  "rolesIds": ["uuid-rol"]
}
```

**Request Body - AHORA (con nuevos campos):**
```json
{
  "username": "jperez",
  "nombreCompleto": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "+57 3001234567",
  
  // 🆕 CAMPOS NUEVOS (OPCIONALES)
  "tipoIdentificacion": "CEDULA",
  "identificacion": "1234567890",
  
  "scopeNivel": "SECCION",
  "seccionId": "uuid-seccion",
  "rolesIds": ["uuid-rol"]
}
```

**Response - AHORA:**
```json
{
  "message": "Usuario creado exitosamente",
  "data": {
    "id": "uuid-usuario",
    "username": "jperez",
    "nombreCompleto": "Juan Pérez",
    "email": "juan@example.com",
    "telefono": "+57 3001234567",
    
    // 🆕 CAMPOS INCLUIDOS EN RESPUESTA
    "tipoIdentificacion": "CEDULA",
    "identificacion": "1234567890",
    
    "activo": true,
    "scopeNivel": "SECCION",
    "seccionId": "uuid-seccion",
    "seccionNombre": "Torre A",
    "fechaCreacion": "2025-12-12T15:30:00Z",
    "rolNombre": "USUARIO"
  }
}
```

**Validaciones Backend:**
- ✅ Si envías `identificacion`, debe ser única (no puede estar duplicada)
- ✅ Si está duplicada, recibes `HTTP 400` con mensaje de error

**Ejemplo de Error:**
```json
{
  "timestamp": "2025-12-12T15:30:00Z",
  "status": 400,
  "message": "Ya existe un usuario con la identificación: 1234567890"
}
```

---

### 2. PATCH - Actualizar Usuario

**Endpoint:** `PATCH /organizaciones/{orgId}/usuarios/{usuarioId}`

**Request Body:**
```json
{
  "nombreCompleto": "Juan Carlos Pérez",
  "email": "juancarlos@example.com",
  "telefono": "+57 3009876543",
  
  // 🆕 PUEDES ACTUALIZAR IDENTIFICACIÓN
  "tipoIdentificacion": "PASAPORTE",
  "identificacion": "AB123456"
}
```

**Response:**
```json
{
  "message": "Usuario actualizado exitosamente",
  "data": {
    "id": "uuid-usuario",
    "username": "jperez",
    "nombreCompleto": "Juan Carlos Pérez",
    "email": "juancarlos@example.com",
    "telefono": "+57 3009876543",
    
    // 🆕 VALORES ACTUALIZADOS
    "tipoIdentificacion": "PASAPORTE",
    "identificacion": "AB123456",
    
    "activo": true,
    "fechaActualizacion": "2025-12-12T16:45:00Z"
  }
}
```

**Validaciones Backend:**
- ✅ Si cambias `identificacion`, valida que no exista otro usuario con ese número
- ✅ Si no cambias `identificacion`, no se valida

---

### 3. GET - Listar Usuarios

**Endpoint:** `GET /organizaciones/{orgId}/usuarios`

**Response:**
```json
{
  "message": "Listado de usuarios",
  "data": [
    {
      "id": "uuid-1",
      "username": "jperez",
      "nombreCompleto": "Juan Pérez",
      "email": "juan@example.com",
      "telefono": "+57 3001234567",
      
      // 🆕 CAMPOS INCLUIDOS (pueden ser null)
      "tipoIdentificacion": "CEDULA",
      "identificacion": "1234567890",
      
      "activo": true,
      "rolNombre": "USUARIO"
    },
    {
      "id": "uuid-2",
      "username": "mlopez",
      "nombreCompleto": "María López",
      
      // 🆕 USUARIO SIN IDENTIFICACIÓN (null)
      "tipoIdentificacion": null,
      "identificacion": null,
      
      "activo": true,
      "rolNombre": "ADMIN"
    }
  ]
}
```

**Nota:** Todos los usuarios incluyen estos campos, pero pueden ser `null` si no tienen identificación asignada.

---

### 4. GET - Obtener Usuario por ID

**Endpoint:** `GET /organizaciones/{orgId}/usuarios/{usuarioId}`

**Response:**
```json
{
  "message": "Detalle de usuario",
  "data": {
    "id": "uuid-usuario",
    "username": "jperez",
    "nombreCompleto": "Juan Pérez González",
    "email": "juan.perez@example.com",
    "telefono": "+57 3001234567",
    
    // 🆕 CAMPOS EN DETALLE
    "tipoIdentificacion": "CEDULA",
    "identificacion": "1234567890",
    
    "activo": true,
    "scopeNivel": "SECCION",
    "seccionId": "uuid-seccion",
    "seccionNombre": "Edificio Torre A",
    "orgId": "uuid-org",
    "orgNombre": "Conjunto Residencial",
    "fechaCreacion": "2025-12-01T10:00:00Z",
    "fechaActualizacion": "2025-12-12T16:45:00Z",
    "rolesOrganizacion": [
      {
        "id": "uuid-rol",
        "nombre": "USUARIO",
        "descripcion": "Usuario estándar"
      }
    ]
  }
}
```

---

## 🎨 Interfaces TypeScript

### Definiciones de Tipos

```typescript
/**
 * Tipos de documento de identidad soportados
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
 * DTO para crear usuario
 */
export interface CrearUsuarioRequest {
  username: string;
  nombreCompleto?: string;
  email?: string;
  telefono?: string;
  
  // 🆕 NUEVOS CAMPOS OPCIONALES
  tipoIdentificacion?: TipoIdentificacion;
  identificacion?: string;
  
  scopeNivel?: 'ORGANIZACION' | 'SECCION';
  seccionId?: string;
  rolesIds?: string[];
  lugaresIds?: string[];
}

/**
 * DTO para actualizar usuario
 */
export interface ActualizarUsuarioRequest {
  username?: string;
  nombreCompleto?: string;
  email?: string;
  telefono?: string;
  
  // 🆕 NUEVOS CAMPOS OPCIONALES
  tipoIdentificacion?: TipoIdentificacion;
  identificacion?: string;
  
  scopeNivel?: 'ORGANIZACION' | 'SECCION';
  seccionId?: string;
  lugaresIds?: string[];
}

/**
 * DTO de respuesta de usuario (detalle y listado)
 */
export interface Usuario {
  id: string;
  username: string;
  nombreCompleto?: string;
  email?: string;
  telefono?: string;
  
  // 🆕 NUEVOS CAMPOS (pueden ser null)
  tipoIdentificacion: TipoIdentificacion | null;
  identificacion: string | null;
  
  activo: boolean;
  scopeNivel: 'ORGANIZACION' | 'SECCION';
  seccionId?: string;
  seccionNombre?: string;
  orgId?: string;
  orgNombre?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  rolNombre?: string;
  rolNombres?: string[];
  rolesOrganizacion?: Array<{
    id: string;
    nombre: string;
    descripcion?: string;
  }>;
}
```

---

## 🛠️ Ejemplos de Implementación

### Angular Service

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private baseUrl = '/api/organizaciones';

  constructor(private http: HttpClient) {}

  /**
   * Crear nuevo usuario
   */
  crearUsuario(orgId: string, usuario: CrearUsuarioRequest): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/${orgId}/usuarios`,
      usuario
    );
  }

  /**
   * Actualizar usuario existente
   */
  actualizarUsuario(
    orgId: string, 
    usuarioId: string, 
    cambios: ActualizarUsuarioRequest
  ): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/${orgId}/usuarios/${usuarioId}`,
      cambios
    );
  }

  /**
   * Listar usuarios de una organización
   */
  listarUsuarios(orgId: string): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(
      `${this.baseUrl}/${orgId}/usuarios`
    );
  }

  /**
   * Obtener detalle de un usuario
   */
  obtenerUsuario(orgId: string, usuarioId: string): Observable<Usuario> {
    return this.http.get<Usuario>(
      `${this.baseUrl}/${orgId}/usuarios/${usuarioId}`
    );
  }
}
```

---

### React/Vue Fetch

```typescript
// crear-usuario.ts
const crearUsuario = async (orgId: string, usuario: CrearUsuarioRequest) => {
  try {
    const response = await fetch(
      `/api/organizaciones/${orgId}/usuarios`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(usuario)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const result = await response.json();
    return result.data; // Usuario creado
  } catch (error) {
    console.error('Error creando usuario:', error);
    throw error;
  }
};

// Ejemplo de uso
const nuevoUsuario: CrearUsuarioRequest = {
  username: 'jperez',
  nombreCompleto: 'Juan Pérez',
  email: 'juan@example.com',
  telefono: '+57 3001234567',
  tipoIdentificacion: TipoIdentificacion.CEDULA,
  identificacion: '1234567890',
  scopeNivel: 'SECCION',
  seccionId: 'uuid-seccion',
  rolesIds: ['uuid-rol-usuario']
};

crearUsuario('uuid-organizacion', nuevoUsuario)
  .then(usuario => console.log('Usuario creado:', usuario))
  .catch(error => console.error('Error:', error));
```

---

## 🎨 Componentes de UI Recomendados

### 1. Selector de Tipo de Identificación

**HTML (Angular):**
```html
<div class="form-group">
  <label for="tipoIdentificacion">Tipo de Identificación</label>
  <select 
    id="tipoIdentificacion" 
    [(ngModel)]="usuario.tipoIdentificacion"
    class="form-control">
    <option [ngValue]="null">Seleccione...</option>
    <option value="CEDULA">Cédula</option>
    <option value="PASAPORTE">Pasaporte</option>
    <option value="DNI">DNI</option>
    <option value="RUC">RUC</option>
    <option value="LICENCIA">Licencia</option>
    <option value="OTRO">Otro</option>
  </select>
</div>
```

**React:**
```tsx
<div className="form-group">
  <label htmlFor="tipoIdentificacion">Tipo de Identificación</label>
  <select
    id="tipoIdentificacion"
    value={usuario.tipoIdentificacion || ''}
    onChange={(e) => setUsuario({
      ...usuario,
      tipoIdentificacion: e.target.value as TipoIdentificacion
    })}
    className="form-control"
  >
    <option value="">Seleccione...</option>
    <option value="CEDULA">Cédula</option>
    <option value="PASAPORTE">Pasaporte</option>
    <option value="DNI">DNI</option>
    <option value="RUC">RUC</option>
    <option value="LICENCIA">Licencia</option>
    <option value="OTRO">Otro</option>
  </select>
</div>
```

---

### 2. Input de Número de Identificación

**Angular:**
```html
<div class="form-group">
  <label for="identificacion">Número de Identificación</label>
  <input
    type="text"
    id="identificacion"
    [(ngModel)]="usuario.identificacion"
    class="form-control"
    placeholder="Ej: 1234567890"
    maxlength="50"
  />
  <small class="form-text text-muted">
    Debe ser único en el sistema
  </small>
</div>
```

**React:**
```tsx
<div className="form-group">
  <label htmlFor="identificacion">Número de Identificación</label>
  <input
    type="text"
    id="identificacion"
    value={usuario.identificacion || ''}
    onChange={(e) => setUsuario({
      ...usuario,
      identificacion: e.target.value
    })}
    className="form-control"
    placeholder="Ej: 1234567890"
    maxLength={50}
  />
  <small className="form-text text-muted">
    Debe ser único en el sistema
  </small>
</div>
```

---

### 3. Formulario Completo de Crear Usuario

**Angular Component:**
```typescript
import { Component } from '@angular/core';
import { UsuarioService } from './usuario.service';
import { TipoIdentificacion, CrearUsuarioRequest } from './usuario.models';

@Component({
  selector: 'app-crear-usuario',
  templateUrl: './crear-usuario.component.html'
})
export class CrearUsuarioComponent {
  TipoIdentificacion = TipoIdentificacion;
  
  usuario: CrearUsuarioRequest = {
    username: '',
    nombreCompleto: '',
    email: '',
    telefono: '',
    tipoIdentificacion: undefined,
    identificacion: '',
    scopeNivel: 'SECCION',
    rolesIds: []
  };

  constructor(private usuarioService: UsuarioService) {}

  guardar() {
    const orgId = 'uuid-organizacion'; // Obtener del contexto
    
    this.usuarioService.crearUsuario(orgId, this.usuario)
      .subscribe({
        next: (response) => {
          console.log('Usuario creado:', response.data);
          // Mostrar mensaje de éxito
          // Navegar a lista de usuarios
        },
        error: (error) => {
          console.error('Error:', error);
          // Mostrar mensaje de error
          if (error.error?.message?.includes('identificación')) {
            alert('Ya existe un usuario con ese número de identificación');
          }
        }
      });
  }
}
```

---

### 4. Tabla de Listado con Identificación

**HTML (Angular):**
```html
<table class="table">
  <thead>
    <tr>
      <th>Usuario</th>
      <th>Nombre Completo</th>
      <th>Email</th>
      <th>Tipo ID</th>
      <th>Identificación</th>
      <th>Estado</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let usuario of usuarios">
      <td>{{ usuario.username }}</td>
      <td>{{ usuario.nombreCompleto }}</td>
      <td>{{ usuario.email }}</td>
      <td>
        <span *ngIf="usuario.tipoIdentificacion" class="badge badge-info">
          {{ usuario.tipoIdentificacion }}
        </span>
        <span *ngIf="!usuario.tipoIdentificacion" class="text-muted">
          Sin definir
        </span>
      </td>
      <td>
        {{ usuario.identificacion || 'N/A' }}
      </td>
      <td>
        <span [class]="usuario.activo ? 'badge badge-success' : 'badge badge-danger'">
          {{ usuario.activo ? 'Activo' : 'Inactivo' }}
        </span>
      </td>
      <td>
        <button (click)="editar(usuario.id)">Editar</button>
      </td>
    </tr>
  </tbody>
</table>
```

---

## ✅ Validaciones Frontend Recomendadas

### 1. Validación de Formato

```typescript
/**
 * Validar formato de identificación según tipo
 */
export function validarIdentificacion(
  tipo: TipoIdentificacion | null, 
  numero: string | null
): { valido: boolean; mensaje?: string } {
  
  if (!numero || numero.trim() === '') {
    return { valido: true }; // Opcional
  }

  const numeroLimpio = numero.trim();

  switch (tipo) {
    case TipoIdentificacion.CEDULA:
      // Validar que sean solo números (ejemplo: 6-15 dígitos)
      if (!/^\d{6,15}$/.test(numeroLimpio)) {
        return { 
          valido: false, 
          mensaje: 'La cédula debe contener entre 6 y 15 dígitos' 
        };
      }
      break;

    case TipoIdentificacion.PASAPORTE:
      // Validar formato de pasaporte (alfanumérico)
      if (!/^[A-Z0-9]{6,12}$/i.test(numeroLimpio)) {
        return { 
          valido: false, 
          mensaje: 'El pasaporte debe contener entre 6 y 12 caracteres alfanuméricos' 
        };
      }
      break;

    case TipoIdentificacion.RUC:
      // Validar RUC (solo números, longitud específica)
      if (!/^\d{10,13}$/.test(numeroLimpio)) {
        return { 
          valido: false, 
          mensaje: 'El RUC debe contener entre 10 y 13 dígitos' 
        };
      }
      break;

    default:
      // Para DNI, LICENCIA, OTRO: validación general
      if (numeroLimpio.length > 50) {
        return { 
          valido: false, 
          mensaje: 'La identificación no puede superar 50 caracteres' 
        };
      }
  }

  return { valido: true };
}
```

---

### 2. Validación en Formulario (Angular)

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function identificacionValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const formGroup = control.parent;
    if (!formGroup) return null;

    const tipoControl = formGroup.get('tipoIdentificacion');
    const identificacionControl = formGroup.get('identificacion');

    if (!tipoControl || !identificacionControl) return null;

    const tipo = tipoControl.value;
    const numero = identificacionControl.value;

    const resultado = validarIdentificacion(tipo, numero);

    return resultado.valido 
      ? null 
      : { identificacionInvalida: { mensaje: resultado.mensaje } };
  };
}

// Uso en FormGroup
this.usuarioForm = this.fb.group({
  username: ['', Validators.required],
  nombreCompleto: [''],
  tipoIdentificacion: [null],
  identificacion: ['', identificacionValidator()],
  // ...otros campos
});
```

---

## 🚨 Manejo de Errores

### Errores Comunes

| Código HTTP | Mensaje | Causa | Acción Frontend |
|-------------|---------|-------|-----------------|
| `400` | "Ya existe un usuario con la identificación: XXXXXXX" | Identificación duplicada | Mostrar mensaje al usuario, permitir corrección |
| `400` | "Datos inválidos" | Formato de request incorrecto | Validar datos antes de enviar |
| `401` | "No autorizado" | Token expirado o inválido | Redirigir a login |
| `403` | "Prohibido" | Usuario sin permisos | Mostrar mensaje "Sin permisos" |
| `500` | "Error interno" | Error en servidor | Mostrar mensaje genérico, reportar a soporte |

---

### Ejemplo de Manejo de Errores (React)

```typescript
const manejarErrorCreacion = (error: any) => {
  if (error.response?.status === 400) {
    const mensaje = error.response.data.message;
    
    if (mensaje.includes('identificación')) {
      setError({
        campo: 'identificacion',
        mensaje: 'Este número de identificación ya está registrado'
      });
    } else if (mensaje.includes('username')) {
      setError({
        campo: 'username',
        mensaje: 'Este nombre de usuario ya existe'
      });
    } else {
      setError({
        campo: 'general',
        mensaje: 'Datos inválidos. Revise el formulario'
      });
    }
  } else if (error.response?.status === 403) {
    setError({
      campo: 'general',
      mensaje: 'No tiene permisos para crear usuarios'
    });
  } else {
    setError({
      campo: 'general',
      mensaje: 'Error al crear usuario. Intente nuevamente'
    });
  }
};
```

---

## 📊 Ejemplos de Visualización

### 1. Badge de Tipo de Identificación

```typescript
// utils/identificacion.utils.ts
export function getTipoIdentificacionLabel(tipo: TipoIdentificacion | null): string {
  const labels: Record<TipoIdentificacion, string> = {
    [TipoIdentificacion.CEDULA]: 'Cédula',
    [TipoIdentificacion.PASAPORTE]: 'Pasaporte',
    [TipoIdentificacion.DNI]: 'DNI',
    [TipoIdentificacion.RUC]: 'RUC',
    [TipoIdentificacion.LICENCIA]: 'Licencia',
    [TipoIdentificacion.OTRO]: 'Otro'
  };
  return tipo ? labels[tipo] : 'Sin definir';
}

export function getTipoIdentificacionColor(tipo: TipoIdentificacion | null): string {
  const colors: Record<TipoIdentificacion, string> = {
    [TipoIdentificacion.CEDULA]: 'primary',
    [TipoIdentificacion.PASAPORTE]: 'success',
    [TipoIdentificacion.DNI]: 'info',
    [TipoIdentificacion.RUC]: 'warning',
    [TipoIdentificacion.LICENCIA]: 'secondary',
    [TipoIdentificacion.OTRO]: 'dark'
  };
  return tipo ? colors[tipo] : 'light';
}
```

**Componente:**
```tsx
<span className={`badge badge-${getTipoIdentificacionColor(usuario.tipoIdentificacion)}`}>
  {getTipoIdentificacionLabel(usuario.tipoIdentificacion)}
</span>
```

---

### 2. Formato de Visualización de Identificación

```typescript
/**
 * Formatea el número de identificación para visualización
 * (oculta parte del número por seguridad)
 */
export function formatearIdentificacion(
  identificacion: string | null,
  ocultar: boolean = false
): string {
  if (!identificacion) return 'N/A';

  if (ocultar && identificacion.length > 4) {
    // Mostrar solo últimos 4 dígitos
    const ultimos4 = identificacion.slice(-4);
    const asteriscos = '*'.repeat(identificacion.length - 4);
    return `${asteriscos}${ultimos4}`;
  }

  return identificacion;
}
```

**Uso:**
```tsx
<td>
  {formatearIdentificacion(usuario.identificacion, true)}
  {/* Ejemplo: ******7890 */}
</td>
```

---

## 🔒 Consideraciones de Seguridad

### 1. Datos Sensibles
- ⚠️ El número de identificación es un **dato personal sensible**
- ✅ Considerar ocultar parte del número en listados
- ✅ Solo mostrar número completo en vistas de detalle con permisos
- ✅ No almacenar en localStorage sin encriptar

### 2. Ejemplo de Componente Seguro

```typescript
@Component({
  selector: 'app-usuario-detalle',
  template: `
    <div *ngIf="puedeVerIdentificacion()">
      <strong>Identificación:</strong>
      <span *ngIf="!mostrarCompleta">
        {{ formatearIdentificacion(usuario.identificacion, true) }}
        <button (click)="mostrarCompleta = true">
          <i class="fa fa-eye"></i> Mostrar completa
        </button>
      </span>
      <span *ngIf="mostrarCompleta">
        {{ usuario.identificacion }}
      </span>
    </div>
  `
})
export class UsuarioDetalleComponent {
  mostrarCompleta = false;
  
  puedeVerIdentificacion(): boolean {
    // Verificar permisos del usuario actual
    return this.authService.hasPermission('VER_IDENTIFICACION_COMPLETA');
  }
}
```

---

## 🧪 Testing Frontend

### 1. Test de Servicio (Jest)

```typescript
import { UsuarioService } from './usuario.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

describe('UsuarioService', () => {
  let service: UsuarioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UsuarioService]
    });
    service = TestBed.inject(UsuarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('debe crear usuario con identificación', () => {
    const mockUsuario: CrearUsuarioRequest = {
      username: 'test',
      nombreCompleto: 'Test User',
      tipoIdentificacion: TipoIdentificacion.CEDULA,
      identificacion: '1234567890'
    };

    const mockResponse = {
      message: 'Usuario creado exitosamente',
      data: { ...mockUsuario, id: 'uuid-123' }
    };

    service.crearUsuario('org-123', mockUsuario).subscribe(response => {
      expect(response.data.identificacion).toBe('1234567890');
      expect(response.data.tipoIdentificacion).toBe('CEDULA');
    });

    const req = httpMock.expectOne('/api/organizaciones/org-123/usuarios');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockUsuario);
    req.flush(mockResponse);
  });

  afterEach(() => {
    httpMock.verify();
  });
});
```

---

### 2. Test de Componente (Jest/Enzyme)

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CrearUsuarioForm from './CrearUsuarioForm';

describe('CrearUsuarioForm', () => {
  it('debe enviar identificación al crear usuario', async () => {
    const mockOnSubmit = jest.fn();
    
    render(<CrearUsuarioForm onSubmit={mockOnSubmit} />);

    // Llenar formulario
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'jperez' }
    });
    
    fireEvent.change(screen.getByLabelText('Tipo de Identificación'), {
      target: { value: 'CEDULA' }
    });
    
    fireEvent.change(screen.getByLabelText('Número de Identificación'), {
      target: { value: '1234567890' }
    });

    // Enviar formulario
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'jperez',
          tipoIdentificacion: 'CEDULA',
          identificacion: '1234567890'
        })
      );
    });
  });
});
```

---

## 📋 Checklist de Integración Frontend

### Antes de Empezar
- [ ] Leer este documento completo
- [ ] Revisar tipos TypeScript proporcionados
- [ ] Configurar variables de entorno (URL del API)
- [ ] Obtener token de acceso para pruebas

### Implementación
- [ ] Actualizar interfaces/modelos de Usuario
- [ ] Agregar enum TipoIdentificacion
- [ ] Actualizar servicio de Usuario (crear, actualizar, listar)
- [ ] Crear componente selector de tipo de identificación
- [ ] Crear input de número de identificación
- [ ] Actualizar formulario de crear usuario
- [ ] Actualizar formulario de editar usuario
- [ ] Actualizar tabla de listado de usuarios
- [ ] Actualizar vista de detalle de usuario
- [ ] Implementar validaciones frontend
- [ ] Implementar manejo de errores
- [ ] Agregar tests unitarios

### Testing
- [ ] Probar crear usuario con identificación
- [ ] Probar crear usuario sin identificación
- [ ] Probar identificación duplicada (error)
- [ ] Probar actualizar identificación
- [ ] Probar listado incluye identificaciones
- [ ] Probar visualización en detalle
- [ ] Verificar compatibilidad con usuarios existentes (sin identificación)

### Despliegue
- [ ] Validar en ambiente de desarrollo
- [ ] Validar en ambiente de QA
- [ ] Documentar cambios en changelog
- [ ] Notificar a equipo de QA
- [ ] Desplegar a producción

---

## 🆘 Soporte y Contacto

### Preguntas Frecuentes

**P: ¿Los campos son obligatorios?**  
R: No, ambos campos son opcionales. Pueden enviarse como `null` o no incluirse en el request.

**P: ¿Qué pasa si envío solo `identificacion` sin `tipoIdentificacion`?**  
R: Es válido. El backend lo acepta, pero se recomienda enviar ambos.

**P: ¿Puedo actualizar solo la identificación sin cambiar otros datos?**  
R: Sí, puedes enviar solo los campos que deseas actualizar.

**P: ¿Qué hago si un usuario intenta registrar una identificación duplicada?**  
R: El backend retornará error 400. Debes mostrar el mensaje al usuario y permitir que corrija.

**P: ¿Los usuarios existentes tienen identificación?**  
R: No necesariamente. Los usuarios creados antes de este cambio tendrán `null` en estos campos.

**P: ¿Puedo buscar usuarios por identificación?**  
R: Actualmente no hay endpoint específico de búsqueda. Se recomienda filtrar en frontend desde el listado.

---

### Contactos

| Necesidad | Contacto |
|-----------|----------|
| Dudas técnicas API | backend@guardian.com |
| Errores en backend | Crear issue en JIRA (REQ-001) |
| Validar funcionalidad | qa@guardian.com |
| Coordinación despliegue | devops@guardian.com |

### Canales
- **Slack:** #guardian-frontend
- **Slack Backend:** #guardian-backend
- **Email:** frontend@guardian.com

---

## 📚 Recursos Adicionales

### Documentación Relacionada
- [REQ-001 - Documento Técnico Backend](./REQ-001-Campo-Identificacion-Usuario.md)
- [API Specification - Usuarios](/docs/api/usuarios.md)
- [Guía de Validaciones Frontend](/docs/frontend/validaciones.md)

### Herramientas de Desarrollo
- **Postman Collection:** Importar colección actualizada con ejemplos de identificación
- **Mock API:** Disponible en `http://mock-api.guardian.local/usuarios`
- **Swagger UI:** `http://api.guardian.local/swagger-ui.html`

---

## 📅 Historial de Cambios

| Versión | Fecha | Autor | Descripción |
|---------|-------|-------|-------------|
| 1.0 | 2025-12-12 | Equipo Backend | Versión inicial para consumo de frontend |

---

**Estado:** ✅ BACKEND IMPLEMENTADO - LISTO PARA INTEGRACIÓN FRONTEND

**Última actualización:** 12 de diciembre de 2025

---

*Documento generado por el equipo de Backend para consumo del equipo Frontend*

