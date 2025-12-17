# 🔴 ERROR 500 DEL BACKEND - DIAGNÓSTICO

**Fecha:** 2025-12-16  
**Error:** `POST /api/movimientos-guardia/entrada` devuelve 500 Internal Server Error

---

## 📊 Logs Capturados

```
🔵 Endpoint: POST /api/movimientos-guardia/entrada | Check: ENTRADA

❌ Error en registro de entrada
🔴 Error completo: HttpErrorResponse { status: 500, ... }
🔴 error.error: {
  message: 'Error interno',
  timestamp: '2025-12-16T20:31:05.835440700Z',
  status: 500
}
🔴 error.error.message: Error interno
🔴 error.message: Http failure response for .../entrada: 500 Internal Server Error
🔴 error.status: 500
```

---

## ✅ Estado del Frontend

El **frontend está funcionando correctamente**:
- ✅ Construye el DTO correctamente (sin campo `tipo`)
- ✅ Envía la petición al endpoint correcto
- ✅ Captura el error del backend
- ✅ Muestra el mensaje en el modal

**El problema está en el BACKEND** que está devolviendo un error 500.

---

## 🔍 DTO Enviado por el Frontend

```typescript
{
  "guardiaId": "uuid-de-la-guardia",
  "usuarioId": "uuid-del-usuario",
  "vehiculoId": null,
  "adminGuardiaId": "uuid-del-admin",
  "observaciones": null
}
```

**✅ Correcto:** No incluye campo `tipo` (el backend lo debe determinar según el endpoint).

---

## 🔴 Posibles Causas del Error 500 en el Backend

### 1. Backend espera el campo `tipo`
El backend podría estar esperando el campo `tipo` en el DTO aunque el endpoint es `/entrada`.

**Solución Backend:**
```java
// El DTO NO debe requerir el campo 'tipo'
public class RegistrarEntradaDTO {
    private UUID guardiaId;
    private UUID usuarioId;
    private UUID vehiculoId;
    private UUID adminGuardiaId;
    private String observaciones;
    // NO debe tener: private TipoMovimiento tipo;
}

// El controlador establece el tipo automáticamente
@PostMapping("/entrada")
public MovimientoGuardia registrarEntrada(@RequestBody RegistrarEntradaDTO dto) {
    // El tipo se establece aquí: ENTRADA
    return service.registrarEntrada(dto); // Tipo = ENTRADA
}
```

---

### 2. NullPointerException en el Backend
El backend podría estar intentando acceder a un campo nulo.

**Revisar:**
- ¿El `guardiaId` existe en la base de datos?
- ¿El `usuarioId` existe y es válido?
- ¿El `adminGuardiaId` existe?
- ¿Hay campos requeridos que están null?

---

### 3. Validaciones del Backend fallan
El backend podría estar lanzando excepciones no controladas.

**Revisar:**
- ¿Hay validaciones `@NotNull` que están fallando?
- ¿Hay constraints de base de datos que se violan?
- ¿Hay validaciones de negocio que lanzan excepciones?

---

### 4. Error de Base de Datos
Puede haber un problema de conexión o constraint en la base de datos.

**Revisar:**
- ¿La base de datos está corriendo?
- ¿Las tablas tienen los datos necesarios?
- ¿Hay foreign keys que no se pueden resolver?

---

### 5. GlobalExceptionHandler no está capturando el error
El backend podría tener un error que no está siendo capturado por el `GlobalExceptionHandler`.

**Revisar:**
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        // Este debe capturar TODOS los errores no manejados
        log.error("Error no controlado:", ex);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse(
                "Error interno: " + ex.getMessage(), // ❌ Mensaje genérico
                HttpStatus.INTERNAL_SERVER_ERROR.value()
            ));
    }
}
```

**Debería devolver más información:**
```java
@ExceptionHandler(Exception.class)
public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
    log.error("Error no controlado:", ex);
    
    String mensaje = ex.getMessage();
    if (ex.getCause() != null) {
        mensaje += " - Causa: " + ex.getCause().getMessage();
    }
    
    return ResponseEntity
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(new ErrorResponse(
            mensaje,
            HttpStatus.INTERNAL_SERVER_ERROR.value()
        ));
}
```

---

## 🔧 Qué Revisar en el Backend

### Paso 1: Ver los Logs del Backend
```bash
# En la consola del backend deberías ver el stacktrace completo
# Busca líneas que empiecen con:
ERROR
java.lang.NullPointerException
java.lang.IllegalStateException
org.springframework.dao.DataIntegrityViolationException
```

### Paso 2: Verificar el Controlador
```java
@PostMapping("/entrada")
public ResponseEntity<MovimientoGuardia> registrarEntrada(
    @Valid @RequestBody RegistrarEntradaDTO dto
) {
    // ¿Este método está lanzando excepciones?
    MovimientoGuardia movimiento = service.registrarEntrada(dto);
    return ResponseEntity.ok(movimiento);
}
```

### Paso 3: Verificar el Servicio
```java
public MovimientoGuardia registrarEntrada(RegistrarEntradaDTO dto) {
    // ¿Alguna de estas líneas lanza NullPointerException?
    Guardia guardia = guardiaRepository.findById(dto.getGuardiaId())
        .orElseThrow(() -> new NotFoundException("Guardia no encontrada"));
    
    Usuario usuario = usuarioRepository.findById(dto.getUsuarioId())
        .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
    
    // ¿Hay validaciones que lanzan excepciones no controladas?
    validarEntrada(usuario, guardia);
    
    // ¿La creación del movimiento falla?
    MovimientoGuardia movimiento = new MovimientoGuardia();
    movimiento.setTipo(TipoMovimiento.ENTRADA); // ← Esto debe funcionar
    movimiento.setGuardia(guardia);
    movimiento.setUsuario(usuario);
    // ...
    
    return movimientoRepository.save(movimiento);
}
```

### Paso 4: Verificar la Base de Datos
```sql
-- ¿Existe la guardia?
SELECT * FROM guardias WHERE id = 'uuid-de-la-guardia';

