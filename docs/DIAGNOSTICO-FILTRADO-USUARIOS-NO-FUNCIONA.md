# 🔍 DIAGNÓSTICO: Filtrado de Usuarios por Sección NO Funciona

**Fecha:** 2025-11-21  
**Prioridad:** 🔴 ALTA  
**Usuario Afectado:** ADMINSECC1_CANSUR  
**Problema:** Ve usuarios de SECC2_CANSUR (NO debería)

---

## 🐛 Evidencia del Error

### Usuario Reportado:
```
Usuario: ADMINSECC1_CANSUR
Rol: Administrador de SECC1_CANSUR
Problema: Está viendo usuario "YAJAIRA CUARDADO URANGO (ADMINSECC2_CANSUR)"
Sección del usuario visto: SECC2_CANSUR
```

**❌ ERROR CRÍTICO:** Un admin de SECC1 NO debe ver usuarios de SECC2

---

## 🔎 Análisis del Código Frontend

### ✅ Código Actual ES CORRECTO

He verificado el código del componente `usuarios-listar.component.ts` y confirmo:

1. **✅ NO hay filtrado manual en el cliente**
   ```typescript
   // El código NO hace esto (correcto):
   // this.usuarios.filter(u => u.seccionId === miSeccion)
   ```

2. **✅ NO envía parámetro seccionId al backend**
   ```typescript
   // Línea 272: Llamada sin parámetros
   this.users.list(this.orgId).subscribe({...})
   ```

3. **✅ Confía en el backend para el filtrado**
   ```typescript
   // Comentarios en línea 260-270 confirman:
   // "El backend ahora aplica automáticamente el filtrado"
   ```

4. **✅ Logs de debugging implementados**
   ```typescript
   // Línea 277-285: Logs de distribución por sección
   console.log('[UsuariosListar] 📊 Distribución por sección:', ...)
   ```

### Conclusión del Análisis Frontend:
**El frontend está implementado CORRECTAMENTE según el requerimiento.**

---

## 🎯 Posibles Causas del Problema

### Causa 1: Caché del Navegador 🔥 (MÁS PROBABLE)
**Probabilidad:** 80%

El navegador está mostrando datos antiguos de antes de la corrección del backend.

**Evidencia que lo confirmaría:**
- Response del backend tiene TODOS los usuarios (no filtrados)
- Logs del backend NO muestran filtrado aplicado
- Timestamp de los datos es anterior a la corrección

**Solución:**
1. Limpiar caché completamente
2. Cerrar todas las pestañas del navegador
3. Reabrir y hacer login nuevamente

---

### Causa 2: Backend NO Aplica Filtro 🔥 (SEGUNDA MÁS PROBABLE)
**Probabilidad:** 15%

El backend no está detectando correctamente el rol del usuario o las secciones administradas.

**Evidencia que lo confirmaría:**
- Response del backend contiene usuarios de múltiples secciones
- Logs del backend muestran: "Usuario es ADMIN de sección. Secciones permitidas: []" (vacío)
- O no hay logs de filtrado

**Solución:**
Verificar en el backend:
1. Método `getSeccionesAdministradas()` retorna IDs correctos
2. Usuario ADMINSECC1_CANSUR tiene asignación a SECC1_CANSUR
3. Logs muestran el filtrado aplicándose

---

### Causa 3: Token JWT Incorrecto 🔥
**Probabilidad:** 3%

El token no contiene la información correcta del usuario o sus roles.

**Evidencia que lo confirmaría:**
- Token decodificado no muestra username correcto
- Token no tiene claim de roles/secciones
- Backend no puede identificar al usuario del token

**Solución:**
1. Decodificar token en https://jwt.io
2. Verificar claims
3. Re-generar token (logout/login)

---

### Causa 4: Datos de Prueba Inconsistentes 🔥
**Probabilidad:** 2%

Los datos en la base de datos están mal configurados.

**Evidencia que lo confirmaría:**
- Query SQL directa muestra usuarios mal asignados
- Tabla de relaciones usuario-sección tiene datos incorrectos

---

## 📋 PLAN DE ACCIÓN INMEDIATO

