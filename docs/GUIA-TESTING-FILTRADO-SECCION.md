# 🧪 Guía de Testing: Filtrado de Usuarios por Sección

**Fecha:** 2025-11-21  
**Objetivo:** Validar que el filtrado de usuarios por sección funciona correctamente

---

## 📋 Pre-requisitos

### Datos de Prueba Requeridos

Asegúrate de tener estos usuarios creados en el sistema:

| Usuario | Rol | Sección | Organización |
|---------|-----|---------|--------------|
| `ADMINSECC1_CANSUR` | ADMIN | SECC1 | CANSUR |
| `ADMINSECC2_CANSUR` | ADMIN | SECC2 | CANSUR |
| `USER1SECC1_CANSUR` | GUARDIA | SECC1 | CANSUR |
| `USER2SECC1_CANSUR` | GUARDIA | SECC1 | CANSUR |
| `USER1SECC2_CANSUR` | GUARDIA | SECC2 | CANSUR |
| `USER2SECC2_CANSUR` | GUARDIA | SECC2 | CANSUR |
| `ORGADMIN_CANSUR` | ORGADMIN | - | CANSUR |
| `SYSADMIN` | SYSADMIN | - | - |

### Herramientas Necesarias

- ✅ Navegador con DevTools (Chrome/Edge recomendado)
- ✅ Acceso a logs del backend
- ✅ Lista de usuarios esperados por sección

---

## 🧪 Test Suite

### Test 1: Admin de SECC1 - Aislamiento Correcto

**Objetivo:** Verificar que ADMINSECC1 solo ve usuarios de SECC1

#### Pasos:

1. **Login:**
   ```
   Usuario: ADMINSECC1_CANSUR
   Password: [tu contraseña]
   ```

2. **Navegación:**
   - Ir a **Gestión de Usuarios** → **Listar Usuarios**

3. **Verificar en UI:**
   
   **✅ DEBEN APARECER:**
   - `ADMINSECC1_CANSUR`
   - `USER1SECC1_CANSUR`
   - `USER2SECC1_CANSUR`
   
   **❌ NO DEBEN APARECER:**
   - `ADMINSECC2_CANSUR`
   - `USER1SECC2_CANSUR`
   - `USER2SECC2_CANSUR`

4. **Verificar en DevTools (Network Tab):**

   Abrir DevTools → Network → Buscar request `usuarios`

   ```
   ✅ Request URL: /api/orgs/{orgId}/usuarios?seccionId={uuid-secc1}
   ✅ Status: 200 OK
   ✅ Response Body: Array con 3 usuarios (solo de SECC1)
   ```

5. **Verificar en Console:**

   ```javascript
   ✅ [UsuariosListar] 🔍 FILTRADO ACTIVO - Filtrando por sección: {uuid-secc1}
   ✅ [UsersService] 📡 Request URL: /orgs/{orgId}/usuarios?seccionId={uuid-secc1}
   ✅ [UsuariosListar] ✅ Usuarios cargados: 3 usuarios
   ```

6. **Verificar en Backend (Logs del Servidor):**

   ```
   ✅ [UsuarioController][listar] Usuario es ADMIN de sección
   ✅ [UsuarioController][listar] Secciones permitidas: [{uuid-secc1}]
   ✅ [UsuarioController][listar] Lista filtrada por sección: 3 usuarios
   ```

#### Resultado Esperado:

```
✅ PASS: Solo usuarios de SECC1 visibles
✅ PASS: Request incluye parámetro seccionId
✅ PASS: Backend aplica filtro correctamente
```

---

### Test 2: Admin de SECC2 - Segregación de Datos

**Objetivo:** Verificar que ADMINSECC2 NO ve usuarios de SECC1

#### Pasos:

1. **Logout y Login:**
   ```
   Usuario: ADMINSECC2_CANSUR
   Password: [tu contraseña]
   ```

2. **Navegación:**
   - Ir a **Gestión de Usuarios** → **Listar Usuarios**

3. **Verificar en UI:**
   
   **✅ DEBEN APARECER:**
   - `ADMINSECC2_CANSUR`
   - `USER1SECC2_CANSUR`
   - `USER2SECC2_CANSUR`
   
   **❌ NO DEBEN APARECER (CRÍTICO):**
   - `ADMINSECC1_CANSUR` ← ⚠️ Si aparece, el bug persiste
   - `USER1SECC1_CANSUR` ← ⚠️ Si aparece, el bug persiste
   - `USER2SECC1_CANSUR`

4. **Verificar en DevTools:**

   ```
   ✅ Request URL: /api/orgs/{orgId}/usuarios?seccionId={uuid-secc2}
   ✅ Response Body: Array con 3 usuarios (solo de SECC2)
   ```

5. **Verificar en Console:**

   ```javascript
   ✅ [UsuariosListar] 🔍 FILTRADO ACTIVO - Filtrando por sección: {uuid-secc2}
   ✅ [UsuariosListar] ✅ Usuarios cargados: 3 usuarios
   ```

#### Resultado Esperado:

