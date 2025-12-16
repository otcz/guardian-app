# 🔍 Análisis: Procesamiento de Datos en Frontend - Módulo Guardia

**Fecha:** 15 de diciembre de 2025  
**Componente:** `control-ingreso-salida.component.ts`  
**Problema:** El frontend está realizando procesamiento de lógica de negocio que debería hacer el backend

---

## ❌ PROBLEMAS IDENTIFICADOS

### 1. **FILTRADO DE GUARDIAS ACTIVAS** (Líneas 188-196)

**Código Actual:**
```typescript
const guardiasActivas = guardiasUsuario.filter(gu => {
  const esAsignada = gu.asignada === true;
  const noRestringida = gu.restringida === false;
  const estaActiva = gu.guardia?.activa !== false;
  return esAsignada && noRestringida && estaActiva;
});
```

**❌ Problema:**
- El frontend está **filtrando** guardias según lógica de negocio
- El backend envía datos que el frontend luego descarta
- La lógica de qué guardias son "disponibles" debería estar en el backend

**✅ Solución:**
- El endpoint `listarDisponiblesPorUsuario()` **YA DEBE** devolver solo las guardias válidas
- Si el backend envía guardias no asignadas/restringidas/inactivas, el backend está mal
- El frontend solo debe **mostrar** lo que recibe

---

### 2. **CONSTRUCCIÓN DE OBJETOS GUARDIA** (Líneas 230-245)

**Código Actual:**
```typescript
this.guardias = guardiasActivas.map(gu => {
  if (gu.guardia) {
    return gu.guardia;
  } else {
    const guAny: any = gu;
    return {
      id: gu.guardiaId,
      codigo: guAny.guardiaCodigo || '',
      nombre: guAny.guardiaNombre || 'Sin nombre',
      seccionId: gu.seccionId,
      organizacionId: gu.organizacionId,
      activa: true // ❌ Asumimos activa porque pasó el filtro
    } as Guardia;
  }
});
```

**❌ Problema:**
- El frontend está **transformando/construyendo** objetos según la estructura recibida
- Está **asumiendo** valores (`activa: true`, `'Sin nombre'`)
- Está compensando por inconsistencias en la respuesta del backend

**✅ Solución:**
- El backend debe **siempre** devolver el objeto `guardia` completo y consistente
- No debe haber campos "planos" vs "anidados"
- El frontend solo debe mapear directamente: `guardiasUsuario.map(gu => gu.guardia)`

---

### 3. **DETERMINACIÓN DE TIPO DE ACCIÓN** (Líneas 329-364)

**Código Actual:**
```typescript
determinarTipoAccion(): void {
  if (!this.validacionUsuario) return;

  // Verificar si está activo
  if (!this.validacionUsuario.activo) {
    this.tipoAccion = 'BLOQUEADO';
    return;
  }

  // Verificar si tiene restricción en esta guardia
  const tieneRestriccion = this.validacionUsuario.restricciones.some(r =>
    r.includes(this.guardiaId)
  );

  if (tieneRestriccion) {
    this.tipoAccion = 'BLOQUEADO';
    return;
  }

  // Determinar si es entrada o salida según si tiene entrada abierta
  if (this.validacionUsuario.tieneEntradaAbierta) {
    this.tipoAccion = 'SALIDA';
  } else {
    this.tipoAccion = 'ENTRADA';
  }
}
```

**❌ Problema:**
- El frontend está **decidiendo** qué acción es válida (ENTRADA/SALIDA/BLOQUEADO)
- Está **evaluando** restricciones y estado de usuario
- Esta es **lógica de negocio** pura

**✅ Solución:**
- El endpoint `validarUsuario()` debe devolver:
  ```typescript
  {
    accionPermitida: 'ENTRADA' | 'SALIDA' | 'BLOQUEADO',
    motivoBloqueo?: string,
    // ... resto de datos
  }
  ```
- El frontend solo debe **mostrar** lo que el backend decidió

---

### 4. **CÁLCULO DE TIEMPO TRANSCURRIDO** (Líneas 822-840)

**Código Actual:**
```typescript
calcularTiempoTranscurrido(): { horas: number; minutos: number } {
  if (!this.validacionUsuario?.entradaAbierta) {
    return { horas: 0, minutos: 0 };
  }

  const timestamp = this.validacionUsuario.entradaAbierta.timestampMovimiento;
  if (!timestamp) {
    return { horas: 0, minutos: 0 };
  }

  const entrada = new Date(timestamp);
  const ahora = new Date();
  const diff = ahora.getTime() - entrada.getTime();
  const minutosTotales = Math.floor(diff / 60000);
  const horas = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;

  return { horas, minutos };
}
```

