# 📘 GUÍA DE USO: CREAR PUNTO DE CONTROL CON GESTOR

**Fecha:** 2025-11-30  
**Audiencia:** Administradores de Sección  
**Funcionalidad:** Crear Puntos de Control (Guardias) con Gestor Asignado

---

## 🎯 ¿QUÉ ES UN PUNTO DE CONTROL?

Un **Punto de Control (Guardia)** es una **ubicación física** donde se controla el ingreso y salida de personas y vehículos. Por ejemplo:
- **GUARDIA_NORTE** - Garita de entrada norte
- **PUERTA_PRINCIPAL** - Puerta principal del edificio
- **CHECKPOINT_1** - Punto de control secundario

Un **Gestor** es un usuario con rol **GUARDIA** que opera y administra ese punto de control.

---

## 🔐 REQUISITOS PREVIOS

Para usar esta funcionalidad, debe cumplir:

✅ **Tener uno de estos roles:**
- SYSADMIN
- ORGADMIN
- ADMIN (ADMIN_SECCION)

✅ **Tener el permiso:**
- `ITEM_CREAR_PUNTO_DE_CONTROL`

✅ **Tener usuarios con rol GUARDIA:**
- Debe existir al menos un usuario con rol GUARDIA en la sección
- Si no hay usuarios con rol GUARDIA, debe crearlos primero

---

## 📍 CÓMO ACCEDER

### Opción 1: URL Directa
```
/gestion-de-secciones/crear-punto-de-control
```

### Opción 2: Desde el Menú (recomendado)
1. Ir a **Gestión de Secciones**
2. Seleccionar la sección donde creará el punto de control
3. Buscar la opción **"Crear Punto de Control"**
4. Hacer clic

> **Nota:** Si no ve la opción en el menú, verifique que tiene el permiso `ITEM_CREAR_PUNTO_DE_CONTROL`.

---

## 📝 PASO A PASO: CREAR UN PUNTO DE CONTROL

### Paso 1: Verificar Contexto
Al entrar al formulario, verá dos campos en la parte superior (solo lectura):
- **Organización:** Nombre de la organización actual
- **Sección:** Nombre de la sección donde se creará el punto

✅ Verifique que sean correctos antes de continuar.

---

### Paso 2: Ingresar Información del Punto de Control

#### Campo: **Código** (Obligatorio)
- **Qué es:** Identificador único del punto de control
- **Formato:** Solo MAYÚSCULAS, números, guiones (-) y guión bajo (_)
- **Ejemplo:** `GUARDIA_NORTE`, `PUERTA_1`, `CHECKPOINT-PRINCIPAL`
- **Límite:** 100 caracteres

**Características especiales:**
- ✅ Se convierte automáticamente a MAYÚSCULAS mientras escribe
- ✅ El sistema verifica en tiempo real si el código ya existe
- ✅ Muestra un ✓ verde si el código está disponible
- ✅ Muestra advertencia si el código ya existe

#### Campo: **Nombre** (Obligatorio)
- **Qué es:** Nombre descriptivo del punto de control
- **Ejemplo:** `Garita Norte - Entrada Principal`
- **Límite:** 200 caracteres

#### Campo: **Descripción** (Opcional)
- **Qué es:** Descripción detallada del punto de control
- **Ejemplo:** `Punto de control principal para entrada de personal y vehículos por el lado norte del edificio`
- **Límite:** 500 caracteres

#### Campo: **Ubicación** (Opcional)
- **Qué es:** Dirección o ubicación física del punto
- **Ejemplo:** `Avenida Norte #123, Entrada Principal`
- **Límite:** 300 caracteres

---

### Paso 3: Asignar Usuario Gestor

#### Campo: **Usuario Gestor** (Obligatorio)
- **Qué es:** Usuario con rol GUARDIA que operará este punto de control
- **Cómo seleccionar:**
  1. Hacer clic en el dropdown
  2. Escribir para filtrar (busca por nombre o username)
  3. Seleccionar el usuario deseado

**Formato de visualización:**
```
Nombre Completo (username)
```

**⚠️ Advertencia:**
Si no aparecen usuarios en el dropdown, significa que **no hay usuarios con rol GUARDIA** en la sección. Debe:
1. Ir a **Gestión de Usuarios**
2. Crear un usuario con rol GUARDIA
3. Asignarlo a la sección actual
4. Volver a este formulario

#### Campo: **Observaciones** (Opcional)
- **Qué es:** Notas sobre la asignación del gestor
- **Ejemplo:** `Juan Pérez asignado como gestor principal. Turno matutino.`
- **Límite:** 500 caracteres

---

### Paso 4: Revisar y Crear

1. **Verificar que todos los campos obligatorios estén completos:**
   - ✅ Código
   - ✅ Nombre
   - ✅ Usuario Gestor

2. **Hacer clic en el botón "Crear Punto de Control"**

3. **Confirmar en el diálogo que aparece:**
   ```
   ¿Está seguro que desea crear este punto de control?
   
   Código: GUARDIA_NORTE
   Nombre: Garita Norte - Entrada Principal
   Gestor: Juan Pérez (guard1)
   ```

