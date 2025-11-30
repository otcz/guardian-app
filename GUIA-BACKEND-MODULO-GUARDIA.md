# 🔧 GUÍA DE IMPLEMENTACIÓN BACKEND - MÓDULO GUARDIA

**Para el equipo de Backend**  
**Fecha:** 2025-11-29  
**Frontend:** ✅ COMPLETADO  
**Backend:** 🔲 PENDIENTE  

---

## 📋 RESUMEN

El frontend del módulo Guardia está **100% implementado y compilado**. Este documento detalla los endpoints, DTOs y lógica de negocio que deben implementarse en el backend.

---

## 🎯 ENDPOINTS REQUERIDOS

### 1. GuardiaController (11 endpoints)

#### Base URL: `/api/guardias`

```java
@RestController
@RequestMapping("/api/guardias")
public class GuardiaController {

    // 1. Listar guardias por organización
    @GetMapping
    ResponseEntity<List<GuardiaDTO>> listar(@RequestParam String organizacionId);
    
    // 2. Listar guardias por sección
    @GetMapping("/seccion/{seccionId}")
    ResponseEntity<List<GuardiaDTO>> listarPorSeccion(@PathVariable String seccionId);
    
    // 3. Listar solo guardias activas de una sección
    @GetMapping("/seccion/{seccionId}/activas")
    ResponseEntity<List<GuardiaDTO>> listarActivasPorSeccion(@PathVariable String seccionId);
    
    // 4. Obtener guardia por ID
    @GetMapping("/{id}")
    ResponseEntity<GuardiaDTO> obtenerPorId(@PathVariable String id);
    
    // 5. Crear guardia
    @PostMapping
    ResponseEntity<GuardiaDTO> crear(@RequestBody CrearGuardiaDTO dto);
    
    // 6. Actualizar guardia
    @PutMapping("/{id}")
    ResponseEntity<GuardiaDTO> actualizar(@PathVariable String id, @RequestBody ActualizarGuardiaDTO dto);
    
    // 7. Activar guardia
    @PutMapping("/{id}/activar")
    ResponseEntity<GuardiaDTO> activar(@PathVariable String id);
    
    // 8. Desactivar guardia
    @PutMapping("/{id}/desactivar")
    ResponseEntity<GuardiaDTO> desactivar(@PathVariable String id);
    
    // 9. Eliminar guardia (solo si no tiene movimientos)
    @DeleteMapping("/{id}")
    ResponseEntity<Void> eliminar(@PathVariable String id);
}
```

---

### 2. GuardiaUsuarioController (8 endpoints)

#### Base URL: `/api/guardias-usuarios`

```java
@RestController
@RequestMapping("/api/guardias-usuarios")
public class GuardiaUsuarioController {

    // 1. Asignar guardia a usuario
    @PostMapping("/{guardiaId}/usuarios/{usuarioId}/asignar")
    ResponseEntity<GuardiaUsuarioDTO> asignar(
        @PathVariable String guardiaId,
        @PathVariable String usuarioId,
        @RequestBody(required = false) AsignarGuardiaDTO dto
    );
    
    // 2. Restringir guardia para usuario
    @PostMapping("/{guardiaId}/usuarios/{usuarioId}/restringir")
    ResponseEntity<GuardiaUsuarioDTO> restringir(
        @PathVariable String guardiaId,
        @PathVariable String usuarioId,
        @RequestBody RestringirGuardiaDTO dto
    );
    
    // 3. Quitar restricción
    @PutMapping("/{guardiaId}/usuarios/{usuarioId}/quitar-restriccion")
    ResponseEntity<GuardiaUsuarioDTO> quitarRestriccion(
        @PathVariable String guardiaId,
        @PathVariable String usuarioId
    );
    
    // 4. Revocar asignación
    @DeleteMapping("/{guardiaId}/usuarios/{usuarioId}")
    ResponseEntity<Void> revocar(
        @PathVariable String guardiaId,
        @PathVariable String usuarioId
    );
    
    // 5. Listar guardias disponibles para usuario
    @GetMapping("/usuario/{usuarioId}/disponibles")
    ResponseEntity<List<GuardiaUsuarioDTO>> listarDisponibles(@PathVariable String usuarioId);
    
    // 6. Listar guardias restringidas para usuario
    @GetMapping("/usuario/{usuarioId}/restringidas")
    ResponseEntity<List<GuardiaUsuarioDTO>> listarRestringidas(@PathVariable String usuarioId);
    
    // 7. Listar usuarios con acceso a guardia
    @GetMapping("/guardia/{guardiaId}/usuarios")
    ResponseEntity<List<GuardiaUsuarioDTO>> listarUsuarios(@PathVariable String guardiaId);
    
    // 8. Verificar si usuario puede usar guardia
    @GetMapping("/{guardiaId}/usuarios/{usuarioId}/puede-usar")
    ResponseEntity<PuedeUsarGuardiaDTO> puedeUsar(
        @PathVariable String guardiaId,
        @PathVariable String usuarioId
    );
}
```

