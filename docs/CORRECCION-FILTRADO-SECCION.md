# 🔒 Corrección: Filtrado de Usuarios por Sección

**Fecha:** 2025-11-21  
**Estado:** ✅ IMPLEMENTADO Y COMPILADO

---

## 📋 Problema Identificado

En el sistema de gestión de usuarios, los administradores de sección estaban viendo usuarios de otras secciones, lo cual **viola el principio de aislamiento por sección**.

### Ejemplos del Error:

**ADMINSECC1_CANSUR** (Administrador de SECC1) estaba viendo:
- ❌ ADMINSECC2_CANSUR (pertenece a SECC2)
- ✅ USER1SECC1_CANSUR (correcto, pertenece a SECC1)

**ADMINSECC2_CANSUR** (Administrador de SECC2) estaba viendo:
- ❌ ADMINSECC1_CANSUR (pertenece a SECC1)
- ❌ USER1SECC1_CANSUR (pertenece a SECC1)

---

## 🔍 Causa Raíz

El método `listar()` en **UsuarioController** (backend) no estaba aplicando automáticamente el filtro de sección para usuarios que son administradores de sección.

**Problemas específicos:**
- ✗ El parámetro `seccionId` era opcional
- ✗ El frontend podía enviarlo incorrectamente o no enviarlo
- ✗ No había validación para forzar el filtro cuando el usuario era ADMIN de sección

---

## ✅ Solución Implementada (Backend)

### 1. Nuevo Método Auxiliar: `getSeccionesAdministradas()`

Se agregó un método que identifica **todas las secciones** donde un usuario es administrador:

```java
private Set<UUID> getSeccionesAdministradas(HttpServletRequest request, UUID orgId) {
    Set<UUID> secciones = new HashSet<>();
    UsuarioEntity u = getCurrentUser(request);
    if (u == null || orgId == null) return secciones;
    UUID uid = u.getId();
    
    // 1. Secciones donde es admin principal
    List<SeccionEntity> seccionesAdminPrincipal = 
        seccionRepository.findByOrganizacionEntity_IdAndAdministradorPrincipal_Id(orgId, uid);
    
    seccionesAdminPrincipal.forEach(s -> secciones.add(s.getId()));
    
    // 2. Secciones donde tiene rol contextual ADMIN
    List<UsuarioSeccionEntity> usuarioSecciones = 
        usuarioSeccionRepository.findByUsuarioEntity_IdAndOrganizacionEntity_Id(uid, orgId);
    
    usuarioSecciones.stream()
        .filter(us -> {
            RolEntity rol = us.getRolEntityContextual();
            return rol != null && "ADMIN".equalsIgnoreCase(rol.getNombre());
        })
        .forEach(us -> secciones.add(us.getSeccionEntity().getId()));
    
    return secciones;
}
```

**Lógica:**
- ✅ Busca secciones donde el usuario es **administrador principal**
- ✅ Busca secciones donde el usuario tiene **rol contextual ADMIN**
- ✅ Retorna el conjunto de todas las secciones administradas

---

### 2. Modificación del Método `listar()`

Se implementó la lógica de **filtrado forzoso** por sección:

