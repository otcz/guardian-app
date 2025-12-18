# 📋 Ejemplos de Respuestas Backend - Control de Ingreso y Salida

**Fecha:** 2025-12-17  
**Versión Backend:** 2.0 - Con validaciones automáticas  
**Estado:** ✅ DOCUMENTADO

---

## 🚨 Nuevas Validaciones Automáticas del Backend

El backend ahora **rechaza automáticamente** movimientos (ENTRADA/SALIDA) cuando:

- ❌ **Usuario inactivo** (`usuario.activo = false`)
- ❌ **Vehículo inactivo** (`vehiculo.activo = false`)  
- ❌ **Vehículo bloqueado** (`vehiculo.bloqueado = true`)

---

## 1️⃣ REGISTRAR ENTRADA

### ✅ Entrada Exitosa CON Vehículo

**Request:**
```http
POST /api/movimientos-guardia/entrada
Content-Type: application/json
Authorization: Bearer {token}

{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001",
  "vehiculoId": "770e8400-e29b-41d4-a716-446655440002",
  "observaciones": "Ingreso para reunión"
}
```

**Response:** `201 Created`
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "tipo": "ENTRADA",
  "timestampMovimiento": "2025-12-17T14:30:00.123456Z",
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombreCompleto": "Juan Pérez"
  },
  "guardia": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "nombre": "Guardia Principal"
  },
  "vehiculo": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "placa": "ABC123"
  },
  "observaciones": "Ingreso para reunión",
  "permanenciaMinutos": null
}
```

---

### ✅ Entrada Exitosa SIN Vehículo (Peatón)

**Request:**
```http
POST /api/movimientos-guardia/entrada
Content-Type: application/json

{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001",
  "vehiculoId": null,
  "observaciones": "Entrada como peatón"
}
```

**Response:** `201 Created`
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440004",
  "tipo": "ENTRADA",
  "timestampMovimiento": "2025-12-17T14:35:00.123456Z",
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombreCompleto": "Juan Pérez"
  },
  "guardia": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "nombre": "Guardia Principal"
  },
  "vehiculo": null,
  "observaciones": "Entrada como peatón",
  "permanenciaMinutos": null
}
```

---

### ❌ Error: Usuario Inactivo

**Request:**
```http
POST /api/movimientos-guardia/entrada

{
  "usuarioId": "999e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response:** `400 Bad Request`
```json
{
  "timestamp": "2025-12-17T14:40:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "No se puede registrar entrada: El usuario está inactivo",
  "path": "/api/movimientos-guardia/entrada"
}
```

---

### ❌ Error: Vehículo Inactivo

**Request:**
```http
POST /api/movimientos-guardia/entrada

{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001",
  "vehiculoId": "888e8400-e29b-41d4-a716-446655440002"
}
```

**Response:** `400 Bad Request`
```json
{
  "timestamp": "2025-12-17T14:45:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "No se puede registrar entrada: El vehículo está inactivo",
  "path": "/api/movimientos-guardia/entrada"
}
```

---

### ❌ Error: Vehículo Bloqueado (🆕 NUEVO)

**Request:**
```http
POST /api/movimientos-guardia/entrada

{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001",
  "vehiculoId": "777e8400-e29b-41d4-a716-446655440002"
}
```

**Response:** `400 Bad Request`
```json
{
  "timestamp": "2025-12-17T14:50:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "No se puede registrar entrada: El vehículo está bloqueado y no puede ingresar",
  "path": "/api/movimientos-guardia/entrada"
}
```

---

### ❌ Error: Usuario con Entrada Abierta

**Request:**
```http
POST /api/movimientos-guardia/entrada

{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response:** `400 Bad Request`
```json
{
  "timestamp": "2025-12-17T14:55:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "El usuario ya tiene una entrada registrada sin salida. Debe registrar la salida antes de permitir un nuevo ingreso.",
  "path": "/api/movimientos-guardia/entrada"
}
```

---

## 2️⃣ REGISTRAR SALIDA

### ✅ Salida CON Vehículo y Entrada Previa (Permanencia Calculada)

**Request:**
```http
POST /api/movimientos-guardia/salida
Content-Type: application/json

{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001",
  "vehiculoId": "770e8400-e29b-41d4-a716-446655440002",
  "observaciones": "Salida normal con vehículo"
}
```

**Response:** `200 OK`
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440005",
  "tipo": "SALIDA",
  "timestampMovimiento": "2025-12-17T16:45:00.123456Z",
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombreCompleto": "Juan Pérez"
  },
  "guardia": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "nombre": "Guardia Principal"
  },
  "vehiculo": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "placa": "ABC123"
  },
  "observaciones": "Salida normal con vehículo",
  "permanenciaMinutos": 135
}
```

**Nota:** La permanencia se calcula automáticamente si existe una entrada previa: `135 minutos = 2 horas 15 minutos`

---

### ✅ Salida SIN Vehículo (Peatón) CON Entrada Previa

**Request:**
```http
POST /api/movimientos-guardia/salida

