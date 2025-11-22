# 🔴 REQUERIMIENTO CRÍTICO: Filtrado por Sección NO Funciona

**Fecha:** 2025-11-22  
**Prioridad:** 🔴 CRÍTICA (Seguridad)  
**Estado:** ❌ FALLANDO EN PRODUCCIÓN  

---

## 🚨 Problema Detectado

El endpoint `GET /api/orgs/{orgId}/usuarios` **NO está aplicando el filtrado por sección** correctamente.

### Evidencia:

**Usuario autenticado:**
- Username: `USER_SECC1_CANSUR`
- Rol: `ADMIN`
- Sección: `SECC1_CANSUR`

**Request:**
```
GET /api/orgs/org-123/usuarios
Authorization: Bearer {JWT con USER_SECC1_CANSUR}
```

**Response ACTUAL (Incorrecto):**
```json
{
  "data": [
    {
      "username": "USER_SECC1_CANSUR",
      "seccionNombre": "SECC1_CANSUR"
    },
    {
      "username": "USER_SECC2_CANSUR",  // ❌ NO DEBERÍA ESTAR AQUÍ
      "seccionNombre": "SECC2_CANSUR"
    }
  ]
}
```

**Response ESPERADA (Correcta):**
```json
{
  "data": [
    {
      "username": "USER_SECC1_CANSUR",  // ✅ Solo usuarios de SECC1
      "seccionNombre": "SECC1_CANSUR"
    }
  ]
}
```

---

## 🔒 Regla de Seguridad Violada

> **Un ADMIN de SECC1 NO puede ver usuarios de SECC2**

El backend DEBE filtrar automáticamente por:
1. ✅ `id_organizacion` = organización del usuario autenticado
2. ❌ `id_seccion` = sección(es) administradas por el usuario autenticado

---

## 🛠️ Solución Requerida

### Archivo a Modificar

`UsuarioController.java` - Método `listar()`

### Query SQL Actual (Incorrecta)

```sql
-- ❌ Solo filtra por organización
SELECT * FROM usuario 
WHERE id_organizacion = 'org-123';
```

### Query SQL Requerida (Correcta)

```sql
-- ✅ Filtra por organización Y sección
SELECT * FROM usuario 
WHERE id_organizacion = 'org-123' 
  AND id_seccion IN ('secc1-uuid');
```

---

## 📐 Implementación Requerida

### 1. Extraer Sección del Usuario Autenticado

```java
@GetMapping
public ResponseEntity<?> listar(
    @PathVariable("orgId") UUID orgId,
    HttpServletRequest request
) {
    // 1. Obtener usuario autenticado del JWT
    UsuarioEntity usuarioAutenticado = getCurrentUser(request);
    
    // 2. Identificar rol
    boolean esSysAdmin = isSysAdmin(request);
    boolean esOrgAdmin = isOrgAdmin(request, orgId);
    boolean esAdminSeccion = isSeccionAdmin(request, orgId);
    
    // 3. CRÍTICO: Aplicar filtro por sección para ADMIN
    if (esAdminSeccion && !esSysAdmin && !esOrgAdmin) {
        // Obtener secciones que administra
        Set<UUID> seccionesAdministradas = getSeccionesAdministradas(usuarioAutenticado, orgId);
        
        if (seccionesAdministradas.isEmpty()) {
            return ResponseEntity.ok(Map.of("data", Collections.emptyList()));
        }
        
        // FILTRAR POR ORGANIZACIÓN Y SECCIONES
        List<UsuarioEntity> usuarios = usuarioRepository
            .findByOrganizacionEntity_IdAndSeccionEntity_IdIn(
                orgId, 
                seccionesAdministradas
            );
        
        return ResponseEntity.ok(Map.of("data", toDto(usuarios)));
    }
    
    // ... resto de la lógica para SYSADMIN y ORGADMIN
}
```

### 2. Método de Repository Requerido

**Agregar en `UsuarioRepository.java`:**

```java
/**
 * CRÍTICO: Filtra usuarios por organización Y secciones
 * 
 * @param organizacionId ID de la organización
 * @param seccionIds Set de IDs de secciones permitidas
 * @return Usuarios que pertenecen a esas secciones
 */
@Query("SELECT u FROM UsuarioEntity u " +
       "WHERE u.organizacionEntity.id = :organizacionId " +
       "AND u.seccionEntity.id IN :seccionIds")
List<UsuarioEntity> findByOrganizacionEntity_IdAndSeccionEntity_IdIn(
    @Param("organizacionId") UUID organizacionId,
    @Param("seccionIds") Set<UUID> seccionIds
);
```

### 3. Obtener Secciones Administradas

```java
private Set<UUID> getSeccionesAdministradas(UsuarioEntity usuario, UUID orgId) {
    Set<UUID> secciones = new HashSet<>();
    UUID usuarioId = usuario.getId();
    
    // 1. Sección principal del usuario si tiene rol ADMIN
    if (usuario.getSeccionEntity() != null) {
        boolean esAdmin = rolUsuarioRepository
            .existsByUsuarioEntity_IdAndRolEntity_NombreIgnoreCase(usuarioId, "ADMIN");
        
        if (esAdmin) {
            secciones.add(usuario.getSeccionEntity().getId());
        }
    }
    
    // 2. Secciones donde es administrador principal
    List<SeccionEntity> seccionesAdminPrincipal = 
        seccionRepository.findByOrganizacionEntity_IdAndAdministradorPrincipal_Id(
            orgId, 
            usuarioId
        );
    seccionesAdminPrincipal.forEach(s -> secciones.add(s.getId()));
    
    // 3. Secciones con rol contextual ADMIN
    List<UsuarioSeccionEntity> usuarioSecciones = 
        usuarioSeccionRepository.findByUsuarioEntity_IdAndOrganizacionEntity_Id(
            usuarioId, 
            orgId
        );
    
    for (UsuarioSeccionEntity us : usuarioSecciones) {
        if (us.getRolEntityContextual() != null 
            && "ADMIN".equalsIgnoreCase(us.getRolEntityContextual().getNombre())) {
            secciones.add(us.getSeccionEntity().getId());
        }
    }
    
    return secciones;
}
```

