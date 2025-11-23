# 🔴 PROBLEMA CRÍTICO: Backend Recibe Headers Incorrectos
**Fecha:** 2025-11-22  
**Estado:** 🔴 PROBLEMA IDENTIFICADO - REQUIERE FIX EN BACKEND  
**Prioridad:** 🔴 CRÍTICA

---

## 🔍 Problema Identificado

### Síntoma
```
Usuario: USERSECC2_CANNON
Sección esperada: SECC2_CANNON (ID: 44a6af84-14e8-4335-bfa0-35887b1f2112)

Vehículos recibidos:
  - IUX263 → SECC1_CANSUR (ID: d30c16bb-f3ce-4c74-94bc-a410f2924a04) ❌
  - EJW05  → SECC1_CANSUR (ID: d30c16bb-f3ce-4c74-94bc-a410f2924a04) ❌

ESPERADO: Solo vehículos de SECC2_CANNON
ACTUAL: Vehículos de SECC1_CANSUR (sección diferente)
```

### 🎯 Causa Raíz

El **interceptor HTTP del frontend** (`auth.interceptor.ts`) está enviando headers adicionales que **interfieren con el filtrado automático del backend**:

```typescript
// auth.interceptor.ts líneas 53-61
if (!isRolesEndpoint) {
  const effectiveOrgId = urlOrgId || ctx.value || localStorage.getItem('currentOrgId');
  const scope = ctx.scope || localStorage.getItem('scopeNivel');
  const seccionId = ctx.seccion || localStorage.getItem('seccionPrincipalId');
  
  if (effectiveOrgId) headers['X-Org-Id'] = String(effectiveOrgId);
  if (scope) headers['X-Scope-Nivel'] = String(scope);
  if (seccionId) headers['X-Seccion-Id'] = String(seccionId);  // ⚠️ PROBLEMA
}
```

**Problema:**
- El header `X-Seccion-Id` se envía desde `localStorage` o `OrgContextService`
- Este valor puede **NO coincidir** con la sección del usuario autenticado en el JWT
- El backend **podría estar usando este header** en lugar del JWT para filtrar

---

## 📊 Evidencia del Problema

### Log del Usuario USERSECC2_CANNON

```javascript
=== DIAGNÓSTICO DE FILTRADO ===
[VehiculosMis] 👤 Usuario actual: USERSECC2_CANNON
[VehiculosMis] 🏢 Sección en localStorage: 44a6af84-14e8-4335-bfa0-35887b1f2112
[VehiculosMis] 🌐 Organización seleccionada: 4a728d93-7475-4065-ae23-e0da25a8b7df
[VehiculosMis] 🔐 Token JWT presente: false  // ⚠️ TOKEN NO PRESENTE

// Vehículos recibidos (INCORRECTOS):
[VehiculosMis] ✅ Vehículos recibidos: 2
[VehiculosMis] 📋 Vehículos: ['IUX263 -> SECC1_CANSUR', 'EJW05 -> SECC1_CANSUR']

// Detalle:
- IUX263: {
    seccionId: 'd30c16bb-f3ce-4c74-94bc-a410f2924a04',  // ← SECC1_CANSUR
    seccionNombre: 'SECC1_CANSUR',
    orgId: '4a728d93-7475-4065-ae23-e0da25a8b7df'
  }
```

### 🚨 Observaciones Críticas

1. **Token JWT NO está presente**
   ```
   [VehiculosMis] 🔐 Token JWT presente: false
   ```
   - El usuario **NO está autenticado correctamente**
   - O el token se perdió después del login

2. **Sección en localStorage es correcta**
   ```
   Sección esperada: 44a6af84-14e8-4335-bfa0-35887b1f2112 (SECC2_CANNON)
   ```
   - El valor en localStorage es el correcto

3. **Backend retorna vehículos incorrectos**
   ```
   Vehículos de SECC1_CANSUR (d30c16bb-f3ce-4c74-94bc-a410f2924a04)
   En lugar de SECC2_CANNON (44a6af84-14e8-4335-bfa0-35887b1f2112)
   ```

---

## 🔍 Análisis del Flujo Actual

### Flujo de la Petición HTTP