---

### 3. MovimientoGuardiaController (11 endpoints)

#### Base URL: `/api/movimientos-guardia`

```java
@RestController
@RequestMapping("/api/movimientos-guardia")
public class MovimientoGuardiaController {

    // ========== OPERACIONES PRINCIPALES ==========
    
    // 1. Registrar ENTRADA
    @PostMapping("/entrada")
    ResponseEntity<MovimientoGuardiaDTO> registrarEntrada(@RequestBody RegistrarEntradaDTO dto);
    
    // 2. Registrar SALIDA
    @PostMapping("/salida")
    ResponseEntity<MovimientoGuardiaDTO> registrarSalida(@RequestBody RegistrarSalidaDTO dto);
    
    // ========== VALIDACIONES (SOLO LECTURA) ==========
    
    // 3. Validar usuario (NO registra movimiento)
    @GetMapping("/validar-usuario/{usuarioId}")
    ResponseEntity<ValidacionUsuarioDTO> validarUsuario(@PathVariable String usuarioId);
    
    // 4. Validar vehículo (NO registra movimiento)
    @GetMapping("/validar-vehiculo/{vehiculoId}")
    ResponseEntity<ValidacionVehiculoDTO> validarVehiculo(@PathVariable String vehiculoId);
    
    // ========== CONSULTAS ==========
    
    // 5. Buscar entrada abierta
    @GetMapping("/entrada-abierta/{usuarioId}")
    ResponseEntity<MovimientoGuardiaDTO> obtenerEntradaAbierta(@PathVariable String usuarioId);
    
    // 6. Contar entradas abiertas
    @GetMapping("/entradas-abiertas/count/{usuarioId}")
    ResponseEntity<ConteoEntradasDTO> contarEntradasAbiertas(@PathVariable String usuarioId);
    
    // 7. Listar movimientos por usuario
    @GetMapping("/usuario/{usuarioId}")
    ResponseEntity<List<MovimientoGuardiaDTO>> listarPorUsuario(@PathVariable String usuarioId);
    
    // 8. Listar movimientos por guardia
    @GetMapping("/guardia/{guardiaId}")
    ResponseEntity<List<MovimientoGuardiaDTO>> listarPorGuardia(@PathVariable String guardiaId);
    
    // 9. Listar movimientos por sección
    @GetMapping("/seccion/{seccionId}")
    ResponseEntity<List<MovimientoGuardiaDTO>> listarPorSeccion(@PathVariable String seccionId);
    
    // 10. Listar todas las entradas abiertas (inconsistencias)
    @GetMapping("/entradas-abiertas")
    ResponseEntity<List<MovimientoGuardiaDTO>> listarTodasEntradasAbiertas();
    
    // 11. Listar movimientos por guardia y fechas
    @GetMapping("/guardia/{guardiaId}/fechas")
    ResponseEntity<List<MovimientoGuardiaDTO>> listarPorGuardiaYFechas(
        @PathVariable String guardiaId,
        @RequestParam String desde,  // ISO 8601
        @RequestParam String hasta   // ISO 8601
    );
}
```

---

## 📦 DTOs REQUERIDOS

### Guardia

```java
// Entidad principal
public class GuardiaDTO {
    private String id;
    private String organizacionId;
    private String seccionId;
    private String codigo;
    private String nombre;
    private String descripcion;
    private String ubicacion;
    private Boolean activa;
    private Boolean permiteEntrada;
    private Boolean permiteSalida;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

// Para crear
public class CrearGuardiaDTO {
    private String organizacionId;
    private String seccionId;
    private String codigo;
    private String nombre;
    private String descripcion;
    private String ubicacion;
}

// Para actualizar
public class ActualizarGuardiaDTO {
    private String nombre;
    private String descripcion;
    private String ubicacion;
    private Boolean permiteEntrada;
    private Boolean permiteSalida;
}
```

### GuardiaUsuario