-- ¿Existe el usuario?
SELECT * FROM usuarios WHERE id = 'uuid-del-usuario';

-- ¿Existe el admin?
SELECT * FROM usuarios WHERE id = 'uuid-del-admin';

-- ¿Hay movimientos previos?
SELECT * FROM movimientos_guardia 
WHERE usuario_id = 'uuid-del-usuario' 
AND tipo = 'ENTRADA'
AND salida_timestamp IS NULL;
```

---

## 📝 Cómo Debuggear

### Opción 1: Agregar Logs en el Backend
```java
@PostMapping("/entrada")
public ResponseEntity<MovimientoGuardia> registrarEntrada(@RequestBody RegistrarEntradaDTO dto) {
    log.info("📥 Recibiendo petición de entrada: {}", dto);
    
    try {
        log.info("🔍 Validando guardia: {}", dto.getGuardiaId());
        log.info("🔍 Validando usuario: {}", dto.getUsuarioId());
        
        MovimientoGuardia movimiento = service.registrarEntrada(dto);
        
        log.info("✅ Entrada registrada exitosamente: {}", movimiento.getId());
        return ResponseEntity.ok(movimiento);
        
    } catch (Exception e) {
        log.error("❌ Error al registrar entrada:", e);
        throw e;
    }
}
```

### Opción 2: Usar Debugger
1. Poner breakpoint en el controlador `registrarEntrada()`
2. Ejecutar en modo debug
3. Hacer la petición desde el frontend
4. Ver en qué línea exacta falla

### Opción 3: Revisar Application Logs
```bash
# En IntelliJ/Eclipse, ver la consola del servidor
# Buscar el stacktrace completo del error

# O en el archivo de logs
tail -f application.log
```

---

## ✅ Respuesta Esperada del Backend

### Caso Exitoso (201)
```json
{
  "id": "movimiento-uuid",
  "tipo": "ENTRADA",
  "timestampMovimiento": "2025-12-16T20:31:05Z",
  "guardia": { "id": "...", "nombre": "PUENTE TABLA" },
  "usuario": { "id": "...", "nombreCompleto": "OSCAR" },
  "adminGuardia": { "id": "...", "username": "ADMIN1SECC1_ICFE" }
}
```

### Caso Error Validación (400)
```json
{
  "timestamp": "2025-12-16T20:31:05Z",
  "status": 400,
  "message": "El usuario ya tiene una entrada registrada en la guardia 'PUENTE TABLA' desde 2025-12-16T08:00:00Z. Debe registrar la SALIDA antes de ingresar nuevamente."
}
```

### Caso Error Servidor (500) - ACTUAL ❌
```json
{
  "timestamp": "2025-12-16T20:31:05Z",
  "status": 500,
  "message": "Error interno"  // ❌ Muy genérico
}
```

**Debería ser:**
```json
{
  "timestamp": "2025-12-16T20:31:05Z",
  "status": 500,
  "message": "NullPointerException: Cannot invoke 'getGuardia()' because 'movimiento' is null"  // ✅ Específico
}
```

---

## 🎯 Acción Inmediata

1. **Revisar los logs del backend** en la consola donde está corriendo el servidor Spring Boot
2. **Buscar el stacktrace completo** del error 500
3. **Identificar la línea exacta** donde falla
4. **Corregir el error** en el backend

---

## 💡 Probable Solución

El problema más probable es que el backend aún espera el campo `tipo` en el DTO. 

**Verificar:**
```java
// RegistrarEntradaDTO.java
public class RegistrarEntradaDTO {
    @NotNull
    private UUID guardiaId;
    
    @NotNull
    private UUID usuarioId;
    
    private UUID vehiculoId;
    
    @NotNull
    private UUID adminGuardiaId;
    
    private String observaciones;
    
    // ❌ ESTO NO DEBE EXISTIR:
    // @NotNull
    // private TipoMovimiento tipo;
}
```

**El tipo se establece en el servicio, no en el DTO:**
```java
public MovimientoGuardia registrarEntrada(RegistrarEntradaDTO dto) {
    MovimientoGuardia movimiento = new MovimientoGuardia();
    movimiento.setTipo(TipoMovimiento.ENTRADA); // ✅ AQUÍ
    // ... resto del código
}
```

---

## ✅ Resumen

- **Frontend:** ✅ Funciona correctamente
- **Backend:** ❌ Error 500 - Revisar logs del servidor
- **Mensaje:** "Error interno" - Muy genérico, necesita más detalle
- **Acción:** Revisar stacktrace en logs del backend

**El frontend ya está listo. El problema está 100% en el backend.**

