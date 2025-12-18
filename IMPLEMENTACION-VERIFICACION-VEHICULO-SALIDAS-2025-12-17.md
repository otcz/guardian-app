# ✅ Implementación: Verificación de Vehículo en Salidas

**Fecha:** 2025-12-17  
**Estado:** ✅ COMPLETADO

---

## 📋 Requerimiento

**Para registrar la salida de un usuario, también se debe verificar si tiene vehículo.**

Si el usuario tiene vehículos asignados, se debe mostrar el modal de selección de vehículo, permitiendo:
1. Seleccionar un vehículo específico
2. Registrar la salida sin vehículo (peatón)
3. Auto-registrar sin vehículo si se agota el tiempo (15 segundos)

---

## 🔧 Cambios Implementados

### 1. ✅ Método `determinarTipoAccionTemporal()` - Actualizado

**Archivo:** `control-ingreso-salida.component.ts`

**Antes:**
```typescript
} else if (tipoConfigurado === 'SALIDA') {
  this.tipoAccion = 'SALIDA';
  this.registrarSalidaConModal();
}
```

**Después:**
```typescript
} else if (tipoConfigurado === 'SALIDA') {
  this.tipoAccion = 'SALIDA';
  
  // 🚗 Verificar si tiene vehículos para mostrar modal de selección
  const tieneVehiculos = (this.validacionUsuario.vehiculos?.length ?? 0) > 0;
  
  if (tieneVehiculos) {
    this.mostrarModalSeleccionVehiculoSalida();
  } else {
    this.registrarSalidaConModal();
  }
}
```

---

### 2. ✅ Flujo Backend con Acción SALIDA - Actualizado

**Método que determina la acción basada en respuesta del backend:**

**Antes:**
```typescript
if (accion === 'SALIDA') {
  this.registrarSalidaConModal();
}
```

**Después:**
```typescript
if (accion === 'SALIDA') {
  // 🚗 Verificar si tiene vehículos para mostrar modal de selección
  const tieneVehiculos = (validacion.vehiculos?.length ?? 0) > 0;
  
  if (tieneVehiculos) {
    this.mostrarModalSeleccionVehiculoSalida();
  } else {
    this.registrarSalidaConModal();
  }
}
```

---

### 3. ✅ Nuevo Método: `mostrarModalSeleccionVehiculoSalida()`

**Método específico para mostrar modal de selección de vehículo en SALIDA:**

```typescript
/**
 * 🚗 MOSTRAR MODAL DE SELECCIÓN DE VEHÍCULO PARA SALIDA
 */
mostrarModalSeleccionVehiculoSalida(): void {
  this.mostrarModalVehiculo = true;
  this.vehiculoSeleccionado = '';
  this.tiempoRestante = 15;

  // Iniciar cuenta regresiva
  this.intervalTimer = setInterval(() => {
    this.tiempoRestante--;

    if (this.tiempoRestante <= 0) {
      this.clearTimer();
      // Registrar salida SIN vehículo automáticamente
      this.registrarSalidaConModal();
    }
  }, 1000);
}
```

**Características:**
- ⏱️ Temporizador de 15 segundos
- 🚗 Permite seleccionar vehículo o continuar sin vehículo
- ⚡ Auto-registra SIN vehículo si expira el tiempo

---

### 4. ✅ Método `confirmarVehiculo()` - Actualizado

**Ahora maneja tanto ENTRADA como SALIDA:**

**Antes:**
```typescript
confirmarVehiculo(): void {
  this.clearTimer();
  
  if (this.vehiculoSeleccionado) {
    this.registrarEntradaConModal(this.vehiculoSeleccionado);
  } else {
    this.registrarEntradaConModal();
  }
}
```

**Después:**
```typescript
confirmarVehiculo(): void {
  this.clearTimer();

  if (this.tipoAccion === 'ENTRADA') {
    if (this.vehiculoSeleccionado) {
      this.registrarEntradaConModal(this.vehiculoSeleccionado);
    } else {
      this.registrarEntradaConModal();
    }
  } else if (this.tipoAccion === 'SALIDA') {
    if (this.vehiculoSeleccionado) {
      this.registrarSalidaConModal(this.vehiculoSeleccionado);
    } else {
      this.registrarSalidaConModal();
    }
  }
}
```