```
Frontend                        Interceptor                       Backend
   │                                │                                 │
   ├─ GET /vehiculos           ────┤                                 │
   │                                │                                 │
   │                          ╔═════╧═════════════╗                  │
   │                          ║ auth.interceptor  ║                  │
   │                          ║                   ║                  │
   │                          ║ Headers añadidos: ║                  │
   │                          ║ ✅ Authorization  ║                  │
   │                          ║ ✅ X-Org-Id       ║                  │
   │                          ║ ⚠️ X-Seccion-Id   ║ (desde localStorage)
   │                          ║ ✅ X-Scope-Nivel  ║                  │
   │                          ╚═════╤═════════════╝                  │
   │                                │                                 │
   │                                ├─ GET /vehiculos           ─────┤
   │                                │  Headers:                       │
   │                                │  - Authorization: Bearer ...    │
   │                                │  - X-Org-Id: org-id             │
   │                                │  - X-Seccion-Id: ???      ⚠️    │
   │                                │                                 │
   │                                │                     ╔═══════════╧═══════════╗
   │                                │                     ║ Backend Controller    ║
   │                                │                     ║                       ║
   │                                │                     ║ ¿Usa X-Seccion-Id?    ║
   │                                │                     ║ o                     ║
   │                                │                     ║ ¿Lee JWT?             ║
   │                                │                     ╚═══════════╤═══════════╝
   │                                │                                 │
   │                                │  ◄──── Vehículos incorrectos ──┤
   │  ◄──── Vehículos incorrectos ──┤                                 │
   │                                │                                 │
   ▼                                ▼                                 ▼
Usuario ve vehículos                                    Backend no filtró
de otra sección ❌                                      correctamente ❌
```

---

## 🎯 Posibles Causas del Problema

### Causa 1: Token JWT No Presente ⚠️ MÁS PROBABLE

El log muestra:
```
[VehiculosMis] 🔐 Token JWT presente: false
```

**Problema:**
- El usuario NO tiene token en `localStorage.getItem('token')`
- Sin token, el backend **NO puede identificar al usuario**
- El backend podría estar:
  - Usando valores por defecto
  - Usando el header `X-Seccion-Id` (que puede estar incorrecto)
  - No filtrando en absoluto

**Solución:**
1. Verificar que el login guarda el token correctamente
2. Verificar que el token no se pierde después del login
3. Verificar que el interceptor lee `localStorage.getItem('token')`

### Causa 2: Backend Usa Header X-Seccion-Id Incorrectamente

El interceptor envía:
```typescript
headers['X-Seccion-Id'] = ctx.seccion || localStorage.getItem('seccionPrincipalId');
```

**Problema:**
- `ctx.seccion` puede ser `null` o `undefined`
- `localStorage.getItem('seccionPrincipalId')` puede estar desactualizado
- El backend podría estar usando este header en lugar del JWT

**Ejemplo de backend problemático:**
```typescript
// ❌ INCORRECTO
@Get('/vehiculos')
async list(@Headers('x-seccion-id') seccionId: string) {
  // Usa el header directamente, ignora el JWT
  return this.vehiculosRepo.findBySeccion(seccionId);
}
```

**Ejemplo de backend correcto:**
```typescript
// ✅ CORRECTO
@Get('/vehiculos')
async list(@CurrentUser() user: User) {
  // Lee la sección del JWT del usuario autenticado
  const seccionId = user.seccionId;
  return this.vehiculosRepo.findBySeccion(seccionId);
}
```

### Causa 3: OrgContextService Tiene Valor Incorrecto

El interceptor obtiene la sección de:
```typescript
const seccionId = ctx.seccion || localStorage.getItem('seccionPrincipalId');
```

**Problema:**
- `OrgContextService.seccion` podría tener un valor global compartido
- Al cambiar entre usuarios, el valor podría no actualizarse
- Persiste el valor de un usuario anterior

---

## ✅ Soluciones Propuestas

### Solución 1: Verificar y Corregir el Login (Frontend)

**Objetivo:** Asegurar que el token se guarde correctamente

**Verificar en `login.component.ts`:**
```typescript
// Debe guardar el token
localStorage.setItem('token', response.token);
localStorage.setItem('userId', response.userId);
localStorage.setItem('loginSeccionImmutable', response.seccionPrincipalId);
```

**Verificar que no se borre después:**
- Verificar que no hay código que haga `localStorage.clear()`
- Verificar que el token no expira inmediatamente

### Solución 2: Backend Debe Ignorar Headers Manuales (Backend)

**Objetivo:** Filtrar SOLO basado en JWT, ignorar headers `X-Seccion-Id`

**Backend Controller (NestJS ejemplo):**
```typescript
@Get('/orgs/:orgId/vehiculos')
@UseGuards(JwtAuthGuard)
async listVehiculos(
  @CurrentUser() user: UserFromJwt,  // ✅ Usuario del JWT
  @Param('orgId') orgId: string
) {
  // ❌ NO usar @Headers('x-seccion-id')
  // ✅ Usar user.seccionId del JWT
  
  const { userId, seccionId, roles } = user;
  
  // Filtrar según rol
  if (roles.includes('SYSADMIN')) {
    return this.vehiculosService.findAll();
  }
  
  if (roles.includes('ORGADMIN')) {
    return this.vehiculosService.findByOrg(orgId);
  }
  
  if (roles.includes('ADMIN')) {
    // ✅ Usa seccionId del JWT
    return this.vehiculosService.findBySeccion(seccionId);
  }
  
  // Usuario regular: solo vehículos asignados
  return this.vehiculosService.findByUsuario(userId);
}
```