**⚠️ Problema Menor:**
- El cálculo es **UI-only** para mostrar tiempo en interfaz
- No afecta lógica de negocio

**✅ Solución (Opcional):**
- Podría ser calculado por el backend y enviado como `permanenciaActual: { horas, minutos }`
- **PERO** es aceptable en frontend si es solo para UI

---

## 📋 RECOMENDACIONES

### **CRÍTICO - Refactorizar Backend**

1. **Endpoint `listarDisponiblesPorUsuario`:**
   ```typescript
   // ✅ Debe devolver SOLO guardias válidas
   GET /api/guardia-usuario/disponibles/{usuarioId}
   Response: [
     {
       guardiaId: string,
       guardia: {  // ✅ SIEMPRE objeto completo
         id: string,
         codigo: string,
         nombre: string,
         seccionId: string,
         organizacionId: string,
         activa: boolean
       },
       asignada: true,      // ✅ Solo incluir si es true
       restringida: false   // ✅ Solo incluir si es false
     }
   ]
   ```

2. **Endpoint `validarUsuario`:**
   ```typescript
   POST /api/movimientos/validar-usuario
   Body: { identificador: string, guardiaId: string }  // ✅ Incluir guardiaId
   Response: {
     existe: boolean,
     usuario: { ... },
     accionPermitida: 'ENTRADA' | 'SALIDA' | 'BLOQUEADO',  // ✅ NUEVO
     motivoBloqueo?: string,                                // ✅ NUEVO
     tieneEntradaAbierta: boolean,
     entradaAbierta?: {
       permanenciaActual?: { horas: number, minutos: number }  // ✅ OPCIONAL
     }
   }
   ```

### **MEDIO - Refactorizar Frontend**

```typescript
// ✅ Simplificar cargarGuardiaUsuario()
cargarGuardiaUsuario(): void {
  this.guardiaUsuarioService.listarDisponiblesPorUsuario(this.usuarioId).subscribe({
    next: (guardias) => {
      // ✅ Sin filtros, el backend ya envía solo las válidas
      if (guardias.length === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Sin Guardias Asignadas',
          detail: 'No tienes guardias activas. Contacta al administrador.'
        });
        return;
      }

      // ✅ Sin transformación, el backend envía estructura consistente
      if (guardias.length === 1) {
        this.guardiaId = guardias[0].guardiaId;
        this.messageService.add({
          severity: 'success',
          summary: 'Bienvenido',
          detail: `${this.nombreGuardiaUsuario} - ${guardias[0].guardia.nombre}`
        });
      } else {
        this.guardias = guardias.map(g => g.guardia);  // ✅ Mapeo directo
      }
    }
  });
}

// ✅ Eliminar determinarTipoAccion()
buscarUsuario(): void {
  this.movimientoService.validarUsuario(this.identificador, this.guardiaId).subscribe({
    next: (validacion) => {
      this.validacionUsuario = validacion;
      
      // ✅ El backend ya decidió qué hacer
      switch (validacion.accionPermitida) {
        case 'ENTRADA':
          this.mostrarOpcionesEntrada();
          break;
        case 'SALIDA':
          this.registrarSalidaConModal();
          break;
        case 'BLOQUEADO':
          this.mostrarMensajeBloqueo(validacion.motivoBloqueo);
          break;
      }
    }
  });
}
```

---

## 📊 RESUMEN

| Problema | Severidad | Ubicación | Solución |
|----------|-----------|-----------|----------|
| Filtrado de guardias activas | 🔴 CRÍTICO | Línea 188 | Backend debe filtrar |
| Construcción de objetos Guardia | 🔴 CRÍTICO | Línea 230 | Backend debe enviar estructura consistente |
| Determinación de tipo de acción | 🔴 CRÍTICO | Línea 329 | Backend debe decidir acción permitida |
| Cálculo de tiempo transcurrido | 🟡 MENOR | Línea 822 | Aceptable en frontend (solo UI) |

---

## ✅ PRINCIPIO RECTOR

> **El frontend es una capa de presentación.**  
> **Toda lógica de negocio debe estar en el backend.**  
> **El frontend solo debe mostrar lo que el backend envía.**

---

## 🎯 PRÓXIMOS PASOS

1. ✅ **Documentar cambios necesarios en backend**
2. ⏳ **Crear issues para refactorización de endpoints**
3. ⏳ **Refactorizar frontend después de cambios en backend**
4. ⏳ **Testing de integración**

---

**Responsables:**
- Backend: Refactorizar endpoints
- Frontend: Simplificar componente después de cambios en backend

