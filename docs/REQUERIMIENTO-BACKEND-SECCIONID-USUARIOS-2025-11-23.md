# Requerimiento Backend: Incluir `seccionId` en Respuesta de Listado de Usuarios

**Fecha:** 2025-11-23  
**Prioridad:** Alta  
**Módulo:** Usuarios / Gestión de Secciones  
**Tipo:** Mejora / Bug Fix

---

## 📋 Resumen

El endpoint `GET /api/orgs/{orgId}/usuarios` actualmente **NO está devolviendo el campo `seccionId`** (o campos relacionados de sección) en la respuesta de usuarios, lo que impide que el frontend pueda filtrar correctamente los usuarios por sección.

---

## 🔍 Problema Actual

### Comportamiento Observado

Cuando se realiza una petición al endpoint de listar usuarios:

```http
GET /api/orgs/{orgId}/usuarios?seccionId={seccionId}
```

**Respuesta actual:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid-1",
      "username": "USERSECC1_CANSUR",
      "nombreCompleto": "Usuario Sección 1",
      "activo": true,
      "seccionId": null,           // ❌ PROBLEMA: Siempre NULL
      "seccionPrincipalId": null,  // ❌ PROBLEMA: Siempre NULL
      "seccionNombre": null,       // ❌ PROBLEMA: Siempre NULL
      "email": "user@example.com",
      "telefono": null,
      "scopeNivel": "SECCION"
    },
    // ... más usuarios
  ]
}
```

### Impacto

1. **Filtrado manual ineficiente**: El frontend debe filtrar todos los usuarios después de recibirlos, lo cual es ineficiente con grandes volúmenes de datos.

2. **Información incompleta**: Los usuarios ORGADMIN que gestionan múltiples secciones necesitan ver a qué sección pertenece cada usuario.

3. **Workaround actual**: El frontend está implementando un filtrado manual post-respuesta, pero esto no es sostenible ni eficiente.

4. **Parámetro ignorado**: El parámetro `seccionId` enviado en el query string es ignorado por el backend para usuarios con rol ORGADMIN, retornando todos los usuarios sin información de sección.

---

## ✅ Solución Requerida

### 1. Incluir Campo `seccionId` en la Respuesta

El endpoint `GET /api/orgs/{orgId}/usuarios` debe devolver **siempre** los siguientes campos relacionados con la sección del usuario:

```typescript
{
  "id": "user-uuid",
  "username": "USERSECC1_CANSUR",
  "nombreCompleto": "Usuario Sección 1",
  "activo": true,
  
  // ✅ REQUERIDO: Campos de sección
  "seccionId": "seccion-uuid-1",              // ID de la sección a la que pertenece
  "seccionNombre": "Sección Sur",             // Nombre de la sección
  "seccionPrincipalId": "seccion-uuid-1",     // (Opcional) Si es admin de esa sección
  
  "email": "user@example.com",
  "telefono": null,
  "scopeNivel": "SECCION",
  "rolesOrganizacion": [...]
}
```

### 2. Respetar Filtrado por `seccionId` (Query Parameter)

Cuando se envía el parámetro `seccionId` en el query string, el backend debe:

#### Opción A: Filtrado en Backend (Recomendado)
```http
GET /api/orgs/{orgId}/usuarios?seccionId={seccionId}
```

**Comportamiento esperado:**
- Devolver **solo** los usuarios que pertenecen a la sección especificada
- Aplicar el filtro independientemente del rol del usuario autenticado
- Esto reduce la carga de datos transferida y mejora el rendimiento

#### Opción B: Incluir Información Completa
Si por alguna razón el filtrado no es posible en backend, al menos **incluir siempre los campos de sección** (`seccionId`, `seccionNombre`) para que el frontend pueda filtrar correctamente.

---

## 📊 Casos de Uso

### Caso 1: ORGADMIN Creando Vehículo

**Flujo:**
1. ORGADMIN selecciona "Sección Sur" en el dropdown de secciones
2. Frontend solicita: `GET /api/orgs/{orgId}/usuarios?seccionId=seccion-sur-uuid`
3. Backend debe devolver:
   - **Solo usuarios de "Sección Sur"** (Opción A - Recomendado)
   - **O todos los usuarios CON `seccionId` incluido** (Opción B - Fallback)

**Resultado esperado:**
- Multiselect de usuarios muestra solo: `USERSECC1_CANSUR`, `USER1_SUR`
- NO muestra: `USERSECC2_CANNOR`, `USER1_NORTE`, `USER2_NORTE`

### Caso 2: ORGADMIN Gestionando Múltiples Secciones

**Flujo:**
1. ORGADMIN lista todos los usuarios de la organización
2. Frontend solicita: `GET /api/orgs/{orgId}/usuarios`
3. Backend devuelve todos los usuarios **con información de sección**

**Resultado esperado:**
- La interfaz puede mostrar columnas: Usuario | Sección | Roles
- El frontend puede filtrar/agrupar por sección en la UI

---

## 🔧 Implementación Sugerida

### En el Entity/DTO de Usuario

```java
// UserResponseDTO.java o UserEntity
public class UserResponseDTO {
    private String id;
    private String username;
    private String nombreCompleto;
    private Boolean activo;
    
