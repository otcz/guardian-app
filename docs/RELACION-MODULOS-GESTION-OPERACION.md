# 🔗 RELACIÓN ENTRE MÓDULOS: GESTIÓN Y OPERACIÓN DE PUNTOS DE CONTROL

**Fecha:** 2025-11-30  
**Propósito:** Clarificar la relación entre la gestión administrativa y la operación de puntos de control

---

## 🎯 VISIÓN GENERAL

El sistema de Puntos de Control (Guardias) se divide en **DOS módulos principales**:

### 1. **MÓDULO DE GESTIÓN** (Administrativo)
**Ubicación:** Gestión de Secciones  
**Usuario:** Administradores (SYSADMIN, ORGADMIN, ADMIN)  
**Función:** Crear, configurar y administrar puntos de control

### 2. **MÓDULO DE OPERACIÓN** (Guardia)
**Ubicación:** Módulo Guardia  
**Usuario:** Personal de Guardia (rol GUARDIA)  
**Función:** Operar los puntos de control día a día

---

## 📊 FLUJO COMPLETO DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                    FASE 1: CONFIGURACIÓN                        │
│                      (Administradores)                          │
└─────────────────────────────────────────────────────────────────┘
                                ↓
        ┌───────────────────────────────────────────┐
        │  1. Crear Usuario con rol GUARDIA        │
        │     /gestion-de-usuarios/crear-usuario    │
        └───────────────────────────────────────────┘
                                ↓
        ┌───────────────────────────────────────────┐
        │  2. Crear Punto de Control con Gestor     │
        │     /gestion-de-secciones/                │
        │     crear-punto-de-control                │
        │                                           │
        │     • Código: GUARDIA_NORTE               │
        │     • Nombre: Garita Norte                │
        │     • Gestor: Usuario GUARD1              │
        └───────────────────────────────────────────┘
                                ↓
        ┌───────────────────────────────────────────┐
        │  3. Asignar Permisos a Usuarios           │
        │     /gestion-de-secciones/                │
        │     administrar-guardias-por-usuario      │
        │                                           │
        │     • Permitir: USER1 → GUARDIA_NORTE     │
        │     • Permitir: USER2 → GUARDIA_NORTE     │
        │     • Restringir: USER3 → GUARDIA_NORTE   │
        └───────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FASE 2: OPERACIÓN                            │
│                   (Personal de Guardia)                         │
└─────────────────────────────────────────────────────────────────┘
                                ↓
        ┌───────────────────────────────────────────┐
        │  4. Gestor GUARD1 Inicia Sesión          │
        │     • Login con usuario: guard1           │
        │     • Sistema asigna punto: GUARDIA_NORTE │
        └───────────────────────────────────────────┘
                                ↓
        ┌───────────────────────────────────────────┐
        │  5. Operación del Punto de Control        │
        │     /modulo-guardia/                      │
        │     control-de-ingreso-y-salida           │
        │                                           │
        │     • Registrar entrada de USER1          │
        │     • Registrar salida de USER2           │
        │     • Validar permisos                    │
        └───────────────────────────────────────────┘
                                ↓
        ┌───────────────────────────────────────────┐
        │  6. Validaciones y Consultas              │
        │     • Validar usuario antes de entrada    │
        │     • Validar vehículo antes de entrada   │
        │     • Ver movimientos del día             │
        │     • Ver entradas sin salida             │
        └───────────────────────────────────────────┘
