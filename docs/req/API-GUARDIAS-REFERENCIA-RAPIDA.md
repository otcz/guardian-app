# 📋 API Guardian - Referencia Rápida de Endpoints

**Última actualización:** 2025-12-23

---

## 🔐 GuardiaController - Gestión de Guardias

| # | Método | Endpoint | Permiso | Parámetros | Body | Respuesta |
|---|--------|----------|---------|------------|------|-----------|
| 1 | GET | `/api/guardias` | ITEM_LISTAR_GUARDIAS | `?organizacionId={uuid}` | - | `List<GuardiaResponse>` |
| 2 | GET | `/api/guardias/seccion/{seccionId}` | ITEM_LISTAR_GUARDIAS | `seccionId` (path) | - | `List<GuardiaResponse>` |
| 3 | GET | `/api/guardias/seccion/{seccionId}/activas` | ITEM_LISTAR_GUARDIAS | `seccionId` (path) | - | `List<GuardiaResponse>` |
| 4 | GET | `/api/guardias/{guardiaId}` | ITEM_GESTIONAR_GUARDIA | `guardiaId` (path) | - | `GuardiaResponse` |
| 5 | POST | `/api/guardias` | ITEM_CREAR_GUARDIA | - | `CrearGuardiaRequest` | `GuardiaResponse` (201) |
| 6 | POST | `/api/guardias/con-gestor` | ITEM_CREAR_GUARDIA | - | `CrearGuardiaConGestorRequest` | `GuardiaConGestorResponse` (201) |
| 7 | PUT | `/api/guardias/{guardiaId}` | ITEM_GESTIONAR_GUARDIA | `guardiaId` (path) | `ActualizarGuardiaRequest` | `GuardiaResponse` |
| 8 | PUT | `/api/guardias/{guardiaId}/activar` | ITEM_GESTIONAR_GUARDIA | `guardiaId` (path) | - | `GuardiaResponse` |
| 9 | PUT | `/api/guardias/{guardiaId}/desactivar` | ITEM_GESTIONAR_GUARDIA | `guardiaId` (path) | - | `GuardiaResponse` |
| 10 | PUT | `/api/guardias/{guardiaId}/permite-entrada` | ITEM_GESTIONAR_GUARDIA | `guardiaId` (path)<br>`?permite={boolean}` | - | `GuardiaResponse` |
| 11 | PUT | `/api/guardias/{guardiaId}/permite-salida` | ITEM_GESTIONAR_GUARDIA | `guardiaId` (path)<br>`?permite={boolean}` | - | `GuardiaResponse` |
| 12 | DELETE | `/api/guardias/{guardiaId}` | ITEM_GESTIONAR_GUARDIA | `guardiaId` (path) | - | 204 No Content |
| 13 | GET | `/api/guardias/buscar` | ITEM_LISTAR_GUARDIAS | `?organizacionId={uuid}`<br>`&nombre={texto}` | - | `List<GuardiaResponse>` |
| 14 | GET | `/api/guardias/existe-codigo` | ITEM_CREAR_GUARDIA | `?organizacionId={uuid}`<br>`&codigo={texto}` | - | `ExisteCodigoResponse` |

---

## 👥 GuardiaUsuarioController - Asignación de Usuarios

| # | Método | Endpoint | Permiso | Parámetros | Body | Respuesta |
|---|--------|----------|---------|------------|------|-----------|
| 15 | POST | `/api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}/asignar` | ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO | `guardiaId`, `usuarioId` (path) | `AsignarRequest` (opcional) | `GuardiaUsuarioResponse` (201) |
| 16 | POST | `/api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}/restringir` | ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO | `guardiaId`, `usuarioId` (path) | `RestringirRequest` | `GuardiaUsuarioResponse` (201) |
| 17 | PUT | `/api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}/quitar-restriccion` | ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO | `guardiaId`, `usuarioId` (path) | - | `GuardiaUsuarioResponse` |
| 18 | DELETE | `/api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}` | ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO | `guardiaId`, `usuarioId` (path) | - | 204 No Content |
| 19 | GET | `/api/guardias-usuarios/usuario/{usuarioId}/disponibles` | ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO | `usuarioId` (path) | - | `List<GuardiaUsuarioResponse>` |
| 20 | GET | `/api/guardias-usuarios/usuario/{usuarioId}/restringidas` | ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO | `usuarioId` (path) | - | `List<GuardiaUsuarioResponse>` |
| 21 | GET | `/api/guardias-usuarios/guardia/{guardiaId}/usuarios` | ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO | `guardiaId` (path) | - | `List<GuardiaUsuarioResponse>` |
| 22 | GET | `/api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}/puede-usar` | ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO | `guardiaId`, `usuarioId` (path) | - | `PuedeUsarGuardiaResponse` |
| 23 | GET | `/api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}` | ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO | `guardiaId`, `usuarioId` (path) | - | `GuardiaUsuarioResponse` |
| 24 | GET | `/api/guardias-usuarios/seccion/{seccionId}` | ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO | `seccionId` (path) | - | `List<GuardiaUsuarioResponse>` |

---

## 📦 Request Bodies (DTOs)