```java
@GetMapping
public ResponseEntity<Map<String, Object>> listar(
    @PathVariable UUID orgId,
    @RequestParam(required = false) UUID seccionId,
    @RequestParam(required = false, defaultValue = "false") boolean excludeAdmins,
    HttpServletRequest request
) {
    boolean su = isSysAdmin(request);
    boolean esOrgAdmin = !su && isOrgAdmin(request, orgId);
    boolean esSeccionAdmin = !su && !esOrgAdmin && isSeccionAdmin(request, orgId);
    
    // 🔒 CRÍTICO: Si es ADMIN de sección, FORZAR filtro por sus secciones
    Set<UUID> seccionesPermitidas = null;
    if (esSeccionAdmin && !su && !esOrgAdmin) {
        seccionesPermitidas = getSeccionesAdministradas(request, orgId);
        
        log.info("[UsuarioController][listar] Usuario es ADMIN de sección. Secciones permitidas: {}", 
            seccionesPermitidas);
        
        if (seccionesPermitidas.isEmpty()) {
            // Admin sin secciones = lista vacía
            return response(HttpStatus.OK, Messages.USER_LIST_OK, Collections.emptyList());
        }
    }
    
    // Cargar lista de usuarios de la organización
    List<UsuarioEntity> lista = usuarioRepository.findByOrganizacionEntity_Id(orgId);
    
    // 🔒 Aplicar filtro por secciones
    if (seccionesPermitidas != null && !seccionesPermitidas.isEmpty()) {
        Set<UUID> usuariosEnSecciones = new HashSet<>();
        for (UUID secId : seccionesPermitidas) {
            usuariosEnSecciones.addAll(
                usuarioSeccionRepository.findBySeccionEntity_Id(secId)
                    .stream()
                    .map(us -> us.getUsuarioEntity().getId())
                    .collect(Collectors.toSet())
            );
        }
        
        log.info("[UsuarioController][listar] Usuarios en secciones permitidas: {}", 
            usuariosEnSecciones.size());
        
        lista = lista.stream()
            .filter(u -> usuariosEnSecciones.contains(u.getId()))
            .collect(Collectors.toList());
        
        log.info("[UsuarioController][listar] Lista filtrada por sección: {} usuarios", 
            lista.size());
    }
    
    // ... resto del código (mapeo, exclusiones, etc.)
}
```

**Lógica de seguridad:**
- 🔒 **Detecta** si el usuario es ADMIN de sección
- 🔒 **Obtiene** las secciones que administra
- 🔒 **Filtra** la lista para mostrar SOLO usuarios de esas secciones
- 🔒 **Ignora** cualquier parámetro `seccionId` enviado por el frontend

---

### 3. Nuevos Métodos en Repositorios

#### **SeccionRepository**
```java
List<SeccionEntity> findByOrganizacionEntity_IdAndAdministradorPrincipal_Id(
    UUID orgId, 
    UUID adminUsuarioId
);
```

#### **UsuarioSeccionRepository**
```java
List<UsuarioSeccionEntity> findByUsuarioEntity_IdAndOrganizacionEntity_Id(
    UUID usuarioId, 
    UUID orgId
);

List<UsuarioSeccionEntity> findBySeccionEntity_Id(UUID seccionId);
```

---

## 🎯 Comportamiento por Rol

| Rol | Comportamiento |
|-----|----------------|
| **SYSADMIN** | Ve **TODOS** los usuarios del sistema (sin filtros) |
| **ORGADMIN** | Ve todos los usuarios de **su organización** |
| **ADMIN (Sección)** | Ve **SOLO** usuarios de **SU(S) sección(es)** - FILTRO FORZOSO |
| **USUARIO** | No tiene acceso al listado |

---

## 🛡️ Reglas de Negocio Aplicadas

✅ **Aislamiento por Sección**  
Un ADMIN de sección solo puede ver usuarios de sus propias secciones

✅ **Ignorar Parámetros Externos**  
Si el frontend envía un `seccionId` diferente, se ignora y se usa el de las secciones del usuario

✅ **Seguridad por Defecto**  
Si un ADMIN de sección no tiene secciones asignadas, retorna lista vacía

✅ **Jerarquía Respetada**  
SYSADMIN y ORGADMIN mantienen acceso completo

---

## 📊 Logs Agregados (Backend)

```
[UsuarioController][listar] Usuario es ADMIN de sección. Secciones permitidas: [uuid1, uuid2]
[UsuarioController][listar] Usuarios en secciones permitidas: X usuarios
[UsuarioController][listar] Lista filtrada por sección: X usuarios
```

---

## 🔗 Integración Frontend-Backend