```

---

## 🏗️ MÓDULO 1: GESTIÓN (Administrativo)

### Objetivo
Configurar la infraestructura de puntos de control y permisos.

### Rutas Administrativas

#### 1. Crear Punto de Control
```
URL: /gestion-de-secciones/crear-punto-de-control
Permiso: ITEM_CREAR_PUNTO_DE_CONTROL
Roles: SYSADMIN, ORGADMIN, ADMIN
```

**Qué hace:**
- ✅ Crea un nuevo punto de control (GuardiaEntity)
- ✅ Asigna un usuario con rol GUARDIA como gestor
- ✅ Define código, nombre, ubicación
- ✅ Activa el punto para uso operacional

**Ejemplo:**
```json
{
  "codigo": "GUARDIA_NORTE",
  "nombre": "Garita Norte - Entrada Principal",
  "ubicacion": "Avenida Norte #123",
  "usuarioGestorId": "uuid-guard1"
}
```

---

#### 2. Administrar Guardias por Usuario
```
URL: /gestion-de-secciones/administrar-guardias-por-usuario
Permiso: ITEM_ADMINISTRAR_GUARDIAS_POR_USUARIO
Roles: SYSADMIN, ORGADMIN, ADMIN
```

**Qué hace:**
- ✅ Asigna usuarios a puntos de control (permisos de acceso)
- ✅ Restringe usuarios en puntos específicos
- ✅ Revoca permisos
- ✅ Gestiona GuardiaUsuarioEntity

**Ejemplo:**
```
Usuario: USER1 (rol: USUARIO)
↓
Asignar a → GUARDIA_NORTE
↓
USER1 puede ingresar/salir por GUARDIA_NORTE
```

---

#### 3. Gestionar Usuarios
```
URL: /gestion-de-usuarios/crear-usuario
Permiso: USER_CREATE
Roles: SYSADMIN, ORGADMIN, ADMIN
```

**Qué hace:**
- ✅ Crea usuarios con rol GUARDIA (personal de seguridad)
- ✅ Crea usuarios con rol USUARIO (personal general)
- ✅ Asigna a secciones

---

## 🚪 MÓDULO 2: OPERACIÓN (Guardia)

### Objetivo
Operar los puntos de control día a día: registrar entradas, salidas y validaciones.

### Rutas Operacionales

#### 1. Control de Ingreso y Salida (Principal)
```
URL: /modulo-guardia/control-de-ingreso-y-salida
Permiso: ITEM_CONTROL_DE_INGRESO_Y_SALIDA
Roles: GUARDIA, ADMIN, ORGADMIN
Estado: ✅ ACTIVO
```

**Qué hace:**
- ✅ Registrar entrada de usuario
- ✅ Registrar salida de usuario
- ✅ Registrar entrada de vehículo
- ✅ Registrar salida de vehículo
- ✅ Asociar vehículo con usuario
- ✅ Agregar observaciones

**Flujo típico:**
```
1. Persona llega al punto GUARDIA_NORTE
2. Gestor GUARD1 abre el sistema
3. Busca usuario: USER1
4. Sistema verifica permisos
5. Registra: ENTRADA | USER1 | GUARDIA_NORTE | 08:00 AM
6. Persona puede ingresar
```

---

#### 2. Validar Usuarios
```
URL: /modulo-guardia/validar-usuarios
Permiso: ITEM_VALIDAR_USUARIOS
Roles: GUARDIA, ADMIN, ORGADMIN
Estado: ✅ ACTIVO
```

**Qué hace:**
- ✅ Consultar si un usuario tiene permiso en este punto
- ✅ Ver información del usuario
- ✅ Ver restricciones activas
- ✅ **Solo lectura** (no registra movimiento)

**Uso:**
```
Antes de permitir entrada:
1. Gestor busca: USER1
2. Sistema responde:
   ✅ Permitido en GUARDIA_NORTE
   ✅ No tiene restricciones
   ✅ Última entrada: Ayer 17:30
