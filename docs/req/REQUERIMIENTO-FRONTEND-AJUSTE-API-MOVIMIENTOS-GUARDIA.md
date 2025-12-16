# 📋 REQUERIMIENTO TÉCNICO - Frontend: Ajuste API Movimientos Guardia

**Fecha:** 15 de diciembre de 2025  
**Prioridad:** 🔴 ALTA - BLOQUEANTE  
**Módulo:** Control de Ingreso y Salida (Módulo Guardia)  
**Ticket/Issue:** #GUARDIA-API-2025-12-15  
**Estado:** 📝 PENDIENTE IMPLEMENTACIÓN

---

## 🎯 OBJETIVO

Ajustar el componente `control-ingreso-salida.component.ts` y servicios relacionados para consumir correctamente la API de Movimientos Guardia, corrigiendo el error 400 (Bad Request) que ocurre al registrar entradas/salidas.

---

## 🔴 PROBLEMA ACTUAL

### Error en producción:
```
POST http://localhost:4200/api/movimientos-guardia/entrada 400 (Bad Request)
```

### Causa raíz identificada:
El frontend está enviando la **identificación del usuario** (número de cédula) en lugar del **UUID del usuario** en el campo `usuarioId`.

**Request INCORRECTO actual:**
```json
{
  "guardiaId": "b20ca23c-4649-494d-8d64-ee03faa11727",
  "usuarioId": "1073995282",  // ❌ IDENTIFICACIÓN (string)
  "adminGuardiaId": "b20ca23c-4649-494d-8d64-ee03faa11727"
}
```

**Request CORRECTO esperado:**
```json
{
  "guardiaId": "b20ca23c-4649-494d-8d64-ee03faa11727",
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",  // ✅ UUID
  "adminGuardiaId": "b20ca23c-4649-494d-8d64-ee03faa11727"
}
```

---

## ✅ SOLUCIÓN REQUERIDA

### 1. **ACTUALIZAR DTO de Validación de Usuario**

El backend ahora retorna un nuevo campo `id` en la respuesta de validación:

**Response actualizado de `/api/movimientos-guardia/validar-usuario/{identificacion}`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",  // ⭐ NUEVO CAMPO
  "existe": true,
  "activo": true,
  "nombreCompleto": "OSCAR TOMAS",
  "username": "USER71_ICFE",
  "tipoIdentificacion": "CEDULA",
  "identificacion": "1073995282",
  "seccion": "Sección Principal",
  "restricciones": [],
  "vehiculos": [
    {
      "id": "uuid-vehiculo",
      "placa": "ABC123",
      "color": "Rojo",
      "marca": "Toyota",
      "modelo": "Corolla",
      "tipo": "AUTOMOVIL"
    }
  ],
  "tieneEntradaAbierta": false,
  "entradaAbierta": null
}
```

**Acción requerida:**
- Actualizar la interfaz TypeScript `ValidacionUsuarioDTO` para incluir el campo `id: string`

---

## 📝 CAMBIOS ESPECÍFICOS REQUERIDOS

### Archivo: `movimiento-guardia.service.ts` (o similar)

#### 1. Actualizar Interface `ValidacionUsuarioDTO`

**ANTES:**
```typescript
export interface ValidacionUsuarioDTO {
  existe: boolean;
  activo: boolean;
  nombreCompleto: string;
  username: string;
  tipoIdentificacion: string;
  identificacion: string;
  seccion: string;
  restricciones: string[];
  vehiculos: VehiculoInfoDTO[];
  tieneEntradaAbierta: boolean;
  entradaAbierta: MovimientoGuardiaResponse | null;
}
```

**DESPUÉS:**
```typescript
export interface ValidacionUsuarioDTO {
  id: string;  // ⭐ NUEVO - UUID del usuario
  existe: boolean;
  activo: boolean;
  nombreCompleto: string;
  username: string;
  tipoIdentificacion: string;
  identificacion: string;
  seccion: string;
  restricciones: string[];
  vehiculos: VehiculoInfoDTO[];
  tieneEntradaAbierta: boolean;
  entradaAbierta: MovimientoGuardiaResponse | null;
}
```

---

### Archivo: `control-ingreso-salida.component.ts`

#### 2. Cambiar cómo se construye el request de entrada/salida

**ANTES (INCORRECTO):**
```typescript
registrarEntrada() {
  const request = {
    guardiaId: this.guardiaActiva.id,
    usuarioId: this.identificacionBusqueda,  // ❌ Usa identificación
    vehiculoId: this.vehiculoSeleccionado?.id || null,
    adminGuardiaId: this.usuarioLogueado.id,
    observaciones: this.observaciones
  };
  
  this.movimientoService.registrarEntrada(request).subscribe(...);
}
```

**DESPUÉS (CORRECTO):**
```typescript
registrarEntrada() {
  const request = {
    guardiaId: this.guardiaActiva.id,
    usuarioId: this.validacionUsuario.id,  // ✅ Usa UUID del DTO
    vehiculoId: this.vehiculoSeleccionado?.id || null,
    adminGuardiaId: this.usuarioLogueado.id,
    observaciones: this.observaciones
  };
  
  this.movimientoService.registrarEntrada(request).subscribe(...);
}
```

#### 3. Guardar la validación completa en una propiedad del componente

**AGREGAR propiedad en el componente:**
```typescript
export class ControlIngresoSalidaComponent {
  // Propiedades existentes
  identificacionBusqueda: string = '';
  