---

### 5. ✅ Método `cancelarModalVehiculo()` - Actualizado

**Ahora cancela según el tipo de acción:**

**Antes:**
```typescript
cancelarModalVehiculo(): void {
  this.clearTimer();
  this.registrarEntradaConModal();
}
```

**Después:**
```typescript
cancelarModalVehiculo(): void {
  this.clearTimer();
  
  if (this.tipoAccion === 'ENTRADA') {
    this.registrarEntradaConModal();
  } else if (this.tipoAccion === 'SALIDA') {
    this.registrarSalidaConModal();
  }
}
```

---

### 6. ✅ Método `registrarSalidaConModal()` - Actualizado

**Ahora acepta parámetro opcional de `vehiculoId`:**

**Firma actualizada:**
```typescript
registrarSalidaConModal(vehiculoId?: string): void
```

**DTO actualizado:**
```typescript
const dto: RegistrarSalidaDTO = {
  guardiaId: this.guardiaId,
  usuarioId: this.validacionUsuario.id,
  vehiculoId: vehiculoId || null,  // ✅ Ahora usa el parámetro
  adminGuardiaId: this.usuarioId,
  observaciones: this.observaciones || null
};
```

---

## 🔄 Flujo Completo de SALIDA

### Caso 1: Usuario SIN Vehículos

```
Usuario validado
       ↓
Backend retorna acción: SALIDA
       ↓
validacion.vehiculos.length === 0
       ↓
Llamar: registrarSalidaConModal()
       ↓
POST /salida con vehiculoId = null
       ↓
Modal de confirmación
```

---

### Caso 2: Usuario CON Vehículos - Selecciona Vehículo

```
Usuario validado
       ↓
Backend retorna acción: SALIDA
       ↓
validacion.vehiculos.length > 0
       ↓
Llamar: mostrarModalSeleccionVehiculoSalida()
       ↓
Modal con lista de vehículos + timer 15s
       ↓
Usuario selecciona vehículo
       ↓
Clic en "Confirmar"
       ↓
Llamar: confirmarVehiculo()
       ↓
registrarSalidaConModal(vehiculoId)
       ↓
POST /salida con vehiculoId = UUID
       ↓
Modal de confirmación
```

---

### Caso 3: Usuario CON Vehículos - NO Selecciona (Timeout)

```
Usuario validado
       ↓
Backend retorna acción: SALIDA
       ↓
validacion.vehiculos.length > 0
       ↓
Llamar: mostrarModalSeleccionVehiculoSalida()
       ↓
Modal con lista de vehículos + timer 15s
       ↓
Timer llega a 0
       ↓
Llamar: registrarSalidaConModal()
       ↓
POST /salida con vehiculoId = null
       ↓
Modal de confirmación
```

---

### Caso 4: Usuario CON Vehículos - Cancela Modal

```
Usuario validado
       ↓
Backend retorna acción: SALIDA
       ↓
validacion.vehiculos.length > 0
       ↓
Llamar: mostrarModalSeleccionVehiculoSalida()
       ↓
Modal con lista de vehículos + timer 15s
       ↓
Usuario hace clic en "Cancelar" o "X"
       ↓
Llamar: cancelarModalVehiculo()
       ↓
registrarSalidaConModal()
       ↓
POST /salida con vehiculoId = null
       ↓
Modal de confirmación
```

---

## 📤 Ejemplos de Request/Response

### Salida CON Vehículo

**Request:**
```json
POST /api/movimientos-guardia/salida

{
  "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
  "guardiaId": "660e8400-e29b-41d4-a716-446655440001",
  "vehiculoId": "770e8400-e29b-41d4-a716-446655440002",
  "observaciones": "Salida con vehículo ABC123"
}
```

**Response:** `200 OK`
```json
{
  "tipo": "SALIDA",
  "vehiculo": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "placa": "ABC123"
  },
  "permanenciaMinutos": 135
}
```

---

### Salida SIN Vehículo (Peatón)

**Request:**
```json
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
  "tipo": "SALIDA",
  "vehiculo": null,
  "permanenciaMinutos": 140
}
```

---

## 🎯 Validaciones del Backend

El backend valida automáticamente:

1. ✅ **Usuario activo** - Si `usuario.activo = false` → Error 400
2. ✅ **Vehículo activo** - Si `vehiculo.activo = false` → Error 400
3. ✅ **Vehículo NO bloqueado** - Si `vehiculo.bloqueado = true` → Error 400

**Nota:** Estas validaciones aplican tanto para ENTRADA como SALIDA.

---

## 📊 Comparativa: Antes vs Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Verificar vehículos en ENTRADA** | ✅ Sí | ✅ Sí |
| **Verificar vehículos en SALIDA** | ❌ No | ✅ Sí |
| **Modal de selección** | Solo ENTRADA | ENTRADA y SALIDA |
| **Registro sin vehículo** | Automático | Con opción de selección |
| **Temporizador** | 15s (solo entrada) | 15s (entrada y salida) |

---

## ✅ Beneficios

### Para el Usuario:
1. **Consistencia:** Mismo flujo para entrada y salida
2. **Flexibilidad:** Puede elegir vehículo o salir como peatón
3. **Control:** 15 segundos para decidir

### Para la Seguridad:
1. **Trazabilidad:** Se registra el vehículo usado en la salida
2. **Auditoría:** Se sabe exactamente con qué vehículo salió
3. **Validaciones:** Backend valida estado de vehículo

### Para el Sistema:
1. **Datos completos:** Información precisa de vehículos
2. **Reporte mejorado:** Se puede rastrear uso de vehículos
3. **Integridad:** Validaciones automáticas del backend

---

## 🧪 Casos de Prueba

### ✅ Test 1: SALIDA con Usuario SIN Vehículos
1. Validar usuario sin vehículos asignados
2. Verificar: NO se muestra modal de selección
3. Verificar: Se registra salida directamente
4. Verificar: `vehiculoId = null` en el DTO

### ✅ Test 2: SALIDA con Usuario CON Vehículos - Selecciona
1. Validar usuario con 2+ vehículos
2. Verificar: Se muestra modal de selección
3. Seleccionar un vehículo
4. Clic en "Confirmar"
5. Verificar: Se registra salida con el vehículo seleccionado

### ✅ Test 3: SALIDA con Usuario CON Vehículos - Timeout
1. Validar usuario con vehículos
2. Verificar: Se muestra modal con timer
3. Esperar 15 segundos sin seleccionar
4. Verificar: Se registra salida sin vehículo
5. Verificar: `vehiculoId = null` en el DTO

### ✅ Test 4: SALIDA con Usuario CON Vehículos - Cancela
1. Validar usuario con vehículos
2. Verificar: Se muestra modal
3. Clic en "Cancelar" o "X"
4. Verificar: Se registra salida sin vehículo

### ✅ Test 5: SALIDA con Vehículo Bloqueado
1. Validar usuario con vehículo bloqueado
2. Seleccionar el vehículo bloqueado
3. Intentar registrar salida
4. Verificar: Backend retorna Error 400
5. Verificar: Mensaje "vehículo está bloqueado"

---

## 📝 Notas de Implementación

### Modal Reutilizado:
- ✅ Se usa el mismo modal para ENTRADA y SALIDA
- ✅ El comportamiento cambia según `this.tipoAccion`
- ✅ Los métodos verifican el tipo de acción antes de proceder

### Temporizador:
- ⏱️ Siempre 15 segundos
- 🔄 Se limpia automáticamente al confirmar o cancelar
- ⚡ Auto-registra sin vehículo al expirar

### Validaciones:
- 🛡️ Frontend: Verifica si tiene vehículos
- 🛡️ Backend: Valida estado de usuario y vehículo
- 🛡️ Doble validación para mayor seguridad

---

## 🚀 Estado Final

- ✅ **Implementación completa** en `control-ingreso-salida.component.ts`
- ✅ **Sin errores de compilación** (solo warnings de código no usado)
- ✅ **Documentación actualizada** en `EJEMPLOS-RESPUESTAS-BACKEND-2025-12-17.md`
- ✅ **Flujo consistente** entre ENTRADA y SALIDA
- ✅ **Listo para producción**

---

**Autor:** Sistema Guardian  
**Fecha:** 2025-12-17  
**Estado:** ✅ COMPLETADO Y PROBADO

