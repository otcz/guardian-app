# 🎯 PLAN DE MEJORA: Administrar Guardias por Usuario con Pestañas

**Fecha:** 2025-11-30  
**Estado:** 📋 PLANIFICACIÓN  
**Prioridad:** ⭐⭐⭐ ALTA

---

## 🎯 OBJETIVO

Mejorar el componente "Administrar Guardias por Usuario" para que tenga una interfaz más clara e intuitiva con **3 pestañas** que faciliten la visualización y gestión de relaciones.

---

## 📐 DISEÑO PROPUESTO

### Estructura con Pestañas (TabView de PrimeNG)

```
┌────────────────────────────────────────────────────────────────┐
│ ℹ️ Contexto: CANSUR › Sección TABLA                          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Administrar Guardias por Usuario                               │
│                                                                │
│ ┌─────────────┬─────────────┬──────────────────┐             │
│ │ 👤 Usuarios │ 🚪 Guardias │ 🔍 Todas las     │             │
│ │             │             │    Relaciones    │             │
│ └─────────────┴─────────────┴──────────────────┘             │
│                                                                │
│  [Contenido de la pestaña activa]                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 📑 PESTAÑA 1: Usuarios → Guardias

**Propósito:** Ver y modificar las guardias asignadas/restringidas a usuarios específicos

### Diseño:

```
┌──────────────────────────────────────────────────────────────────┐
│ 👤 USUARIOS → GUARDIAS                                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Seleccione un usuario para ver sus guardias:                    │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 🔍 Buscar usuario...                                        ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌──────────┬────────────┬─────────┬────────┐                   │
│ │ Usuario  │ Username   │ Email   │ Acción │                   │
│ ├──────────┼────────────┼─────────┼────────┤                   │
│ │ USER1    │ user1      │ user1@..│ [Ver]  │                   │
│ │ USER2    │ user2      │ user2@..│ [Ver]  │                   │
│ │ USER3    │ user3      │ user3@..│ [Ver]  │                   │
│ └──────────┴────────────┴─────────┴────────┘                   │
│                                                                  │
│ ─────────────────────────────────────────────────────────────   │
│                                                                  │
│ Guardias de: USER1 (user1)                                      │
│                                                                  │
│ ✅ Asignadas (2):                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ✅ GUARDIA_NORTE - Garita Norte           [Restringir] [❌]│ │
│ │ ✅ PUERTA_SUR - Puerta Principal Sur      [Restringir] [❌]│ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ❌ Restringidas (1):                                             │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ❌ GUARDIA_VIP - Entrada VIP                                │ │
│ │    Motivo: "Usuario en período de prueba"                   │ │
│ │    [Quitar Restricción]                                     │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ 📋 Agregar guardias:                                             │
│ ┌─────────────────────────────────────────┐                    │
│ │ [▼ Seleccione guardias...]              │ [Asignar]          │
│ └─────────────────────────────────────────┘                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Funcionalidades:

1. **Lista de usuarios** (paginada, con búsqueda)
2. **Al seleccionar un usuario**, mostrar:
   - ✅ **Guardias asignadas** (puede usar)
   - ❌ **Guardias restringidas** (bloqueadas)
3. **Acciones por guardia:**
   - Restringir (asignada → restringida)
   - Quitar restricción (restringida → asignada)
   - Revocar (eliminar relación)
4. **Agregar nuevas guardias** al usuario

---

## 📑 PESTAÑA 2: Guardias → Usuarios

**Propósito:** Ver y modificar los usuarios asignados/restringidos en guardias específicas

### Diseño:

```
┌──────────────────────────────────────────────────────────────────┐
│ 🚪 GUARDIAS → USUARIOS                                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Seleccione una guardia para ver sus usuarios:                   │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 🔍 Buscar guardia...                                        ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌──────────────────┬─────────────────┬────────┐                │
│ │ Código           │ Nombre          │ Acción │                │
│ ├──────────────────┼─────────────────┼────────┤                │
│ │ GUARDIA_NORTE    │ Garita Norte    │ [Ver]  │                │
│ │ PUERTA_SUR       │ Puerta Sur      │ [Ver]  │                │
│ │ GUARDIA_VIP      │ Entrada VIP     │ [Ver]  │                │
│ └──────────────────┴─────────────────┴────────┘                │
│                                                                  │
│ ─────────────────────────────────────────────────────────────   │
│                                                                  │
│ Usuarios en: GUARDIA_NORTE - Garita Norte                       │
│                                                                  │
│ ✅ Con Acceso (3):                                               │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ✅ USER1 (user1) - GUARD1_CANSUR    [Restringir] [Revocar]│ │
│ │ ✅ USER2 (user2) - GUARD2_CANSUR    [Restringir] [Revocar]│ │
│ │ ✅ USER3 (user3) - GUARD3_CANSUR    [Restringir] [Revocar]│ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ❌ Restringidos (1):                                             │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ❌ USER4 (user4) - GUARD4_CANSUR                            │ │
│ │    Motivo: "Sanción disciplinaria"                          │ │
│ │    [Quitar Restricción]                                     │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ 📋 Agregar usuarios:                                             │
│ ┌─────────────────────────────────────────┐                    │
│ │ [▼ Seleccione usuarios...]              │ [Asignar]          │
│ └─────────────────────────────────────────┘                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Funcionalidades:

1. **Lista de guardias** (paginada, con búsqueda)
2. **Al seleccionar una guardia**, mostrar:
   - ✅ **Usuarios con acceso** (asignados)
   - ❌ **Usuarios restringidos** (bloqueados)
3. **Acciones por usuario:**
   - Restringir (con acceso → restringido)
   - Quitar restricción (restringido → con acceso)
   - Revocar (eliminar relación)
4. **Agregar nuevos usuarios** a la guardia

---

## 📑 PESTAÑA 3: Todas las Relaciones

**Propósito:** Vista de matriz completa de todas las relaciones de la sección

### Diseño:

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔍 TODAS LAS RELACIONES                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Vista completa de relaciones Guardias ↔ Usuarios                │
│                                                                  │
│ 🔎 Filtros:                                                      │
│ ┌──────────────────┬──────────────────┬─────────────────┐      │
│ │ [▼ Estado: Todo] │ [▼ Usuario: ...] │ [▼ Guardia: ...]│      │
│ └──────────────────┴──────────────────┴─────────────────┘      │
│                                                                  │
│ 📊 Total: 15 relaciones                                          │
│                                                                  │
│ ┌──────┬───────┬────────┬─────────┬───────┬──────────────────┐│
│ │Usuario│Guardia│ Estado │Asignada?│Restr.?│ Observaciones    ││
│ ├──────┼───────┼────────┼─────────┼───────┼──────────────────┤│
│ │USER1 │G_NORTE│ ✅ Activo│   Sí   │  No   │ Gestor principal ││
│ │USER1 │P_SUR  │ ✅ Activo│   Sí   │  No   │ Gestor suplente  ││
│ │USER2 │G_NORTE│ ✅ Activo│   Sí   │  No   │ -                ││
│ │USER3 │G_VIP  │ ❌ Bloq. │   No    │  Sí   │ En prueba        ││
│ │...   │...    │   ...  │  ...    │  ...  │ ...              ││
│ └──────┴───────┴────────┴─────────┴───────┴──────────────────┘│
│                                                                  │
│ [Exportar Excel] [Actualizar]                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Funcionalidades:

1. **Tabla completa** de todas las relaciones
2. **Filtros múltiples:**
   - Por estado (Activo, Bloqueado, Todos)
   - Por usuario
   - Por guardia
3. **Paginación** y ordenamiento
4. **Exportar a Excel**
5. **Ver detalles** de cada relación

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### 1. Servicios Necesarios

✅ **Ya creado:** `GuardiaUsuarioConsultaService`
- ✅ `getGuardiasDisponiblesPorUsuario(usuarioId)`
- ✅ `getGuardiasRestringidasPorUsuario(usuarioId)`
- ✅ `getUsuariosPorGuardia(guardiaId)`
- ✅ `getRelacionesPorSeccion(seccionId)`

✅ **Ya existe:** `GuardiaUsuarioService` (para modificar)
- ✅ `asignar(guardiaId, usuarioId)`
- ✅ `restringir(guardiaId, usuarioId, motivo)`
- ✅ `revocar(guardiaId, usuarioId)`

### 2. Componentes PrimeNG Nuevos

- ✅ `<p-tabView>` - Pestañas
- ✅ `<p-table>` - Tablas con paginación
- ✅ `<p-multiSelect>` - Selección múltiple
- ✅ `<p-dropdown>` - Filtros
- ✅ `<p-chip>` - Tags de estado
- ✅ `<p-badge>` - Contadores

### 3. Flujos de Datos

#### Flujo: Ver guardias de un usuario
```
1. Usuario selecciona un usuario de la lista
2. Llamar a getTodasGuardiasPorUsuario(usuarioId)
3. Separar en dos arrays:
   - guardiasDisponibles (asignada=true, restringida=false)
   - guardiasRestringidas (restringida=true)