  // ⭐ NUEVA propiedad para guardar la validación completa
  validacionUsuario: ValidacionUsuarioDTO | null = null;
  
  // ... resto del código
}
```

#### 4. Actualizar el método `buscarUsuario()` o `validarUsuario()`

**MODIFICAR para guardar la respuesta completa:**
```typescript
buscarUsuario() {
  if (!this.identificacionBusqueda) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Advertencia',
      detail: 'Debe ingresar una identificación'
    });
    return;
  }

  this.loading = true;
  
  this.movimientoService.validarUsuario(this.identificacionBusqueda)
    .pipe(finalize(() => this.loading = false))
    .subscribe({
      next: (validacion: ValidacionUsuarioDTO) => {
        console.log('Validación recibida:', validacion);
        
        // ⭐ GUARDAR la validación completa
        this.validacionUsuario = validacion;
        
        if (!validacion.existe) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Usuario no encontrado'
          });
          return;
        }
        
        if (!validacion.activo) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Usuario Inactivo',
            detail: `El usuario ${validacion.nombreCompleto} está inactivo`
          });
          return;
        }
        
        // Verificar entrada abierta y continuar con el flujo
        this.determinarTipoAccion(validacion);
      },
      error: (error) => {
        console.error('Error al validar usuario:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al validar usuario'
        });
      }
    });
}
```

#### 5. Actualizar método `registrarSalida()` si existe

**CAMBIAR de:**
```typescript
usuarioId: this.identificacionBusqueda  // ❌
```

**A:**
```typescript
usuarioId: this.validacionUsuario.id  // ✅
```

---

## 🔍 ENDPOINTS A CONSUMIR

### Base URL: `http://localhost:8080/api/movimientos-guardia`

### 1. **Validar Usuario** (GET)
```
GET /api/movimientos-guardia/validar-usuario/{identificacion}
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json
```

