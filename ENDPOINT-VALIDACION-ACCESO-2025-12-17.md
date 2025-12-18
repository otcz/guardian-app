# 🔍 Endpoint del Módulo de Validación de Acceso

**Fecha:** 2025-12-17  
**Módulo:** Validar Usuarios (Validación de Acceso)

---

## 📋 Información del Endpoint

### Endpoint Principal:
```
GET /api/movimientos-guardia/validar-usuario-identificacion/{identificacion}
```

### Parámetros:

#### Path Parameter:
- **`identificacion`** (string, requerido)
  - Número de identificación del usuario
  - Puede ser: Cédula, Pasaporte, DNI, RUC, Licencia, etc.
  - Se codifica con `encodeURIComponent` antes de enviar

#### Query Parameter (opcional):
- **`guardiaId`** (string, opcional)
  - ID de la guardia donde se realiza la validación
  - Formato: `?guardiaId={uuid}`
  - Permite al backend determinar qué acciones están permitidas

---

## 🔧 Implementación Frontend

### Servicio:
**Archivo:** `src/app/service/movimiento-guardia.service.ts`

```typescript
validarUsuario(identificacion: string, guardiaId?: string): Observable<ValidacionUsuarioDTO> {
  const valor = identificacion.trim();
  let url = `${this.API_URL}/validar-usuario-identificacion/${valor}`;

  // Si se proporciona guardiaId, enviarlo al backend como query param
  if (guardiaId) {
    url += `?guardiaId=${guardiaId}`;
  }

  return this.http.get<ValidacionUsuarioDTO>(url);
}

// Alias para compatibilidad
validarUsuarioPorIdentificacion(identificacion: string, guardiaId?: string): Observable<ValidacionUsuarioDTO> {
  return this.validarUsuario(identificacion, guardiaId);
}
```

### Componente:
**Archivo:** `src/app/guardia/validacion-ingreso/validar-usuario/validar-usuario.component.ts`

```typescript
validarAcceso(): void {
  // ...validaciones...
  
  this.movimientoService.validarUsuarioPorIdentificacion(this.identificacion).subscribe({
    next: (validacion) => {
      this.validacion = validacion;
      // Procesar respuesta...
    },
    error: (error) => {
      // Manejar error...
    }
  });
}
```

---

## 📤 Ejemplo de Petición

### Request:
```http
GET /api/movimientos-guardia/validar-usuario-identificacion/0123456789 HTTP/1.1
Host: localhost:4200
```

### Request con guardiaId:
```http
GET /api/movimientos-guardia/validar-usuario-identificacion/0123456789?guardiaId=aab86ae0-7d9c-46dd-b615-d65a0a5577c7 HTTP/1.1
Host: localhost:4200
```

---

## 📥 Respuesta del Backend

### Interfaz TypeScript:
```typescript
export interface ValidacionUsuarioDTO {
  id: string;                      // UUID del usuario
  existe: boolean;                 // Si existe en el sistema
  activo: boolean;                 // Si está activo
  nombreCompleto: string | null;   // Nombre completo
  username: string | null;         // Nombre de usuario
  tipoIdentificacion: string | null; // Tipo de documento
  identificacion: string | null;   // Número de documento
  seccion: string | null;          // Sección asignada
  restricciones: string[];         // Lista de restricciones
  vehiculos: Vehiculo[];           // Vehículos asociados
  tieneEntradaAbierta: boolean;    // Si tiene entrada sin salida
  entradaAbierta: EntradaAbiertaDTO | null; // Detalles de la entrada
}

export interface EntradaAbiertaDTO {
  id: string;                      // UUID del movimiento
  guardiaNombre: string;           // Nombre de la guardia
  guardiaId: string;               // UUID de la guardia
  fechaEntrada: string;            // Fecha ISO 8601
  vehiculoPlaca?: string | null;   // Placa del vehículo
  observaciones?: string | null;   // Observaciones
}
```

### Ejemplo de Respuesta Exitosa:
```json
{
  "id": "3b8536c4-c5b6-4298-879e-338e925bbfdc",
  "existe": true,
  "activo": true,
  "nombreCompleto": "OSCAR TOMAS",
  "username": "USER71_ICFE",
  "tipoIdentificacion": "CEDULA",
  "identificacion": "0123456789",
  "seccion": "Administración",
  "restricciones": [],
  "vehiculos": [
    {
      "id": "uuid-vehiculo",
      "placa": "XXX255",
      "estado": "ACTIVO"
    }
  ],
  "tieneEntradaAbierta": true,
  "entradaAbierta": {
    "id": "80f2f46a-3cc7-4d7b-a395-6f545d1e0648",
    "guardiaNombre": "PUENTE TABLA",
    "guardiaId": "aab86ae0-7d9c-46dd-b615-d65a0a5577c7",
    "fechaEntrada": "2025-12-17T01:36:00.498653Z",
    "vehiculoPlaca": "XXX255",
    "observaciones": null
  }
}
```

### Ejemplo de Usuario No Encontrado:
```json
{
  "id": null,
  "existe": false,
  "activo": false,
  "nombreCompleto": null,
  "username": null,
  "tipoIdentificacion": null,
  "identificacion": "0123456789",
  "seccion": null,
  "restricciones": [],
  "vehiculos": [],
  "tieneEntradaAbierta": false,
  "entradaAbierta": null
}
```

---

## 🔄 Flujo Completo

```
Usuario ingresa identificación
        ↓
Componente: validarAcceso()
        ↓
Servicio: validarUsuarioPorIdentificacion()
        ↓
HTTP GET: /api/movimientos-guardia/validar-usuario-identificacion/{id}
        ↓
Backend: Busca usuario por identificación
        ↓
Backend: Verifica entradas abiertas
        ↓
Backend: Retorna ValidacionUsuarioDTO
        ↓
Frontend: Muestra resultado en UI
```

---

## 📝 Notas Importantes

### Campos Clave:
1. **`id`**: UUID del usuario (requerido para registrar movimientos)
2. **`tieneEntradaAbierta`**: Indica si tiene entrada sin salida
3. **`entradaAbierta.fechaEntrada`**: Campo que se usa en el frontend (NO `timestampMovimiento`)
4. **`entradaAbierta.guardiaNombre`**: Nombre de la guardia (NO `guardia.nombre`)

### Versión:
- **v2.2** - Incluye soporte para `guardiaId` como query parameter
- **Endpoint estable** - Usado en producción

### Otros Endpoints Relacionados:

```
GET /api/movimientos-guardia/validar-vehiculo/{placa}
GET /api/movimientos-guardia/validar-manual/{documentoOPlaca}
GET /api/movimientos-guardia/entrada-abierta/{usuarioId}
POST /api/movimientos-guardia/entrada
POST /api/movimientos-guardia/salida
```

---

**Documentado por:** GitHub Copilot  
**Fecha:** 2025-12-17  
**Estado:** ✅ Endpoint verificado y funcionando

