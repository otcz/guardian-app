# 📖 GLOSARIO: CONCEPTOS DEL MÓDULO DE GUARDIA

**Fecha:** 2025-11-30  
**Propósito:** Clarificar terminología para evitar confusiones  

---

## 🎯 CONCEPTOS FUNDAMENTALES

### 1. **GuardiaEntity** (Punto de Control)
**🏢 Entidad de Base de Datos**

- **Qué es:** Ubicación física donde se controla el ingreso/salida
- **Ejemplos:**
  - "GUARDIA_NORTE" - Garita entrada norte
  - "PUERTA_PRINCIPAL" - Puerta principal del edificio
  - "CHECKPOINT_1" - Punto de control 1
- **Tabla en BD:** `guardia`
- **Atributos principales:**
  ```typescript
  {
    id: string;
    codigo: string;           // Ej: "GUARDIA_NORTE"
    nombre: string;           // Ej: "Garita Norte - Entrada Principal"
    descripcion?: string;
    ubicacion?: string;       // Ej: "Avenida Norte #123"
    seccionId: string;
    organizacionId: string;
    activa: boolean;
    permiteEntrada: boolean;
    permiteSalida: boolean;
  }
  ```

---

### 2. **Usuario con rol GUARDIA** (Personal de Vigilancia)
**👤 Persona que Opera el Punto de Control**

- **Qué es:** Empleado que gestiona/opera un punto de control
- **Ejemplos:**
  - "GUARD1" - Juan Pérez (usuario: guard1)
  - "GUARD2" - María González (usuario: guard2)
- **Tabla en BD:** `usuario` + rol `GUARDIA`
- **Responsabilidades:**
  - Registrar entradas y salidas
  - Verificar permisos de acceso
  - Gestionar movimientos en su punto de control asignado
  - Ver reportes de su punto de control

---

### 3. **Usuario con rol USUARIO** (Personal General)
**👥 Personas que Usan los Puntos de Control**

- **Qué es:** Empleados que ingresan/salen por los puntos de control
- **Ejemplos:**
  - "USER1" - Pedro López (trabajador)
  - "USER2" - Ana Martínez (trabajadora)
- **Tabla en BD:** `usuario` + rol `USUARIO`
- **Acciones:**
  - Pueden ser registrados entrando/saliendo
  - Pueden tener vehículos asociados
  - Pueden tener permisos en ciertos puntos de control

---

### 4. **GuardiaUsuarioEntity** (Relación de Permisos)
**🔗 Asignación Usuario ↔ Punto de Control**

- **Qué es:** Relación que define si un usuario tiene acceso a un punto de control
- **Tipos de relación:**
  1. **Gestor:** Usuario con rol GUARDIA asignado para operar el punto
  2. **Permitido:** Usuario con rol USUARIO que puede usar el punto
  3. **Restringido:** Usuario con rol USUARIO bloqueado en el punto

- **Tabla en BD:** `guardia_usuario`
- **Atributos principales:**
  ```typescript
  {
    id: string;
    guardiaId: string;        // ID del punto de control
    usuarioId: string;        // ID del usuario
    asignada: boolean;        // Tiene permiso
    restringida: boolean;     // Está bloqueado
    motivoRestriccion?: string;
    observaciones?: string;
  }
  ```

---

## 📊 EJEMPLOS DE RELACIONES

### Ejemplo 1: Punto de Control con Gestor
```
GuardiaEntity: "GUARDIA_NORTE"
   ↓
GuardiaUsuarioEntity (relación gestor)
   ↓
Usuario: "GUARD1" (rol: GUARDIA)
```

**Interpretación:**
- GUARDIA_NORTE es el punto de control físico
- GUARD1 es el empleado que lo opera/gestiona

---

### Ejemplo 2: Usuario con Acceso a Punto de Control
```
GuardiaEntity: "PUERTA_PRINCIPAL"
   ↓
GuardiaUsuarioEntity (relación permitido)
   ↓
Usuario: "USER1" (rol: USUARIO)
```