4. **Esperar confirmación:**
   - ✅ Verá un mensaje de éxito: "Punto de control creado exitosamente"
   - ✅ Será redirigido automáticamente al listado de puntos de control (en 2 segundos)

---

## ⚠️ POSIBLES ERRORES Y SOLUCIONES

### Error: "El código ya existe"
**Causa:** Ya existe un punto de control con ese código en la organización.

**Solución:**
1. Cambiar el código por uno único
2. Ejemplos: `GUARDIA_NORTE_2`, `PUERTA_NORTE`, `CHECKPOINT_A`

---

### Error: "No hay usuarios con rol GUARDIA"
**Causa:** No existen usuarios con rol GUARDIA en la sección actual.

**Solución:**
1. Ir a **Gestión de Usuarios** > **Crear Usuario**
2. Crear un usuario con rol **GUARDIA**
3. Asignar el usuario a la **sección actual**
4. Volver al formulario de crear punto de control

---

### Error: "El usuario gestor debe tener el rol GUARDIA"
**Causa:** El usuario seleccionado NO tiene el rol GUARDIA (error de sistema).

**Solución:**
1. Recargar la página
2. Verificar que el usuario tenga el rol GUARDIA en **Gestión de Usuarios**
3. Si persiste, contactar al administrador del sistema

---

### Error: "No tiene permisos para realizar esta acción"
**Causa:** No tiene el permiso `ITEM_CREAR_PUNTO_DE_CONTROL`.

**Solución:**
1. Contactar al administrador del sistema
2. Solicitar que le asigne el permiso `ITEM_CREAR_PUNTO_DE_CONTROL`

---

## ✅ BUENAS PRÁCTICAS

### 1. Nombres Descriptivos
✅ **Bueno:** `GUARDIA_NORTE`, `PUERTA_PRINCIPAL`, `CHECKPOINT_ESTACIONAMIENTO`
❌ **Malo:** `G1`, `P`, `X`

### 2. Usar Códigos Consistentes
Si ya tiene puntos de control con el patrón `GUARDIA_XXX`, continúe con ese patrón:
- `GUARDIA_NORTE`
- `GUARDIA_SUR`
- `GUARDIA_ESTE`
- `GUARDIA_OESTE`

### 3. Incluir Ubicación
Siempre que sea posible, incluya la ubicación física para facilitar la identificación:
```
Ubicación: Avenida Principal #123, Entrada Norte
```

### 4. Documentar en Observaciones
Use el campo de observaciones para dejar notas importantes:
```
Observaciones: Gestor asignado para turno matutino (6:00 AM - 2:00 PM). 
Turno vespertino: guard2.
```

---

## 🔄 ¿QUÉ PASA DESPUÉS DE CREAR?

Una vez creado el punto de control:

1. ✅ **El punto aparecerá en el listado** de puntos de control de la sección
2. ✅ **El gestor podrá usarlo** para registrar entradas y salidas
3. ✅ **Podrá asignar usuarios** que pueden usar este punto de control
4. ✅ **Podrá restringir usuarios** que NO pueden usar este punto de control

---

## 📊 EJEMPLO COMPLETO

### Escenario
Queremos crear un punto de control en la entrada norte del edificio y asignar a Juan Pérez como gestor.

### Datos a Ingresar

**Información del Punto de Control:**
```
Código: GUARDIA_NORTE
Nombre: Garita Norte - Entrada Principal
Descripción: Punto de control principal para ingreso de personal y vehículos por el lado norte del complejo.
Ubicación: Avenida Norte #123, Edificio Central
```

**Gestor del Punto de Control:**
```
Usuario Gestor: Juan Pérez (guard1)
Observaciones: Asignado como gestor principal del punto norte. Turno matutino 6:00 AM - 2:00 PM.
```

### Resultado
✅ Se crea el punto de control `GUARDIA_NORTE` con Juan Pérez como gestor.

---

## ❓ PREGUNTAS FRECUENTES

### ¿Puedo crear un punto de control sin gestor?
❌ No. Siempre debe asignar un usuario con rol GUARDIA como gestor al momento de crear el punto de control.

### ¿Puedo cambiar el gestor después?
✅ Sí, podrá cambiar el gestor desde la opción de **Editar Punto de Control** (funcionalidad futura).

### ¿Cuántos puntos de control puedo crear?
✅ No hay límite. Puede crear tantos puntos de control como necesite su organización.

### ¿Un gestor puede administrar varios puntos de control?
✅ Sí, un usuario con rol GUARDIA puede ser asignado como gestor de varios puntos de control.

### ¿Puedo desactivar un punto de control?
✅ Sí, desde la opción de **Gestionar Puntos de Control** podrá activar/desactivar puntos.

### ¿Qué pasa si elimino el usuario gestor?
⚠️ Primero debe reasignar el punto de control a otro gestor antes de eliminar el usuario.

---

## 📞 SOPORTE

Si tiene problemas o preguntas:
1. Revise esta guía completa
2. Consulte el **Glosario de Conceptos** en: `docs/GLOSARIO-CONCEPTOS-GUARDIA.md`
3. Contacte al administrador del sistema

---

**Última Actualización:** 2025-11-30  
**Versión:** 1.0