### PASO 1: Limpiar Caché (2 minutos) ⚡

#### En Chrome/Edge:
1. Presionar `F12` para abrir DevTools
2. Click derecho en el botón de recargar (junto a la barra de direcciones)
3. Seleccionar **"Vaciar caché y recargar con fuerza"**
4. Alternativamente:
   - `Ctrl + Shift + Delete`
   - Seleccionar "Imágenes y archivos en caché"
   - Rango: "Desde siempre"
   - Click "Borrar datos"

#### En Firefox:
1. `Ctrl + Shift + Delete`
2. Seleccionar "Caché"
3. Rango: "Todo"
4. Click "Limpiar ahora"
5. Recargar con `Ctrl + F5`

#### Limpiar Storage del Navegador:
```javascript
// Ejecutar en la Console (F12 → Console):
localStorage.clear();
sessionStorage.clear();
console.log('✅ Storage limpiado');
location.reload(true);
```

---

### PASO 2: Verificar Request/Response (5 minutos) 🔍

#### 2.1. Abrir DevTools
1. Presionar `F12`
2. Ir a pestaña **Network**
3. Marcar checkbox **"Preserve log"**

#### 2.2. Login y Navegar
1. Hacer login como: `ADMINSECC1_CANSUR` / `[password]`
2. Ir a: **Gestión de Usuarios → Listar Usuarios**
3. Observar requests en Network tab

#### 2.3. Verificar Request
Buscar request a: `/api/v1/organizaciones/{orgId}/usuarios`

**Headers Esperados:**
```
GET /api/v1/organizaciones/{orgId}/usuarios HTTP/1.1
Authorization: Bearer eyJhbGc...
Content-Type: application/json
Accept: application/json
```

**Query Parameters:**
```
❌ NO debe tener: ?seccionId=...
✅ Debe ser: /usuarios (sin parámetros)
```

**Screenshot:** Capturar request completo

#### 2.4. Verificar Response
Click en el request → pestaña **Response**

**Estructura Esperada:**
```json
{
  "message": "Usuarios listados correctamente",
  "data": [
    {
      "id": "uuid-1",
      "username": "USER1SECC1_CANSUR",
      "seccionNombre": "SECC1_CANSUR",  // ✅ Debe ser SECC1
      ...
    },
    {
      "id": "uuid-2",
      "username": "ADMINSECC1_CANSUR",
      "seccionNombre": "SECC1_CANSUR",  // ✅ Debe ser SECC1
      ...
    }
  ]
}
```

**⚠️ VERIFICACIÓN CRÍTICA:**
Contar cuántos usuarios tienen `seccionNombre` diferente a `"SECC1_CANSUR"`:

```javascript
// En Console (F12 → Console):
// Copiar el response JSON y pegarlo en una variable:
const response = { /* pegar JSON aquí */ };

const usuariosPorSeccion = {};
response.data.forEach(u => {
  const sec = u.seccionNombre || 'Sin sección';
  usuariosPorSeccion[sec] = (usuariosPorSeccion[sec] || 0) + 1;
});

console.log('📊 Distribución:', usuariosPorSeccion);

// Resultado esperado para ADMINSECC1:
// { "SECC1_CANSUR": X }  (solo una sección)

// ❌ Si aparece:
// { "SECC1_CANSUR": 3, "SECC2_CANSUR": 2 }
// → El problema está en el BACKEND
```

**Screenshot:** Capturar response completo

---

### PASO 3: Verificar Console Logs (2 minutos) 📝

En DevTools → **Console**, buscar los logs del componente:

**Logs Esperados:**
```
[UsuariosListar] 📡 Cargando usuarios...
[UsuariosListar] 📊 Contexto Frontend: { scope: "SECCION", seccionId: "uuid-secc1", orgId: "uuid-org" }
[UsuariosListar] ℹ️ El backend aplicará filtrado automático según rol del usuario
[UsersService] 📡 GET /orgs/{orgId}/usuarios
[UsersService] ℹ️ Backend aplicará filtrado automático según rol de usuario autenticado
[UsuariosListar] ✅ Usuarios cargados: 3 usuarios
[UsuariosListar] ✅ Filtrado aplicado por el backend según rol de usuario autenticado
[UsuariosListar] 📊 Distribución por sección: { "SECC1_CANSUR": 3 }
```

