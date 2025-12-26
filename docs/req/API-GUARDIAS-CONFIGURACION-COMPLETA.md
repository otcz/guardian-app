# 📚 API Guardian - Módulo de Guardias - Configuración Completa

**Fecha:** 2025-12-23  
**Base URL:** `/api`  
**Autenticación:** Bearer Token (JWT)

---

## 📑 Tabla de Contenidos

1. [GuardiaController - Gestión de Guardias](#guardiacontroller---gestión-de-guardias)
2. [GuardiaUsuarioController - Asignación de Usuarios](#guardiausuariocontroller---asignación-de-usuarios)
3. [Modelos de Datos (DTOs)](#modelos-de-datos-dtos)
4. [Códigos de Respuesta HTTP](#códigos-de-respuesta-http)
5. [Ejemplos de Uso](#ejemplos-de-uso)

---

# GuardiaController - Gestión de Guardias

## 1. Listar Guardias por Organización

**Endpoint:** `GET /api/guardias`  
**Permiso:** `ITEM_LISTAR_GUARDIAS`

### Parámetros Query
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `organizacionId` | UUID | ✅ Sí | ID de la organización |

### Respuesta Exitosa (200 OK)
```json
[
  {
    "id": "uuid",
    "organizacionId": "uuid",
    "seccionId": "uuid",
    "codigo": "PUERTA-01",
    "nombre": "Puerta Principal",
    "descripcion": "Entrada principal del edificio",
    "ubicacion": "Planta Baja - Norte",
    "activa": true,
    "permiteEntrada": true,
    "permiteSalida": true,
    "seccionNombre": "Sección Norte",
    "organizacionNombre": "Empresa XYZ",
    "adminUsuarioId": "uuid",
    "adminUsuarioNombre": "Juan Pérez",
    "adminUsuarioUsername": "jperez",
    "usuarioGestorId": "uuid",
    "usuarioGestorNombre": "Juan Pérez",
    "usuarioGestorUsername": "jperez"
  }
]
```

### Ejemplo cURL
```bash
curl -X GET "http://localhost:8080/api/guardias?organizacionId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 2. Listar Guardias por Sección

**Endpoint:** `GET /api/guardias/seccion/{seccionId}`  
**Permiso:** `ITEM_LISTAR_GUARDIAS`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `seccionId` | UUID | ✅ Sí | ID de la sección |

### Respuesta Exitosa (200 OK)
```json
[
  {
    "id": "uuid",
    "codigo": "PUERTA-01",
    "nombre": "Puerta Principal",
    // ... mismo formato que endpoint anterior
  }
]
```

### Ejemplo cURL
```bash
curl -X GET "http://localhost:8080/api/guardias/seccion/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 3. Listar Guardias Activas por Sección

**Endpoint:** `GET /api/guardias/seccion/{seccionId}/activas`  
**Permiso:** `ITEM_LISTAR_GUARDIAS` o `ITEM_CONTROL_DE_INGRESO_Y_SALIDA`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `seccionId` | UUID | ✅ Sí | ID de la sección |

### Respuesta Exitosa (200 OK)
```json
[
  {
    "id": "uuid",
    "activa": true,
    // ... solo guardias con activa=true
  }
]
```

### Ejemplo cURL
```bash
curl -X GET "http://localhost:8080/api/guardias/seccion/123e4567-e89b-12d3-a456-426614174000/activas" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 4. Obtener Guardia por ID

**Endpoint:** `GET /api/guardias/{guardiaId}`  
**Permiso:** `ITEM_GESTIONAR_GUARDIA` o `ITEM_LISTAR_GUARDIAS`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |

### Respuesta Exitosa (200 OK)
```json
{
  "id": "uuid",
  "organizacionId": "uuid",
  "seccionId": "uuid",
  "codigo": "PUERTA-01",
  "nombre": "Puerta Principal",
  "descripcion": "Entrada principal",
  "ubicacion": "Planta Baja",
  "activa": true,
  "permiteEntrada": true,
  "permiteSalida": true,
  "seccionNombre": "Sección Norte",
  "organizacionNombre": "Empresa XYZ",
  "adminUsuarioId": "uuid",
  "adminUsuarioNombre": "Juan Pérez",
  "adminUsuarioUsername": "jperez"
}
```

### Ejemplo cURL
```bash
curl -X GET "http://localhost:8080/api/guardias/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 5. Crear Guardia

**Endpoint:** `POST /api/guardias`  
**Permiso:** `ITEM_CREAR_GUARDIA`  
**Nota:** El usuario autenticado debe tener rol `GUARDIA` y será asignado automáticamente como administrador

### Body (JSON)
```json
{
  "organizacionId": "uuid",          // REQUERIDO
  "seccionId": "uuid",               // REQUERIDO
  "codigo": "PUERTA-01",             // REQUERIDO, max 100 caracteres
  "nombre": "Puerta Principal",      // REQUERIDO, max 200 caracteres
  "descripcion": "Descripción...",   // OPCIONAL, max 500 caracteres
  "ubicacion": "Planta Baja"         // OPCIONAL, max 300 caracteres
}
```

### Respuesta Exitosa (201 CREATED)
```json
{
  "id": "uuid",
  "organizacionId": "uuid",
  "seccionId": "uuid",
  "codigo": "PUERTA-01",
  "nombre": "Puerta Principal",
  "descripcion": "Descripción...",
  "ubicacion": "Planta Baja",
  "activa": true,
  "permiteEntrada": true,
  "permiteSalida": true,
  "adminUsuarioId": "uuid",  // Usuario autenticado
  "seccionNombre": "Sección Norte",
  "organizacionNombre": "Empresa XYZ"
}
```

### Validaciones
- ✅ Usuario autenticado tiene rol `GUARDIA`
- ✅ Usuario pertenece a la sección especificada
- ✅ Usuario está activo
- ✅ Código único en la organización
- ✅ Sección pertenece a la organización

### Ejemplo cURL
```bash
curl -X POST "http://localhost:8080/api/guardias" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizacionId": "123e4567-e89b-12d3-a456-426614174000",
    "seccionId": "223e4567-e89b-12d3-a456-426614174001",
    "codigo": "PUERTA-01",
    "nombre": "Puerta Principal",
    "descripcion": "Entrada principal del edificio",
    "ubicacion": "Planta Baja - Norte"
  }'
```

---

## 6. Crear Guardia con Gestor Específico

**Endpoint:** `POST /api/guardias/con-gestor`  
**Permiso:** `ITEM_CREAR_GUARDIA`

### Body (JSON)
```json
{
  "organizacionId": "uuid",              // REQUERIDO
  "seccionId": "uuid",                   // REQUERIDO
  "codigo": "PUERTA-02",                 // REQUERIDO, max 100 caracteres
  "nombre": "Puerta Secundaria",         // REQUERIDO, max 200 caracteres
  "descripcion": "Descripción...",       // OPCIONAL, max 500 caracteres
  "ubicacion": "Planta Alta",            // OPCIONAL, max 300 caracteres
  "usuarioGestorId": "uuid",             // REQUERIDO - Usuario con rol GUARDIA
  "observaciones": "Gestor asignado..."  // OPCIONAL, max 500 caracteres
}
```

### Respuesta Exitosa (201 CREATED)
```json
{
  "id": "uuid",
  "organizacionId": "uuid",
  "seccionId": "uuid",
  "codigo": "PUERTA-02",
  "nombre": "Puerta Secundaria",
  "descripcion": "Descripción...",
  "ubicacion": "Planta Alta",
  "activa": true,
  "permiteEntrada": true,
  "permiteSalida": true,
  "seccionNombre": "Sección Norte",
  "organizacionNombre": "Empresa XYZ",
  "usuarioGestorId": "uuid",
  "mensaje": "Guardia creada exitosamente con gestor asociado"
}
```

### Validaciones
- ✅ Usuario gestor existe
- ✅ Usuario gestor tiene rol `GUARDIA`
- ✅ Usuario gestor pertenece a la misma sección
- ✅ Usuario gestor está activo
- ✅ Código único en la organización

### Ejemplo cURL
```bash
curl -X POST "http://localhost:8080/api/guardias/con-gestor" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizacionId": "123e4567-e89b-12d3-a456-426614174000",
    "seccionId": "223e4567-e89b-12d3-a456-426614174001",
    "codigo": "PUERTA-02",
    "nombre": "Puerta Secundaria",
    "usuarioGestorId": "323e4567-e89b-12d3-a456-426614174002",
    "observaciones": "Gestor principal de la guardia"
  }'
```

---

## 7. Actualizar Guardia

**Endpoint:** `PUT /api/guardias/{guardiaId}`  
**Permiso:** `ITEM_GESTIONAR_GUARDIA`  
**Restricción:** Solo el administrador de la guardia o SYSADMIN/ORGADMIN

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |

### Body (JSON) - Todos los campos son OPCIONALES
```json
{
  "nombre": "Nuevo Nombre",              // OPCIONAL, max 200 caracteres
  "descripcion": "Nueva descripción",    // OPCIONAL, max 500 caracteres
  "ubicacion": "Nueva ubicación",        // OPCIONAL, max 300 caracteres
  "permiteEntrada": true,                // OPCIONAL, boolean
  "permiteSalida": false                 // OPCIONAL, boolean
}
```

### Respuesta Exitosa (200 OK)
```json
{
  "id": "uuid",
  "nombre": "Nuevo Nombre",
  "descripcion": "Nueva descripción",
  "ubicacion": "Nueva ubicación",
  "permiteEntrada": true,
  "permiteSalida": false,
  // ... resto de campos
}
```

### Ejemplo cURL
```bash
curl -X PUT "http://localhost:8080/api/guardias/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Puerta Principal - Actualizada",
    "descripcion": "Descripción actualizada",
    "permiteEntrada": true,
    "permiteSalida": true
  }'
```

---

## 8. Activar Guardia

**Endpoint:** `PUT /api/guardias/{guardiaId}/activar`  
**Permiso:** `ITEM_GESTIONAR_GUARDIA`  
**Restricción:** Solo el administrador de la guardia o SYSADMIN/ORGADMIN

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |

### Respuesta Exitosa (200 OK)
```json
{
  "id": "uuid",
  "activa": true,
  // ... resto de campos
}
```

### Ejemplo cURL
```bash
curl -X PUT "http://localhost:8080/api/guardias/123e4567-e89b-12d3-a456-426614174000/activar" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 9. Desactivar Guardia

**Endpoint:** `PUT /api/guardias/{guardiaId}/desactivar`  
**Permiso:** `ITEM_GESTIONAR_GUARDIA`  
**Restricción:** Solo el administrador de la guardia o SYSADMIN/ORGADMIN

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |

### Respuesta Exitosa (200 OK)
```json
{
  "id": "uuid",
  "activa": false,
  // ... resto de campos
}
```

### Ejemplo cURL
```bash
curl -X PUT "http://localhost:8080/api/guardias/123e4567-e89b-12d3-a456-426614174000/desactivar" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 10. Modificar Permite Entrada

**Endpoint:** `PUT /api/guardias/{guardiaId}/permite-entrada`  
**Permiso:** `ITEM_GESTIONAR_GUARDIA`  
**Restricción:** Solo el administrador de la guardia o SYSADMIN/ORGADMIN

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |

### Parámetros Query
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `permite` | Boolean | ✅ Sí | true = permite entradas, false = bloquea entradas |

### Respuesta Exitosa (200 OK)
```json
{
  "id": "uuid",
  "permiteEntrada": true,
  // ... resto de campos
}
```

### Ejemplo cURL
```bash
# Permitir entradas
curl -X PUT "http://localhost:8080/api/guardias/123e4567-e89b-12d3-a456-426614174000/permite-entrada?permite=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Bloquear entradas
curl -X PUT "http://localhost:8080/api/guardias/123e4567-e89b-12d3-a456-426614174000/permite-entrada?permite=false" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 11. Modificar Permite Salida

**Endpoint:** `PUT /api/guardias/{guardiaId}/permite-salida`  
**Permiso:** `ITEM_GESTIONAR_GUARDIA`  
**Restricción:** Solo el administrador de la guardia o SYSADMIN/ORGADMIN

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |

### Parámetros Query
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `permite` | Boolean | ✅ Sí | true = permite salidas, false = bloquea salidas |

### Respuesta Exitosa (200 OK)
```json
{
  "id": "uuid",
  "permiteSalida": false,
  // ... resto de campos
}
```

### Ejemplo cURL
```bash
# Permitir salidas
curl -X PUT "http://localhost:8080/api/guardias/123e4567-e89b-12d3-a456-426614174000/permite-salida?permite=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Bloquear salidas
curl -X PUT "http://localhost:8080/api/guardias/123e4567-e89b-12d3-a456-426614174000/permite-salida?permite=false" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 12. Eliminar Guardia

**Endpoint:** `DELETE /api/guardias/{guardiaId}`  
**Permiso:** `ITEM_GESTIONAR_GUARDIA`  
**Restricción:** Solo el administrador de la guardia o SYSADMIN/ORGADMIN  
**Nota:** Solo se puede eliminar si no tiene movimientos registrados

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |

### Respuesta Exitosa (204 NO CONTENT)
Sin contenido en el body.

### Errores Posibles
- **400 Bad Request:** La guardia tiene movimientos registrados
- **403 Forbidden:** Usuario no es administrador
- **404 Not Found:** Guardia no existe

### Ejemplo cURL
```bash
curl -X DELETE "http://localhost:8080/api/guardias/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 13. Buscar Guardias por Nombre

**Endpoint:** `GET /api/guardias/buscar`  
**Permiso:** `ITEM_LISTAR_GUARDIAS`

### Parámetros Query
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `organizacionId` | UUID | ✅ Sí | ID de la organización |
| `nombre` | String | ✅ Sí | Texto a buscar (búsqueda parcial) |

### Respuesta Exitosa (200 OK)
```json
[
  {
    "id": "uuid",
    "nombre": "Puerta Principal",
    // ... resto de campos
  }
]
```

### Ejemplo cURL
```bash
curl -X GET "http://localhost:8080/api/guardias/buscar?organizacionId=123e4567-e89b-12d3-a456-426614174000&nombre=Puerta" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 14. Verificar si Existe Código

**Endpoint:** `GET /api/guardias/existe-codigo`  
**Permiso:** `ITEM_CREAR_GUARDIA` o `ITEM_GESTIONAR_GUARDIA`

### Parámetros Query
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `organizacionId` | UUID | ✅ Sí | ID de la organización |
| `codigo` | String | ✅ Sí | Código a verificar |

### Respuesta Exitosa (200 OK)
```json
{
  "existe": true
}
```

### Ejemplo cURL
```bash
curl -X GET "http://localhost:8080/api/guardias/existe-codigo?organizacionId=123e4567-e89b-12d3-a456-426614174000&codigo=PUERTA-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

# GuardiaUsuarioController - Asignación de Usuarios

## 15. Asignar Guardia a Usuario

**Endpoint:** `POST /api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}/asignar`  
**Permiso:** `ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |
| `usuarioId` | UUID | ✅ Sí | ID del usuario |

### Body (JSON) - OPCIONAL
```json
{
  "observaciones": "Usuario autorizado para entrada"
}
```

### Respuesta Exitosa (201 CREATED)
```json
{
  "id": "uuid",
  "guardiaId": "uuid",
  "usuarioId": "uuid",
  "seccionId": "uuid",
  "organizacionId": "uuid",
  "asignada": true,
  "restringida": false,
  "motivoRestriccion": null,
  "observaciones": "Usuario autorizado para entrada",
  "guardiaNombre": "Puerta Principal",
  "guardiaCodigo": "PUERTA-01",
  "usuarioNombre": "Juan Pérez",
  "usuarioUsername": "jperez",
  "seccionNombre": "Sección Norte"
}
```

### Ejemplo cURL
```bash
curl -X POST "http://localhost:8080/api/guardias-usuarios/123e4567-e89b-12d3-a456-426614174000/usuarios/223e4567-e89b-12d3-a456-426614174001/asignar" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "observaciones": "Usuario autorizado para entrada"
  }'
```

---

## 16. Restringir Guardia para Usuario

**Endpoint:** `POST /api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}/restringir`  
**Permiso:** `ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |
| `usuarioId` | UUID | ✅ Sí | ID del usuario |

### Body (JSON)
```json
{
  "motivoRestriccion": "Acceso revocado por seguridad"  // REQUERIDO
}
```

### Respuesta Exitosa (201 CREATED)
```json
{
  "id": "uuid",
  "guardiaId": "uuid",
  "usuarioId": "uuid",
  "asignada": false,
  "restringida": true,
  "motivoRestriccion": "Acceso revocado por seguridad",
  "observaciones": null,
  "guardiaNombre": "Puerta Principal",
  "usuarioNombre": "Juan Pérez"
}
```

### Ejemplo cURL
```bash
curl -X POST "http://localhost:8080/api/guardias-usuarios/123e4567-e89b-12d3-a456-426614174000/usuarios/223e4567-e89b-12d3-a456-426614174001/restringir" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "motivoRestriccion": "Acceso revocado por seguridad"
  }'
```

---

## 17. Quitar Restricción

**Endpoint:** `PUT /api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}/quitar-restriccion`  
**Permiso:** `ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |
| `usuarioId` | UUID | ✅ Sí | ID del usuario |

### Respuesta Exitosa (200 OK)
```json
{
  "id": "uuid",
  "guardiaId": "uuid",
  "usuarioId": "uuid",
  "asignada": true,
  "restringida": false,
  "motivoRestriccion": null,
  // ... resto de campos
}
```

### Ejemplo cURL
```bash
curl -X PUT "http://localhost:8080/api/guardias-usuarios/123e4567-e89b-12d3-a456-426614174000/usuarios/223e4567-e89b-12d3-a456-426614174001/quitar-restriccion" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 18. Revocar Asignación (Eliminar Relación)

**Endpoint:** `DELETE /api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}`  
**Permiso:** `ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |
| `usuarioId` | UUID | ✅ Sí | ID del usuario |

### Respuesta Exitosa (204 NO CONTENT)
Sin contenido en el body.

### Ejemplo cURL
```bash
curl -X DELETE "http://localhost:8080/api/guardias-usuarios/123e4567-e89b-12d3-a456-426614174000/usuarios/223e4567-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 19. Listar Guardias Disponibles para Usuario

**Endpoint:** `GET /api/guardias-usuarios/usuario/{usuarioId}/disponibles`  
**Permiso:** `ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO` o `ITEM_CONTROL_DE_INGRESO_Y_SALIDA`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `usuarioId` | UUID | ✅ Sí | ID del usuario |

### Respuesta Exitosa (200 OK)
```json
[
  {
    "id": "uuid",
    "guardiaId": "uuid",
    "usuarioId": "uuid",
    "asignada": true,
    "restringida": false,
    "guardiaNombre": "Puerta Principal",
    "guardiaCodigo": "PUERTA-01",
    // ... resto de campos
  }
]
```

### Ejemplo cURL
```bash
curl -X GET "http://localhost:8080/api/guardias-usuarios/usuario/123e4567-e89b-12d3-a456-426614174000/disponibles" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 20. Listar Guardias Restringidas para Usuario

**Endpoint:** `GET /api/guardias-usuarios/usuario/{usuarioId}/restringidas`  
**Permiso:** `ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `usuarioId` | UUID | ✅ Sí | ID del usuario |

### Respuesta Exitosa (200 OK)
```json
[
  {
    "id": "uuid",
    "guardiaId": "uuid",
    "usuarioId": "uuid",
    "asignada": false,
    "restringida": true,
    "motivoRestriccion": "Acceso revocado",
    // ... resto de campos
  }
]
```

### Ejemplo cURL
```bash
curl -X GET "http://localhost:8080/api/guardias-usuarios/usuario/123e4567-e89b-12d3-a456-426614174000/restringidas" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 21. Listar Usuarios con Acceso a Guardia

**Endpoint:** `GET /api/guardias-usuarios/guardia/{guardiaId}/usuarios`  
**Permiso:** `ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |

### Respuesta Exitosa (200 OK)
```json
[
  {
    "id": "uuid",
    "guardiaId": "uuid",
    "usuarioId": "uuid",
    "asignada": true,
    "restringida": false,
    "usuarioNombre": "Juan Pérez",
    "usuarioUsername": "jperez",
    // ... resto de campos
  }
]
```

### Ejemplo cURL
```bash
curl -X GET "http://localhost:8080/api/guardias-usuarios/guardia/123e4567-e89b-12d3-a456-426614174000/usuarios" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 22. Verificar si Usuario Puede Usar Guardia

**Endpoint:** `GET /api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}/puede-usar`  
**Permiso:** `ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO` o `ITEM_CONTROL_DE_INGRESO_Y_SALIDA`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |
| `usuarioId` | UUID | ✅ Sí | ID del usuario |

### Respuesta Exitosa (200 OK)
```json
{
  "puedeUsar": true
}
```

### Ejemplo cURL
```bash
curl -X GET "http://localhost:8080/api/guardias-usuarios/123e4567-e89b-12d3-a456-426614174000/usuarios/223e4567-e89b-12d3-a456-426614174001/puede-usar" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 23. Buscar Relación Específica

**Endpoint:** `GET /api/guardias-usuarios/{guardiaId}/usuarios/{usuarioId}`  
**Permiso:** `ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `guardiaId` | UUID | ✅ Sí | ID de la guardia |
| `usuarioId` | UUID | ✅ Sí | ID del usuario |

### Respuesta Exitosa (200 OK)
```json
{
  "id": "uuid",
  "guardiaId": "uuid",
  "usuarioId": "uuid",
  "seccionId": "uuid",
  "organizacionId": "uuid",
  "asignada": true,
  "restringida": false,
  "motivoRestriccion": null,
  "observaciones": "Usuario autorizado",
  "guardiaNombre": "Puerta Principal",
  "guardiaCodigo": "PUERTA-01",
  "usuarioNombre": "Juan Pérez",
  "usuarioUsername": "jperez",
  "seccionNombre": "Sección Norte"
}
```

### Ejemplo cURL
```bash
curl -X GET "http://localhost:8080/api/guardias-usuarios/123e4567-e89b-12d3-a456-426614174000/usuarios/223e4567-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 24. Listar Relaciones por Sección

**Endpoint:** `GET /api/guardias-usuarios/seccion/{seccionId}`  
**Permiso:** `ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO`

### Parámetros Path
| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `seccionId` | UUID | ✅ Sí | ID de la sección |

### Respuesta Exitosa (200 OK)
```json
[
  {
    "id": "uuid",
    "guardiaId": "uuid",
    "usuarioId": "uuid",
    "seccionId": "uuid",
    "asignada": true,
    "restringida": false,
    // ... resto de campos
  }
]
```

### Ejemplo cURL
```bash
curl -X GET "http://localhost:8080/api/guardias-usuarios/seccion/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

# Modelos de Datos (DTOs)

## GuardiaResponse

```typescript
{
  id: UUID,                      // ID único de la guardia
  organizacionId: UUID,          // ID de la organización
  seccionId: UUID,               // ID de la sección
  codigo: String,                // Código único (ej: "PUERTA-01")
  nombre: String,                // Nombre de la guardia
  descripcion: String,           // Descripción (opcional)
  ubicacion: String,             // Ubicación física (opcional)
  activa: Boolean,               // Estado activo/inactivo
  permiteEntrada: Boolean,       // Permite registrar entradas
  permiteSalida: Boolean,        // Permite registrar salidas
  seccionNombre: String,         // Nombre de la sección (anidado)
  organizacionNombre: String,    // Nombre de la organización (anidado)
  adminUsuarioId: UUID,          // ID del usuario administrador
  adminUsuarioNombre: String,    // Nombre del administrador (opcional)
  adminUsuarioUsername: String,  // Username del administrador (opcional)
  usuarioGestorId: UUID,         // ID del gestor (LEGACY, opcional)
  usuarioGestorNombre: String,   // Nombre del gestor (LEGACY, opcional)
  usuarioGestorUsername: String  // Username del gestor (LEGACY, opcional)
}
```

## GuardiaUsuarioResponse

```typescript
{
  id: UUID,                      // ID único de la relación
  guardiaId: UUID,               // ID de la guardia
  usuarioId: UUID,               // ID del usuario
  seccionId: UUID,               // ID de la sección
  organizacionId: UUID,          // ID de la organización
  asignada: Boolean,             // Usuario tiene acceso (true/false)
  restringida: Boolean,          // Usuario está restringido (true/false)
  motivoRestriccion: String,     // Motivo de restricción (opcional)
  observaciones: String,         // Observaciones (opcional)
  guardiaNombre: String,         // Nombre de la guardia (anidado)
  guardiaCodigo: String,         // Código de la guardia (anidado)
  usuarioNombre: String,         // Nombre del usuario (anidado)
  usuarioUsername: String,       // Username del usuario (anidado)
  seccionNombre: String          // Nombre de la sección (anidado)
}
```

---

# Códigos de Respuesta HTTP

| Código | Descripción |
|--------|-------------|
| **200 OK** | Operación exitosa (GET, PUT) |
| **201 Created** | Recurso creado exitosamente (POST) |
| **204 No Content** | Operación exitosa sin contenido (DELETE) |
| **400 Bad Request** | Datos inválidos o violación de reglas de negocio |
| **401 Unauthorized** | No autenticado o token inválido |
| **403 Forbidden** | Sin permisos para realizar la operación |
| **404 Not Found** | Recurso no encontrado |
| **500 Internal Server Error** | Error interno del servidor |

---

# Ejemplos de Uso

## Caso de Uso 1: Crear Guardia y Asignar Usuarios

```bash
# 1. Crear guardia
curl -X POST "http://localhost:8080/api/guardias" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizacionId": "123e4567-e89b-12d3-a456-426614174000",
    "seccionId": "223e4567-e89b-12d3-a456-426614174001",
    "codigo": "PUERTA-01",
    "nombre": "Puerta Principal"
  }'

# Respuesta: { "id": "333e4567-e89b-12d3-a456-426614174002", ... }

# 2. Asignar usuario a la guardia
curl -X POST "http://localhost:8080/api/guardias-usuarios/333e4567-e89b-12d3-a456-426614174002/usuarios/423e4567-e89b-12d3-a456-426614174003/asignar" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "observaciones": "Usuario autorizado para acceso"
  }'
```

## Caso de Uso 2: Bloquear Entradas Temporalmente

```bash
# Deshabilitar entradas en una guardia
curl -X PUT "http://localhost:8080/api/guardias/333e4567-e89b-12d3-a456-426614174002/permite-entrada?permite=false" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Las salidas siguen permitidas (permiteSalida = true)
```

## Caso de Uso 3: Restringir Usuario

```bash
# Restringir acceso de un usuario a una guardia
curl -X POST "http://localhost:8080/api/guardias-usuarios/333e4567-e89b-12d3-a456-426614174002/usuarios/423e4567-e89b-12d3-a456-426614174003/restringir" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "motivoRestriccion": "Acceso revocado por seguridad"
  }'
```

---

# Validaciones y Reglas de Negocio

## Guardia

### Crear Guardia
- ✅ Usuario autenticado debe tener rol `GUARDIA`
- ✅ Usuario debe pertenecer a la sección especificada
- ✅ Código debe ser único en la organización
- ✅ Sección debe pertenecer a la organización

### Actualizar/Activar/Desactivar/Eliminar
- ✅ Usuario debe ser el administrador (`adminUsuarioId`)
- ✅ O tener rol `SYSADMIN` o `ORGADMIN`

### Eliminar
- ✅ No debe tener movimientos registrados
- ✅ Se eliminan primero las asignaciones en `guardia_usuario`

## GuardiaUsuario

### Asignar
- ✅ Guardia y usuario deben existir
- ✅ Usuario debe pertenecer a la sección de la guardia
- ✅ No puede haber duplicados (guardia + usuario únicos)

### Restringir
- ✅ Debe proporcionar `motivoRestriccion`
- ✅ Marca `restringida=true` y `asignada=false`

### Puede Usar Guardia
- ✅ Usuario es administrador de la guardia, O
- ✅ Usuario está en `guardia_usuario` con `asignada=true` y `restringida=false`

---

**Fecha de Documentación:** 2025-12-23  
**Versión API:** 1.0.0  
**Backend:** Spring Boot + Java 8

