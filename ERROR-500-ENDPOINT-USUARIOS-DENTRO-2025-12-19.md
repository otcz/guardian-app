# 🚨 ERROR 500 en Endpoint /usuarios-dentro
**Fecha:** 19 de Diciembre, 2025  
**Prioridad:** 🔴 ALTA  
**Estado:** ❌ Endpoint falla en producción

---

## 📊 Situación Actual

### ✅ Endpoint que FUNCIONA
```
GET /api/movimientos-guardia/usuarios-fuera
```
**Respuesta exitosa:**
```json
[
  {
    "id": "3b8536c4-c5b6-4298-879e-338e925bbfdc",
    "nombreCompleto": "OSCAR TOMAS",
    "identificacion": "1073995282",
    "tipoIdentificacion": "CEDULA",
    "telefono": "+57 3135331533",
    "email": "CARRILLOZULETAOSCAR@GMAIL.com",
    "seccionNombre": "SECC1_ICFE",
    "seccionId": "e7480c48-...",
    "activo": true,
    "tieneEntradaAbierta": false,
    "entradaAbierta": null,
    "ultimoMovimiento": {
      "id": "b0f0f84e-21d9-4706-9a2f-58cf013d5b1e",
      "tipo": "SALIDA",
      "fechaMovimiento": "2025-12-19T14:37:16.682837Z",
      "guardiaNombre": "PUENTE TABLA",
      "usuarioNombre": "OSCAR TOMAS",
      "observaciones": null,
      "permanenciaMinutos": 1220,
      "esEntradaAbierta": false
    }
  }
]
```
**Status:** ✅ `200 OK`

---

### ❌ Endpoint que FALLA
```
GET /api/movimientos-guardia/usuarios-dentro
```
**Error del servidor:**
```
HTTP 500 Internal Server Error
URL: http://localhost:4200/api/movimientos-guardia/usuarios-dentro
```

**Log del frontend:**
```
❌ ERROR al cargar usuarios DENTRO: HttpErrorResponse
📍 Status: 500
📍 URL: http://localhost:4200/api/movimientos-guardia/usuarios-dentro
📍 Error completo: [ver detalles en consola]
```

---

## 🔍 Análisis del Problema

### Comparación de Endpoints

| Aspecto | `/usuarios-fuera` | `/usuarios-dentro` |
|---------|-------------------|-------------------|
| **Status HTTP** | ✅ 200 OK | ❌ 500 Error |
| **Estructura DTO** | ✅ Correcta | ❓ Desconocida |
| **tieneEntradaAbierta** | `false` | Debería ser `true` |
| **entradaAbierta** | `null` | Debería tener objeto |
| **ultimoMovimiento** | ✅ Presente | ❓ Desconocido |

### Posibles Causas del Error 500

1. **Query SQL con error de sintaxis**
   - Filtro incorrecto: `tieneEntradaAbierta = true`
   - JOIN mal configurado con tabla de movimientos
   - Campo no existente en la consulta

2. **NullPointerException / NullReferenceException**
   - Campo `entradaAbierta` puede ser null cuando debería tener valor
   - Campo `ultimoMovimiento` no se está construyendo correctamente
   - Falta manejo de casos donde no hay entrada abierta

3. **Error en el mapeo de entidad a DTO**
   - Conversión incorrecta de `MovimientoGuardiaEntity` a `UltimoMovimientoDTO`
   - Campos del DTO que no coinciden con la entidad
   - Constructor del DTO mal implementado

4. **Problema de lógica de negocio**
   - El backend intenta acceder a `entradaAbierta` que puede ser null
   - No valida si el usuario realmente tiene entrada abierta
   - Error al calcular `permanenciaMinutos`

---

## 🎯 Requisitos del Endpoint `/usuarios-dentro`

### 1. Estructura de Respuesta Esperada

```json
[
  {
    "id": "89a7a6b6-5b3e-46d4-9cf7-83cf86c2839b",
    "nombreCompleto": "OSCAR TOMAS",
    "identificacion": "1073995283",
    "tipoIdentificacion": "CEDULA",
    "telefono": "+57 3135331533",
    "email": "oscar@example.com",
    "seccionNombre": "SECC1_ICFE",
    "seccionId": "e7480c48-c80d-481c-bb49-1b9624aac47b",
    "activo": true,
    "tieneEntradaAbierta": true,          // ✅ DEBE SER true
    "entradaAbierta": {                   // ✅ DEBE TENER objeto
      "id": "04387940-0926-41f6-90dc-4d0495769a36",
      "guardiaId": "aab86ae0-7d9c-46dd-b615-d65a0a5577c7",
      "tipo": "ENTRADA",
      "timestampMovimiento": "2025-12-18T17:58:58.795381Z",
      "observaciones": null
    },
    "ultimoMovimiento": {                 // ✅ DEBE ESTAR formateado
      "id": "04387940-0926-41f6-90dc-4d0495769a36",
      "tipo": "ENTRADA",
      "fechaMovimiento": "2025-12-18T17:58:58.795381Z",
      "guardiaNombre": "PUENTE TABLA",
      "usuarioNombre": "OSCAR TOMAS",
      "observaciones": null,
      "permanenciaMinutos": null,        // null para ENTRADA
      "esEntradaAbierta": true           // ✅ DEBE SER true
    }
  }
]
```

