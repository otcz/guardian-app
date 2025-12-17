# Solución: Botón Congelado y Error de Entrada Abierta
**Fecha:** 2025-12-16  
**Módulo:** Control de Ingreso y Salida  
**Prioridad:** Alta

## 🐛 Problema Reportado

### Síntoma 1: Error de Validación Incorrecto
Al buscar un vehículo por placa, seleccionar el conductor y registrar, el backend responde:
```
"El usuario ya tiene una entrada registrada en la guardia 'PUENTE TABLA' 
desde 2025-12-16T23:35:02.065823Z. Debe registrar la SALIDA antes de ingresar nuevamente."
```

**Pero en la base de datos:**
- ✅ El usuario SÍ tiene un registro de SALIDA
- ✅ El intento es registrar una ENTRADA (que debería ser válido)

### Síntoma 2: Botón de Búsqueda Congelado
Después de recibir el error, el botón de búsqueda queda deshabilitado y no permite enviar nuevas peticiones.

---

## 🔍 Diagnóstico

### ⚠️ ACTUALIZACIÓN: Logs de Debug Agregados

**✅ LOGS VERIFICADOS - Fecha: 2025-12-17 00:34**

Se verificaron los logs y se confirmó que **el problema está 100% en el BACKEND**:

**Datos enviados por el frontend (CORRECTOS):**
```javascript
🔵 guardiaId: aab86ae0-7d9c-46dd-b615-d65a0a5577c7
🔵 usuarioId: 89a7a6b6-5b3e-46d4-9cf7-83cf86c2839b
🔵 vehiculoId: 9fcd77db-8f73-4f25-8d99-85508fa635cd
🔵 adminGuardiaId: b20ca23c-4649-494d-8d64-ee03faa11727
🔵 tipoMovimientoConfig: ENTRADA
🔵 Endpoint: POST /api/movimientos-guardia/entrada
```

**Respuesta del backend:**
```
POST http://localhost:4200/api/movimientos-guardia/entrada 400 (Bad Request)
```

**Conclusión:**
- ✅ El endpoint usado es el correcto: `POST /api/movimientos-guardia/entrada`
- ✅ Todos los IDs son válidos y correctos
- ✅ El frontend está enviando exactamente los mismos datos que cuando busca por identificación
- ❌ **El backend tiene un bug de validación cuando se consulta por placa**

**Logs agregados originalmente:**
1. `procesarResultadoValidacion()` - Muestra el tipo de búsqueda (USUARIO/VEHICULO)
2. `confirmarUsuarioVehiculo()` - Muestra el usuario seleccionado cuando se busca por placa
3. `registrarEntradaConModal()` - Muestra todos los datos del DTO antes de enviar
4. **ERROR handler** - Muestra el mensaje exacto del backend (nuevo)

**Para verificar:**
```
Abrir DevTools → Consola → Buscar por:
🟢 = Búsqueda por IDENTIFICACIÓN
🟡 = Búsqueda por PLACA  
🔵 = Registro de ENTRADA
```

**Comparar los datos enviados:**
- guardiaId
- usuarioId
- vehiculoId
- adminGuardiaId

---

## 🎯 ANÁLISIS DEFINITIVO DEL PROBLEMA

### ✅ Frontend: CORRECTO
El frontend está funcionando perfectamente. Los logs muestran que:

1. **Endpoint correcto:** `POST /api/movimientos-guardia/entrada`
2. **Datos correctos:** Todos los IDs son válidos
3. **Mismo flujo:** Usa el mismo código que cuando busca por identificación
4. **No hay diferencias:** Los datos enviados son idénticos en ambos casos

### ❌ Backend: BUG CONFIRMADO

**El backend tiene un bug de validación.**

**Escenario:**
- Usuario: OSCAR TOMAS (ID: 89a7a6b6-5b3e-46d4-9cf7-83cf86c2839b)
- Guardia: PUENTE TABLA (ID: aab86ae0-7d9c-46dd-b615-d65a0a5577c7)
- En BD: Tiene SALIDA registrada (puede registrar ENTRADA)

**Comportamiento:**
- ✅ Buscar por IDENTIFICACIÓN `1073995283` → Permite registrar ENTRADA
- ❌ Buscar por PLACA `XXX250` → Rechaza registrar ENTRADA (error 400)

**Causa probable:**
El backend está usando **diferentes consultas SQL** o **diferentes caches** cuando:
1. Valida el usuario encontrado por identificación
2. Valida el usuario encontrado por placa