### Solución 3: Eliminar Header X-Seccion-Id del Interceptor (Frontend)

**Objetivo:** NO enviar header que pueda confundir al backend

**Modificar `auth.interceptor.ts`:**
```typescript
// ❌ REMOVER estas líneas:
if (seccionId) headers['X-Seccion-Id'] = String(seccionId);

// ✅ SOLO enviar:
if (token) headers['Authorization'] = `Bearer ${token}`;
if (effectiveOrgId) headers['X-Org-Id'] = String(effectiveOrgId);
```

**Justificación:**
- El JWT ya contiene `seccionId`
- No es necesario enviarlo como header
- Evita conflictos entre header y JWT

---

## 🧪 Plan de Diagnóstico Completo

### Paso 1: Verificar Token JWT

**Acción:**
1. Abre DevTools → Console
2. Ejecuta: `localStorage.getItem('token')`
3. Verifica que retorne un string largo (JWT)

**Resultado Esperado:**
```javascript
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIuLi4ifQ..."
```

**Si es `null`:**
- ❌ El token no se guardó en el login
- ❌ El token se borró después del login
- 🔧 **FIX:** Corregir el flujo de login

### Paso 2: Decodificar JWT y Verificar Contenido

**Acción:**
1. Copia el token de `localStorage.getItem('token')`
2. Ve a https://jwt.io
3. Pega el token en el decoder
4. Verifica el payload

**Payload Esperado:**
```json
{
  "userId": "uuid-del-usuario",
  "username": "USERSECC2_CANNON",
  "seccionId": "44a6af84-14e8-4335-bfa0-35887b1f2112",
  "roles": ["USUARIO"],
  "organizacionId": "4a728d93-7475-4065-ae23-e0da25a8b7df",
  "iat": 1234567890,
  "exp": 1234567900
}
```

**Verificar:**
- ✅ `seccionId` coincide con `localStorage.getItem('loginSeccionImmutable')`
- ✅ `roles` contiene el rol correcto
- ✅ `exp` (expiración) no está en el pasado

### Paso 3: Verificar Headers en Network Tab

**Acción:**
1. DevTools → Network tab
2. Buscar petición a `/vehiculos`
3. Ver "Request Headers"

**Headers Esperados:**
```http
GET /api/orgs/4a728d93-7475-4065-ae23-e0da25a8b7df/vehiculos HTTP/1.1
Host: localhost:4200
Authorization: Bearer eyJhbGci...  ← DEBE ESTAR PRESENTE
X-Org-Id: 4a728d93-7475-4065-ae23-e0da25a8b7df
X-Seccion-Id: ???  ← VERIFICAR ESTE VALOR
```

**Verificar:**
- ✅ `Authorization` header presente
- ⚠️ `X-Seccion-Id` coincide con la sección del usuario

### Paso 4: Verificar Respuesta del Backend

**Acción:**
1. Network tab → Click en la petición `/vehiculos`
2. Ver "Response" tab
3. Verificar los vehículos retornados

**Verificar:**
- ❌ Si retorna vehículos de otra sección → **BACKEND NO FILTRA**
- ✅ Si retorna vehículos correctos → **BACKEND FILTRA OK**

---

## 📋 Checklist de Verificación

### Frontend
- [ ] Token se guarda correctamente en login
- [ ] Token está presente: `localStorage.getItem('token')`
- [ ] Interceptor envía Authorization header
- [ ] `loginSeccionImmutable` tiene el valor correcto
- [ ] No hay código que borre el token

### Backend
- [ ] Endpoint `/vehiculos` usa `@CurrentUser()` para obtener usuario
- [ ] Filtra basado en `user.seccionId` del JWT
- [ ] NO usa `@Headers('x-seccion-id')`
- [ ] Logs muestran `seccionId` del JWT
- [ ] Retorna solo vehículos de la sección del usuario

### Testing
- [ ] Login con USERSECC1_CANSUR → Ver solo vehículos de SECC1
- [ ] Login con USERSECC2_CANNON → Ver solo vehículos de SECC2
- [ ] Verificar token en localStorage después de login
- [ ] Verificar headers en Network tab
- [ ] Verificar logs del backend

---

## 🚀 Próximos Pasos

1. **URGENTE:** Verificar por qué `Token JWT presente: false`
   - Revisar flujo de login
   - Verificar que se guarda con key `'token'`
   - Verificar que no se borra

2. **Modificar Backend** para filtrar SOLO por JWT:
   ```typescript
   // Ignorar header X-Seccion-Id
   // Usar SOLO user.seccionId del JWT
   ```

3. **Opcional:** Eliminar header `X-Seccion-Id` del interceptor frontend

4. **Testing exhaustivo** con múltiples usuarios y secciones

---

**Documentado por:** GitHub Copilot  
**Fecha:** 2025-11-22  
**Estado:** 🔴 REQUIERE ACCIÓN INMEDIATA  
**Prioridad:** CRÍTICA