```java
public class GuardiaUsuarioDTO {
    private String id;
    private String guardiaId;
    private String usuarioId;
    private String seccionId;
    private String organizacionId;
    private Boolean asignada;
    private Boolean restringida;
    private String motivoRestriccion;
    private String observaciones;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // Datos anidados opcionales
    private GuardiaDTO guardia;
    private UsuarioDTO usuario;
}

public class AsignarGuardiaDTO {
    private String observaciones;
}

public class RestringirGuardiaDTO {
    private String motivoRestriccion; // REQUERIDO
}

public class PuedeUsarGuardiaDTO {
    private Boolean puedeUsar;
    private String motivo;
}
```

### MovimientoGuardia

```java
public class MovimientoGuardiaDTO {
    private String id;
    private String organizacionId;
    private String seccionId;
    private String guardiaId;
    private String usuarioId;
    private String vehiculoId;
    private String adminGuardiaId;
    private TipoMovimiento tipo; // ENTRADA | SALIDA
    private LocalDateTime timestampMovimiento;
    private String observaciones;
    private String entradaAsociadaId; // Solo SALIDA
    private Integer permanenciaMinutos; // Solo SALIDA
    private Boolean registroVehiculoIncluido;
    private LocalDateTime createdAt;
    // Datos anidados opcionales
    private GuardiaDTO guardia;
    private UsuarioDTO usuario;
    private VehiculoDTO vehiculo;
    private UsuarioDTO adminGuardia;
    private MovimientoGuardiaDTO entradaAsociada;
}

public class RegistrarEntradaDTO {
    private String guardiaId;
    private String usuarioId;
    private String vehiculoId; // Opcional
    private String adminGuardiaId;
    private String observaciones; // Opcional
}

public class RegistrarSalidaDTO {
    private String guardiaId;
    private String usuarioId;
    private String vehiculoId; // Opcional
    private String adminGuardiaId;
    private String observaciones; // Opcional
}

public class ValidacionUsuarioDTO {
    private Boolean existe;
    private Boolean activo;
    private String nombreCompleto;
    private String documento;
    private String seccion;
    private List<String> restricciones;
    private List<String> vehiculos;
    private Boolean tieneEntradaAbierta;
    private MovimientoGuardiaDTO entradaAbierta;
}

public class ValidacionVehiculoDTO {
    private Boolean existe;
    private String estado;
    private String placa;
    private String usuarioAsociado;
    private String usuarioId;
    private String ultimaActividad;
}

public class ConteoEntradasDTO {
    private Integer count;
}

public enum TipoMovimiento {
    ENTRADA,
    SALIDA
}
```

---

## 🗄️ MODELO DE BASE DE DATOS

### Tabla: guardias

```sql
CREATE TABLE guardias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id),
    seccion_id UUID NOT NULL REFERENCES secciones(id),
    codigo VARCHAR(100) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    ubicacion VARCHAR(300),
    activa BOOLEAN DEFAULT TRUE,
    permite_entrada BOOLEAN DEFAULT TRUE,
    permite_salida BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organizacion_id, codigo)
);

CREATE INDEX idx_guardias_organizacion ON guardias(organizacion_id);
CREATE INDEX idx_guardias_seccion ON guardias(seccion_id);
CREATE INDEX idx_guardias_activa ON guardias(activa);
```

### Tabla: guardias_usuarios

```sql
CREATE TABLE guardias_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guardia_id UUID NOT NULL REFERENCES guardias(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    seccion_id UUID NOT NULL REFERENCES secciones(id),
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id),
    asignada BOOLEAN DEFAULT FALSE,
    restringida BOOLEAN DEFAULT FALSE,
    motivo_restriccion TEXT,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guardia_id, usuario_id)
);

CREATE INDEX idx_gu_guardia ON guardias_usuarios(guardia_id);
CREATE INDEX idx_gu_usuario ON guardias_usuarios(usuario_id);
CREATE INDEX idx_gu_asignada ON guardias_usuarios(asignada);
CREATE INDEX idx_gu_restringida ON guardias_usuarios(restringida);
```

### Tabla: movimientos_guardia