### Frontend (Ya Implementado)

El componente **usuarios-listar.component.ts** ya detecta el contexto y envía el parámetro `seccionId`:

```typescript
// ✅ Detectar contexto
const scope = String(this.orgCtx.scope || '').toUpperCase();
const seccionId = this.orgCtx.seccion;

const params: { seccionId?: string; excludeAdmins?: boolean } = {};

if (scope === 'SECCION' && seccionId) {
  params.seccionId = String(seccionId);
}

// ✅ Llamar al servicio con parámetros
this.users.list(this.orgId, params).subscribe(...);
```

### Backend (Nueva Implementación)

El backend **ignora** el parámetro `seccionId` enviado por el frontend cuando el usuario es ADMIN de sección y aplica su propio filtro basado en las secciones administradas.

**Flujo de seguridad:**
1. Frontend envía: `GET /api/orgs/{orgId}/usuarios?seccionId={uuid}`
2. Backend detecta: "Usuario es ADMIN de sección"
3. Backend obtiene: Secciones administradas por el usuario
4. Backend filtra: Solo usuarios de esas secciones
5. Backend retorna: Lista filtrada

---

## 🧪 Pruebas Recomendadas

### **Caso 1: ADMIN de SECC1**

**Pasos:**
1. Login como **ADMINSECC1_CANSUR**
2. Ir a "Gestión de Usuarios" → "Listar Usuarios"

**Resultado esperado:**
- ✅ Solo aparecen usuarios de **SECC1**
- ❌ No aparecen usuarios de SECC2, SECC3, etc.

**Verificar en logs (backend):**
```
[UsuarioController][listar] Usuario es ADMIN de sección. Secciones permitidas: [uuid-secc1]
[UsuarioController][listar] Lista filtrada por sección: X usuarios
```

---

### **Caso 2: ADMIN de SECC2**

**Pasos:**
1. Login como **ADMINSECC2_CANSUR**
2. Ir a "Gestión de Usuarios" → "Listar Usuarios"

**Resultado esperado:**
- ✅ Solo aparecen usuarios de **SECC2**
- ❌ No aparecen usuarios de SECC1, SECC3, etc.

---

### **Caso 3: ORGADMIN**

**Pasos:**
1. Login como usuario **ORGADMIN**
2. Ir a "Gestión de Usuarios" → "Listar Usuarios"

**Resultado esperado:**
- ✅ Aparecen **todos los usuarios** de la organización (todas las secciones)

**Verificar en logs (backend):**
```
[UsuarioController][listar] Usuario es ORGADMIN. Sin filtro de sección.
```

---

### **Caso 4: ADMIN con múltiples secciones**

**Pasos:**
1. Login como usuario que administra **SECC1 y SECC2**
2. Ir a "Gestión de Usuarios" → "Listar Usuarios"

**Resultado esperado:**
- ✅ Aparecen usuarios de **SECC1 y SECC2**
- ❌ No aparecen usuarios de SECC3, SECC4, etc.

**Verificar en logs (backend):**
```
[UsuarioController][listar] Usuario es ADMIN de sección. Secciones permitidas: [uuid-secc1, uuid-secc2]
```

---

## 📁 Archivos Modificados (Backend)

### ✅ UsuarioController.java
- Método `listar()` modificado
- Método `getSeccionesAdministradas()` agregado

### ✅ SeccionRepository.java
- Método `findByOrganizacionEntity_IdAndAdministradorPrincipal_Id()` agregado

### ✅ UsuarioSeccionRepository.java
- Método `findByUsuarioEntity_IdAndOrganizacionEntity_Id()` agregado
- Método `findBySeccionEntity_Id()` agregado (si no existía)

---

## 🔍 Verificación Técnica

### **1. Verificar en Network Tab (DevTools)**

#### Usuario ADMIN de sección:
```
Request URL: /api/orgs/{orgId}/usuarios?seccionId={uuid}
Status: 200 OK
Response: [solo usuarios de esa sección]
```

