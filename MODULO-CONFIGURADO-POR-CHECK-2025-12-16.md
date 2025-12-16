# ✅ MÓDULO CONFIGURADO POR TIPO DE MOVIMIENTO (CHECK)

**Fecha:** 2025-12-16  
**Cambio:** Lógica basada en configuración manual del operador  
**Estado:** ✅ IMPLEMENTADO

---

## 🎯 Requerimiento del Usuario

> El módulo estará situado para realizar un tipo de operación de acuerdo a la configuración del usuario:
> - Si el check está en **ENTRADA**, solo registrará entradas
> - Si el check está en **SALIDA**, solo registrará salidas

---

## ❌ Comportamiento Anterior (Automático)

### Problema
El sistema **decidía automáticamente** según `tieneEntradaAbierta`:
- Usuario con entrada abierta → Registraba SALIDA automáticamente
- Usuario sin entrada abierta → Registraba ENTRADA automáticamente
- **Ignoraba** el check de configuración

### Flujo Anterior
```
Usuario busca
  ↓
Sistema detecta: tieneEntradaAbierta = true
  ↓
Registra SALIDA (automático) ❌
  ↓
Ignora que el check está en ENTRADA
```

---

## ✅ Comportamiento Nuevo (Manual)

### Solución
El sistema **respeta la configuración del check** y valida que la operación sea posible:
- Check en **ENTRADA** → Solo registra entradas (valida que no tenga entrada abierta)
- Check en **SALIDA** → Solo registra salidas (valida que tenga entrada abierta)

### Flujo Nuevo

#### Escenario 1: Check en ENTRADA + Usuario SIN entrada abierta
```
Operador configura: Check = ENTRADA
Usuario busca
  ↓
Sistema valida: tieneEntradaAbierta = false ✅
  ↓
Registra ENTRADA ✅
```

#### Escenario 2: Check en ENTRADA + Usuario CON entrada abierta
```
Operador configura: Check = ENTRADA
Usuario busca
  ↓
Sistema valida: tieneEntradaAbierta = true ❌
  ↓
Muestra ERROR: "El usuario ya tiene una entrada abierta desde hace Xh Xm.
               Cambie el check a SALIDA o registre la salida primero."
  ↓
NO registra nada ❌
```

#### Escenario 3: Check en SALIDA + Usuario CON entrada abierta
```
Operador configura: Check = SALIDA
Usuario busca
  ↓
Sistema valida: tieneEntradaAbierta = true ✅
  ↓
Muestra INFO: "Entrada abierta detectada desde hace Xh Xm"
  ↓
Registra SALIDA ✅
```

#### Escenario 4: Check en SALIDA + Usuario SIN entrada abierta
```
Operador configura: Check = SALIDA
Usuario busca
  ↓
Sistema valida: tieneEntradaAbierta = false ❌
  ↓
Muestra ERROR: "El usuario NO tiene ninguna entrada abierta.
               Cambie el check a ENTRADA o registre una entrada primero."
  ↓
NO registra nada ❌
```

---

## 🔧 Cambios Implementados

### 1. Método `determinarTipoAccionTemporal()`

**Antes:**
```typescript
if (this.validacionUsuario.tieneEntradaAbierta) {
  this.tipoAccion = 'SALIDA';
  this.registrarSalidaConModal(); // Automático ❌
} else {
  this.tipoAccion = 'ENTRADA';
  this.registrarEntradaConModal(); // Automático ❌
}
```

**Ahora:**
```typescript
const tipoConfigurado = this.tipoMovimientoConfig; // ✅ Leer configuración

if (tipoConfigurado === 'ENTRADA') {
  // Validar que puede registrar entrada
  if (this.validacionUsuario.tieneEntradaAbierta) {
    // ❌ ERROR: Ya tiene entrada abierta
    this.messageService.add({ severity: 'error', ... });
    this.tipoAccion = 'BLOQUEADO';
    return;
  }
  // ✅ OK: Registrar entrada
  this.tipoAccion = 'ENTRADA';
  this.registrarEntradaConModal();
  
} else if (tipoConfigurado === 'SALIDA') {
  // Validar que puede registrar salida
  if (!this.validacionUsuario.tieneEntradaAbierta) {
    // ❌ ERROR: No tiene entrada abierta
    this.messageService.add({ severity: 'error', ... });
    this.tipoAccion = 'BLOQUEADO';
    return;
  }
  // ✅ OK: Registrar salida
  this.tipoAccion = 'SALIDA';
  this.registrarSalidaConModal();
}
```

