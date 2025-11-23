# Requerimiento: Confirmar y Documentar ID de Usuario en Respuesta de Login

**Fecha:** 2025-11-22  
**Prioridad:** Media (Verificación)
**Módulo:** Autenticación  
**Afecta a:** Frontend Angular  
**Estado:** ✅ FUNCIONANDO (Requiere Confirmación)

---

## 📋 Resumen

**ACTUALIZACIÓN:** Se ha detectado que el `userId` YA está disponible en localStorage del frontend:
```
userId: fc6a9f07-93d8-48ab-bb12-43d4b76951be
```

Este requerimiento ahora se convierte en una **solicitud de confirmación y documentación** para verificar que el backend está enviando correctamente el campo `userId` o `usuarioId` en la respuesta del endpoint de login.

---

## ✅ Evidencia de Funcionamiento

### Logs del Frontend (2025-11-22)
```
[VehiculosCrear] ✅ Sección desde loginSeccionImmutable: d30c16bb-f3ce-4c74-94bc-a410f2924a04
[VehiculosCrear] ✅ Sección auto-seleccionada: d30c16bb-f3ce-4c74-94bc-a410f2924a04
[VehiculosCrear] Sin permisos para listar usuarios de la sección (403)
[VehiculosCrear] ✅ Auto-seleccionado usuario desde localStorage: fc6a9f07-93d8-48ab-bb12-43d4b76951be
```

**Resultado:** El usuario fue auto-seleccionado correctamente usando el `userId` almacenado en localStorage.

---

## 🎯 Objetivo Actualizado

**Solicitar al equipo de backend:**

1. ✅ **Confirmar** que el endpoint `POST /auth/login` está incluyendo el campo `userId` o `usuarioId` en la respuesta
2. ✅ **Documentar** oficialmente este campo en la especificación de la API
3. ✅ **Garantizar** que el campo estará presente en todas las respuestas futuras de login

---

## 📡 Endpoint a Verificar

```
POST /auth/login
```

### Response Actual (Supuesta - A Confirmar)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "username": "usuario@ejemplo.com",
  "roles": ["USUARIO"],
  "opcionesDetalle": [...],
  "orgAdministraId": "4a728d93-7475-4065-ae23-e0da25a8b7df",
  "scopeNivel": "SECCION",
  "seccionPrincipalId": "d30c16bb-f3ce-4c74-94bc-a410f2924a04",
  "userId": "fc6a9f07-93d8-48ab-bb12-43d4b76951be"  // ✅ ¿Este campo está siendo enviado?
}
```

**O alternativamente:**
```json
{
  ...,
  "usuarioId": "fc6a9f07-93d8-48ab-bb12-43d4b76951be"  // ✅ ¿O se usa este nombre?
}
```

---

## 🔧 Especificación Técnica

### Campo a Confirmar

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `userId` o `usuarioId` | `string` (UUID) | ✅ Sí | ID único del usuario autenticado en la base de datos |

### Preguntas para el Backend

1. ¿El campo `userId` está siendo incluido en la respuesta de login actualmente?
2. ¿O se usa el nombre `usuarioId` en su lugar?
3. ¿Este campo está garantizado en todas las respuestas de login?
4. ¿Está documentado en la especificación de la API?

---

## 💻 Código del Frontend (Ya Implementado)

El frontend YA está preparado y funcionando correctamente:

```typescript
// auth.service.ts - línea 125-134
// ✅ Guardar userId si viene del backend
try {
  const userIdRaw = resp.userId ?? resp.usuarioId;
  if (userIdRaw != null) {
    localStorage.setItem('userId', String(userIdRaw));
    localStorage.setItem('currentUserId', String(userIdRaw));
    console.log('[AuthService] ✅ Usuario ID guardado:', userIdRaw);
  }
} catch (e) {
  console.error('[AuthService] Error al guardar userId:', e);
}
```

```typescript
// vehiculos-crear.component.ts - línea 230-252
private autoSelectCurrentUser() {
  // Intenta desde localStorage
  try {
    const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
    if (userId) {
      this.currentUserId = userId;
      this.model.usuarioIds = [userId];
      console.log('[VehiculosCrear] ✅ Auto-seleccionado usuario desde localStorage:', userId);
      return;
    }
  } catch {}
  // ... fallbacks adicionales ...
}
```

---

## ✅ Casos de Uso Funcionando

### 1. Crear Vehículo (Usuario Regular) - ✅ FUNCIONANDO

**Escenario:**
- Usuario regular (sin permisos de admin) crea un vehículo
- El backend responde con 403 al intentar listar usuarios de la sección
- El frontend auto-selecciona al usuario usando el `userId` de localStorage

**Resultado Actual:**
```
✅ Sección auto-seleccionada desde loginSeccionImmutable
✅ Usuario auto-seleccionado desde localStorage  
✅ Usuario puede crear vehículo sin problemas
```

---

## 🧪 Test de Verificación

### Para el Equipo de Backend

Por favor, verificar la respuesta del endpoint de login con este test:

```bash
# Request
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "usuario@ejemplo.com",
    "password": "password123"
  }' | jq '.'