#### Usuario ORGADMIN:
```
Request URL: /api/orgs/{orgId}/usuarios
Status: 200 OK
Response: [todos los usuarios de la organización]
```

---

### **2. Verificar en Console (Frontend)**

```javascript
[UsuariosListar] 🔍 FILTRADO ACTIVO - Filtrando por sección: {uuid}
[UsersService] 📡 Request URL: /orgs/{orgId}/usuarios?seccionId={uuid}
[UsuariosListar] ✅ Usuarios cargados: X usuarios
```

---

### **3. Verificar en Logs (Backend)**

```
[UsuarioController][listar] orgId={uuid}, seccionId={uuid}
[UsuarioController][listar] Usuario es ADMIN de sección. Secciones permitidas: [{uuid}]
[UsuarioController][listar] Usuarios en secciones permitidas: X usuarios
[UsuarioController][listar] Lista filtrada por sección: X usuarios
```

---

## ✅ Estado de Implementación

| Componente | Estado | Archivo |
|-----------|--------|---------|
| Backend - UsuarioController | ✅ IMPLEMENTADO | `UsuarioController.java` |
| Backend - SeccionRepository | ✅ IMPLEMENTADO | `SeccionRepository.java` |
| Backend - UsuarioSeccionRepository | ✅ IMPLEMENTADO | `UsuarioSeccionRepository.java` |
| Frontend - usuarios-listar.component | ✅ YA EXISTÍA | `usuarios-listar.component.ts` |
| Frontend - users.service | ✅ YA EXISTÍA | `users.service.ts` |
| Compilación Backend | ✅ SIN ERRORES | - |
| Compilación Frontend | ✅ SIN ERRORES | - |

---

## 🎯 Criterios de Aceptación

### Backend
- [x] Método `getSeccionesAdministradas()` implementado
- [x] Método `listar()` aplica filtro forzoso para ADMIN de sección
- [x] Nuevos métodos en repositorios agregados
- [x] Logs de debugging agregados
- [x] Código compilado sin errores

### Frontend
- [x] Componente envía parámetro `seccionId` cuando corresponde
- [x] Servicio construye query params correctamente
- [x] Logs de debugging agregados

### Testing Manual (Pendiente)
- [ ] ADMIN de SECC1 solo ve usuarios de SECC1
- [ ] ADMIN de SECC2 solo ve usuarios de SECC2
- [ ] ORGADMIN ve todos los usuarios de la organización
- [ ] SYSADMIN ve todos los usuarios del sistema
- [ ] ADMIN con múltiples secciones ve usuarios de todas sus secciones

---

## 📝 Notas Importantes

1. **Seguridad por Defecto**: El filtro se aplica en el backend, no se confía en el frontend
2. **Backward Compatible**: Los usuarios SYSADMIN y ORGADMIN siguen viendo todos los usuarios
3. **Sin Cambios en Frontend**: La implementación existente del frontend es compatible
4. **Performance**: El filtrado se hace con consultas optimizadas en repositorios

---

## 🚀 Próximos Pasos

1. ✅ Verificar compilación del backend
2. ✅ Verificar compilación del frontend
3. ⏳ Desplegar en entorno de desarrollo
4. ⏳ Ejecutar pruebas funcionales (casos 1-4)
5. ⏳ Verificar logs en backend
6. ⏳ Validar en entorno de QA
7. ⏳ Desplegar en producción

---

## 📞 Contacto y Soporte

Si encuentra problemas durante las pruebas, verificar:
- Logs del backend (buscar `[UsuarioController][listar]`)
- Network tab del navegador (verificar parámetros enviados)
- Console del navegador (buscar `[UsuariosListar]`)

---

**Documento actualizado:** 2025-11-21  
**Versión:** 1.0  
**Estado:** ✅ LISTO PARA PRUEBAS