---

## 🧪 Casos de Prueba

### Caso 1: ADMIN de SECC1 lista usuarios

**Dado:**
- Usuario: `USER_SECC1_CANSUR` (ADMIN de SECC1)
- JWT contiene: `userId`, `rol=ADMIN`, `seccionId=secc1-uuid`

**Cuando:**
```
GET /api/orgs/org-123/usuarios
Authorization: Bearer {JWT}
```

**Entonces:**
```sql
-- Query ejecutada:
SELECT * FROM usuario 
WHERE id_organizacion = 'org-123' 
  AND id_seccion IN ('secc1-uuid')

-- Resultado:
[
  { username: "USER_SECC1_CANSUR", seccionNombre: "SECC1_CANSUR" }
]
```

**Resultado Esperado:**
- ✅ Retorna SOLO 1 usuario (USER_SECC1_CANSUR)
- ✅ NO retorna USER_SECC2_CANSUR
- ✅ HTTP 200 OK

---

### Caso 2: ORGADMIN lista usuarios

**Dado:**
- Usuario: `ORGADMIN_EMPRESA` (ORGADMIN)

**Cuando:**
```
GET /api/orgs/org-123/usuarios
```

**Entonces:**
```sql
-- Query ejecutada:
SELECT * FROM usuario 
WHERE id_organizacion = 'org-123'

-- Resultado:
[
  { username: "USER_SECC1_CANSUR", seccionNombre: "SECC1_CANSUR" },
  { username: "USER_SECC2_CANSUR", seccionNombre: "SECC2_CANSUR" },
  { username: "USER_SECC3_CANSUR", seccionNombre: "SECC3_CANSUR" }
]
```

**Resultado Esperado:**
- ✅ Retorna TODOS los usuarios de la organización
- ✅ HTTP 200 OK

---

### Caso 3: ADMIN sin secciones

**Dado:**
- Usuario: `ADMIN_SIN_SECCION` (rol ADMIN, pero sin secciones asignadas)

**Cuando:**
```
GET /api/orgs/org-123/usuarios
```

**Entonces:**
```json
{
  "data": []
}
```

**Resultado Esperado:**
- ✅ Retorna lista vacía
- ✅ HTTP 200 OK

---

## 📊 Logging Requerido

Agregar logs para auditoría:

```java
if (esAdminSeccion) {
    Set<UUID> seccionesAdministradas = getSeccionesAdministradas(usuarioAutenticado, orgId);
    
    log.info("🔒 FILTRO FORZOSO - Usuario: {} - Secciones: {} - Org: {}", 
        usuarioAutenticado.getUsername(), 
        seccionesAdministradas, 
        orgId);
    
    List<UsuarioEntity> usuarios = usuarioRepository
        .findByOrganizacionEntity_IdAndSeccionEntity_IdIn(orgId, seccionesAdministradas);
    
    log.info("✅ Usuarios retornados: {} (filtrados por secciones)", usuarios.size());
    
    return ResponseEntity.ok(Map.of("data", toDto(usuarios)));
}
```

---

## ✅ Checklist de Implementación

- [ ] **1. Agregar método en `UsuarioRepository`:**
  - `findByOrganizacionEntity_IdAndSeccionEntity_IdIn()`

- [ ] **2. Implementar `getSeccionesAdministradas()`**
  - Extraer secciones del usuario autenticado

- [ ] **3. Modificar método `listar()` en `UsuarioController`**
  - Aplicar filtro forzoso para ADMIN de sección

- [ ] **4. Agregar logging de auditoría**
  - Registrar secciones filtradas
  - Registrar cantidad de usuarios retornados

- [ ] **5. Tests unitarios**
  - Test: ADMIN ve solo su sección
  - Test: ORGADMIN ve toda la organización
  - Test: ADMIN sin secciones recibe lista vacía

- [ ] **6. Verificación manual**
  - Login como USER_SECC1_CANSUR
  - Verificar que NO ve USER_SECC2_CANSUR

- [ ] **7. Deploy y monitoreo**
  - Revisar logs del servidor
  - Confirmar queries SQL ejecutadas

---

## 🚀 Urgencia

Esta es una **vulnerabilidad de seguridad crítica**. Un administrador de una sección puede ver usuarios de otras secciones, violando el principio de aislamiento por sección.

**Impacto:**
- 🔴 Seguridad: ALTA
- 🔴 Privacidad: ALTA
- 🔴 Cumplimiento: ALTA

**Tiempo estimado de implementación:** 2-3 horas

**Prioridad:** 🔴 CRÍTICA - Implementar INMEDIATAMENTE

---

## 📞 Contacto

**Frontend ya está listo:** ✅ No envía parámetros, espera filtrado automático del backend

**Pendiente:** ❌ Backend debe implementar el filtrado por `id_organizacion` + `id_seccion`

---

**Creado por:** Equipo Frontend  
**Fecha:** 2025-11-22  
**Estado:** ⏳ ESPERANDO IMPLEMENTACIÓN BACKEND