    // ✅ AGREGAR estos campos
    private String seccionId;              // ID de la sección de pertenencia
    private String seccionNombre;          // Nombre de la sección
    private String seccionPrincipalId;     // (Opcional) Si es admin de sección
    
    private String email;
    private String telefono;
    private String scopeNivel;
    // ... otros campos
}
```

### En el Repository/Service

```java
// UsuarioRepository.java
@Query("SELECT u FROM Usuario u " +
       "LEFT JOIN FETCH u.seccionEntity s " +  // ✅ JOIN con sección
       "WHERE u.organizacionId = :orgId " +
       "AND (:seccionId IS NULL OR s.id = :seccionId)")  // ✅ Filtro opcional
List<Usuario> findByOrganizacion(
    @Param("orgId") String orgId,
    @Param("seccionId") String seccionId
);
```

### En el Controller

```java
@GetMapping("/orgs/{orgId}/usuarios")
public ResponseEntity<?> listarUsuarios(
    @PathVariable String orgId,
    @RequestParam(required = false) String seccionId  // ✅ Parámetro opcional
) {
    // Aplicar filtro si se proporciona seccionId
    List<UserResponseDTO> usuarios = usuarioService.listar(orgId, seccionId);
    
    // Asegurar que seccionId y seccionNombre estén poblados
    return ResponseEntity.ok(ApiResponse.success(usuarios));
}
```

---

## 🧪 Pruebas Requeridas

### Test 1: Usuario con Sección Asignada
```http
GET /api/orgs/{orgId}/usuarios
```
**Verificar:**
- ✅ `seccionId` no es `null` para usuarios con sección
- ✅ `seccionNombre` contiene el nombre correcto
- ✅ Datos coinciden con la tabla de relación usuario-sección

### Test 2: Filtrado por Sección
```http
GET /api/orgs/{orgId}/usuarios?seccionId=seccion-uuid-1
```
**Verificar:**
- ✅ Solo devuelve usuarios de `seccion-uuid-1`
- ✅ `seccionId` de todos los usuarios = `seccion-uuid-1`
- ✅ Usuarios de otras secciones NO aparecen

### Test 3: ORGADMIN ve Todas las Secciones
```http
GET /api/orgs/{orgId}/usuarios
Authorization: Bearer {token-orgadmin}
```
**Verificar:**
- ✅ Devuelve usuarios de todas las secciones
- ✅ Cada usuario tiene su `seccionId` y `seccionNombre` correctos
- ✅ No hay usuarios con `seccionId` = `null` (a menos que realmente no tengan sección)

### Test 4: Admin de Sección ve Solo Su Sección
```http
GET /api/orgs/{orgId}/usuarios
Authorization: Bearer {token-admin-seccion}
```
**Verificar:**
- ✅ Solo devuelve usuarios de la sección que administra
- ✅ Todos los usuarios tienen el mismo `seccionId`
- ✅ No filtra usuarios si se envía `seccionId` diferente (403 o filtro ignorado)

---

## 📝 Notas Adicionales

### Compatibilidad con Roles

El endpoint debe considerar:

1. **SYSADMIN**: Ve todas las secciones, respeta filtro `seccionId` si se envía
2. **ORGADMIN**: Ve todas las secciones de su org, respeta filtro `seccionId` si se envía
3. **ADMIN (Sección)**: Ve solo usuarios de su sección, ignora `seccionId` diferente
4. **USUARIO**: Ve solo su perfil o usuarios de su sección según permisos

### Performance

- Considerar **eager loading** de la relación `usuario.seccionEntity` para evitar N+1 queries
- Indexar la columna `seccion_id` en la tabla de usuarios si no está indexada
- Cachear nombres de secciones si son consultados frecuentemente

### Migración de Datos

Si existen usuarios sin `seccionId` asignado:
- Definir si es válido tener usuarios "sin sección" en el sistema
- Si no es válido, ejecutar migración para asignar sección default
- Documentar el comportamiento esperado para estos casos

---

## 🎯 Criterios de Aceptación

- [ ] El campo `seccionId` está presente en la respuesta y no es `null` para usuarios con sección asignada
- [ ] El campo `seccionNombre` está presente y contiene el nombre correcto de la sección
- [ ] El parámetro query `seccionId` filtra correctamente los resultados (o se documenta que no lo hace)
- [ ] Los tests automáticos verifican el correcto poblado de estos campos
- [ ] La documentación del API (Swagger/OpenAPI) está actualizada
- [ ] No hay regresiones en funcionalidades existentes

---

## 📚 Referencias

- **Endpoint afectado**: `GET /api/orgs/{orgId}/usuarios`
- **Frontend afectado**: `src/app/service/users.service.ts`
- **Componente UI**: `src/app/admin/vehiculos-crear-component/`
- **Logs de evidencia**: Ver archivo adjunto con logs de consola del navegador

---

## 🔗 Información de Contexto

**Usuario reportante:** Frontend Team  
**Fecha de detección:** 2025-11-23  
**Severidad:** Alta (impide funcionalidad de filtrado de usuarios por sección)  
**Workaround actual:** Filtrado manual en frontend (ineficiente)  
**Impacto en UX:** Alto (usuarios ven lista completa sin filtrar)

---

## ✉️ Contacto

Para consultas o aclaraciones sobre este requerimiento, contactar al equipo de frontend.