{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001",
  "vehiculoId": null,
  "observaciones": "Salida como peatón"
}
```

**Response:** `200 OK`
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440006",
  "tipo": "SALIDA",
  "timestampMovimiento": "2025-12-17T16:50:00.123456Z",
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombreCompleto": "Juan Pérez"
  },
  "guardia": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "nombre": "Guardia Principal"
  },
  "vehiculo": null,
  "observaciones": "Salida como peatón",
  "permanenciaMinutos": 140
}
```

---

### ✅ Salida SIN Entrada Previa (Permanencia NULL)

**Request:**
```http
POST /api/movimientos-guardia/salida

{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001",
  "observaciones": "Salida sin entrada registrada"
}
```

**Response:** `200 OK`
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440007",
  "tipo": "SALIDA",
  "timestampMovimiento": "2025-12-17T17:00:00.123456Z",
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombreCompleto": "Juan Pérez"
  },
  "guardia": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "nombre": "Guardia Principal"
  },
  "vehiculo": null,
  "observaciones": "Salida sin entrada registrada",
  "permanenciaMinutos": null
}
```

**Nota:** `permanenciaMinutos = null` indica que no había entrada previa para calcular el tiempo.

---

### ❌ Error: Usuario Inactivo al Salir

**Request:**
```http
POST /api/movimientos-guardia/salida

