# 🛡️ API COMPLETA - MÓDULO DE GUARDIA

**Fecha:** 2025-12-13  
**Versión:** 0.0.1-SNAPSHOT  
**Destinatario:** Equipo Frontend  
**Objetivo:** Verificación completa de integración del módulo de guardia

---

## 📋 ÍNDICE

1. [Gestión de Guardias](#1-gestión-de-guardias)
2. [Gestión de Usuarios de Guardia](#2-gestión-de-usuarios-de-guardia)
3. [Movimientos de Guardia](#3-movimientos-de-guardia)
4. [Validaciones y Consultas](#4-validaciones-y-consultas)
5. [Modelos de Datos](#5-modelos-de-datos)
6. [Códigos de Error](#6-códigos-de-error)

---

## 1. GESTIÓN DE GUARDIAS

### 1.1 Crear Guardia

**Endpoint:** `POST /api/guardias`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** `SUPERADMIN`, `ORGADMIN`, `GESTOR_GUARDIAS`

#### Request Body:
```json
{
  "codigo": "GDPUENTE",
  "nombre": "GUARDIA PUENTE PRINCIPAL",
  "descripcion": "Guardia del puente de acceso principal",
  "seccionId": "846c2f7c-1017-4ff2-b600-0e608fa64042",
  "usuarioGestorId": "2d4a5b6c-7e8f-9012-3456-789abcdef012",
  "activa": true
}
```

#### Validaciones:
- ✅ `codigo`: OBLIGATORIO, único en la organización, 3-20 caracteres
- ✅ `nombre`: OBLIGATORIO, 3-100 caracteres
- ✅ `descripcion`: OPCIONAL, máx 500 caracteres
- ✅ `seccionId`: OBLIGATORIO, UUID válido de sección existente
- ✅ `usuarioGestorId`: OPCIONAL, UUID de usuario con rol GESTOR_GUARDIAS
- ✅ `activa`: OPCIONAL, default `true`

#### Response 201 (Created):
```json
{
  "id": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "codigo": "GDPUENTE",
  "nombre": "GUARDIA PUENTE PRINCIPAL",
  "descripcion": "Guardia del puente de acceso principal",
  "seccionId": "846c2f7c-1017-4ff2-b600-0e608fa64042",
  "seccionNombre": "SECTOR NORTE",
  "organizacionId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  "organizacionNombre": "ORGANIZACIÓN DEMO",
  "usuarioGestorId": "2d4a5b6c-7e8f-9012-3456-789abcdef012",
  "usuarioGestorNombre": "OSCAR TOMAS",
  "usuarioGestorUsername": "otcz",
  "activa": true,
  "cantidadUsuariosAsignados": 0
}
```

#### Errores Posibles:
```json
// 400 - Código duplicado
{
  "error": "BAD_REQUEST",
  "message": "Ya existe una guardia con el código 'GDPUENTE'"
}

// 404 - Sección no existe
{
  "error": "NOT_FOUND",
  "message": "Sección no encontrada con id: 846c2f7c-1017-4ff2-b600-0e608fa64042"
}

// 403 - Usuario no es gestor
{
  "error": "FORBIDDEN",
  "message": "El usuario especificado no tiene rol GESTOR_GUARDIAS"
}
```

---

### 1.2 Listar Guardias por Organización

**Endpoint:** `GET /api/guardias?organizacionId={uuid}`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** Todos los autenticados

#### Parámetros Query:
- `organizacionId` (UUID, OBLIGATORIO): ID de la organización

#### Request Example:
```
GET /api/guardias?organizacionId=1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200:
```json
[
  {
    "id": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
    "codigo": "GDPUENTE",
    "nombre": "GUARDIA PUENTE PRINCIPAL",
    "descripcion": "Guardia del puente de acceso principal",
    "seccionId": "846c2f7c-1017-4ff2-b600-0e608fa64042",
    "seccionNombre": "SECTOR NORTE",
    "organizacionId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "organizacionNombre": "ORGANIZACIÓN DEMO",
    "usuarioGestorId": "2d4a5b6c-7e8f-9012-3456-789abcdef012",
    "usuarioGestorNombre": "OSCAR TOMAS",
    "usuarioGestorUsername": "otcz",
    "activa": true,
    "cantidadUsuariosAsignados": 3
  },
  {
    "id": "4a9e0f2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
    "codigo": "GDPARQUEO",
    "nombre": "GUARDIA PARQUEO",
    "descripcion": null,
    "seccionId": "846c2f7c-1017-4ff2-b600-0e608fa64042",
    "seccionNombre": "SECTOR NORTE",
    "organizacionId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "organizacionNombre": "ORGANIZACIÓN DEMO",
    "usuarioGestorId": null,
    "usuarioGestorNombre": null,
    "usuarioGestorUsername": null,
    "activa": false,
    "cantidadUsuariosAsignados": 1
  }
]
```

---

### 1.3 Listar Guardias por Sección

**Endpoint:** `GET /api/guardias/seccion/{seccionId}`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** Todos los autenticados

#### Parámetros Path:
- `seccionId` (UUID, OBLIGATORIO): ID de la sección

#### Request Example:
```
GET /api/guardias/seccion/846c2f7c-1017-4ff2-b600-0e608fa64042
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200:
```json
[
  {
    "id": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
    "codigo": "GDPUENTE",
    "nombre": "GUARDIA PUENTE PRINCIPAL",
    "descripcion": "Guardia del puente de acceso principal",
    "seccionId": "846c2f7c-1017-4ff2-b600-0e608fa64042",
    "seccionNombre": "SECTOR NORTE",
    "organizacionId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "organizacionNombre": "ORGANIZACIÓN DEMO",
    "usuarioGestorId": "2d4a5b6c-7e8f-9012-3456-789abcdef012",
    "usuarioGestorNombre": "OSCAR TOMAS",
    "usuarioGestorUsername": "otcz",
    "activa": true,
    "cantidadUsuariosAsignados": 3
  }
]
```

---

### 1.4 Listar Guardias Activas por Sección

**Endpoint:** `GET /api/guardias/seccion/{seccionId}/activas`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** Todos los autenticados

#### Parámetros Path:
- `seccionId` (UUID, OBLIGATORIO): ID de la sección

#### Request Example:
```
GET /api/guardias/seccion/846c2f7c-1017-4ff2-b600-0e608fa64042/activas
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200:
```json
[
  {
    "id": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
    "codigo": "GDPUENTE",
    "nombre": "GUARDIA PUENTE PRINCIPAL",
    "descripcion": "Guardia del puente de acceso principal",
    "seccionId": "846c2f7c-1017-4ff2-b600-0e608fa64042",
    "seccionNombre": "SECTOR NORTE",
    "organizacionId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "organizacionNombre": "ORGANIZACIÓN DEMO",
    "usuarioGestorId": "2d4a5b6c-7e8f-9012-3456-789abcdef012",
    "usuarioGestorNombre": "OSCAR TOMAS",
    "usuarioGestorUsername": "otcz",
    "activa": true,
    "cantidadUsuariosAsignados": 3
  }
]
```

**Nota:** Solo devuelve guardias con `activa = true`

---

### 1.5 Obtener Guardia por ID

**Endpoint:** `GET /api/guardias/{guardiaId}`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** Todos los autenticados

#### Parámetros Path:
- `guardiaId` (UUID, OBLIGATORIO): ID de la guardia

#### Request Example:
```
GET /api/guardias/3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200:
```json
{
  "id": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "codigo": "GDPUENTE",
  "nombre": "GUARDIA PUENTE PRINCIPAL",
  "descripcion": "Guardia del puente de acceso principal",
  "seccionId": "846c2f7c-1017-4ff2-b600-0e608fa64042",
  "seccionNombre": "SECTOR NORTE",
  "organizacionId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  "organizacionNombre": "ORGANIZACIÓN DEMO",
  "usuarioGestorId": "2d4a5b6c-7e8f-9012-3456-789abcdef012",
  "usuarioGestorNombre": "OSCAR TOMAS",
  "usuarioGestorUsername": "otcz",
  "activa": true,
  "cantidadUsuariosAsignados": 3
}
```

#### Error 404:
```json
{
  "error": "NOT_FOUND",
  "message": "Guardia no encontrada con id: 3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a"
}
```

---

### 1.6 Actualizar Guardia

**Endpoint:** `PATCH /api/guardias/{guardiaId}`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** `SUPERADMIN`, `ORGADMIN`, `GESTOR_GUARDIAS`

#### Parámetros Path:
- `guardiaId` (UUID, OBLIGATORIO): ID de la guardia

#### Request Body:
```json
{
  "nombre": "GUARDIA PUENTE PRINCIPAL ACTUALIZADA",
  "descripcion": "Nueva descripción actualizada",
  "usuarioGestorId": "9f8e7d6c-5b4a-3210-9876-543210fedcba",
  "activa": false
}
```

**Nota:** Todos los campos son opcionales. Solo se actualizan los campos enviados.

#### Response 200:
```json
{
  "id": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "codigo": "GDPUENTE",
  "nombre": "GUARDIA PUENTE PRINCIPAL ACTUALIZADA",
  "descripcion": "Nueva descripción actualizada",
  "seccionId": "846c2f7c-1017-4ff2-b600-0e608fa64042",
  "seccionNombre": "SECTOR NORTE",
  "organizacionId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  "organizacionNombre": "ORGANIZACIÓN DEMO",
  "usuarioGestorId": "9f8e7d6c-5b4a-3210-9876-543210fedcba",
  "usuarioGestorNombre": "JUAN PEREZ",
  "usuarioGestorUsername": "jperez",
  "activa": false,
  "cantidadUsuariosAsignados": 3
}
```

---

### 1.7 Eliminar Guardia

**Endpoint:** `DELETE /api/guardias/{guardiaId}`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** `SUPERADMIN`, `ORGADMIN`

#### Parámetros Path:
- `guardiaId` (UUID, OBLIGATORIO): ID de la guardia

#### Request Example:
```
DELETE /api/guardias/3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 204 (No Content):
```
(Sin contenido)
```

#### Validaciones:
- ✅ No se puede eliminar si tiene movimientos registrados
- ✅ Elimina automáticamente las asignaciones de usuarios (tabla `guardia_usuario`)

#### Error 400:
```json
{
  "error": "BAD_REQUEST",
  "message": "No se puede eliminar la guardia porque tiene 5 movimientos registrados"
}
```

---

### 1.8 Búsqueda de Guardias

**Endpoint:** `GET /api/guardias/buscar`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** Todos los autenticados

#### Parámetros Query (todos opcionales):
- `organizacionId` (UUID): Filtrar por organización
- `seccionId` (UUID): Filtrar por sección
- `codigo` (String): Búsqueda parcial en código
- `nombre` (String): Búsqueda parcial en nombre
- `activa` (Boolean): Filtrar por estado (true/false)

#### Request Example:
```
GET /api/guardias/buscar?organizacionId=1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d&nombre=PUENTE&activa=true
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200:
```json
[
  {
    "id": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
    "codigo": "GDPUENTE",
    "nombre": "GUARDIA PUENTE PRINCIPAL",
    "descripcion": "Guardia del puente de acceso principal",
    "seccionId": "846c2f7c-1017-4ff2-b600-0e608fa64042",
    "seccionNombre": "SECTOR NORTE",
    "organizacionId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "organizacionNombre": "ORGANIZACIÓN DEMO",
    "usuarioGestorId": "2d4a5b6c-7e8f-9012-3456-789abcdef012",
    "usuarioGestorNombre": "OSCAR TOMAS",
    "usuarioGestorUsername": "otcz",
    "activa": true,
    "cantidadUsuariosAsignados": 3
  }
]
```

---

## 2. GESTIÓN DE USUARIOS DE GUARDIA

### 2.1 Asignar Usuario a Guardia

**Endpoint:** `POST /api/guardias/{guardiaId}/usuarios/{usuarioId}`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** `SUPERADMIN`, `ORGADMIN`, `GESTOR_GUARDIAS`

#### Parámetros Path:
- `guardiaId` (UUID, OBLIGATORIO): ID de la guardia
- `usuarioId` (UUID, OBLIGATORIO): ID del usuario

#### Request Example:
```
POST /api/guardias/3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a/usuarios/5c6d7e8f-9012-3456-789a-bcdef0123456
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200:
```json
{
  "id": "7a8b9c0d-1e2f-3a4b-5c6d-7e8f90123456",
  "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
  "usuarioNombre": "MARIA GOMEZ",
  "usuarioUsername": "mgomez",
  "asignada": true,
  "fechaAsignacion": "2025-12-13T10:30:00"
}
```

#### Validaciones:
- ✅ Usuario debe pertenecer a la misma organización
- ✅ Usuario debe tener rol `GUARDIA`
- ✅ No puede estar ya asignado a la misma guardia

#### Error 400:
```json
{
  "error": "BAD_REQUEST",
  "message": "El usuario ya está asignado a esta guardia"
}
```

---

### 2.2 Listar Usuarios de una Guardia

**Endpoint:** `GET /api/guardias/{guardiaId}/usuarios`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** Todos los autenticados

#### Parámetros Path:
- `guardiaId` (UUID, OBLIGATORIO): ID de la guardia

#### Parámetros Query (opcionales):
- `asignada` (Boolean): Filtrar por estado de asignación

#### Request Example:
```
GET /api/guardias/3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a/usuarios?asignada=true
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200:
```json
[
  {
    "id": "7a8b9c0d-1e2f-3a4b-5c6d-7e8f90123456",
    "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
    "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
    "usuarioNombre": "MARIA GOMEZ",
    "usuarioUsername": "mgomez",
    "asignada": true,
    "fechaAsignacion": "2025-12-13T10:30:00"
  },
  {
    "id": "8b9c0d1e-2f3a-4b5c-6d7e-8f9012345678",
    "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
    "usuarioId": "6d7e8f90-1234-5678-9abc-def012345678",
    "usuarioNombre": "PEDRO LOPEZ",
    "usuarioUsername": "plopez",
    "asignada": true,
    "fechaAsignacion": "2025-12-13T11:00:00"
  }
]
```

---

### 2.3 Remover Usuario de Guardia

**Endpoint:** `DELETE /api/guardias/{guardiaId}/usuarios/{usuarioId}`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** `SUPERADMIN`, `ORGADMIN`, `GESTOR_GUARDIAS`

#### Parámetros Path:
- `guardiaId` (UUID, OBLIGATORIO): ID de la guardia
- `usuarioId` (UUID, OBLIGATORIO): ID del usuario

#### Request Example:
```
DELETE /api/guardias/3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a/usuarios/5c6d7e8f-9012-3456-789a-bcdef0123456
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 204 (No Content):
```
(Sin contenido)
```

**Nota:** Marca `asignada = false` en lugar de eliminar el registro (soft delete)

---

## 3. MOVIMIENTOS DE GUARDIA

### 3.1 Registrar Entrada a Guardia

**Endpoint:** `POST /api/movimientos-guardia/entrada`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** `GUARDIA`, `GESTOR_GUARDIAS`

#### Request Body:
```json
{
  "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
  "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "observaciones": "Inicio de turno nocturno"
}
```

#### Validaciones:
- ✅ `usuarioId`: OBLIGATORIO, UUID válido
- ✅ `guardiaId`: OBLIGATORIO, UUID válido
- ✅ `observaciones`: OPCIONAL, máx 500 caracteres
- ✅ Usuario debe estar asignado a la guardia
- ✅ No puede tener una entrada sin salida previa

#### Response 201 (Created):
```json
{
  "id": "9c0d1e2f-3a4b-5c6d-7e8f-901234567890",
  "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
  "usuarioNombre": "MARIA GOMEZ",
  "usuarioUsername": "mgomez",
  "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "guardiaCodigo": "GDPUENTE",
  "guardiaNombre": "GUARDIA PUENTE PRINCIPAL",
  "tipoMovimiento": "ENTRADA",
  "fechaHora": "2025-12-13T18:00:00",
  "observaciones": "Inicio de turno nocturno"
}
```

#### Error 400:
```json
{
  "error": "BAD_REQUEST",
  "message": "El usuario ya tiene una entrada sin salida en esta guardia"
}
```

---

### 3.2 Registrar Salida de Guardia

**Endpoint:** `POST /api/movimientos-guardia/salida`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** `GUARDIA`, `GESTOR_GUARDIAS`

#### Request Body:
```json
{
  "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
  "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "observaciones": "Fin de turno - Sin novedades"
}
```

#### Validaciones:
- ✅ Debe existir una entrada previa sin salida
- ✅ Usuario debe estar asignado a la guardia

#### Response 201 (Created):
```json
{
  "id": "0d1e2f3a-4b5c-6d7e-8f90-123456789abc",
  "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
  "usuarioNombre": "MARIA GOMEZ",
  "usuarioUsername": "mgomez",
  "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "guardiaCodigo": "GDPUENTE",
  "guardiaNombre": "GUARDIA PUENTE PRINCIPAL",
  "tipoMovimiento": "SALIDA",
  "fechaHora": "2025-12-14T06:00:00",
  "observaciones": "Fin de turno - Sin novedades"
}
```

#### Error 400:
```json
{
  "error": "BAD_REQUEST",
  "message": "No existe una entrada previa sin salida para este usuario en esta guardia"
}
```

---

### 3.3 Listar Movimientos de una Guardia

**Endpoint:** `GET /api/movimientos-guardia/guardia/{guardiaId}`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** Todos los autenticados

#### Parámetros Path:
- `guardiaId` (UUID, OBLIGATORIO): ID de la guardia

#### Parámetros Query (opcionales):
- `fechaInicio` (DateTime ISO): Fecha/hora inicial del rango
- `fechaFin` (DateTime ISO): Fecha/hora final del rango
- `tipoMovimiento` (ENTRADA/SALIDA): Filtrar por tipo

#### Request Example:
```
GET /api/movimientos-guardia/guardia/3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a?fechaInicio=2025-12-13T00:00:00&fechaFin=2025-12-13T23:59:59
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200:
```json
[
  {
    "id": "9c0d1e2f-3a4b-5c6d-7e8f-901234567890",
    "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
    "usuarioNombre": "MARIA GOMEZ",
    "usuarioUsername": "mgomez",
    "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
    "guardiaCodigo": "GDPUENTE",
    "guardiaNombre": "GUARDIA PUENTE PRINCIPAL",
    "tipoMovimiento": "ENTRADA",
    "fechaHora": "2025-12-13T18:00:00",
    "observaciones": "Inicio de turno nocturno"
  },
  {
    "id": "0d1e2f3a-4b5c-6d7e-8f90-123456789abc",
    "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
    "usuarioNombre": "MARIA GOMEZ",
    "usuarioUsername": "mgomez",
    "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
    "guardiaCodigo": "GDPUENTE",
    "guardiaNombre": "GUARDIA PUENTE PRINCIPAL",
    "tipoMovimiento": "SALIDA",
    "fechaHora": "2025-12-14T06:00:00",
    "observaciones": "Fin de turno - Sin novedades"
  }
]
```

---

### 3.4 Listar Movimientos de un Usuario

**Endpoint:** `GET /api/movimientos-guardia/usuario/{usuarioId}`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** Todos los autenticados

#### Parámetros Path:
- `usuarioId` (UUID, OBLIGATORIO): ID del usuario

#### Parámetros Query (opcionales):
- `fechaInicio` (DateTime ISO): Fecha/hora inicial del rango
- `fechaFin` (DateTime ISO): Fecha/hora final del rango

#### Request Example:
```
GET /api/movimientos-guardia/usuario/5c6d7e8f-9012-3456-789a-bcdef0123456?fechaInicio=2025-12-01T00:00:00&fechaFin=2025-12-13T23:59:59
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200:
```json
[
  {
    "id": "9c0d1e2f-3a4b-5c6d-7e8f-901234567890",
    "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
    "usuarioNombre": "MARIA GOMEZ",
    "usuarioUsername": "mgomez",
    "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
    "guardiaCodigo": "GDPUENTE",
    "guardiaNombre": "GUARDIA PUENTE PRINCIPAL",
    "tipoMovimiento": "ENTRADA",
    "fechaHora": "2025-12-13T18:00:00",
    "observaciones": "Inicio de turno nocturno"
  }
]
```

---

### 3.5 Obtener Estado Actual de Usuario en Guardia

**Endpoint:** `GET /api/movimientos-guardia/estado-actual`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** Todos los autenticados

#### Parámetros Query:
- `usuarioId` (UUID, OBLIGATORIO): ID del usuario
- `guardiaId` (UUID, OBLIGATORIO): ID de la guardia

#### Request Example:
```
GET /api/movimientos-guardia/estado-actual?usuarioId=5c6d7e8f-9012-3456-789a-bcdef0123456&guardiaId=3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200 (Usuario EN guardia):
```json
{
  "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
  "usuarioNombre": "MARIA GOMEZ",
  "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "guardiaNombre": "GUARDIA PUENTE PRINCIPAL",
  "enGuardia": true,
  "ultimaEntrada": "2025-12-13T18:00:00",
  "tiempoEnGuardia": "12:30:00"
}
```

#### Response 200 (Usuario FUERA de guardia):
```json
{
  "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
  "usuarioNombre": "MARIA GOMEZ",
  "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "guardiaNombre": "GUARDIA PUENTE PRINCIPAL",
  "enGuardia": false,
  "ultimaSalida": "2025-12-14T06:00:00"
}
```

---

## 4. VALIDACIONES Y CONSULTAS

### 4.1 Validar Usuario para Movimiento

**Endpoint:** `GET /api/movimientos-guardia/validar-usuario/{usuarioIdOIdentificacion}`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** Todos los autenticados

#### Parámetros Path:
- `usuarioIdOIdentificacion` (String, OBLIGATORIO): UUID del usuario O número de identificación

**⚠️ IMPORTANTE:** Este endpoint acepta AMBOS formatos:
- UUID: `5c6d7e8f-9012-3456-789a-bcdef0123456`
- Identificación: `1073995282`

#### Request Example 1 (UUID):
```
GET /api/movimientos-guardia/validar-usuario/5c6d7e8f-9012-3456-789a-bcdef0123456
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Request Example 2 (Identificación):
```
GET /api/movimientos-guardia/validar-usuario/1073995282
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200:
```json
{
  "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
  "username": "mgomez",
  "nombreCompleto": "MARIA GOMEZ",
  "identificacion": "1073995282",
  "tipoIdentificacion": "CEDULA",
  "email": "maria.gomez@example.com",
  "activo": true,
  "tieneRolGuardia": true,
  "guardiasAsignadas": [
    {
      "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
      "guardiaCodigo": "GDPUENTE",
      "guardiaNombre": "GUARDIA PUENTE PRINCIPAL",
      "asignada": true
    }
  ]
}
```

#### Error 404:
```json
{
  "error": "NOT_FOUND",
  "message": "Usuario no encontrado con identificación: 1073995282"
}
```

---

### 4.2 Validar Usuario por Identificación

**Endpoint:** `GET /api/organizaciones/{orgId}/usuarios/validar-identificacion`  
**Autenticación:** Bearer Token (JWT)  
**Roles Permitidos:** Todos los autenticados

#### Parámetros Path:
- `orgId` (UUID, OBLIGATORIO): ID de la organización

#### Parámetros Query:
- `identificacion` (String, OBLIGATORIO): Número de identificación

#### Request Example:
```
GET /api/organizaciones/1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d/usuarios/validar-identificacion?identificacion=1073995282
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200:
```json
{
  "id": "5c6d7e8f-9012-3456-789a-bcdef0123456",
  "username": "mgomez",
  "nombreCompleto": "MARIA GOMEZ",
  "identificacion": "1073995282",
  "tipoIdentificacion": "CEDULA",
  "email": "maria.gomez@example.com",
  "activo": true
}
```

#### Error 404:
```json
{
  "error": "NOT_FOUND",
  "message": "Usuario no encontrado con identificación: 1073995282"
}
```

---

## 5. MODELOS DE DATOS

### 5.1 Guardia
```typescript
interface Guardia {
  id: string;                          // UUID
  codigo: string;                      // Código único (3-20 chars)
  nombre: string;                      // Nombre (3-100 chars)
  descripcion?: string;                // Opcional, máx 500 chars
  seccionId: string;                   // UUID de sección
  seccionNombre: string;               // Nombre de la sección
  organizacionId: string;              // UUID de organización
  organizacionNombre: string;          // Nombre de la organización
  usuarioGestorId?: string;            // UUID del gestor (opcional)
  usuarioGestorNombre?: string;        // Nombre del gestor
  usuarioGestorUsername?: string;      // Username del gestor
  activa: boolean;                     // Estado de la guardia
  cantidadUsuariosAsignados: number;   // Contador
}
```

### 5.2 GuardiaUsuario
```typescript
interface GuardiaUsuario {
  id: string;                          // UUID
  guardiaId: string;                   // UUID de guardia
  usuarioId: string;                   // UUID de usuario
  usuarioNombre: string;               // Nombre del usuario
  usuarioUsername: string;             // Username
  asignada: boolean;                   // Estado de asignación
  fechaAsignacion: string;             // ISO DateTime
}
```

### 5.3 MovimientoGuardia
```typescript
interface MovimientoGuardia {
  id: string;                          // UUID
  usuarioId: string;                   // UUID de usuario
  usuarioNombre: string;               // Nombre del usuario
  usuarioUsername: string;             // Username
  guardiaId: string;                   // UUID de guardia
  guardiaCodigo: string;               // Código de guardia
  guardiaNombre: string;               // Nombre de guardia
  tipoMovimiento: 'ENTRADA' | 'SALIDA';
  fechaHora: string;                   // ISO DateTime
  observaciones?: string;              // Opcional
}
```

### 5.4 EstadoActualGuardia
```typescript
interface EstadoActualGuardia {
  usuarioId: string;
  usuarioNombre: string;
  guardiaId: string;
  guardiaNombre: string;
  enGuardia: boolean;
  ultimaEntrada?: string;              // ISO DateTime
  ultimaSalida?: string;               // ISO DateTime
  tiempoEnGuardia?: string;            // HH:mm:ss
}
```

### 5.5 ValidacionUsuario
```typescript
interface ValidacionUsuario {
  usuarioId: string;
  username: string;
  nombreCompleto: string;
  identificacion: string;
  tipoIdentificacion: 'CEDULA' | 'PASAPORTE' | 'DNI' | 'OTRO';
  email: string;
  activo: boolean;
  tieneRolGuardia: boolean;
  guardiasAsignadas: Array<{
    guardiaId: string;
    guardiaCodigo: string;
    guardiaNombre: string;
    asignada: boolean;
  }>;
}
```

### 5.6 Usuario (Actualizado)
```typescript
interface Usuario {
  id: string;
  username: string;
  nombreCompleto: string;
  email: string;
  telefono?: string;
  tipoIdentificacion?: 'CEDULA' | 'PASAPORTE' | 'DNI' | 'OTRO';  // NUEVO ✅
  identificacion?: string;                                         // NUEVO ✅
  activo: boolean;
  organizacionId: string;
  roles: string[];
}
```

---

## 6. CÓDIGOS DE ERROR

### 6.1 Errores HTTP

| Código | Significado | Cuándo Ocurre |
|--------|-------------|---------------|
| 200 | OK | Operación exitosa (GET, PATCH) |
| 201 | Created | Recurso creado (POST) |
| 204 | No Content | Eliminación exitosa (DELETE) |
| 400 | Bad Request | Validación fallida, datos inválidos |
| 401 | Unauthorized | Token JWT inválido o expirado |
| 403 | Forbidden | Sin permisos para la operación |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Conflicto de datos (ej: código duplicado) |
| 500 | Internal Server Error | Error del servidor |

### 6.2 Mensajes de Error Comunes

```typescript
// Guardia no encontrada
{
  "error": "NOT_FOUND",
  "message": "Guardia no encontrada con id: {uuid}"
}

// Usuario ya asignado
{
  "error": "BAD_REQUEST",
  "message": "El usuario ya está asignado a esta guardia"
}

// Código duplicado
{
  "error": "CONFLICT",
  "message": "Ya existe una guardia con el código '{codigo}'"
}

// Sin entrada previa
{
  "error": "BAD_REQUEST",
  "message": "No existe una entrada previa sin salida para este usuario en esta guardia"
}

// Entrada sin salida
{
  "error": "BAD_REQUEST",
  "message": "El usuario ya tiene una entrada sin salida en esta guardia"
}

// No se puede eliminar
{
  "error": "BAD_REQUEST",
  "message": "No se puede eliminar la guardia porque tiene {n} movimientos registrados"
}

// Token inválido
{
  "error": "UNAUTHORIZED",
  "message": "Token JWT inválido o expirado"
}

// Sin permisos
{
  "error": "FORBIDDEN",
  "message": "No tiene permisos para realizar esta operación"
}
```

---

## 7. AUTENTICACIÓN Y SEGURIDAD

### 7.1 Headers Requeridos

Todas las peticiones deben incluir:

```http
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### 7.2 Obtener Token JWT

**Endpoint:** `POST /api/auth/login`

```json
// Request
{
  "username": "mgomez",
  "password": "password123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tipo": "Bearer",
  "expiracion": "2025-12-14T18:00:00"
}
```

### 7.3 Roles y Permisos

| Rol | Crear Guardia | Editar Guardia | Eliminar Guardia | Asignar Usuarios | Registrar Movimientos |
|-----|---------------|----------------|------------------|------------------|-----------------------|
| SUPERADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| ORGADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| GESTOR_GUARDIAS | ✅ | ✅ | ❌ | ✅ | ✅ |
| GUARDIA | ❌ | ❌ | ❌ | ❌ | ✅ (solo propio) |

---

## 8. FLUJOS DE TRABAJO COMPLETOS

### 8.1 Flujo: Crear y Configurar Guardia

```typescript
// 1. Crear guardia
POST /api/guardias
{
  "codigo": "GDPUENTE",
  "nombre": "GUARDIA PUENTE PRINCIPAL",
  "seccionId": "846c2f7c-1017-4ff2-b600-0e608fa64042",
  "usuarioGestorId": "2d4a5b6c-7e8f-9012-3456-789abcdef012"
}
// → guardiaId: "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a"

// 2. Asignar usuario 1
POST /api/guardias/3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a/usuarios/5c6d7e8f-9012-3456-789a-bcdef0123456

// 3. Asignar usuario 2
POST /api/guardias/3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a/usuarios/6d7e8f90-1234-5678-9abc-def012345678

// 4. Verificar asignaciones
GET /api/guardias/3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a/usuarios
```

### 8.2 Flujo: Registro de Turno

```typescript
// 1. Validar usuario (por identificación)
GET /api/movimientos-guardia/validar-usuario/1073995282
// → Verificar tieneRolGuardia: true

// 2. Registrar entrada
POST /api/movimientos-guardia/entrada
{
  "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
  "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "observaciones": "Turno nocturno"
}

// 3. Verificar estado
GET /api/movimientos-guardia/estado-actual?usuarioId=5c6d7e8f-9012-3456-789a-bcdef0123456&guardiaId=3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a
// → enGuardia: true

// ... después de 8 horas ...

// 4. Registrar salida
POST /api/movimientos-guardia/salida
{
  "usuarioId": "5c6d7e8f-9012-3456-789a-bcdef0123456",
  "guardiaId": "3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "observaciones": "Fin de turno"
}
```

### 8.3 Flujo: Consulta de Reportes

```typescript
// 1. Ver todas las guardias activas
GET /api/guardias/seccion/846c2f7c-1017-4ff2-b600-0e608fa64042/activas

// 2. Ver movimientos del día
GET /api/movimientos-guardia/guardia/3f8d9e1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a?fechaInicio=2025-12-13T00:00:00&fechaFin=2025-12-13T23:59:59

// 3. Ver historial de un usuario
GET /api/movimientos-guardia/usuario/5c6d7e8f-9012-3456-789a-bcdef0123456?fechaInicio=2025-12-01T00:00:00&fechaFin=2025-12-13T23:59:59
```

---

## 9. CASOS DE PRUEBA RECOMENDADOS

### 9.1 Happy Path
- ✅ Crear guardia con todos los campos
- ✅ Asignar 3 usuarios a una guardia
- ✅ Registrar entrada y salida completa
- ✅ Consultar estado actual
- ✅ Buscar usuario por identificación

### 9.2 Validaciones
- ✅ Crear guardia con código duplicado (debe fallar)
- ✅ Asignar usuario sin rol GUARDIA (debe fallar)
- ✅ Registrar entrada doble sin salida (debe fallar)
- ✅ Registrar salida sin entrada previa (debe fallar)
- ✅ Eliminar guardia con movimientos (debe fallar)

### 9.3 Edge Cases
- ✅ Buscar usuario por UUID
- ✅ Buscar usuario por identificación
- ✅ Actualizar guardia con campos parciales
- ✅ Listar guardias sin filtros
- ✅ Remover usuario de guardia (soft delete)

---

## 10. NOTAS IMPORTANTES

### ✅ Cambios Recientes (2025-12-13)
1. **Campo `usuarioGestorId` en todas las respuestas de guardias**
   - Incluye: `usuarioGestorId`, `usuarioGestorNombre`, `usuarioGestorUsername`
   - Afecta a TODOS los endpoints de listado de guardias

2. **Validación de usuario acepta UUID O identificación**
   - Endpoint: `/api/movimientos-guardia/validar-usuario/{id}`
   - Detección automática del formato

3. **Nuevo endpoint de validación por identificación**
   - Endpoint: `/api/organizaciones/{orgId}/usuarios/validar-identificacion`
   - Query param: `identificacion`

4. **Eliminación de guardia mejorada**
   - Elimina automáticamente asignaciones de usuarios
   - Valida que no tenga movimientos

### ⚠️ Consideraciones de Seguridad
- Todos los endpoints requieren autenticación JWT
- Los tokens expiran después de N horas (configurado en el servidor)
- Validar permisos según rol antes de habilitar opciones en el UI

### 🔄 Retrocompatibilidad
- Todos los cambios son retrocompatibles
- Los nuevos campos son opcionales
- Los endpoints anteriores siguen funcionando

---

## 11. CHECKLIST DE VERIFICACIÓN

### Frontend debe verificar:
- [ ] Todos los modelos TypeScript actualizados
- [ ] Campo `usuarioGestorId` visible en listados
- [ ] Búsqueda por identificación funciona
- [ ] Formulario de guardia incluye selector de gestor
- [ ] Validación de usuario acepta ambos formatos
- [ ] Manejo de errores 400, 403, 404
- [ ] Tokens JWT se renuevan antes de expirar
- [ ] Permisos por rol implementados en UI

### Tests a realizar:
- [ ] Crear guardia completa
- [ ] Asignar y remover usuarios
- [ ] Ciclo completo entrada-salida
- [ ] Búsqueda por filtros
- [ ] Validación por UUID
- [ ] Validación por identificación
- [ ] Manejo de errores

---

## 📞 CONTACTO Y SOPORTE

**Desarrollador Backend:** Oscar Tomas  
**Fecha de Documento:** 2025-12-13  
**Versión API:** 0.0.1-SNAPSHOT  
**Estado:** ✅ Producción Ready

Para preguntas o problemas de integración, contactar al equipo backend.

---

**FIN DEL DOCUMENTO**