**Parámetros:**
- `identificacion` (string): Acepta UUID o número de identificación

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "existe": true,
  "activo": true,
  "nombreCompleto": "OSCAR TOMAS",
  "username": "USER71_ICFE",
  "tipoIdentificacion": "CEDULA",
  "identificacion": "1073995282",
  "seccion": "Sección Principal",
  "restricciones": [],
  "vehiculos": [...],
  "tieneEntradaAbierta": false,
  "entradaAbierta": null
}
```

---

### 2. **Registrar Entrada** (POST)
```
POST /api/movimientos-guardia/entrada
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json
```

**Request Body:**
```json
{
  "guardiaId": "b20ca23c-4649-494d-8d64-ee03faa11727",
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "vehiculoId": "a1b2c3d4-e5f6-4789-a012-345678901234",
  "adminGuardiaId": "b20ca23c-4649-494d-8d64-ee03faa11727",
  "observaciones": "Entrada normal"
}
```

**Campos:**
- `guardiaId` (UUID) - **REQUERIDO**
- `usuarioId` (UUID) - **REQUERIDO** ⚠️ **DEBE SER UUID, NO IDENTIFICACIÓN**
- `vehiculoId` (UUID) - **OPCIONAL** (puede ser `null`)
- `adminGuardiaId` (UUID) - **REQUERIDO**
- `observaciones` (string) - **OPCIONAL** (puede ser `null`)

**Response (201 CREATED):**
```json
{
  "id": "d40ec34e-6861-616f-0f86-001155cc3949",
  "organizacionId": "uuid-organizacion",
  "seccionId": "uuid-seccion",
  "guardiaId": "b20ca23c-4649-494d-8d64-ee03faa11727",
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "vehiculoId": "a1b2c3d4-e5f6-4789-a012-345678901234",
  "adminGuardiaId": "b20ca23c-4649-494d-8d64-ee03faa11727",
  "tipo": "ENTRADA",
  "timestampMovimiento": "2025-12-15T21:30:00Z",
  "observaciones": "Entrada normal",
  "entradaAsociadaId": null,
  "permanenciaMinutos": null,
  "registroVehiculoIncluido": true,
  "guardiaNombre": "Guardia Principal",
  "usuarioNombre": "OSCAR TOMAS",
  "vehiculoPlaca": "ABC123",
  "adminGuardiaNombre": "ADMIN USUARIO"
}
```

---

### 3. **Registrar Salida** (POST)
```
POST /api/movimientos-guardia/salida
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json
```

**Request Body:** Igual que entrada

**Response (200 OK):**
```json
{
  "id": "uuid-salida",
  "tipo": "SALIDA",
  "timestampMovimiento": "2025-12-15T23:45:00Z",
  "permanenciaMinutos": 135,
  "entradaAsociadaId": "uuid-entrada-asociada",
  ...
}
```

---

## 🔄 FLUJO ESPERADO

```
1. Usuario ingresa identificación en input
   ↓
2. Click en botón "Buscar" o "Validar"
   ↓
3. Frontend llama: GET /api/movimientos-guardia/validar-usuario/1073995282
   ↓
4. Backend responde con ValidacionUsuarioDTO (incluye campo "id")
   ↓
5. Frontend guarda la respuesta en: this.validacionUsuario
   ↓
6. Frontend verifica:
   - ¿Existe? → NO: Mostrar error
   - ¿Activo? → NO: Mostrar advertencia
   - ¿Tiene entrada abierta? → Determinar acción (ENTRADA o SALIDA)
   ↓
7. Usuario confirma acción (con o sin vehículo)
   ↓
8. Frontend construye request usando:
   - guardiaId: ID de la guardia activa
   - usuarioId: this.validacionUsuario.id  ← ⚠️ IMPORTANTE
   - vehiculoId: Vehículo seleccionado o null
   - adminGuardiaId: ID del usuario logueado
   - observaciones: Texto opcional
   ↓
9. Frontend llama: POST /api/movimientos-guardia/entrada (o /salida)
   ↓
10. Backend responde 201 CREATED (entrada) o 200 OK (salida)
    ↓