```sql
CREATE TABLE movimientos_guardia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id UUID NOT NULL REFERENCES organizaciones(id),
    seccion_id UUID NOT NULL REFERENCES secciones(id),
    guardia_id UUID NOT NULL REFERENCES guardias(id),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    vehiculo_id UUID REFERENCES vehiculos(id),
    admin_guardia_id UUID NOT NULL REFERENCES usuarios(id),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA')),
    timestamp_movimiento TIMESTAMP NOT NULL DEFAULT NOW(),
    observaciones TEXT,
    entrada_asociada_id UUID REFERENCES movimientos_guardia(id),
    permanencia_minutos INTEGER,
    registro_vehiculo_incluido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mg_organizacion ON movimientos_guardia(organizacion_id);
CREATE INDEX idx_mg_seccion ON movimientos_guardia(seccion_id);
CREATE INDEX idx_mg_guardia ON movimientos_guardia(guardia_id);
CREATE INDEX idx_mg_usuario ON movimientos_guardia(usuario_id);
CREATE INDEX idx_mg_tipo ON movimientos_guardia(tipo);
CREATE INDEX idx_mg_timestamp ON movimientos_guardia(timestamp_movimiento);
CREATE INDEX idx_mg_entrada_asociada ON movimientos_guardia(entrada_asociada_id);
```

---

## ⚙️ LÓGICA DE NEGOCIO CRÍTICA

### 1. Registrar Entrada

```java
@Transactional
public MovimientoGuardiaDTO registrarEntrada(RegistrarEntradaDTO dto) {
    // 1. Validar que guardia existe y está activa
    Guardia guardia = guardiaRepository.findById(dto.getGuardiaId())
        .orElseThrow(() -> new NotFoundException("Guardia no encontrada"));
    
    if (!guardia.getActiva()) {
        throw new BusinessException("La guardia no está activa");
    }
    
    if (!guardia.getPermiteEntrada()) {
        throw new BusinessException("Esta guardia no permite registrar entradas");
    }
    
    // 2. Validar que usuario existe y está activo
    Usuario usuario = usuarioRepository.findById(dto.getUsuarioId())
        .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
    
    if (!usuario.getActivo()) {
        throw new BusinessException("El usuario no está activo");
    }
    
    // 3. Verificar que usuario tiene permiso en esta guardia
    boolean puedeUsar = guardiaUsuarioRepository.puedeUsarGuardia(
        dto.getGuardiaId(), 
        dto.getUsuarioId()
    );
    
    if (!puedeUsar) {
        throw new BusinessException("El usuario no tiene permiso para usar esta guardia");
    }
    
    // 4. CRÍTICO: Verificar que NO existe entrada abierta
    long entradasAbiertas = movimientoRepository.countEntradasAbiertas(dto.getUsuarioId());
    
    if (entradasAbiertas > 0) {
        throw new BusinessException("El usuario ya tiene una entrada abierta");
    }
    
    // 5. Crear movimiento de ENTRADA
    MovimientoGuardia movimiento = new MovimientoGuardia();
    movimiento.setOrganizacionId(guardia.getOrganizacionId());
    movimiento.setSeccionId(guardia.getSeccionId());
    movimiento.setGuardiaId(dto.getGuardiaId());
    movimiento.setUsuarioId(dto.getUsuarioId());
    movimiento.setVehiculoId(dto.getVehiculoId());
    movimiento.setAdminGuardiaId(dto.getAdminGuardiaId());
    movimiento.setTipo(TipoMovimiento.ENTRADA);
    movimiento.setTimestampMovimiento(LocalDateTime.now());
    movimiento.setObservaciones(dto.getObservaciones());
    movimiento.setRegistroVehiculoIncluido(dto.getVehiculoId() != null);
    
    return movimientoRepository.save(movimiento);
}
```

### 2. Registrar Salida

```java
@Transactional
public MovimientoGuardiaDTO registrarSalida(RegistrarSalidaDTO dto) {
    // 1. Validar guardia (igual que entrada)
    // ...
    
    // 2. Validar usuario (igual que entrada)
    // ...
    
    // 3. CRÍTICO: Buscar entrada abierta
    MovimientoGuardia entradaAbierta = movimientoRepository
        .findEntradaAbierta(dto.getUsuarioId())
        .orElseThrow(() -> new BusinessException(
            "No existe entrada abierta para este usuario"
        ));
    
    // 4. Calcular permanencia
    LocalDateTime ahora = LocalDateTime.now();
    long minutos = Duration.between(
        entradaAbierta.getTimestampMovimiento(), 
        ahora
    ).toMinutes();
    
    // 5. Crear movimiento de SALIDA
    MovimientoGuardia movimiento = new MovimientoGuardia();
    movimiento.setOrganizacionId(guardia.getOrganizacionId());
    movimiento.setSeccionId(guardia.getSeccionId());
    movimiento.setGuardiaId(dto.getGuardiaId());
    movimiento.setUsuarioId(dto.getUsuarioId());
    movimiento.setVehiculoId(dto.getVehiculoId());
    movimiento.setAdminGuardiaId(dto.getAdminGuardiaId());
    movimiento.setTipo(TipoMovimiento.SALIDA);
    movimiento.setTimestampMovimiento(ahora);
    movimiento.setObservaciones(dto.getObservaciones());
    movimiento.setEntradaAsociadaId(entradaAbierta.getId());
    movimiento.setPermanenciaMinutos((int) minutos);
    movimiento.setRegistroVehiculoIncluido(dto.getVehiculoId() != null);
    
    return movimientoRepository.save(movimiento);
}
```