### 2. Lógica de Negocio

```
PARA CADA usuario EN la base de datos:
  SI usuario tiene un movimiento tipo "ENTRADA" sin "SALIDA" asociada:
    incluir_en_respuesta = true
    tieneEntradaAbierta = true
    entradaAbierta = [objeto del movimiento de ENTRADA]
    ultimoMovimiento = [formatear entrada abierta como UltimoMovimientoDTO]
  SINO:
    NO incluir en esta lista
FIN PARA
```

### 3. Campos Obligatorios

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `id` | UUID | NO | ID del usuario |
| `nombreCompleto` | String | NO | Nombre completo |
| `identificacion` | String | NO | Número de documento |
| `tipoIdentificacion` | String | NO | CEDULA, PASAPORTE, etc. |
| `telefono` | String | NO | Teléfono |
| `email` | String | NO | Email |
| `seccionNombre` | String | NO | Nombre de la sección |
| `seccionId` | UUID | NO | ID de la sección |
| `activo` | Boolean | NO | Estado del usuario |
| `tieneEntradaAbierta` | Boolean | NO | **SIEMPRE true** en este endpoint |
| `entradaAbierta` | Object | NO | **NUNCA null** en este endpoint |
| `ultimoMovimiento` | Object | SÍ | Puede ser null si no hay movimientos |

---

## 🔧 Solución Temporal Implementada (Frontend)

### Fallback al Endpoint Antiguo

Mientras se corrige el error 500, el frontend implementa un **fallback automático**:

```typescript
// 1️⃣ Intenta con el endpoint nuevo
GET /api/movimientos-guardia/usuarios-dentro

// ❌ Si falla (500 Error):
// 2️⃣ Usa el endpoint antiguo como respaldo
GET /api/movimientos-guardia/entradas-abiertas
```

**Limitaciones del fallback:**
- ❌ No incluye email del usuario
- ❌ No incluye información de sección
- ❌ No incluye estado activo
- ⚠️ Muestra advertencia al usuario

**Mensaje mostrado:**
```
⚠️ Usando endpoint alternativo
Cargados X usuario(s) dentro usando endpoint antiguo. 
Algunos datos pueden no estar disponibles.
```

---

## 🚀 Pasos para Solucionar (Backend)

### 1. Verificar Logs del Servidor
```bash
# Ver últimas líneas del log del backend
tail -f /var/log/backend/application.log

# Buscar errores relacionados con usuarios-dentro
grep -i "usuarios-dentro" /var/log/backend/application.log
grep -i "500" /var/log/backend/application.log
```

### 2. Revisar el Controlador
```java
@GetMapping("/usuarios-dentro")
public ResponseEntity<List<UsuarioDentroDTO>> getUsuariosDentro() {
    try {
        List<UsuarioDentroDTO> usuarios = movimientoService.getUsuariosDentro();
        return ResponseEntity.ok(usuarios);
    } catch (Exception e) {
        log.error("Error al obtener usuarios dentro", e);
        return ResponseEntity.internalServerError().build();
    }
}
```

### 3. Revisar el Servicio
```java
public List<UsuarioDentroDTO> getUsuariosDentro() {
    // Obtener todos los usuarios con entrada abierta
    List<Usuario> usuarios = usuarioRepository.findAllWithEntradaAbierta();
    
    return usuarios.stream()
        .map(this::mapearAUsuarioDentroDTO)
        .collect(Collectors.toList());
}

private UsuarioDentroDTO mapearAUsuarioDentroDTO(Usuario usuario) {
    // ⚠️ VERIFICAR: entradaAbierta puede ser null?
    MovimientoGuardia entradaAbierta = usuario.getEntradaAbierta();
    
    if (entradaAbierta == null) {
        log.warn("Usuario {} no tiene entrada abierta pero está en la consulta", usuario.getId());
        return null; // ❌ ESTO PUEDE CAUSAR PROBLEMAS
    }
    
    return UsuarioDentroDTO.builder()
        .id(usuario.getId())
        .nombreCompleto(usuario.getNombreCompleto())
        .identificacion(usuario.getIdentificacion())
        // ... otros campos
        .tieneEntradaAbierta(true)
        .entradaAbierta(entradaAbierta)
        .ultimoMovimiento(mapearAUltimoMovimientoDTO(entradaAbierta))
        .build();
}
```