### CrearGuardiaRequest
```json
{
  "organizacionId": "uuid",       // REQUERIDO
  "seccionId": "uuid",            // REQUERIDO
  "codigo": "string",             // REQUERIDO, max 100
  "nombre": "string",             // REQUERIDO, max 200
  "descripcion": "string",        // OPCIONAL, max 500
  "ubicacion": "string"           // OPCIONAL, max 300
}
```

### CrearGuardiaConGestorRequest
```json
{
  "organizacionId": "uuid",       // REQUERIDO
  "seccionId": "uuid",            // REQUERIDO
  "codigo": "string",             // REQUERIDO, max 100
  "nombre": "string",             // REQUERIDO, max 200
  "descripcion": "string",        // OPCIONAL, max 500
  "ubicacion": "string",          // OPCIONAL, max 300
  "usuarioGestorId": "uuid",      // REQUERIDO
  "observaciones": "string"       // OPCIONAL, max 500
}
```

### ActualizarGuardiaRequest
```json
{
  "nombre": "string",             // OPCIONAL, max 200
  "descripcion": "string",        // OPCIONAL, max 500
  "ubicacion": "string",          // OPCIONAL, max 300
  "permiteEntrada": true,         // OPCIONAL
  "permiteSalida": false          // OPCIONAL
}
```

### AsignarRequest
```json
{
  "observaciones": "string"       // OPCIONAL
}
```

### RestringirRequest
```json
{
  "motivoRestriccion": "string"   // REQUERIDO
}
```

---

## 📤 Response Bodies (DTOs)

### GuardiaResponse
```json
{
  "id": "uuid",
  "organizacionId": "uuid",
  "seccionId": "uuid",
  "codigo": "string",
  "nombre": "string",
  "descripcion": "string",
  "ubicacion": "string",
  "activa": true,
  "permiteEntrada": true,
  "permiteSalida": true,
  "seccionNombre": "string",
  "organizacionNombre": "string",
  "adminUsuarioId": "uuid",
  "adminUsuarioNombre": "string",
  "adminUsuarioUsername": "string",
  "usuarioGestorId": "uuid",
  "usuarioGestorNombre": "string",
  "usuarioGestorUsername": "string"
}
```

### GuardiaUsuarioResponse
```json
{
  "id": "uuid",
  "guardiaId": "uuid",
  "usuarioId": "uuid",
  "seccionId": "uuid",
  "organizacionId": "uuid",
  "asignada": true,
  "restringida": false,
  "motivoRestriccion": "string",
  "observaciones": "string",
  "guardiaNombre": "string",
  "guardiaCodigo": "string",
  "usuarioNombre": "string",
  "usuarioUsername": "string",
  "seccionNombre": "string"
}
```

### ExisteCodigoResponse
```json
{
  "existe": true
}
```

### PuedeUsarGuardiaResponse
```json
{
  "puedeUsar": true
}
```

---

## 🔒 Permisos Requeridos

| Permiso | Descripción |
|---------|-------------|
| `ITEM_LISTAR_GUARDIAS` | Ver listado de guardias |
| `ITEM_CREAR_GUARDIA` | Crear nuevas guardias (requiere rol GUARDIA) |
| `ITEM_GESTIONAR_GUARDIA` | Editar/activar/desactivar/eliminar guardias (solo administrador) |
| `ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO` | Asignar/restringir usuarios a guardias |
| `ITEM_CONTROL_DE_INGRESO_Y_SALIDA` | Ver guardias disponibles para registrar movimientos |

---

## ⚠️ Restricciones de Seguridad

### GuardiaController
- **Crear Guardia:** Usuario debe tener rol `GUARDIA`
- **Actualizar/Activar/Desactivar/Eliminar:** Solo el administrador (`adminUsuarioId`) o SYSADMIN/ORGADMIN
- **Eliminar:** Solo si no tiene movimientos registrados

### GuardiaUsuarioController
- **Asignar:** Usuario debe pertenecer a la sección de la guardia
- **Puede Usar Guardia:** 
  - Usuario es administrador de la guardia, O
  - Usuario tiene `asignada=true` y `restringida=false`

---

## 📊 Códigos HTTP

| Código | Uso |
|--------|-----|
| 200 | Operación exitosa (GET, PUT) |
| 201 | Recurso creado (POST) |
| 204 | Sin contenido (DELETE exitoso) |
| 400 | Error de validación |
| 401 | No autenticado |
| 403 | Sin permisos |
| 404 | No encontrado |

---

## 🚀 Ejemplos de Uso Rápido

### Crear Guardia
```bash
POST /api/guardias
{
  "organizacionId": "uuid",
  "seccionId": "uuid",
  "codigo": "PUERTA-01",
  "nombre": "Puerta Principal"
}
```

### Asignar Usuario
```bash
POST /api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}/asignar
{
  "observaciones": "Acceso autorizado"
}
```

### Bloquear Entradas
```bash
PUT /api/guardias/{guardiaId}/permite-entrada?permite=false
```

### Verificar Acceso
```bash
GET /api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}/puede-usar
```

---

**Documentación Completa:** Ver `API-GUARDIAS-CONFIGURACION-COMPLETA.md`