{
  "usuarioId": "999e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response:** `400 Bad Request`
```json
{
  "timestamp": "2025-12-17T17:05:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "No se puede registrar salida: El usuario está inactivo",
  "path": "/api/movimientos-guardia/salida"
}
```

---

### ❌ Error: Vehículo Bloqueado al Salir (🆕 NUEVO)

**Request:**
```http
POST /api/movimientos-guardia/salida

{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001",
  "vehiculoId": "777e8400-e29b-41d4-a716-446655440002"
}
```

**Response:** `400 Bad Request`
```json
{
  "timestamp": "2025-12-17T17:10:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "No se puede registrar salida: El vehículo está bloqueado",
  "path": "/api/movimientos-guardia/salida"
}
```

---

## 3️⃣ BUSCAR VEHÍCULO POR PLACA (🆕 NUEVO ENDPOINT)

### ✅ Vehículo con Entrada Abierta (Usuario Dentro)

**Request:**
```http
GET /api/movimientos-guardia/vehiculo/placa/ABC123
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "placa": "ABC123",
  "marca": "Toyota",
  "modelo": "Corolla",
  "color": "Rojo",
  "tipo": "AUTOMOVIL",
  "activo": true,
  "bloqueado": false,
  "usuariosAsignados": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nombreCompleto": "Juan Pérez",
      "identificacion": "1234567890",
      "tipoIdentificacion": "CEDULA",
      "activo": true,
      "tieneEntradaAbierta": true
    }
  ],
  "ultimoMovimiento": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "tipo": "ENTRADA",
    "fechaMovimiento": "2025-12-17T14:30:00Z",
    "guardiaNombre": "Guardia Principal",
    "usuarioNombre": "Juan Pérez",
    "observaciones": "Ingreso para reunión",
    "permanenciaMinutos": null,
    "esEntradaAbierta": true
  }
}
```

---

### ✅ Vehículo con Última Salida (Usuario Fuera)

**Request:**
```http
GET /api/movimientos-guardia/vehiculo/placa/XYZ789
```

**Response:** `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440010",
  "placa": "XYZ789",
  "marca": "Honda",
  "modelo": "Civic",
  "color": "Azul",
  "tipo": "AUTOMOVIL",
  "activo": true,
  "bloqueado": false,
  "usuariosAsignados": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440011",
      "nombreCompleto": "María García",
      "identificacion": "0987654321",
      "tipoIdentificacion": "CEDULA",
      "activo": true,
      "tieneEntradaAbierta": false
    }
  ],
  "ultimoMovimiento": {
    "id": "990e8400-e29b-41d4-a716-446655440012",
    "tipo": "SALIDA",
    "fechaMovimiento": "2025-12-17T12:00:00Z",
    "guardiaNombre": "Guardia Principal",
    "usuarioNombre": "María García",
    "observaciones": null,
    "permanenciaMinutos": 120,
    "esEntradaAbierta": false
  }
}
```

---

### ✅ Vehículo Bloqueado

**Request:**
```http
GET /api/movimientos-guardia/vehiculo/placa/DEF456
```

**Response:** `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440020",
  "placa": "DEF456",
  "marca": "Nissan",
  "modelo": "Sentra",
  "color": "Negro",
  "tipo": "AUTOMOVIL",
  "activo": true,
  "bloqueado": true,
  "usuariosAsignados": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440021",
      "nombreCompleto": "Carlos López",
      "identificacion": "1122334455",
      "tipoIdentificacion": "CEDULA",
      "activo": true,
      "tieneEntradaAbierta": false
    }
  ],
  "ultimoMovimiento": {
    "id": "990e8400-e29b-41d4-a716-446655440022",
    "tipo": "SALIDA",
    "fechaMovimiento": "2025-12-16T18:00:00Z",
    "guardiaNombre": "Guardia Principal",
    "usuarioNombre": "Carlos López",
    "observaciones": "Vehículo bloqueado por administración",
    "permanenciaMinutos": 480,
    "esEntradaAbierta": false
  }
}
```

**Nota:** Aunque el vehículo está `bloqueado: true`, el endpoint de búsqueda sí retorna información (solo lectura).

---

### ✅ Vehículo Sin Movimientos

**Request:**
```http
GET /api/movimientos-guardia/vehiculo/placa/NEW001
```

**Response:** `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440030",
  "placa": "NEW001",
  "marca": "Mazda",
  "modelo": "3",
  "color": "Blanco",
  "tipo": "AUTOMOVIL",
  "activo": true,
  "bloqueado": false,
  "usuariosAsignados": [],
  "ultimoMovimiento": null
}
```

**Nota:** `ultimoMovimiento: null` indica que nunca ha tenido movimientos registrados.

---

### ❌ Vehículo No Encontrado

**Request:**
```http
GET /api/movimientos-guardia/vehiculo/placa/NOEXISTE
```

**Response:** `404 Not Found`
```json
{
  "timestamp": "2025-12-17T17:30:00.000+00:00",
  "status": 404,
  "error": "Not Found",
  "message": "Vehículo con placa 'NOEXISTE' no encontrado",
  "path": "/api/movimientos-guardia/vehiculo/placa/NOEXISTE"
}
```

---

## 4️⃣ ERRORES COMUNES

### ❌ Sin Autenticación (401 Unauthorized)

**Request:**
```http
GET /api/movimientos-guardia/vehiculo/placa/ABC123
```

**Response:** `401 Unauthorized`
```json
{
  "timestamp": "2025-12-17T17:35:00.000+00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Token inválido o expirado",
  "path": "/api/movimientos-guardia/vehiculo/placa/ABC123"
}
```

---

### ❌ Sin Permisos (403 Forbidden)

**Request:**
```http
POST /api/movimientos-guardia/entrada
Authorization: Bearer {token_sin_permisos}

{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response:** `403 Forbidden`
```json
{
  "timestamp": "2025-12-17T17:40:00.000+00:00",
  "status": 403,
  "error": "Forbidden",
  "message": "Acceso denegado: No tiene permisos para registrar entradas",
  "path": "/api/movimientos-guardia/entrada"
}
```

---

### ❌ Recurso No Encontrado (404)

**Request:**
```http
POST /api/movimientos-guardia/entrada

{
  "usuarioId": "000e8400-0000-0000-0000-000000000000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response:** `404 Not Found`
```json
{
  "timestamp": "2025-12-17T17:45:00.000+00:00",
  "status": 404,
  "error": "Not Found",
  "message": "Usuario con ID '000e8400-0000-0000-0000-000000000000' no encontrado",
  "path": "/api/movimientos-guardia/entrada"
}
```

---

### ❌ Validación de Campos (400)

**Request:**
```http
POST /api/movimientos-guardia/entrada

{
  "usuarioId": "not-a-valid-uuid",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response:** `400 Bad Request`
```json
{
  "timestamp": "2025-12-17T17:50:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Formato de UUID inválido para usuarioId",
  "path": "/api/movimientos-guardia/entrada"
}
```

---

## 📊 Tabla de Códigos HTTP

| Código | Significado | Cuándo Ocurre |
|--------|-------------|---------------|
| `200` | OK | Operación exitosa (consultas, salidas) |
| `201` | Created | Recurso creado exitosamente (entradas) |
| `400` | Bad Request | Validación fallida, reglas de negocio violadas |
| `401` | Unauthorized | Token ausente, inválido o expirado |
| `403` | Forbidden | Usuario autenticado pero sin permisos |
| `404` | Not Found | Recurso no existe (usuario, vehículo, guardia) |
| `500` | Internal Server Error | Error del servidor (bug backend) |

---

## 💡 Tips para Interpretar Respuestas en Frontend

### 1. Verificar el Status Code Primero
```typescript
if (response.status === 201) {
  // ✅ Entrada registrada con éxito
} else if (response.status === 400) {
  // ❌ Error de validación o regla de negocio
  // Mostrar el message al usuario
}
```

### 2. Leer el Campo `message`
El campo `message` siempre contiene una descripción legible del error:
```typescript
error: (error) => {
  const mensaje = error.error?.message || 'Error desconocido';
  this.messageService.add({
    severity: 'error',
    summary: 'Error',
    detail: mensaje
  });
}
```

### 3. Manejar Casos Específicos
```typescript
// Detectar usuario inactivo
if (error.error?.message?.includes('usuario está inactivo')) {
  // Mostrar mensaje específico
}

// Detectar vehículo bloqueado
if (error.error?.message?.includes('vehículo está bloqueado')) {
  // Mostrar alerta de vehículo bloqueado
}
```

### 4. Validar Antes de Enviar
```typescript
// Si tienes la información del vehículo:
if (vehiculo.bloqueado) {
  this.messageService.add({
    severity: 'error',
    summary: 'Vehículo Bloqueado',
    detail: 'Este vehículo está bloqueado y no puede ingresar'
  });
  return; // No enviar la petición
}
```

---

## 🔧 Código TypeScript de Ejemplo

### Registrar Entrada con Manejo Completo
```typescript
registrarEntrada(): void {
  const dto: RegistrarEntradaDTO = {
    usuarioId: this.usuario.id,
    guardiaId: this.guardiaId,
    vehiculoId: this.vehiculo?.id || null,
    observaciones: this.observaciones
  };

  this.movimientoService.registrarEntrada(dto).subscribe({
    next: (movimiento) => {
      // ✅ Entrada registrada exitosamente
      this.messageService.add({
        severity: 'success',
        summary: 'Entrada Registrada',
        detail: `Entrada registrada para ${movimiento.usuario.nombreCompleto}`,
        life: 4000
      });
      this.limpiarFormulario();
    },
    error: (error) => {
      console.error('❌ Error al registrar entrada:', error);

      // Obtener mensaje del backend
      const mensaje = error.error?.message || 'Error al registrar entrada';
      
      // Determinar severidad según el tipo de error
      let severity: 'error' | 'warn' = 'error';
      
      // Casos específicos
      if (mensaje.includes('entrada registrada sin salida')) {
        severity = 'warn';
      }

      this.messageService.add({
        severity: severity,
        summary: error.status === 400 ? 'Validación' : 'Error',
        detail: mensaje,
        life: 5000
      });
    }
  });
}
```

### Buscar Vehículo con Validación
```typescript
buscarVehiculo(placa: string): void {
  this.movimientoService.buscarVehiculoPorPlaca(placa).subscribe({
    next: (vehiculo: VehiculoCompletoDTO) => {
      this.vehiculo = vehiculo;

      // Verificar si está bloqueado
      if (vehiculo.bloqueado) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Vehículo Bloqueado',
          detail: 'Este vehículo está bloqueado y NO puede ingresar',
          life: 5000
        });
      }

      // Verificar si está inactivo
      if (!vehiculo.activo) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Vehículo Inactivo',
          detail: 'Este vehículo está inactivo en el sistema',
          life: 5000
        });
      }

      // Verificar si tiene entrada abierta
      if (vehiculo.ultimoMovimiento?.esEntradaAbierta) {
        this.messageService.add({
          severity: 'info',
          summary: 'Entrada Abierta',
          detail: `El usuario ${vehiculo.ultimoMovimiento.usuarioNombre} tiene entrada sin salida`,
          life: 5000
        });
      }
    },
    error: (error) => {
      if (error.status === 404) {
        this.messageService.add({
          severity: 'error',
          summary: 'No Encontrado',
          detail: `No existe ningún vehículo con la placa ${placa}`,
          life: 4000
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Error al buscar vehículo',
          life: 5000
        });
      }
    }
  });
}
```

---

## 📌 Resumen de Validaciones Backend

| Validación | Endpoint | Status | Mensaje |
|------------|----------|--------|---------|
| Usuario inactivo | Entrada/Salida | 400 | "El usuario está inactivo" |
| Vehículo inactivo | Entrada/Salida | 400 | "El vehículo está inactivo" |
| Vehículo bloqueado | Entrada/Salida | 400 | "El vehículo está bloqueado" |
| Entrada abierta | Entrada | 400 | "Ya tiene una entrada sin salida" |
| Sin entrada previa | Salida | 200 | `permanenciaMinutos: null` |

---

## ✅ Conclusión

Con estos ejemplos, el frontend puede:

1. **Manejar correctamente** todas las respuestas del backend
2. **Mostrar mensajes claros** al usuario según el caso
3. **Validar proactivamente** antes de enviar peticiones
4. **Interpretar estados** del vehículo y usuario
5. **Proporcionar feedback visual** apropiado

**Todos los ejemplos son casos reales** basados en la implementación actual del backend v2.0.

---

**Documento creado:** 2025-12-17  
**Autor:** Sistema Guardian  
**Estado:** ✅ COMPLETO Y LISTO PARA USO