**Interpretación:**
- PUERTA_PRINCIPAL es el punto de control físico
- USER1 tiene permiso para entrar/salir por esa puerta

---

### Ejemplo 3: Usuario Restringido
```
GuardiaEntity: "CHECKPOINT_1"
   ↓
GuardiaUsuarioEntity (relación restringida)
   ↓
Usuario: "USER2" (rol: USUARIO)
   motivoRestriccion: "Sanción disciplinaria"
```

**Interpretación:**
- CHECKPOINT_1 es el punto de control físico
- USER2 NO puede usar ese punto de control
- Motivo: Sanción disciplinaria

---

## 🏗️ ARQUITECTURA COMPLETA

```
OrganizacionEntity (CANSUR)
  └── SeccionEntity (Sección TABLA)
       ├── GuardiaEntity (GUARDIA_NORTE - punto físico)
       │    └── GuardiaUsuarioEntity (relaciones)
       │         ├── → Usuario: GUARD1 (rol: GUARDIA) [GESTOR]
       │         ├── → Usuario: USER1 (rol: USUARIO) [PERMITIDO]
       │         └── → Usuario: USER2 (rol: USUARIO) [RESTRINGIDO]
       │
       └── UsuarioEntity
            ├── GUARD1 (rol: GUARDIA) - Opera el punto
            ├── USER1 (rol: USUARIO) - Puede usar el punto
            └── USER2 (rol: USUARIO) - Bloqueado en el punto
```

---

## 🔄 FLUJOS DE NEGOCIO

### Flujo 1: Crear Punto de Control con Gestor
```
1. Admin crea GuardiaEntity (GUARDIA_NORTE)
2. Admin selecciona Usuario con rol GUARDIA (GUARD1)
3. Sistema crea GuardiaUsuarioEntity automáticamente:
   - guardiaId: GUARDIA_NORTE
   - usuarioId: GUARD1
   - asignada: true (es gestor)
```

### Flujo 2: Asignar Usuario a Punto de Control
```
1. Admin selecciona Usuario (USER1, rol: USUARIO)
2. Admin selecciona Guardia (GUARDIA_NORTE)
3. Admin hace clic en "Asignar"
4. Sistema crea GuardiaUsuarioEntity:
   - guardiaId: GUARDIA_NORTE
   - usuarioId: USER1
   - asignada: true
   - restringida: false
```

### Flujo 3: Restringir Usuario en Punto de Control
```
1. Admin selecciona Usuario (USER2, rol: USUARIO)
2. Admin selecciona Guardia (GUARDIA_NORTE)
3. Admin hace clic en "Restringir"
4. Admin ingresa motivo: "Sanción disciplinaria"
5. Sistema crea/actualiza GuardiaUsuarioEntity:
   - guardiaId: GUARDIA_NORTE
   - usuarioId: USER2
   - asignada: false
   - restringida: true
   - motivoRestriccion: "Sanción disciplinaria"
```

### Flujo 4: Registrar Movimiento
```
1. Persona llega a GUARDIA_NORTE
2. GUARD1 (gestor del punto) registra en el sistema:
   - Usuario: USER1
   - Guardia: GUARDIA_NORTE
   - Tipo: ENTRADA
   - Fecha/Hora: 2025-11-30 08:00:00
3. Sistema verifica:
   - ¿USER1 tiene permiso en GUARDIA_NORTE? ✅ Sí
   - ¿USER1 está restringido? ❌ No
4. Sistema registra MovimientoEntity
```

---

## ⚠️ CONFUSIONES COMUNES A EVITAR

### ❌ ERROR 1: "Guardia = Persona"
**Incorrecto:** Pensar que "Guardia" es el empleado de seguridad

**Correcto:** 
- "Guardia" = Lugar físico (punto de control)
- "Usuario con rol GUARDIA" = Empleado de seguridad

---

### ❌ ERROR 2: "Listar Guardias = Listar Personal"
**Incorrecto:**
```typescript
// ❌ Carga usuarios con rol GUARDIA
this.usersService.list(...).subscribe({
  next: (usuarios) => {
    this.guardias = usuarios.map(u => ({ 
      codigo: u.username // ❌ INCORRECTO
    }));
  }
});
```