11. Frontend muestra mensaje de éxito y actualiza listado
```

---

## ⚠️ VALIDACIONES REQUERIDAS

### Frontend debe validar:

1. ✅ **Identificación no vacía** antes de llamar validación
2. ✅ **Usuario existe** (`validacion.existe === true`)
3. ✅ **Usuario activo** (`validacion.activo === true`)
4. ✅ **guardiaId no nulo** antes de registrar entrada/salida
5. ✅ **usuarioId es UUID válido** (del campo `validacion.id`)
6. ✅ **adminGuardiaId no nulo** (usuario logueado)

### Mensajes de error esperados:

| Condición | Severidad | Mensaje |
|-----------|----------|---------|
| Identificación vacía | `warn` | "Debe ingresar una identificación" |
| Usuario no existe | `error` | "Usuario no encontrado" |
| Usuario inactivo | `warn` | "El usuario {nombre} está inactivo" |
| Error 400 en entrada | `error` | "Error al registrar entrada. Verifique los datos" |
| Error 401/403 | `error` | "Sesión expirada. Inicie sesión nuevamente" |
| Error 500 | `error` | "Error del servidor. Intente nuevamente" |

---

## 🧪 CRITERIOS DE ACEPTACIÓN

### Debe cumplir:

- [ ] 1. La interfaz `ValidacionUsuarioDTO` incluye el campo `id: string`
- [ ] 2. El componente guarda la validación completa en `this.validacionUsuario`
- [ ] 3. Al registrar entrada, se envía `usuarioId: this.validacionUsuario.id`
- [ ] 4. Al registrar salida, se envía `usuarioId: this.validacionUsuario.id`
- [ ] 5. NO se envía la identificación como `usuarioId`
- [ ] 6. Se valida que el usuario existe antes de registrar movimiento
- [ ] 7. Se valida que el usuario está activo antes de registrar movimiento
- [ ] 8. Se muestra mensaje de error si `validacion.existe === false`
- [ ] 9. Se muestra advertencia si `validacion.activo === false`
- [ ] 10. El request de entrada/salida cumple con la estructura JSON requerida
- [ ] 11. Se manejan errores 400, 401, 403, 500 con mensajes apropiados
- [ ] 12. El campo `vehiculoId` se envía como `null` si no hay vehículo seleccionado
- [ ] 13. El campo `observaciones` se envía como `null` si está vacío
- [ ] 14. Al recibir 201 CREATED (entrada exitosa), se muestra mensaje de éxito
- [ ] 15. Al recibir 200 OK (salida exitosa), se muestra permanencia en minutos

---

## 🧪 CASOS DE PRUEBA

### Caso 1: Entrada exitosa sin vehículo
```
1. Ingresar identificación: "1073995282"
2. Click en "Buscar"
3. Verificar que se muestra información del usuario
4. Verificar que no tiene entrada abierta
5. Click en "Registrar Entrada" (sin seleccionar vehículo)
6. Verificar request enviado:
   {
     "guardiaId": "{uuid-guardia}",
     "usuarioId": "550e8400-e29b-41d4-a716-446655440000",  ← UUID
     "vehiculoId": null,
     "adminGuardiaId": "{uuid-admin}",
     "observaciones": null
   }
7. Verificar respuesta 201 CREATED
8. Verificar mensaje: "Entrada registrada exitosamente"
```

### Caso 2: Salida exitosa con vehículo
```
1. Ingresar identificación de usuario CON entrada abierta
2. Click en "Buscar"
3. Verificar que muestra "Usuario tiene entrada abierta"
4. Verificar que muestra opción de "Registrar Salida"
5. Seleccionar vehículo (si aplica)
6. Click en "Registrar Salida"
7. Verificar request enviado con usuarioId como UUID
8. Verificar respuesta 200 OK con permanenciaMinutos
9. Verificar mensaje: "Salida registrada. Permanencia: {X} minutos"
```

### Caso 3: Usuario no encontrado
```
1. Ingresar identificación inexistente: "9999999999"
2. Click en "Buscar"
3. Verificar respuesta con existe: false
4. Verificar mensaje de error: "Usuario no encontrado"
5. Verificar que NO se habilita botón de entrada/salida
```

### Caso 4: Usuario inactivo
```
1. Ingresar identificación de usuario inactivo
2. Click en "Buscar"
3. Verificar respuesta con activo: false
4. Verificar mensaje de advertencia: "El usuario {nombre} está inactivo"
5. Verificar que NO se habilita botón de entrada/salida
```

### Caso 5: Error 400 (datos inválidos)
```
1. Simular envío de usuarioId inválido (no UUID)
2. Verificar respuesta 400 Bad Request
3. Verificar mensaje: "Error al registrar entrada. Verifique los datos"
```

---

## 📚 DOCUMENTACIÓN DE REFERENCIA

- **API Completa:** `API-MOVIMIENTOS-GUARDIA-CONFIGURACION-COMPLETA.md`
- **Corrección Error 400:** `CORRECCION-ERROR-400-ENTRADA-FALTA-UUID-USUARIO-2025-12-15.md`
- **Base URL Backend:** `http://localhost:8080/api/movimientos-guardia`

---

## 📦 ENTREGABLES