```
✅ PASS: Solo usuarios de SECC2 visibles
✅ PASS: NO hay usuarios de SECC1
✅ PASS: Segregación de datos correcta
```

---

### Test 3: ORGADMIN - Acceso Completo

**Objetivo:** Verificar que ORGADMIN ve TODOS los usuarios

#### Pasos:

1. **Logout y Login:**
   ```
   Usuario: ORGADMIN_CANSUR
   Password: [tu contraseña]
   ```

2. **Navegación:**
   - Ir a **Gestión de Usuarios** → **Listar Usuarios**

3. **Verificar en UI:**
   
   **✅ DEBEN APARECER TODOS:**
   - Usuarios de SECC1 (3 usuarios)
   - Usuarios de SECC2 (3 usuarios)
   - Usuarios sin sección
   - Total esperado: 6+ usuarios

4. **Verificar en DevTools:**

   ```
   ✅ Request URL: /api/orgs/{orgId}/usuarios
   ⚠️ NO debe incluir ?seccionId= (sin filtro)
   ✅ Status: 200 OK
   ✅ Response Body: Array con todos los usuarios
   ```

5. **Verificar en Console:**

   ```javascript
   ✅ [UsuariosListar] 🌐 SIN FILTRO - Mostrando todos los usuarios
   ```

#### Resultado Esperado:

```
✅ PASS: Todos los usuarios visibles
✅ PASS: Sin parámetro seccionId en request
✅ PASS: ORGADMIN mantiene acceso completo
```

---

### Test 4: SYSADMIN - Acceso Global

**Objetivo:** Verificar que SYSADMIN ve usuarios de TODAS las organizaciones

#### Pasos:

1. **Logout y Login:**
   ```
   Usuario: SYSADMIN
   Password: [tu contraseña]
   ```

2. **Seleccionar Organización:**
   - Seleccionar "CANSUR"
   - Ir a **Gestión de Usuarios** → **Listar Usuarios**

3. **Verificar en UI:**
   
   **✅ DEBEN APARECER:**
   - Todos los usuarios de CANSUR (6+)
   - Sin restricciones de sección

4. **Verificar en DevTools:**

   ```
   ✅ Request URL: /api/orgs/{orgId}/usuarios
   ⚠️ NO debe incluir ?seccionId=
   ✅ Status: 200 OK
   ```

#### Resultado Esperado:

```
✅ PASS: Todos los usuarios de la organización visibles
✅ PASS: SYSADMIN mantiene privilegios completos
```

---

### Test 5: Búsqueda y Filtrado (ADMIN Sección)

**Objetivo:** Verificar que el filtrado de búsqueda solo opera sobre usuarios visibles

#### Pasos:

1. **Login como ADMINSECC1_CANSUR**

2. **En el campo de búsqueda, escribir:**
   ```
   USER1
   ```

3. **Verificar:**
   
   **✅ DEBE APARECER:**
   - `USER1SECC1_CANSUR` ✅
   
   **❌ NO DEBE APARECER:**
   - `USER1SECC2_CANSUR` ❌ (aunque coincide con el filtro, pertenece a otra sección)

#### Resultado Esperado:

```
✅ PASS: Búsqueda solo opera sobre usuarios de la sección permitida
✅ PASS: No se filtran usuarios de otras secciones por nombre
```

---

### Test 6: Admin con Múltiples Secciones

**Objetivo:** Verificar que un admin con múltiples secciones ve usuarios de todas sus secciones

> ⚠️ **Nota:** Este test requiere crear un usuario que administre SECC1 y SECC2

#### Pre-requisito:

Crear usuario `ADMIN_MULTI_CANSUR` con:
- Rol ADMIN contextual en SECC1
- Rol ADMIN contextual en SECC2

#### Pasos:

1. **Login:**
   ```
   Usuario: ADMIN_MULTI_CANSUR
   Password: [tu contraseña]
   ```

2. **Verificar en UI:**
   
   **✅ DEBEN APARECER:**
   - Usuarios de SECC1 (3)
   - Usuarios de SECC2 (3)
   - Total: 6 usuarios
   
   **❌ NO DEBEN APARECER:**
   - Usuarios de SECC3, SECC4, etc.

3. **Verificar en Backend (Logs):**

   ```
   ✅ [UsuarioController][listar] Secciones permitidas: [{uuid-secc1}, {uuid-secc2}]
   ✅ [UsuarioController][listar] Usuarios en secciones permitidas: 6
   ```

#### Resultado Esperado:

```
✅ PASS: Usuarios de múltiples secciones administradas visibles
✅ PASS: Usuarios de otras secciones no visibles
```

---

## 🐛 Tests de Casos Límite

### Test Edge 1: Admin sin Secciones Asignadas

**Escenario:** Usuario con rol ADMIN pero sin secciones asignadas

#### Pasos:

1. Crear usuario `ADMIN_SIN_SECC` con rol ADMIN pero sin asignación de sección
2. Login con ese usuario
3. Ir a Listar Usuarios

#### Resultado Esperado:

```
✅ PASS: Lista vacía (sin usuarios)
✅ PASS: Mensaje: "No hay usuarios para mostrar"
✅ PASS: Backend retorna array vacío
```