```

---

#### 3. Validar Vehículos
```
URL: /modulo-guardia/validar-vehiculos
Permiso: ITEM_VALIDAR_VEHICULOS
Roles: GUARDIA, ADMIN, ORGADMIN
Estado: ✅ ACTIVO
```

**Qué hace:**
- ✅ Consultar información de un vehículo
- ✅ Ver propietario del vehículo
- ✅ Ver si el vehículo está autorizado
- ✅ **Solo lectura** (no registra movimiento)

**Uso:**
```
Vehículo llega a punto de control:
1. Gestor ingresa placa: ABC-123
2. Sistema responde:
   ✅ Propietario: USER1
   ✅ Tipo: Automóvil
   ✅ Autorizado: Sí
   ✅ Último ingreso: Hoy 08:00 AM
```

---

#### 4. Ver Entradas Abiertas
```
URL: /modulo-guardia/ver-entradas-abiertas
Permiso: ITEM_VER_ENTRADAS_ABIERTAS
Roles: ADMIN, ORGADMIN
Estado: ✅ ACTIVO
```

**Qué hace:**
- ✅ Listar personas que ingresaron pero NO han salido
- ✅ Listar vehículos que ingresaron pero NO han salido
- ✅ Ver tiempo de permanencia
- ✅ Detectar anomalías

**Uso:**
```
Al final del día:
1. Admin revisa entradas abiertas
2. Sistema muestra:
   ⚠️ USER1: Entrada 08:00, Sin salida (10 horas)
   ⚠️ Vehículo ABC-123: Entrada 09:00, Sin salida
3. Admin investiga o cierra manualmente
```

---

#### 5. Ver Movimientos Guardia
```
URL: /modulo-guardia/ver-movimientos-guardia
Permiso: ITEM_VER_MOVIMIENTOS_GUARDIA
Roles: GUARDIA, ADMIN, ORGADMIN
Estado: ✅ ACTIVO
```

**Qué hace:**
- ✅ Ver historial de movimientos del punto de control
- ✅ Filtrar por fecha, tipo (entrada/salida), usuario
- ✅ Exportar reportes
- ✅ Auditoría de operaciones

**Uso:**
```
Gestor revisa su día:
1. Abre ver movimientos
2. Filtro: Hoy | GUARDIA_NORTE
3. Sistema muestra:
   08:00 | USER1 | ENTRADA | GUARDIA_NORTE
   08:05 | USER2 | ENTRADA | GUARDIA_NORTE
   12:00 | USER1 | SALIDA  | GUARDIA_NORTE
   ...