# Verificar que la respuesta incluya uno de estos campos:
# - .userId
# - .usuarioId
```

**Pregunta:** ¿El JSON de respuesta incluye el campo `userId` o `usuarioId`?

---

## 📅 Impacto y Urgencia (Actualizado)

### Impacto Actual
- **✅ Funcionalidad Operativa**: Los usuarios YA pueden crear vehículos
- **⚠️ Documentación Pendiente**: Falta confirmar que el campo está oficialmente soportado

### Urgencia
- **Media**: La funcionalidad está operando correctamente
- **Objetivo**: Confirmar y documentar para evitar futuros problemas

---

## 🔄 Cambios en Frontend (Ya Implementados y Funcionando)

El frontend ya está preparado y **funcionando correctamente** para:

1. ✅ Recibir `userId` o `usuarioId` del backend en el login
2. ✅ Guardarlo en localStorage
3. ✅ Auto-seleccionar al usuario en formularios
4. ✅ Manejar el caso de error 403 al listar usuarios

**Código:**
- `auth.service.ts` (líneas 125-134): Guarda userId en localStorage
- `vehiculos-crear.component.ts` (líneas 230-275): Auto-selección con fallbacks

---

## 📞 Solicitud al Backend

**Acción requerida:**

1. ✅ Confirmar que el campo `userId` o `usuarioId` está siendo enviado en `POST /auth/login`
2. ✅ Documentar este campo en la especificación oficial de la API
3. ✅ Asegurar que el campo estará presente en futuras versiones

**Respuesta esperada del backend:**
- Nombre del campo: `userId` o `usuarioId`
- Confirmación de que está incluido en la respuesta
- Referencia a la documentación donde está especificado

---

## ✅ Checklist de Verificación Backend

- [ ] Confirmar que `userId` o `usuarioId` está en la respuesta de login
- [ ] Especificar el nombre exacto del campo (`userId` vs `usuarioId`)
- [ ] Documentar el campo en la especificación de la API
- [ ] Confirmar que el campo siempre estará presente (no opcional)
- [ ] Notificar a frontend la confirmación

---

## 📸 Evidencia Actualizada

### ✅ Funcionamiento Correcto (2025-11-22)
```
[VehiculosCrear] ✅ Sección desde loginSeccionImmutable: d30c16bb-f3ce-4c74-94bc-a410f2924a04
[UsersService] 📡 GET /usuarios?seccionId=d30c16bb-f3ce-4c74-94bc-a410f2924a04
❌ GET 403 (Forbidden) → Manejado correctamente, sin error molesto
[VehiculosCrear] ✅ Auto-seleccionado usuario desde localStorage: fc6a9f07-93d8-48ab-bb12-43d4b76951be
✅ Usuario puede continuar con la creación del vehículo
```

---

## 🎯 Resultado Actual

✅ **FUNCIONANDO CORRECTAMENTE**

1. ✅ Los usuarios regulares pueden crear vehículos exitosamente
2. ✅ No se requieren peticiones adicionales al backend
3. ✅ La auto-selección funciona correctamente
4. ✅ El manejo del error 403 es transparente para el usuario

**Pendiente:**
- Confirmación oficial del backend sobre el campo `userId`/`usuarioId`
- Documentación del campo en la especificación de la API

---

**Fin del documento actualizado**