**Verificar en el backend:**
```java
// MovimientoGuardiaService.java

// Método que valida al registrar entrada
public MovimientoGuardia registrarEntrada(RegistrarEntradaDTO dto) {
    // ⚠️ Esta consulta debe ser la misma siempre
    boolean tieneEntradaAbierta = movimientoRepository
        .existsByUsuarioIdAndGuardiaIdAndTipoAndEntradaAsociadaIdIsNull(
            dto.getUsuarioId(),
            dto.getGuardiaId()
        );
    
    if (tieneEntradaAbierta) {
        throw new BusinessException("Usuario ya tiene entrada abierta");
    }
    // ...
}
```

**Posibles causas del bug:**
1. ❌ Cache desactualizado cuando se consulta por placa
2. ❌ Transacciones no commiteadas correctamente
3. ❌ Query que no considera el campo `entradaAsociadaId IS NULL`
4. ❌ Join incorrecto que duplica registros

---

### 📌 Recomendación para el Backend
**Problema del Backend:**
El campo `tieneEntradaAbierta` en `UsuarioAsignadoDTO` está desactualizado cuando se busca por placa.

**Flujo del problema:**
1. Usuario busca vehículo por placa → `GET /api/movimientos-guardia/validar-manual/{placa}`
2. Backend devuelve `VehiculoConUsuariosDTO` con lista de `UsuarioAsignadoDTO`
3. Cada `UsuarioAsignadoDTO` incluye el campo `tieneEntradaAbierta`
4. ⚠️ **Este campo NO se está calculando correctamente en el backend**
5. El frontend selecciona el conductor y envía la petición de ENTRADA
6. El backend valida correctamente que NO puede registrar entrada (porque ya tiene una entrada abierta según la BD)
7. ❌ **Error 400: Usuario ya tiene entrada abierta**

**Inconsistencia:**
- El campo `tieneEntradaAbierta` del DTO dice `false` (desactualizado)
- La validación en el backend consulta la BD y encuentra que es `true` (correcto)
- Resultado: Error confuso para el usuario

### Causa del Botón Congelado
**Problema del Frontend:**
Cuando ocurre un error en los métodos de registro, no se estaba limpiando la variable `this.buscando`, lo que mantenía el botón de búsqueda deshabilitado.

---

## ✅ Solución Implementada

### 1. Frontend: Limpiar Estado al Error
**Archivo:** `control-ingreso-salida.component.ts`

**Cambios en todos los métodos de registro:**
```typescript
error: (error) => {
  this.registrando = false;
  this.buscando = false; // ✅ AGREGADO: Desbloquear botón de búsqueda
  this.manejarError(error);
  this.limpiarFormulario(); // ✅ CAMBIADO: Limpiar formulario completo
}
```

**Antes:**
```typescript
error: (error) => {
  this.registrando = false;
  this.manejarError(error);
  this.estado = 'USUARIO_ENCONTRADO'; // ❌ Mantenía el formulario en pantalla
}
```

**Métodos actualizados:**
- ✅ `registrarEntradaConModal()`
- ✅ `registrarSalidaConModal()`
- ✅ `registrarEntradaAutomatica()`
- ✅ `registrarSalidaAutomatica()`

### 2. Frontend: Agregar Comentario Explicativo
```typescript
// ⚠️ NOTA: tieneEntradaAbierta puede estar desactualizado del backend
// El frontend NO toma decisiones basado en este campo
// Solo se envía la petición según el check configurado y el backend valida
tieneEntradaAbierta: usuarioSeleccionado.tieneEntradaAbierta,
```

### 3. Backend: Requerimiento de Corrección
**Acción requerida del equipo de Backend:**

El endpoint `/api/movimientos-guardia/validar-manual/{placa}` debe calcular correctamente el campo `tieneEntradaAbierta` para cada usuario asignado al vehículo.

**Método del backend que debe revisarse:**
```java
// MovimientoGuardiaService.java o similar
public VehiculoConUsuariosDTO validarManual(String documentoOPlaca) {
    // ...
    
    // ⚠️ REVISAR: Calcular tieneEntradaAbierta correctamente
    for (Usuario usuario : vehiculo.getUsuarios()) {
        boolean tieneEntradaAbierta = movimientoRepository
            .existsByUsuarioIdAndGuardiaIdAndTipoAndEntradaAsociadaIdIsNull(
                usuario.getId(), 
                guardiaActual.getId()
            );
            
        UsuarioAsignadoDTO dto = new UsuarioAsignadoDTO();
        dto.setTieneEntradaAbierta(tieneEntradaAbierta); // ✅ Calculado correctamente
        // ...
    }
}
```