```

---

## 🔄 INTERACCIÓN ENTRE MÓDULOS

### Escenario Completo

#### FASE 1: CONFIGURACIÓN (Admin)

**Día 1 - Configuración Inicial:**

1. **Admin crea usuario GUARD1:**
   ```
   /gestion-de-usuarios/crear-usuario
   • Username: guard1
   • Rol: GUARDIA
   • Sección: Sección TABLA
   ```

2. **Admin crea punto de control:**
   ```
   /gestion-de-secciones/crear-punto-de-control
   • Código: GUARDIA_NORTE
   • Nombre: Garita Norte
   • Gestor: GUARD1
   ```

3. **Admin asigna permisos a usuarios:**
   ```
   /gestion-de-secciones/administrar-guardias-por-usuario
   • USER1 → Permitido en GUARDIA_NORTE
   • USER2 → Permitido en GUARDIA_NORTE
   • USER3 → Restringido en GUARDIA_NORTE
   ```

---

#### FASE 2: OPERACIÓN (Guardia)

**Día 2 - Operación Normal:**

1. **GUARD1 inicia sesión:**
   ```
   Login → Sistema asigna GUARDIA_NORTE
   ```

2. **USER1 llega a la entrada (08:00 AM):**
   ```
   /modulo-guardia/validar-usuarios
   • Busca: USER1
   • ✅ Permitido en GUARDIA_NORTE
   
   /modulo-guardia/control-de-ingreso-y-salida
   • Registra: ENTRADA | USER1 | 08:00
   ```

3. **Vehículo ABC-123 llega (08:05 AM):**
   ```
   /modulo-guardia/validar-vehiculos
   • Busca placa: ABC-123
   • ✅ Propietario: USER1
   • ✅ Autorizado
   
   /modulo-guardia/control-de-ingreso-y-salida
   • Registra: ENTRADA | ABC-123 | USER1 | 08:05
   ```

4. **USER1 sale (17:00 PM):**
   ```
   /modulo-guardia/control-de-ingreso-y-salida
   • Registra: SALIDA | USER1 | 17:00
   • Registra: SALIDA | ABC-123 | 17:00
   ```

5. **Al final del día:**
   ```
   /modulo-guardia/ver-movimientos-guardia
   • Revisa todos los movimientos del día
   
   /modulo-guardia/ver-entradas-abiertas
   • Verifica que no haya entradas sin salida
   ```

---

## 📋 PERMISOS Y ROLES

### Matriz de Permisos

| Funcionalidad | SYSADMIN | ORGADMIN | ADMIN | GUARDIA | USUARIO |
|---------------|----------|----------|-------|---------|---------|
| **Crear Punto de Control** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Administrar Permisos** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Control Ingreso/Salida** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Validar Usuarios** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Validar Vehículos** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ver Entradas Abiertas** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver Movimientos** | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 🎯 CASOS DE USO TÍPICOS

### Caso 1: Nuevo Punto de Control
```
1. Admin → Crear punto GUARDIA_SUR
2. Admin → Asignar gestor GUARD2
3. Admin → Dar permisos a 50 usuarios
4. GUARD2 → Comenzar operación
```

### Caso 2: Restricción de Usuario
```
1. USER5 tiene sanción disciplinaria
2. Admin → Restringir USER5 en GUARDIA_NORTE
3. USER5 intenta ingresar
4. GUARD1 → Validar usuario
5. Sistema → ❌ RESTRINGIDO (motivo: sanción)
6. GUARD1 → Denegar acceso
```

### Caso 3: Control de Vehículos
```
1. Vehículo ABC-999 llega sin identificar
2. GUARD1 → Validar vehículo ABC-999
3. Sistema → ❌ No registrado
4. GUARD1 → Solicita documentación
5. GUARD1 → Registra entrada con observaciones
```

### Caso 4: Auditoría de Movimientos
```
1. Admin necesita reporte mensual
2. Admin → Ver movimientos guardia
3. Filtro: Mes actual | Todos los puntos
4. Sistema → Genera reporte Excel
5. Admin → Analiza estadísticas
```

---

## 🔗 RESUMEN DE INTEGRACIÓN

### Datos que se Comparten

```
GuardiaEntity (Punto de Control)
    ↓
    ├─→ GuardiaUsuarioEntity (Permisos)
    │    ├─→ Usuario: USER1 (Permitido)
    │    ├─→ Usuario: USER2 (Permitido)
    │    └─→ Usuario: USER3 (Restringido)
    │
    └─→ MovimientoEntity (Registros)
         ├─→ USER1 | ENTRADA | 08:00
         ├─→ USER1 | SALIDA  | 17:00
         └─→ USER2 | ENTRADA | 09:00
```

### Flujo de Datos

```
1. Admin crea → GuardiaEntity
                    ↓
2. Admin asigna → GuardiaUsuarioEntity
                    ↓
3. Guardia valida → Lee GuardiaUsuarioEntity
                    ↓
4. Guardia registra → Crea MovimientoEntity
                    ↓
5. Admin revisa → Lee MovimientoEntity
```

---

## 📞 REFERENCIAS

- **Glosario:** `docs/GLOSARIO-CONCEPTOS-GUARDIA.md`
- **Guía de Uso:** `docs/GUIA-USO-CREAR-PUNTO-CONTROL.md`
- **Implementación:** `docs/IMPLEMENTACION-CREAR-PUNTO-CONTROL-CON-GESTOR-2025-11-30.md`

---

**Última Actualización:** 2025-11-30  
**Estado:** ✅ Documentación Completa

