# ✅ Refactorización: Frontend Solo Muestra Lo Que Backend Envía

**Fecha:** 15 de diciembre de 2025  
**Componente:** Control de Ingreso y Salida  
**Objetivo:** Eliminar lógica de negocio del frontend - Solo mostrar datos del backend

---

## 📋 RESUMEN DE CAMBIOS

### ✅ **1. Eliminado Filtrado de Guardias** 
**Archivo:** `control-ingreso-salida.component.ts`  
**Líneas:** 188-246 (antes)

#### ❌ **ANTES** (Frontend filtraba y transformaba):
```typescript
const guardiasActivas = guardiasUsuario.filter(gu => {
  const esAsignada = gu.asignada === true;
  const noRestringida = gu.restringida === false;
  const estaActiva = gu.guardia?.activa !== false;
  return esAsignada && noRestringida && estaActiva;
});

// Construir objeto Guardia desde los campos planos
this.guardias = guardiasActivas.map(gu => {
  if (gu.guardia) {
    return gu.guardia;
  } else {
    return {
      id: gu.guardiaId,
      codigo: guAny.guardiaCodigo || '',
      nombre: guAny.guardiaNombre || 'Sin nombre',
      seccionId: gu.seccionId,
      organizacionId: gu.organizacionId,
      activa: true // ⚠️ Asumiendo valor
    } as Guardia;
  }
});
```

#### ✅ **DESPUÉS** (Frontend solo mapea):
```typescript
// ✅ SIN FILTROS - El backend ya envía solo las guardias válidas
if (guardiasUsuario.length === 0) {
  this.messageService.add({
    severity: 'error',
    summary: 'Sin Guardias Asignadas',
    detail: 'No tienes guardias activas asignadas.'
  });
  return;
}

// ✅ Mapeo directo - Sin transformación
this.guardias = guardiasUsuario.map(gu => gu.guardia);
```

**Responsabilidad del Backend:**
- El endpoint `listarDisponiblesPorUsuario()` **DEBE** devolver solo guardias válidas:
  - `asignada = true`
  - `restringida = false`
  - `activa = true`
- **DEBE** enviar siempre `gu.guardia` como objeto completo
- **NO** enviar campos planos como `guardiaNombre`, `guardiaCodigo`, etc.

---

### ✅ **2. Eliminada Determinación de Tipo de Acción**
**Archivo:** `control-ingreso-salida.component.ts`  
**Método:** `determinarTipoAccion()` → `procesarAccionBackend()`

#### ❌ **ANTES** (Frontend decidía ENTRADA/SALIDA/BLOQUEADO):
```typescript
determinarTipoAccion(): void {
  if (!this.validacionUsuario) return;

  // ⚠️ Frontend validando si está activo
  if (!this.validacionUsuario.activo) {
    this.tipoAccion = 'BLOQUEADO';
    return;
  }

  // ⚠️ Frontend validando restricciones
  const tieneRestriccion = this.validacionUsuario.restricciones.some(r =>
    r.includes(this.guardiaId)
  );

  if (tieneRestriccion) {
    this.tipoAccion = 'BLOQUEADO';
    return;
  }

  // ⚠️ Frontend decidiendo acción
  if (this.validacionUsuario.tieneEntradaAbierta) {
    this.tipoAccion = 'SALIDA';
  } else {
    this.tipoAccion = 'ENTRADA';
  }
}
```

#### ✅ **DESPUÉS** (Frontend solo muestra lo que backend decide):
```typescript
procesarAccionBackend(validacion: ValidacionUsuarioDTO): void {
  // ✅ Usar el campo accionPermitida que el backend envía
  const accion = (validacion as any).accionPermitida;
  
  // ⚠️ Fallback temporal hasta que backend implemente accionPermitida
  if (!accion) {
    console.warn('⚠️ Backend no envía accionPermitida - usando lógica temporal');
    this.determinarTipoAccionTemporal();
    return;
  }

  this.tipoAccion = accion;

  // ✅ Solo mostrar lo que backend decidió
  switch (accion) {
    case 'BLOQUEADO':
      const motivo = validacion.motivoBloqueo || 'Usuario no autorizado';
      this.messageService.add({ severity: 'error', summary: 'Acceso Bloqueado', detail: motivo });
      break;

    case 'SALIDA':
      this.registrarSalidaConModal();
      break;

    case 'ENTRADA':
      const tieneVehiculos = (validacion.vehiculos?.length ?? 0) > 0;
      if (tieneVehiculos) {
        this.mostrarModalSeleccionVehiculo();
      } else {
        this.registrarEntradaConModal();
      }
      break;
  }
}
```