### 2. Método `procesarAccionBackend()`

Similar lógica: valida consistencia entre configuración y estado del usuario.

### 3. Método `limpiarFormulario()`

**Antes:**
```typescript
this.tipoMovimientoConfig = 'ENTRADA'; // Reseteaba ❌
```

**Ahora:**
```typescript
// ✅ NO resetea tipoMovimientoConfig
// Mantiene la configuración del operador entre búsquedas
```

---

## 📊 Casos de Uso

### Caso 1: Módulo de ENTRADA (Guardia de acceso)
**Configuración:** Check = ENTRADA

**Operación:**
- Usuario 1 (sin entrada) → ✅ Registra entrada
- Usuario 2 (con entrada abierta) → ❌ Error: "Ya tiene entrada abierta, cambie check a SALIDA"

**Resultado:** Solo registra entradas válidas

---

### Caso 2: Módulo de SALIDA (Guardia de salida)
**Configuración:** Check = SALIDA

**Operación:**
- Usuario 1 (con entrada abierta) → ✅ Registra salida
- Usuario 2 (sin entrada) → ❌ Error: "No tiene entrada abierta, cambie check a ENTRADA"

**Resultado:** Solo registra salidas válidas

---

### Caso 3: Módulo Dual (Operador cambia según necesidad)
**Configuración:** Operador alterna el check según situación

**Operación:**
- Inicio del día → Check = ENTRADA → Registra entradas
- Fin del día → Check = SALIDA → Registra salidas
- Check permanece entre búsquedas (no se resetea)

**Resultado:** Módulo flexible controlado por operador

---

## ✅ Mensajes de Error/Info

### Error: Entrada No Permitida
```
❌ Entrada No Permitida

El usuario ya tiene una entrada abierta desde hace 2h 15m.
Cambie el check a SALIDA o registre la salida primero.
```

### Error: Salida No Permitida
```
❌ Salida No Permitida

El usuario NO tiene ninguna entrada abierta.
Cambie el check a ENTRADA o registre una entrada primero.
```

### Info: Entrada Abierta Detectada
```
ℹ️ Entrada Abierta Detectada

El usuario tiene una entrada abierta desde hace 2h 15m
```

---

## 🎯 Ventajas del Nuevo Comportamiento

1. ✅ **Control del operador:** El check decide qué se registra
2. ✅ **Módulos especializados:** Puede haber guardias solo de entrada o solo de salida
3. ✅ **Validación clara:** Errores descriptivos si la operación no es válida
4. ✅ **Configuración persistente:** El check no se resetea entre búsquedas
5. ✅ **Sin sorpresas:** No registra automáticamente algo diferente a lo configurado

---

## 📝 Logs en Consola

### Check = ENTRADA, Usuario sin entrada
```
🔵 Endpoint: POST /api/movimientos-guardia/entrada | Check: ENTRADA
```

### Check = SALIDA, Usuario con entrada
```
🟠 Endpoint: POST /api/movimientos-guardia/salida | Check: SALIDA
```

### Check = ENTRADA, Usuario CON entrada (ERROR)
```
(No se llama a ningún endpoint)
Toast Error: "❌ Entrada No Permitida..."
```

### Check = SALIDA, Usuario SIN entrada (ERROR)
```
(No se llama a ningún endpoint)
Toast Error: "❌ Salida No Permitida..."
```

---

## ✅ Estado Final

- **Compilación:** ✅ Sin errores
- **Lógica:** ✅ Basada en configuración manual (check)
- **Validación:** ✅ Errores claros si operación no válida
- **Check:** ✅ Persiste entre búsquedas
- **Endpoint:** ✅ Solo se llama si configuración es válida

---

**El módulo ahora funciona según la configuración del operador, no automáticamente.** ✅