**Correcto:**
```typescript
// ✅ Carga puntos de control
this.guardiaService.listarPorSeccion(...).subscribe({
  next: (guardias) => {
    this.guardias = guardias; // ✅ CORRECTO
  }
});
```

---

### ❌ ERROR 3: "Asignar Guardia = Contratar Personal"
**Incorrecto:** Pensar que "asignar guardia" es contratar un empleado

**Correcto:** "Asignar guardia" significa dar permiso a un usuario para usar un punto de control

---

## 📝 TERMINOLOGÍA RECOMENDADA

| ✅ USAR | ❌ EVITAR | CONTEXTO |
|---------|-----------|----------|
| "Punto de control" | "Guardia" (solo) | Al hablar del lugar físico |
| "Usuario con rol GUARDIA" | "Guardia" (persona) | Al hablar del empleado |
| "Gestor del punto de control" | "Guardia asignado" | Al hablar del operador |
| "Usuario" o "Personal" | "Usuario común" | Al hablar de empleados generales |
| "Asignar punto de control a usuario" | "Asignar guardia" | Al dar permisos |
| "Crear punto de control con gestor" | "Crear guardia con guardia" | Al crear en el sistema |

---

## 🎯 REGLAS DE ORO

### 1. **GuardiaEntity siempre es un LUGAR**
- ✅ "GUARDIA_NORTE" es una garita
- ✅ "PUERTA_1" es una puerta
- ❌ "JUAN_PEREZ" NO es una guardia

### 2. **Usuarios tienen ROLES**
- ✅ Usuario con rol GUARDIA → Opera puntos de control
- ✅ Usuario con rol USUARIO → Usa puntos de control
- ✅ Usuario con rol ADMIN → Administra el sistema

### 3. **GuardiaUsuarioEntity es una RELACIÓN**
- ✅ Conecta un LUGAR con una PERSONA
- ✅ Define PERMISOS de acceso
- ✅ Puede ser de tipo: Gestor, Permitido, Restringido

### 4. **Separación Clara en el Código**
```typescript
// ✅ CORRECTO
cargarPuntosDeControl(): void {
  this.guardiaService.listarPorSeccion(...)
}

cargarPersonalDeSeguridad(): void {
  this.usersService.listByRole('GUARDIA', ...)
}

// ❌ INCORRECTO
cargarGuardias(): void {
  // ¿Carga lugares o personas? ¡Confuso!
}
```

---

## 📚 REFERENCIAS

### Código Fuente
- **Modelos:** `src/app/models/guardia.models.ts`
- **Servicio Guardias:** `src/app/service/guardia.service.ts`
- **Servicio GuardiaUsuario:** `src/app/service/guardia-usuario.service.ts`
- **Componente Crear:** `src/app/admin/punto-control-crear-component/`
- **Componente Asignar:** `src/app/admin/administrar-guardias-por-usuario-component/`

### Documentación
- **Implementación Crear:** `docs/IMPLEMENTACION-CREAR-PUNTO-CONTROL-CON-GESTOR-2025-11-30.md`
- **Resumen Ejecutivo:** `RESUMEN-CREAR-PUNTO-CONTROL-2025-11-30.md`

---

## ✅ CHECKLIST DE REVISIÓN

Antes de implementar nueva funcionalidad relacionada con guardias, verificar:

- [ ] ¿Estoy trabajando con el LUGAR (GuardiaEntity)?
- [ ] ¿Estoy trabajando con la PERSONA (Usuario con rol GUARDIA)?
- [ ] ¿Estoy trabajando con la RELACIÓN (GuardiaUsuarioEntity)?
- [ ] ¿Los nombres de variables son claros?
- [ ] ¿Los comentarios explican el contexto?
- [ ] ¿No estoy mezclando conceptos?

---

**Última Actualización:** 2025-11-30  
**Estado:** 📖 REFERENCIA OFICIAL