### 3. Validar Usuario

```java
public ValidacionUsuarioDTO validarUsuario(String usuarioId) {
    // 1. Buscar usuario
    Usuario usuario = usuarioRepository.findById(usuarioId)
        .orElse(null);
    
    if (usuario == null) {
        ValidacionUsuarioDTO dto = new ValidacionUsuarioDTO();
        dto.setExiste(false);
        return dto;
    }
    
    // 2. Cargar restricciones
    List<String> restricciones = guardiaUsuarioRepository
        .findRestriccionesByUsuario(usuarioId);
    
    // 3. Cargar vehículos
    List<String> vehiculos = vehiculoRepository
        .findPlacasByUsuario(usuarioId);
    
    // 4. Buscar entrada abierta
    Optional<MovimientoGuardia> entradaAbierta = 
        movimientoRepository.findEntradaAbierta(usuarioId);
    
    // 5. Construir respuesta
    ValidacionUsuarioDTO dto = new ValidacionUsuarioDTO();
    dto.setExiste(true);
    dto.setActivo(usuario.getActivo());
    dto.setNombreCompleto(usuario.getNombreCompleto());
    dto.setDocumento(usuario.getDocumento());
    dto.setSeccion(usuario.getSeccion().getNombre());
    dto.setRestricciones(restricciones);
    dto.setVehiculos(vehiculos);
    dto.setTieneEntradaAbierta(entradaAbierta.isPresent());
    dto.setEntradaAbierta(entradaAbierta.orElse(null));
    
    return dto;
}
```

---

## 🔒 REGLAS DE SEGURIDAD

### 1. Verificación de Organización
Todos los endpoints deben verificar que el usuario autenticado pertenece a la organización de la guardia/movimiento.

### 2. Verificación de Rol
- **ADMIN**: Acceso total
- **ORGADMIN**: Solo su organización
- **GUARDIA**: Solo guardias de su sección

### 3. Auditoría
Registrar en tabla de auditoría:
- Creación/modificación de guardias
- Asignación/restricción de usuarios
- Todos los movimientos (entrada/salida)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN BACKEND

### Fase 1: Modelo de Datos
- [ ] Crear tablas en base de datos
- [ ] Crear entidades JPA
- [ ] Crear repositorios
- [ ] Implementar queries personalizadas

### Fase 2: DTOs y Mappers
- [ ] Crear todos los DTOs
- [ ] Implementar MapStruct mappers
- [ ] Validaciones con Bean Validation

### Fase 3: Lógica de Negocio
- [ ] Implementar GuardiaService
- [ ] Implementar GuardiaUsuarioService
- [ ] Implementar MovimientoGuardiaService
- [ ] Validaciones de negocio

### Fase 4: Controllers
- [ ] Implementar GuardiaController
- [ ] Implementar GuardiaUsuarioController
- [ ] Implementar MovimientoGuardiaController
- [ ] Manejo de excepciones

### Fase 5: Seguridad
- [ ] Aplicar @PreAuthorize en endpoints
- [ ] Verificación de organización
- [ ] Auditoría de operaciones

### Fase 6: Testing
- [ ] Unit tests de servicios
- [ ] Integration tests de controllers
- [ ] Tests de seguridad

---

## 🧪 CASOS DE PRUEBA CRÍTICOS

1. **Registrar entrada sin entrada abierta** → ✅ OK
2. **Intentar registrar entrada con entrada abierta** → ❌ Error
3. **Registrar salida con entrada abierta** → ✅ OK (calcular permanencia)
4. **Intentar registrar salida sin entrada abierta** → ❌ Error
5. **Usuario inactivo intenta acceder** → ❌ Error
6. **Usuario restringido intenta acceder** → ❌ Error
7. **Eliminar guardia con movimientos** → ❌ Error
8. **Código de guardia duplicado** → ❌ Error

---

**Documento preparado para el equipo de Backend**  
**Frontend Status:** ✅ Completado y compilado  
**Fecha:** 2025-11-29  
**Next Step:** Implementar backend según esta especificación