**⚠️ SI VES ESTO → PROBLEMA EN BACKEND:**
```
[UsuariosListar] 📊 Distribución por sección: { "SECC1_CANSUR": 3, "SECC2_CANSUR": 2 }
```

**Screenshot:** Capturar console completo

---

### PASO 4: Verificar Token JWT (3 minutos) 🔐

#### 4.1. Extraer Token
```javascript
// En Console (F12 → Console):
const token = localStorage.getItem('authToken') 
           || sessionStorage.getItem('authToken')
           || localStorage.getItem('token')
           || sessionStorage.getItem('token');

console.log('Token encontrado:', token ? 'SÍ' : 'NO');
if (token) {
  console.log('Longitud:', token.length);
  console.log('Primeros 50 chars:', token.substring(0, 50) + '...');
}
```

#### 4.2. Decodificar Token
1. Copiar el token completo
2. Ir a: https://jwt.io
3. Pegar en el campo "Encoded"

**Verificar Claims:**
```json
{
  "sub": "ADMINSECC1_CANSUR",  // ✅ Username correcto
  "username": "ADMINSECC1_CANSUR",
  "roles": ["ADMIN"],  // ✅ Rol correcto
  "orgId": "uuid-org",
  "seccionId": "uuid-secc1",  // ✅ Sección correcta
  "exp": 1732234567,
  ...
}
```

**⚠️ Problemas Posibles:**
- Token no tiene campo `username`
- Token no tiene campo `roles`
- Token tiene username incorrecto
- Token expirado (`exp` en el pasado)

**Screenshot:** Capturar token decodificado (ocultar signature)

---

### PASO 5: Prueba con Otro Usuario (5 minutos) 🧪

Para confirmar que el problema es específico del usuario o general:

#### 5.1. Login como ADMINSECC2_CANSUR
1. Logout de ADMINSECC1_CANSUR
2. Limpiar caché nuevamente
3. Login: `ADMINSECC2_CANSUR` / `[password]`
4. Ir a: Gestión de Usuarios → Listar

**Verificar:**
- ✅ Solo ve usuarios de SECC2_CANSUR
- ❌ NO ve usuarios de SECC1_CANSUR

**Si también falla:** Problema general del backend  
**Si funciona:** Problema específico de ADMINSECC1 o sus datos

#### 5.2. Login como ORGADMIN (si existe)
1. Login: `orgadmin` / `[password]`
2. Ir a: Gestión de Usuarios → Listar

**Verificar:**
- ✅ Ve usuarios de TODAS las secciones
- Debe ver SECC1, SECC2, SECC3, etc.

---

## 📊 CHECKLIST DE DIAGNÓSTICO

### Pre-requisitos:
- [ ] Caché del navegador limpiado
- [ ] localStorage/sessionStorage limpiado
- [ ] Navegador reiniciado
- [ ] Login realizado con credenciales correctas

### Verificaciones:
- [ ] Request NO incluye `?seccionId=`
- [ ] Response verificada en Network tab
- [ ] Console logs capturados
- [ ] Token JWT decodificado y verificado
- [ ] Distribución por sección verificada
- [ ] Prueba con segundo usuario realizada

### Capturas:
- [ ] Screenshot: Request Headers
- [ ] Screenshot: Response JSON
- [ ] Screenshot: Console Logs
- [ ] Screenshot: Token decodificado (sin signature)
- [ ] Screenshot: Pantalla mostrando el error

---

## 🎯 DETERMINACIÓN DE CAUSA

### ✅ SI Response tiene SOLO SECC1:
**CAUSA:** Caché del navegador  
**SOLUCIÓN:** Limpiar caché, recargar, problema resuelto ✅

### ❌ SI Response tiene SECC1 + SECC2:
**CAUSA:** Backend NO aplica filtro  
**ACCIÓN:** Escalar a equipo de backend con evidencia