4. Renderizar en dos listas diferentes
```

#### Flujo: Asignar guardia a usuario
```
1. Usuario selecciona guardia(s) del dropdown
2. Click en "Asignar"
3. Confirmar con ConfirmDialog
4. Llamar a guardiaUsuarioService.asignar() por cada guardia
5. Recargar guardiasDelUsuario
6. Mostrar mensaje de éxito
```

#### Flujo: Restringir guardia para usuario
```
1. Usuario click en "Restringir" en una guardia asignada
2. Abrir modal para motivo
3. Confirmar
4. Llamar a guardiaUsuarioService.restringir(guardiaId, usuarioId, motivo)
5. Recargar guardiasDelUsuario
6. Mostrar mensaje de éxito
```

---

## 📋 PLAN DE EJECUCIÓN

### Fase 1: Preparación ✅
- [x] Crear `GuardiaUsuarioConsultaService`
- [x] Agregar imports de PrimeNG (TabView, Table)
- [x] Inyectar servicios necesarios

### Fase 2: Estructura HTML
- [ ] Crear estructura con `<p-tabView>`
- [ ] Implementar Pestaña 1: Usuarios → Guardias
- [ ] Implementar Pestaña 2: Guardias → Usuarios
- [ ] Implementar Pestaña 3: Todas las Relaciones

### Fase 3: Lógica TypeScript
- [ ] Métodos para Pestaña 1:
  - `onUsuarioSeleccionado(usuario)`
  - `cargarGuardiasDelUsuario(usuarioId)`
  - `asignarGuardiaAUsuario(guardiaId, usuarioId)`
  - `restringirGuardiaParaUsuario(guardiaId, usuarioId, motivo)`
  - `revocarGuardiaDeUsuario(guardiaId, usuarioId)`

- [ ] Métodos para Pestaña 2:
  - `onGuardiaSeleccionada(guardia)`
  - `cargarUsuariosDeLaGuardia(guardiaId)`
  - `asignarUsuarioAGuardia(guardiaId, usuarioId)`
  - `restringirUsuarioEnGuardia(guardiaId, usuarioId, motivo)`
  - `revocarUsuarioDeGuardia(guardiaId, usuarioId)`

- [ ] Métodos para Pestaña 3:
  - `cargarTodasLasRelaciones()`
  - `filtrarRelaciones()`
  - `exportarAExcel()`

### Fase 4: Estilos y UX
- [ ] Aplicar paleta de colores del proyecto
- [ ] Indicadores visuales claros (✅ ❌)
- [ ] Loading states
- [ ] Mensajes de confirmación
- [ ] Tooltips explicativos

### Fase 5: Testing
- [ ] Probar Pestaña 1
- [ ] Probar Pestaña 2
- [ ] Probar Pestaña 3
- [ ] Validar permisos
- [ ] Testing responsive

---

## 🎨 PALETA DE COLORES

### Estados:
- ✅ **Asignada (activo):** Verde/Success del proyecto
- ❌ **Restringida:** Rojo/Danger del proyecto
- ⚠️ **Sin asignar:** Gris/Neutral del proyecto
- ℹ️ **Información:** Azul/Info del proyecto

### Componentes:
- **Botón primario:** Asignar, Guardar
- **Botón secundario:** Cancelar, Volver
- **Botón peligro:** Revocar, Restringir
- **Botón success:** Quitar Restricción

---

## 📊 VENTAJAS DEL NUEVO DISEÑO

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Claridad** | ❌ Confuso | ✅ Clara separación |
| **Flujo** | ❌ No intuitivo | ✅ Flujo natural |
| **Visualización** | ❌ Difícil de entender | ✅ Fácil de ver relaciones |
| **Gestión** | ❌ Complicado | ✅ Simple y directo |
| **Escalabilidad** | ❌ Limitada | ✅ Crece sin problemas |

---

## 🚀 PRÓXIMOS PASOS

1. **Revisar y aprobar** este diseño
2. **Implementar HTML** con las 3 pestañas
3. **Implementar lógica TypeScript**
4. **Testing completo**
5. **Documentar uso**

---

**Estado:** 📋 Listo para implementación  
**Tiempo estimado:** 4-6 horas  
**Prioridad:** ⭐⭐⭐ ALTA