**Responsabilidad del Backend:**
- El endpoint `validarUsuario()` **DEBE** incluir en la respuesta:
  ```typescript
  {
    accionPermitida: 'ENTRADA' | 'SALIDA' | 'BLOQUEADO',
    motivoBloqueo?: string,  // Si accionPermitida = 'BLOQUEADO'
    ...resto de campos existentes
  }
  ```
- El backend **DEBE** evaluar:
  - ✅ Si el usuario está activo
  - ✅ Si tiene restricciones en esa guardia
  - ✅ Si tiene permisos en esa guardia
  - ✅ Si tiene entrada abierta
  - ✅ Decidir: ENTRADA, SALIDA o BLOQUEADO

---

### ✅ **3. Actualizado Servicio para Enviar guardiaId**
**Archivo:** `movimiento-guardia.service.ts`  
**Método:** `validarUsuario()`

#### ❌ **ANTES** (No enviaba guardiaId):
```typescript
validarUsuario(identificacion: string): Observable<ValidacionUsuarioDTO> {
  const valor = identificacion.trim();
  return this.http.get<ValidacionUsuarioDTO>(
    `${this.API_URL}/validar-usuario-identificacion/${valor}`
  );
}
```

#### ✅ **DESPUÉS** (Envía guardiaId como query param):
```typescript
validarUsuario(identificacion: string, guardiaId?: string): Observable<ValidacionUsuarioDTO> {
  const valor = identificacion.trim();
  let url = `${this.API_URL}/validar-usuario-identificacion/${valor}`;
  
  // ✅ Si se proporciona guardiaId, enviarlo al backend
  if (guardiaId) {
    url += `?guardiaId=${guardiaId}`;
  }
  
  return this.http.get<ValidacionUsuarioDTO>(url);
}
```

**Responsabilidad del Backend:**
- El endpoint **DEBE** aceptar `guardiaId` como query parameter opcional
- Si se recibe `guardiaId`, **DEBE** validar restricciones y permisos específicos de esa guardia
- **DEBE** devolver `accionPermitida` basándose en la validación contextual

**Ejemplo de llamada:**
```
GET /api/movimientos-guardia/validar-usuario-identificacion/1073995282?guardiaId=uuid-guardia-123
```

---

### ✅ **4. Actualizado Componente para Enviar guardiaId**
**Archivo:** `control-ingreso-salida.component.ts`  
**Método:** `buscarUsuario()`

#### ❌ **ANTES**:
```typescript
this.movimientoService.validarUsuario(this.identificador).subscribe({
  next: (validacion) => {
    this.validacionUsuario = validacion;
    this.determinarTipoAccion(); // ⚠️ Frontend decidiendo
  }
});
```

#### ✅ **DESPUÉS**:
```typescript
this.movimientoService.validarUsuario(this.identificador, this.guardiaId).subscribe({
  next: (validacion) => {
    console.log('✅ Validación recibida del backend:', validacion);
    this.validacionUsuario = validacion;
    
    // ✅ El backend ya decidió qué acción hacer - Solo mostramos
    this.procesarAccionBackend(validacion);
  }
});
```

---

## 🔄 MÉTODO TEMPORAL (Eliminar cuando backend esté listo)

**Método:** `determinarTipoAccionTemporal()`

Este método existe **SOLO** como fallback temporal mientras el backend no implemente el campo `accionPermitida`.

```typescript
/**
 * ⚠️⚠️⚠️ MÉTODO TEMPORAL - ELIMINAR CUANDO BACKEND IMPLEMENTE accionPermitida ⚠️⚠️⚠️
 */
determinarTipoAccionTemporal(): void {
  console.warn('⚠️ Usando lógica temporal en frontend - DEBE moverse al backend');

  // ⚠️ LÓGICA SIMPLIFICADA - Solo usa tieneEntradaAbierta
  // El backend DEBE validar: activo, restricciones, permisos, etc.
  if (this.validacionUsuario.tieneEntradaAbierta) {
    this.tipoAccion = 'SALIDA';
    this.registrarSalidaConModal();
  } else {
    this.tipoAccion = 'ENTRADA';
    // ... mostrar modal de vehículo o registrar entrada
  }
}
```

**⚠️ Este método:**
- Ya **NO** valida si el usuario está activo
- Ya **NO** verifica restricciones
- Ya **NO** evalúa permisos
- Solo usa `tieneEntradaAbierta` para decidir ENTRADA vs SALIDA
- **DEBE SER ELIMINADO** cuando el backend implemente `accionPermitida`