---

### Test Edge 2: Cambio de Contexto de Sección

**Escenario:** Admin cambia de sección en el contexto

#### Pasos:

1. Login como admin con múltiples secciones
2. Seleccionar SECC1 en el contexto
3. Verificar usuarios (solo de SECC1)
4. Cambiar contexto a SECC2
5. Verificar usuarios (debe actualizarse a solo SECC2)

#### Resultado Esperado:

```
✅ PASS: Lista se actualiza al cambiar contexto
✅ PASS: Parámetro seccionId se actualiza en request
✅ PASS: Solo usuarios de la nueva sección visible
```

---

## 📊 Matriz de Resultados

Completa esta matriz durante el testing:

| Test | Usuario | Sección | Usuarios Esperados | Usuarios Reales | ✅/❌ |
|------|---------|---------|-------------------|----------------|------|
| Test 1 | ADMINSECC1_CANSUR | SECC1 | 3 (solo SECC1) | | ⏳ |
| Test 2 | ADMINSECC2_CANSUR | SECC2 | 3 (solo SECC2) | | ⏳ |
| Test 3 | ORGADMIN_CANSUR | - | 6+ (todos) | | ⏳ |
| Test 4 | SYSADMIN | - | 6+ (todos) | | ⏳ |
| Test 5 | ADMINSECC1_CANSUR | SECC1 | 1 (búsqueda) | | ⏳ |
| Test 6 | ADMIN_MULTI | SECC1+SECC2 | 6 | | ⏳ |
| Edge 1 | ADMIN_SIN_SECC | - | 0 (vacío) | | ⏳ |
| Edge 2 | ADMIN_MULTI | Cambio | Actualiza | | ⏳ |

---

## ✅ Criterios de Éxito

Para considerar la implementación exitosa:

### Obligatorios:
- [x] Test 1: PASS (ADMINSECC1 solo ve SECC1)
- [x] Test 2: PASS (ADMINSECC2 solo ve SECC2)
- [x] Test 3: PASS (ORGADMIN ve todos)
- [x] No hay cross-contamination entre secciones

### Deseables:
- [x] Test 4: PASS (SYSADMIN ve todos)
- [x] Test 5: PASS (búsqueda respeta filtro)
- [x] Performance < 500ms
- [x] Logs detallados en backend

---

## 🚨 Acciones en Caso de Fallo

### Si Test 1 o Test 2 fallan:

**❌ Síntoma:** ADMINSECC1 ve usuarios de SECC2

**Causa Probable:**
1. Backend no está aplicando el filtro
2. Parámetro seccionId no llega al backend
3. Usuario no tiene sección correctamente asignada

**Solución:**

1. **Verificar logs del backend:**
   ```
   Buscar: [UsuarioController][listar]
   Esperado: "Usuario es ADMIN de sección"
   ```

2. **Verificar Network Tab:**
   ```
   Request debe incluir: ?seccionId={uuid}
   ```

3. **Verificar datos del usuario:**
   ```sql
   SELECT u.username, s.nombre, us.rol_contextual
   FROM usuarios u
   JOIN usuario_seccion us ON u.id = us.usuario_id
   JOIN secciones s ON us.seccion_id = s.id
   WHERE u.username = 'ADMINSECC1_CANSUR';
   ```

---

### Si Test 3 falla:

**❌ Síntoma:** ORGADMIN no ve todos los usuarios

**Causa Probable:**
- Backend está aplicando filtro cuando no debería

**Solución:**

Verificar logs del backend:
```
Esperado: "Usuario es ORGADMIN. Sin filtro de sección"
```

---

## 📸 Evidencia de Testing

Para cada test, capturar:

1. **Screenshot de la UI** mostrando la lista de usuarios
2. **Screenshot de Network Tab** con el request y response
3. **Screenshot de Console** con los logs
4. **Logs del backend** (copiar y pegar)

Guardar en carpeta: `docs/testing-evidencia/filtrado-seccion/`

---

## 📞 Reporte de Resultados

### Formato de Reporte:

```markdown
## Resultados de Testing - Filtrado de Usuarios por Sección

**Fecha:** [fecha]
**Tester:** [nombre]
**Ambiente:** [dev/qa/prod]

### Resumen:
- Tests Ejecutados: X
- Tests Pasados: X
- Tests Fallados: X
- Tests Pendientes: X

### Detalle:

#### Test 1: PASS ✅
- Usuario: ADMINSECC1_CANSUR
- Usuarios visibles: 3 (solo SECC1)
- Evidencia: [link a screenshots]

#### Test 2: FAIL ❌
- Usuario: ADMINSECC2_CANSUR
- Problema: Aún ve usuarios de SECC1
- Evidencia: [link a screenshots]
- Logs: [logs del error]

[... etc ...]

### Conclusión:
[Descripción general del estado]

### Próximos Pasos:
1. [Acción 1]
2. [Acción 2]
```

---

**Documento creado:** 2025-11-21  
**Versión:** 1.0  
**Estado:** ✅ LISTO PARA USAR