1. ✅ Interfaz `ValidacionUsuarioDTO` actualizada con campo `id`
2. ✅ Componente `control-ingreso-salida.component.ts` modificado
3. ✅ Servicio `movimiento-guardia.service.ts` verificado
4. ✅ Pruebas unitarias actualizadas (si aplica)
5. ✅ Pruebas E2E de flujo completo entrada/salida
6. ✅ Logs de consola eliminados o comentados (environment production)

---

## ⏰ ESTIMACIÓN

- **Tiempo estimado:** 2-4 horas
- **Complejidad:** Media
- **Impacto:** Alto (bloqueante para módulo guardia)

---

## 👥 RESPONSABLES

- **Desarrollador Frontend:** [Asignar]
- **Revisor Técnico:** [Asignar]
- **QA:** [Asignar]
- **Backend (Soporte):** Completado ✅

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Actualización de Interfaces
- [ ] Actualizar `ValidacionUsuarioDTO` con campo `id: string`
- [ ] Verificar que no haya interfaces duplicadas
- [ ] Compilar sin errores TypeScript

### Fase 2: Modificación del Componente
- [ ] Agregar propiedad `validacionUsuario: ValidacionUsuarioDTO | null`
- [ ] Modificar método `buscarUsuario()` para guardar validación completa
- [ ] Actualizar método `registrarEntrada()` para usar `validacionUsuario.id`
- [ ] Actualizar método `registrarSalida()` para usar `validacionUsuario.id`
- [ ] Compilar sin errores

### Fase 3: Pruebas Locales
- [ ] Probar flujo de entrada sin vehículo
- [ ] Probar flujo de entrada con vehículo
- [ ] Probar flujo de salida
- [ ] Probar usuario no encontrado
- [ ] Probar usuario inactivo
- [ ] Verificar que NO se envía identificación como `usuarioId`

### Fase 4: Validación
- [ ] Revisar logs de consola del navegador
- [ ] Verificar request en Network tab (debe mostrar UUID en usuarioId)
- [ ] Verificar respuestas 201/200/400/404
- [ ] Confirmar mensajes de éxito/error apropiados

### Fase 5: Code Review
- [ ] Solicitar revisión de código
- [ ] Corregir observaciones
- [ ] Aprobar merge

### Fase 6: Deploy
- [ ] Deploy en ambiente de desarrollo
- [ ] Pruebas en desarrollo
- [ ] Deploy en staging
- [ ] Pruebas en staging
- [ ] Deploy en producción

---

## 🚨 RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Interfaces desactualizadas en otros componentes | Media | Bajo | Buscar referencias de `ValidacionUsuarioDTO` en todo el proyecto |
| Identificación usada en otros lugares | Alta | Alto | Hacer búsqueda global de `identificacionBusqueda` usado como `usuarioId` |
| Token expirado durante pruebas | Media | Bajo | Implementar refresh token automático |
| Vehículo requerido pero no seleccionado | Baja | Medio | Validar antes de enviar si el usuario tiene vehículos |

---

## 📞 CONTACTO Y SOPORTE

**Backend/API:**
- Documentación: Ver `API-MOVIMIENTOS-GUARDIA-CONFIGURACION-COMPLETA.md`
- Cambios recientes: Ver `CORRECCION-ERROR-400-ENTRADA-FALTA-UUID-USUARIO-2025-12-15.md`

**Frontend:**
- Implementador: [Pendiente asignar]
- Revisor: [Pendiente asignar]

---

## 📝 NOTAS ADICIONALES

1. **Campo `id` es obligatorio:** El backend siempre devuelve el campo `id` en la validación. Si es `null`, significa que el usuario no existe.

2. **Identificación vs UUID:** La identificación (cédula) es para BUSCAR al usuario. El UUID es para OPERAR con el usuario.

3. **Entradas abiertas:** Siempre verificar `tieneEntradaAbierta` antes de decidir si mostrar botón de entrada o salida.

4. **Vehículos opcionales:** El campo `vehiculoId` puede ser `null`. No es obligatorio registrar vehículo.

5. **Permanencia automática:** El backend calcula automáticamente la permanencia en minutos al registrar una salida.

---

**Última actualización:** 15 de diciembre de 2025  
**Versión:** 1.0  
**Estado:** 📝 PENDIENTE IMPLEMENTACIÓN