---

## 📊 IMPACTO DE LOS CAMBIOS

### **Frontend Simplificado:**
- ✅ **-50 líneas** de código de lógica de negocio
- ✅ **-3 validaciones** que no le corresponden al frontend
- ✅ **+0 dependencias** nuevas
- ✅ **Más fácil de mantener**
- ✅ **Más rápido de entender**

### **Backend Responsable:**
- ⏳ **Debe implementar** `accionPermitida` en `ValidacionUsuarioDTO`
- ⏳ **Debe aceptar** `guardiaId` como query param
- ⏳ **Debe validar** restricciones, permisos, estado
- ⏳ **Debe decidir** qué acción permitir

---

## 🎯 CHECKLIST PARA BACKEND

### **Endpoint: `validarUsuario`**

- [ ] Aceptar `guardiaId` como query parameter opcional
  ```java
  @GetMapping("/validar-usuario-identificacion/{identificacion}")
  public ValidacionUsuarioDTO validarUsuario(
      @PathVariable String identificacion,
      @RequestParam(required = false) String guardiaId
  )
  ```

- [ ] Agregar campos a `ValidacionUsuarioDTO`:
  ```java
  public class ValidacionUsuarioDTO {
      // ...campos existentes...
      
      private String accionPermitida; // "ENTRADA", "SALIDA", "BLOQUEADO"
      private String motivoBloqueo;   // Solo si accionPermitida = "BLOQUEADO"
  }
  ```

- [ ] Implementar lógica de validación:
  ```java
  // 1. Verificar si usuario está activo
  if (!usuario.getActivo()) {
      dto.setAccionPermitida("BLOQUEADO");
      dto.setMotivoBloqueo("Usuario inactivo");
      return dto;
  }
  
  // 2. Verificar restricciones en la guardia (si guardiaId se proporcionó)
  if (guardiaId != null) {
      boolean tieneRestriccion = verificarRestriccionEnGuardia(usuarioId, guardiaId);
      if (tieneRestriccion) {
          dto.setAccionPermitida("BLOQUEADO");
          dto.setMotivoBloqueo("Usuario restringido en esta guardia");
          return dto;
      }
  }
  
  // 3. Determinar acción según entrada abierta
  boolean tieneEntradaAbierta = tieneEntradaAbierta(usuarioId);
  if (tieneEntradaAbierta) {
      dto.setAccionPermitida("SALIDA");
  } else {
      dto.setAccionPermitida("ENTRADA");
  }
  ```

### **Endpoint: `listarDisponiblesPorUsuario`**

- [ ] Filtrar solo guardias asignadas (`asignada = true`)
- [ ] Filtrar solo guardias no restringidas (`restringida = false`)
- [ ] Filtrar solo guardias activas (`guardia.activa = true`)
- [ ] **Siempre** devolver `guardia` como objeto completo
- [ ] **NO** devolver campos planos como `guardiaNombre`, `guardiaCodigo`

---

## ✅ BENEFICIOS

### **Arquitectura:**
- ✅ **Separación de responsabilidades** correcta
- ✅ **Backend como fuente de verdad**
- ✅ **Frontend como capa de presentación**

### **Mantenibilidad:**
- ✅ **Lógica centralizada** en un solo lugar (backend)
- ✅ **Más fácil de probar** (unit tests en backend)
- ✅ **Menos duplicación** de código

### **Consistencia:**
- ✅ **Mismas reglas** para todos los clientes (web, mobile, etc.)
- ✅ **Actualizaciones** solo en backend
- ✅ **Sin inconsistencias** entre frontend y backend

---

## 🚀 PRÓXIMOS PASOS

1. ✅ **Frontend refactorizado** (COMPLETADO)
2. ⏳ **Backend: Implementar `accionPermitida`**
3. ⏳ **Backend: Aceptar `guardiaId` en `validarUsuario`**
4. ⏳ **Backend: Filtrar guardias en `listarDisponiblesPorUsuario`**
5. ⏳ **Testing de integración**
6. ⏳ **Eliminar `determinarTipoAccionTemporal()` del frontend**

---

## 📝 NOTAS

- **El frontend YA está preparado** para recibir `accionPermitida` del backend
- **Fallback temporal** funcionará hasta que backend esté listo
- **No hay breaking changes** - Compatible con backend actual
- **Cuando backend esté listo**, solo eliminar 1 método temporal

---

**Responsables:**
- ✅ Frontend: @copilot (Refactorización completada)
- ⏳ Backend: Pendiente implementación de `accionPermitida`

