# Fix: Usuarios de ORGANIZACION sin roles en Gestión de Usuarios

## Problema identificado

En el listado de usuarios (Gestión de Usuarios), los usuarios con alcance `ORGANIZACION` aparecen como "Sin roles" aunque tengan roles asignados.

### Causa raíz

El backend **no está enviando los roles en el payload del endpoint de listado de usuarios** (`GET /api/orgs/{orgId}/usuarios`) para usuarios con `scopeNivel: "ORGANIZACION"`.

Los campos esperados en el frontend son:
- `rolNombres[]` - Array de nombres de roles
- `rolesOrganizacion[]` - Array de objetos con `{id, nombre}`
- `rolNombre` - String con el nombre del rol principal

Para usuarios de ORGANIZACION, estos campos llegan como `null` o vacíos desde el backend.

## Solución implementada (Frontend - Workaround)

Se implementó una solución temporal en el frontend mientras se corrige el backend:

### Cambios realizados:

#### 1. `users.service.ts` - Mapeo mejorado de roles
Se mejoró el método `ensureUser()` para intentar extraer roles de múltiples fuentes:

```typescript
rolNombres: Array.isArray(d?.rolNombres) 
  ? d.rolNombres.map((x: any) => String(x)) 
  : (Array.isArray(d?.rolesOrganizacion) 
    ? d.rolesOrganizacion.map((r: any) => String(r?.nombre ?? r?.name ?? '')).filter(Boolean)
    : (Array.isArray(d?.roles) 
      ? d.roles.map((r: any) => String(r?.nombre ?? r?.name ?? '')).filter(Boolean) 
      : null)),
```

Ahora intenta extraer roles desde:
1. `d?.rolNombres` (campo esperado)
2. `d?.rolesOrganizacion[].nombre` (alternativa)
3. `d?.roles[].nombre` (alternativa genérica)

#### 2. `usuarios-listar.component.ts` - Carga asíncrona de roles faltantes

Se agregó el método `loadMissingRoles()` que:

1. **Identifica usuarios sin roles**: Detecta usuarios donde todos los campos de roles están vacíos
2. **Carga roles de forma asíncrona**: Usa el servicio `RolesService.listUserRoles(usuarioId)` para obtener los roles
3. **Actualiza el usuario**: Inyecta los roles cargados en los campos `rolNombres` y `rolNombre`
4. **Refresca la vista**: Fuerza la actualización de la tabla

```typescript
private loadMissingRoles() {
  const usersWithoutRoles = this.usuarios.filter(u => {
    const fromNames = Array.isArray((u as any).rolNombres) && (u as any).rolNombres.length > 0;
    const fromOrg = Array.isArray((u as any).rolesOrganizacion) && (u as any).rolesOrganizacion.length > 0;
    const single = !!(u as any).rolNombre;
    const fallback = !!this.roleByUserId[u.id];
    return !fromNames && !fromOrg && !single && !fallback;
  });

  // ... carga asíncrona con forkJoin ...
}
```

#### 3. Logging de depuración

Se agregaron logs para identificar usuarios afectados:

```typescript
if (u.scopeNivel === 'ORGANIZACION' && !fromNames.length && !fromOrg.length && !single.length && !fallbackCtx.length) {
  console.log('[UsuariosListar] ⚠️ Usuario ORGANIZACION sin roles:', {
    username: u.username,
    scopeNivel: u.scopeNivel,
    rolNombres: (u as any).rolNombres,
    rolesOrganizacion: (u as any).rolesOrganizacion,
    rolNombre: (u as any).rolNombre,
    roleByUserId: this.roleByUserId[u.id],
    todoElObjeto: u
  });
}
```

## Solución definitiva (Backend - Pendiente)

### Recomendación para el Backend:

El endpoint `GET /api/orgs/{orgId}/usuarios` debe incluir los roles en el DTO de respuesta para **todos** los usuarios, independientemente de su `scopeNivel`.

**Opciones:**

1. **Opción 1 (Recomendada)**: Incluir `rolesOrganizacion[]` con objetos `{id, nombre}` en el DTO
2. **Opción 2**: Incluir `rolNombres[]` con los nombres de los roles
3. **Opción 3**: Incluir ambos campos para máxima compatibilidad

### Ejemplo de respuesta esperada:

```json
{
  "success": true,
  "message": "USER_LIST_OK",
  "data": [
    {
      "id": "uuid-123",
      "username": "ADMIN_ORG",
      "nombreCompleto": "Administrador Organización",
      "scopeNivel": "ORGANIZACION",
      "rolesOrganizacion": [
        {
          "id": "rol-uuid-1",
          "nombre": "ORGADMIN"
        }
      ],
      "rolNombres": ["ORGADMIN"],
      "rolNombre": "ORGADMIN"
    }
  ]
}
```

## Verificación

Para verificar que la solución funciona:

1. Abrir el navegador y acceder a Gestión de Usuarios
2. Abrir la consola del navegador (F12)
3. Buscar logs que indiquen:
   - `[UsuariosListar] 🔄 Cargando roles faltantes para X usuarios sin roles`
   - `[UsuariosListar] ✅ Usuario XXXXX actualizado con roles: [...]`
4. Verificar que los usuarios de ORGANIZACION ahora muestran sus roles en lugar de "Sin roles"

## Impacto en performance

- **Requests adicionales**: 1 request por cada usuario sin roles
- **Mitigación**: Los requests se ejecutan en paralelo usando `forkJoin`
- **Recomendación**: Esta es una solución temporal. La solución definitiva debe venir del backend.

## Archivos modificados

1. `src/app/service/users.service.ts` - Mapeo mejorado de roles
2. `src/app/admin/usuarios-listar-component/usuarios-listar.component.ts` - Carga asíncrona de roles

## Fecha de implementación

2025-11-21