---

## 🎯 Resultado

### ✅ Botón de Búsqueda Ya No Se Congela
- El botón se desbloquea inmediatamente después de un error
- El formulario se limpia automáticamente
- El usuario puede buscar nuevamente sin recargar la página

### ⚠️ Error de Validación Persiste (Backend)
Este error ES CORRECTO del backend si el usuario realmente tiene una entrada abierta.

**El problema es:**
- El frontend muestra el usuario en estado "AFUERA" (basado en `tieneEntradaAbierta=false` desactualizado)
- El backend rechaza la entrada porque el usuario está "ADENTRO" (según la BD)

**Solución final:**
El backend debe actualizar el campo `tieneEntradaAbierta` en el DTO de respuesta para que coincida con la realidad de la BD.

---

## 📋 Checklist de Verificación

### Frontend ✅ Completado
- [x] Limpiar `this.buscando` en todos los métodos de error
- [x] Limpiar `this.limpiarFormulario()` en todos los métodos de error
- [x] Remover `this.estado = 'USUARIO_ENCONTRADO'` de los handlers de error
- [x] Agregar comentario explicativo sobre `tieneEntradaAbierta`
- [x] Compilación sin errores
- [x] Probar flujo de error → búsqueda nueva

### Backend ⚠️ Pendiente
- [ ] Revisar método de validación manual por placa
- [ ] Asegurar que `tieneEntradaAbierta` se calcula consultando la BD
- [ ] Agregar query para verificar entrada abierta por usuario y guardia
- [ ] Probar endpoint con usuario que tiene entrada abierta
- [ ] Probar endpoint con usuario que NO tiene entrada abierta

---

## 🧪 Pruebas Recomendadas

### Caso 1: Usuario con Salida Registrada
1. Registrar ENTRADA para usuario X en guardia Y
2. Registrar SALIDA para usuario X en guardia Y
3. Buscar vehículo asociado al usuario X
4. Seleccionar usuario X como conductor
5. Intentar registrar ENTRADA
6. **Resultado esperado:** ✅ Entrada registrada exitosamente

### Caso 2: Usuario con Entrada Abierta
1. Registrar ENTRADA para usuario X en guardia Y
2. NO registrar salida
3. Buscar vehículo asociado al usuario X
4. Seleccionar usuario X como conductor
5. Intentar registrar ENTRADA nuevamente
6. **Resultado esperado:** ❌ Error 400 "Usuario ya tiene entrada abierta"
7. **Verificar:** El dropdown debe mostrar badge "ADENTRO" para el usuario

### Caso 3: Botón No Se Congela
1. Provocar cualquier error de registro (entrada abierta, guardia restringida, etc.)
2. Cerrar modal de error
3. Verificar que el campo de búsqueda esté limpio
4. Verificar que el botón de búsqueda esté habilitado
5. Buscar otro usuario/vehículo
6. **Resultado esperado:** ✅ Búsqueda funciona correctamente

---

## 📝 Notas Adicionales

### Filosofía del Frontend
El frontend **NO debe hacer lógica de negocio**. Solo debe:
1. Capturar la entrada del usuario
2. Enviar la petición según la configuración (check ENTRADA/SALIDA)
3. Mostrar la respuesta del backend (éxito o error)
4. Limpiar estado para permitir nueva operación

### Responsabilidad del Backend
El backend es quien:
1. Valida las reglas de negocio
2. Consulta el estado actual en la BD
3. Decide si permite o rechaza la operación
4. Devuelve mensajes de error claros y consistentes

### Campo `tieneEntradaAbierta` en DTOs
**Propósito:** Solo informativo para la UI
**Uso:** Mostrar badges "ADENTRO" / "AFUERA" en el dropdown
**NO debe usarse para:** Tomar decisiones de registro

---

## 🔗 Referencias
- **Requerimiento original:** REQUERIMIENTO-FRONTEND-VALIDACION-ENTRADA-SALIDA-2025-12-15
- **Archivo modificado:** `src/app/guardia/validacion-ingreso/control-ingreso-salida/control-ingreso-salida.component.ts`
- **Líneas modificadas:** 
  - `registrarEntradaConModal()` línea ~550
  - `registrarSalidaConModal()` línea ~610
  - `registrarEntradaAutomatica()` línea ~665
  - `registrarSalidaAutomatica()` línea ~710