### 4. Revisar la Query SQL
```sql
-- Ejemplo de query correcta
SELECT u.*, 
       m.id as entrada_id,
       m.timestamp_movimiento,
       m.guardia_id,
       g.nombre as guardia_nombre
FROM usuarios u
INNER JOIN movimientos_guardia m ON m.usuario_id = u.id
INNER JOIN guardias g ON g.id = m.guardia_id
WHERE m.tipo = 'ENTRADA'
  AND m.entrada_asociada_id IS NULL  -- No tiene salida asociada
  AND u.activo = true
ORDER BY m.timestamp_movimiento DESC;
```

### 5. Comparar con `/usuarios-fuera` (que funciona)

Revisar el código de `/usuarios-fuera` y replicar la misma estructura para `/usuarios-dentro`, solo cambiando:
- Filtro: `tieneEntradaAbierta = true` (en lugar de `false`)
- Validación: `entradaAbierta != null` (en lugar de `== null`)

---

## 🧪 Testing Recomendado (Backend)

### 1. Crear Test Unitario
```java
@Test
public void testGetUsuariosDentro_ConEntradaAbierta() {
    // Arrange
    Usuario usuario = crearUsuarioConEntradaAbierta();
    when(usuarioRepository.findAllWithEntradaAbierta()).thenReturn(List.of(usuario));
    
    // Act
    List<UsuarioDentroDTO> resultado = movimientoService.getUsuariosDentro();
    
    // Assert
    assertNotNull(resultado);
    assertEquals(1, resultado.size());
    assertTrue(resultado.get(0).isTieneEntradaAbierta());
    assertNotNull(resultado.get(0).getEntradaAbierta());
}

@Test
public void testGetUsuariosDentro_SinUsuarios() {
    // Arrange
    when(usuarioRepository.findAllWithEntradaAbierta()).thenReturn(List.of());
    
    // Act
    List<UsuarioDentroDTO> resultado = movimientoService.getUsuariosDentro();
    
    // Assert
    assertNotNull(resultado);
    assertEquals(0, resultado.size());
}
```

### 2. Probar Manualmente con cURL
```bash
# Probar endpoint usuarios-dentro
curl -X GET "http://localhost:8080/api/movimientos-guardia/usuarios-dentro" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v

# Comparar con usuarios-fuera (que funciona)
curl -X GET "http://localhost:8080/api/movimientos-guardia/usuarios-fuera" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v
```

### 3. Revisar Base de Datos
```sql
-- Verificar si hay usuarios con entrada abierta
SELECT COUNT(*) 
FROM movimientos_guardia 
WHERE tipo = 'ENTRADA' 
  AND entrada_asociada_id IS NULL;

-- Ver un ejemplo de entrada abierta
SELECT * 
FROM movimientos_guardia 
WHERE tipo = 'ENTRADA' 
  AND entrada_asociada_id IS NULL
LIMIT 1;
```

---

## 📋 Checklist de Verificación

### Backend
- [ ] Ver logs del servidor para identificar el error específico
- [ ] Verificar que la query SQL no tenga errores de sintaxis
- [ ] Validar que todos los campos obligatorios estén presentes
- [ ] Confirmar que `entradaAbierta` nunca sea null en la respuesta
- [ ] Asegurar que `tieneEntradaAbierta` siempre sea `true`
- [ ] Comparar código con `/usuarios-fuera` (que funciona)
- [ ] Ejecutar tests unitarios
- [ ] Probar manualmente con cURL o Postman
- [ ] Verificar permisos del endpoint
- [ ] Desplegar corrección en servidor

### Frontend (Ya implementado)
- [x] Mejorar logs de error con más información
- [x] Implementar fallback al endpoint antiguo
- [x] Mostrar mensaje informativo al usuario
- [x] Documentar el problema
- [x] Crear ticket para backend

---

## 🎯 Resultado Esperado

Una vez corregido el endpoint, el frontend debería mostrar:

```
✅ ========== USUARIOS DENTRO (NUEVO ENDPOINT) ==========
✅ Total recibidos: 1
✅   → nombreCompleto: OSCAR TOMAS
✅   → identificacion: 1073995283
✅   → email: oscar@example.com
✅   → seccionNombre: SECC1_ICFE
✅   → tieneEntradaAbierta: true
✅   → entradaAbierta: { ... objeto completo ... }
✅   → ultimoMovimiento: { tipo: 'ENTRADA', ... }
```

---

## 📞 Contacto

**Equipo Frontend:** Ya implementó fallback temporal  
**Equipo Backend:** Necesita corregir endpoint `/usuarios-dentro`  
**Prioridad:** 🔴 ALTA - Afecta funcionalidad principal del módulo Guardia

---

## 📅 Última Actualización
**19 de Diciembre, 2025**

---

## 🔗 Archivos Relacionados

### Frontend
- `src/app/guardia/reportes-guardia/entradas-abiertas/entradas-abiertas.component.ts` (con fallback)
- `src/app/service/movimiento-guardia.service.ts` (endpoints definidos)
- `src/app/models/guardia.models.ts` (interface `UsuarioDentroDTO`)

### Documentación
- `MIGRACION-ENDPOINTS-USUARIOS-DENTRO-FUERA-2025-12-19.md`
- `api-contratos-frontend.md`