### ❌ SI Token JWT está mal:
**CAUSA:** Problema de autenticación  
**ACCIÓN:** Re-generar token (logout/login), verificar servicio auth

### ❌ SI Console muestra errores:
**CAUSA:** Error en el código frontend  
**ACCIÓN:** Revisar stack trace, corregir error

---

## 📝 FORMATO DE REPORTE

```markdown
## 🔍 Reporte de Diagnóstico - [Tu Nombre] - 2025-11-21

### 1. Información Básica
- Usuario probado: ADMINSECC1_CANSUR
- Navegador: [Chrome/Firefox/Edge] versión [X]
- Fecha/Hora: [timestamp]
- Caché limpiado: ✅ SÍ / ❌ NO

### 2. Request Verificado
- URL: GET /api/v1/organizaciones/{orgId}/usuarios
- Query Params: [ninguno / seccionId=xxx]
- Headers: [Authorization presente: SÍ/NO]

### 3. Response Verificado
- Status: [200 / 400 / 403 / 500]
- Total usuarios: [número]
- Distribución:
  ```json
  {
    "SECC1_CANSUR": 3,
    "SECC2_CANSUR": 2  // ❌ NO debería estar
  }
  ```

### 4. Console Logs
```
[logs aquí]
```

### 5. Token JWT
- Token presente: SÍ / NO
- Username en token: [username]
- Roles en token: [roles]
- Expiración: [fecha]

### 6. Prueba con ADMINSECC2
- Resultado: ✅ PASS / ❌ FAIL
- Distribución: {...}

### 7. Conclusión
**CAUSA IDENTIFICADA:** [Caché / Backend / Token / Datos]

**EVIDENCIA:**
- [punto 1]
- [punto 2]

**ACCIÓN REQUERIDA:**
- [acción 1]
- [acción 2]

### 8. Screenshots
- [adjuntar capturas]
```

---

## 🚨 ESCALACIÓN

### Si el problema está en el BACKEND:

**Contactar a:** Backend Team  
**Incluir:**
1. Este documento completo
2. Screenshots del Response JSON
3. Console logs del frontend
4. Token JWT decodificado

**Solicitar:**
- Logs del servidor cuando ADMINSECC1_CANSUR accede
- Resultado de la query SQL que busca secciones administradas
- Logs de `[UsuarioController][listar]`
- Logs de `[getSeccionesAdministradas]`

### Queries SQL para Backend:

```sql
-- Verificar asignación de ADMINSECC1 a SECC1
SELECT u.username, s.nombre as seccion, us.rol_contextual
FROM usuarios u
JOIN usuario_seccion us ON u.id = us.usuario_id
JOIN secciones s ON us.seccion_id = s.id
WHERE u.username = 'ADMINSECC1_CANSUR';

-- Debe retornar:
-- username: ADMINSECC1_CANSUR
-- seccion: SECC1_CANSUR
-- rol_contextual: ADMIN

-- Verificar secciones donde es admin principal
SELECT s.nombre, s.administrador_principal_id
FROM secciones s
JOIN usuarios u ON s.administrador_principal_id = u.id
WHERE u.username = 'ADMINSECC1_CANSUR';

-- Debe retornar:
-- nombre: SECC1_CANSUR
```

---

## ⏱️ TIEMPO ESTIMADO

- **Diagnóstico completo:** 20 minutos
- **Reporte:** 10 minutos
- **Total:** 30 minutos

---

## 📞 CONTACTO

**Equipo Frontend:**
- Documento implementación: `docs/IMPLEMENTACION-REQUERIMIENTO-FILTRADO-SECCION-2025-11-21.md`

**Equipo Backend:**
- Documento corrección: `docs/CORRECCION-FILTRADO-SECCION.md`
- Buscar logs: `[UsuarioController][listar]` y `[getSeccionesAdministradas]`

---

**Creado por:** GitHub Copilot  
**Fecha:** 2025-11-21  
**Prioridad:** 🔴 ALTA  
**Estado:** 📋 DIAGNÓSTICO LISTO PARA EJECUTAR

