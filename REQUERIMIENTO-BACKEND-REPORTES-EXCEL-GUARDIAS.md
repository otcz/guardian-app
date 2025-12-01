# REQUERIMIENTO TÉCNICO: SERVICIO DE REPORTES EXCEL - MÓDULO GUARDIAS

**Fecha:** 2025-12-01  
**Solicitado por:** Equipo Frontend  
**Prioridad:** Alta  
**Versión:** 1.0

---

## 📋 RESUMEN EJECUTIVO

Se requiere implementar **dos endpoints** en el backend para generar reportes en formato Excel (.xlsx) con información del módulo de Guardias (Puntos de Control). Los informes deben tener **formato profesional** con estilos, colores corporativos, bordes y organización visual como se especifica en este documento.

El objetivo es **descargar la lógica de generación de Excel del frontend al backend** para mejorar el rendimiento, escalabilidad y consistencia de los reportes.

---

## 🎯 OBJETIVOS

1. ✅ **Generar informes Excel profesionales** con estilos y formato corporativo
2. ✅ **Reducir la carga del frontend** (actualmente 500KB de librería xlsx)
3. ✅ **Centralizar la lógica de reportes** para facilitar mantenimiento
4. ✅ **Permitir auditoría** de generación de reportes en servidor
5. ✅ **Preparar infraestructura** para futuros reportes programados/automáticos

---

## 🔧 ENDPOINTS REQUERIDOS

### **Endpoint 1: Reporte de Guardias por Usuario**

```
POST /api/reportes/guardias-usuario
Content-Type: application/json
Authorization: Bearer {token}
```

#### **Request Body**
```json
{
  "usuarioId": "uuid-del-usuario",
  "seccionId": "uuid-de-la-seccion",
  "organizacionId": "uuid-de-la-organizacion"
}
```

#### **Response**
```
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="Informe_Guardias_USER1_CANSUR_2025-12-01.xlsx"

[Binary Excel File]
```

---

### **Endpoint 2: Reporte de Usuarios por Guardia**

```
POST /api/reportes/usuarios-guardia
Content-Type: application/json
Authorization: Bearer {token}
```

#### **Request Body**
```json
{
  "guardiaId": "uuid-de-la-guardia",
  "seccionId": "uuid-de-la-seccion",
  "organizacionId": "uuid-de-la-organizacion"
}
```

#### **Response**
```
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="Informe_Usuarios_G_TABLA_2025-12-01.xlsx"

[Binary Excel File]
```

---

## 📊 ESTRUCTURA DEL INFORME 1: Guardias por Usuario

### **Formato del Excel** (archivo: `Informe_Guardias_{username}_{fecha}.xlsx`)

#### **Hoja: "Informe de Guardias"**

```
╔═══════════════════════════════════════════════════════════╗
║     SISTEMA DE GESTIÓN DE GUARDIAS                        ║  <- Fila 1: Fusionada A-E, fondo #1F4E78, texto blanco, 18pt, negrita
╠═══════════════════════════════════════════════════════════╣
║     INFORME DE GUARDIAS ASIGNADAS POR USUARIO             ║  <- Fila 2: Fusionada A-E, fondo #2E75B5, texto blanco, 14pt, negrita
╚═══════════════════════════════════════════════════════════╝

[Fila vacía]

╔═══════════════════════════════════════════════════════════╗
║     INFORMACIÓN DEL USUARIO                               ║  <- Fusionada A-E, fondo #2E75B5, texto blanco, 14pt, negrita
╚═══════════════════════════════════════════════════════════╝
Nombre Completo:    OSCAR TOMÁS CARRILLO ZULETA              <- Columna B-E fusionadas
Username:           USER1_CANSUR
Email:              OSCAR.CARRILLO@GMAIL.com
Fecha de Generación: 30 de noviembre de 2025, 22:39

[2 filas vacías]

╔═══════════════════════════════════════════════════════════╗
║     RESUMEN EJECUTIVO                                     ║  <- Fusionada A-E, fondo #2E75B5
╚═══════════════════════════════════════════════════════════╝
Guardias Asignadas:     1                                     <- Columna B-E fusionadas
Guardias Restringidas:  1
Guardias Disponibles:   0
Total de Guardias:      2

[3 filas vacías]

╔═══════════════════════════════════════════════════════════╗
║     1. GUARDIAS ASIGNADAS                                 ║  <- Fusionada A-E, fondo #4472C4, texto blanco, 12pt, negrita
╚═══════════════════════════════════════════════════════════╝

[Fila vacía]

┌───┬─────────────────────────────┬──────────┬───────────────────────┐  <- Header fondo #5B9BD5, texto blanco, negrita
│ N°│ Nombre de la Guardia        │ Código   │ Observaciones         │
├───┼─────────────────────────────┼──────────┼───────────────────────┤  <- Datos con bordes grises #D3D3D3
│ 1 │ GUARDIA_TABLA              │ G_TABLA  │ Sin observaciones     │  <- N° con fondo #F8F9FA
└───┴─────────────────────────────┴──────────┴───────────────────────┘

[Fila vacía]

TOTAL DE GUARDIAS ASIGNADAS:    1                             <- Fusionada A-D, fondo #E7E6E6, negrita, color #1F4E78

[3 filas vacías]

╔═══════════════════════════════════════════════════════════╗
║     2. GUARDIAS RESTRINGIDAS                              ║  <- Fusionada A-E, fondo #4472C4
╚═══════════════════════════════════════════════════════════╝

[Fila vacía]

┌───┬─────────────────────────┬──────────┬────────────────────┬───────────────┐
│ N°│ Nombre de la Guardia    │ Código   │ Motivo Restricción │ Observaciones │
├───┼─────────────────────────┼──────────┼────────────────────┼───────────────┤
│ 1 │ PUENTE TABLA           │ G_TABLA2 │ SE PORTO MAL       │ Sin observ.   │
└───┴─────────────────────────┴──────────┴────────────────────┴───────────────┘

[Fila vacía]

TOTAL DE GUARDIAS RESTRINGIDAS:    1

[3 filas vacías]

╔═══════════════════════════════════════════════════════════╗
║     3. GUARDIAS DISPONIBLES PARA ASIGNACIÓN               ║  <- Fusionada A-E, fondo #4472C4
╚═══════════════════════════════════════════════════════════╝

[Fila vacía]

┌───┬─────────────────────────┬──────────┬───────────┐
│ N°│ Nombre de la Guardia    │ Código   │ Ubicación │
├───┼─────────────────────────┼──────────┼───────────┤
│   │ No hay guardias disponibles para asignar.      │  <- Si está vacío
└───┴─────────────────────────┴──────────┴───────────┘

[Fila vacía]

TOTAL DE GUARDIAS DISPONIBLES:    0

[2 filas vacías]

Este documento es un reporte generado automáticamente por el Sistema de Gestión de Guardias  <- Fusionada A-E
Fecha de generación:    30/11/2025, 22:45:56                                                  <- Fusionada A-E
```

---

## 📊 ESTRUCTURA DEL INFORME 2: Usuarios por Guardia

### **Formato del Excel** (archivo: `Informe_Usuarios_{codigoGuardia}_{fecha}.xlsx`)

#### **Hoja: "Informe de Usuarios"**

```
╔═══════════════════════════════════════════════════════════╗
║     SISTEMA DE GESTIÓN DE GUARDIAS                        ║  <- Fila 1: Fusionada A-E, fondo #1F4E78
╠═══════════════════════════════════════════════════════════╣
║     INFORME DE USUARIOS AUTORIZADOS POR GUARDIA           ║  <- Fila 2: Fusionada A-E, fondo #2E75B5
╚═══════════════════════════════════════════════════════════╝

[Fila vacía]

╔═══════════════════════════════════════════════════════════╗
║     INFORMACIÓN DE LA GUARDIA                             ║  <- Fusionada A-E, fondo #2E75B5
╚═══════════════════════════════════════════════════════════╝
Nombre:             GUARDIA_TABLA                             <- Columna B-E fusionadas
Código:             G_TABLA
Ubicación:          CALLE 55
Fecha de Generación: 30 de noviembre de 2025, 22:39

[2 filas vacías]

╔═══════════════════════════════════════════════════════════╗
║     RESUMEN EJECUTIVO                                     ║  <- Fusionada A-E, fondo #2E75B5
╚═══════════════════════════════════════════════════════════╝
Usuarios con Acceso:    2                                     <- Columna B-E fusionadas
Usuarios Restringidos:  0
Usuarios Disponibles:   5
Total de Usuarios:      7

[3 filas vacías]

╔═══════════════════════════════════════════════════════════╗
║     1. USUARIOS CON ACCESO AUTORIZADO                     ║  <- Fusionada A-E, fondo #4472C4
╚═══════════════════════════════════════════════════════════╝

[Fila vacía]

┌───┬────────────────────────────┬──────────────┬───────────────────┐
│ N°│ Nombre Completo            │ Username     │ Observaciones     │
├───┼────────────────────────────┼──────────────┼───────────────────┤
│ 1 │ OSCAR TOMÁS CARRILLO      │ USER1_CANSUR │ Sin observaciones │
│ 2 │ JUAN PÉREZ LÓPEZ          │ USER2_CANSUR │ Autorizado       │
└───┴────────────────────────────┴──────────────┴───────────────────┘

[Fila vacía]

TOTAL DE USUARIOS CON ACCESO:    2

[3 filas vacías]

╔═══════════════════════════════════════════════════════════╗
║     2. USUARIOS CON ACCESO RESTRINGIDO                    ║  <- Fusionada A-E
╚═══════════════════════════════════════════════════════════╝

[Fila vacía]

┌───┬────────────────────┬───────────┬────────────────────┬───────────────┐
│ N°│ Nombre Completo    │ Username  │ Motivo Restricción │ Observaciones │
├───┼────────────────────┼───────────┼────────────────────┼───────────────┤
│   │ No hay usuarios con restricciones para esta guardia.             │
└───┴────────────────────┴───────────┴────────────────────┴───────────────┘

[Fila vacía]

TOTAL DE USUARIOS RESTRINGIDOS:    0

[3 filas vacías]

╔═══════════════════════════════════════════════════════════╗
║     3. USUARIOS DISPONIBLES PARA ASIGNACIÓN               ║  <- Fusionada A-E
╚═══════════════════════════════════════════════════════════╝

[Fila vacía]

┌───┬────────────────────┬───────────┬─────────────────────┐
│ N°│ Nombre Completo    │ Username  │ Email               │
├───┼────────────────────┼───────────┼─────────────────────┤
│ 1 │ Pedro Martínez     │ USER3     │ pedro@example.com   │
│ 2 │ Ana Rodríguez      │ USER4     │ ana@example.com     │
└───┴────────────────────┴───────────┴─────────────────────┘

[Fila vacía]

TOTAL DE USUARIOS DISPONIBLES:    2

[2 filas vacías]

Este documento es un reporte generado automáticamente por el Sistema de Gestión de Guardias
Fecha de generación:    30/11/2025, 22:45:56
```

---

## 🎨 ESPECIFICACIONES DE DISEÑO Y ESTILOS

### **Paleta de Colores Corporativa**

| Elemento | Color Fondo | Color Texto | Hex |
|----------|-------------|-------------|-----|
| **Título Principal** | Azul Oscuro | Blanco | `#1F4E78` |
| **Subtítulo** | Azul Medio | Blanco | `#2E75B5` |
| **Secciones Numeradas** | Azul Corporativo | Blanco | `#4472C4` |
| **Headers de Tabla** | Azul Claro | Blanco | `#5B9BD5` |
| **N° de Fila** | Gris Muy Claro | Negro | `#F8F9FA` |
| **Totales** | Gris Claro | Azul Oscuro | `#E7E6E6` / `#1F4E78` |
| **Info Labels** | Gris Claro | Azul Medio | `#F2F2F2` / `#2E75B5` |
| **Bordes Datos** | N/A | N/A | `#D3D3D3` |

### **Tipografía**

| Elemento | Fuente | Tamaño | Peso | Alineación |
|----------|--------|--------|------|------------|
| **Título Principal** | Calibri | 18pt | Negrita | Centrado |
| **Subtítulo** | Calibri | 14pt | Negrita | Centrado |
| **Secciones Numeradas** | Calibri | 12pt | Negrita | Izquierda |
| **Headers Tabla** | Calibri | 11pt | Negrita | Centrado |
| **Datos Tabla** | Calibri | 10pt | Normal | Izquierda |
| **N° de Fila** | Calibri | 10pt | Negrita | Centrado |
| **Totales** | Calibri | 11pt | Negrita | Izquierda |
| **Info Labels** | Calibri | 10pt | Negrita | Izquierda |

### **Bordes**

| Elemento | Estilo | Color |
|----------|--------|-------|
| **Títulos** | Medium (grueso) | Negro `#000000` |
| **Headers Tabla** | Medium arriba/abajo, Thin lados | Negro `#000000` |
| **Datos Tabla** | Thin (delgado) | Gris `#D3D3D3` |
| **Totales** | Medium arriba/abajo | Negro `#000000` |

### **Anchos de Columna**

#### **Informe de Guardias**
```
Columna A (N°):          8 caracteres
Columna B (Nombre):      35 caracteres
Columna C (Código):      15 caracteres
Columna D (Motivo/Ubi):  40 caracteres
Columna E (Observ):      30 caracteres
```

#### **Informe de Usuarios**
```
Columna A (N°):          8 caracteres
Columna B (Nombre):      35 caracteres
Columna C (Username):    20 caracteres
Columna D (Motivo/Email):40 caracteres
Columna E (Observ):      30 caracteres
```

### **Alturas de Fila**

```
Fila 1 (Título):         25 puntos
Fila 2 (Subtítulo):      22 puntos
Secciones Numeradas:     20 puntos
Headers de Tabla:        18 puntos
Datos:                   Automático
```

### **Fusión de Celdas**

1. **Títulos principales** (Filas 1-2): Columnas A-E
2. **Subtítulos de sección** (INFORMACIÓN, RESUMEN): Columnas A-E
3. **Secciones numeradas** (1., 2., 3.): Columnas A-E
4. **Valores de información**: Columnas B-E (dejando A para label)
5. **Totales**: Columnas A-D (dejando E para número)
6. **Pie de página**: Columnas A-E

---

## 📥 FUENTES DE DATOS

### **Para Endpoint 1 (Guardias por Usuario)**

El backend debe consultar:

```sql
-- Guardias Asignadas (disponibles)
SELECT g.id, g.nombre, g.codigo, g.ubicacion, gu.observaciones
FROM guardia_usuario gu
JOIN guardias g ON gu.guardia_id = g.id
WHERE gu.usuario_id = :usuarioId
  AND gu.asignada = TRUE
  AND gu.restringida = FALSE
ORDER BY g.nombre;

-- Guardias Restringidas
SELECT g.id, g.nombre, g.codigo, g.ubicacion, gu.motivo_restriccion, gu.observaciones
FROM guardia_usuario gu
JOIN guardias g ON gu.guardia_id = g.id
WHERE gu.usuario_id = :usuarioId
  AND gu.restringida = TRUE
ORDER BY g.nombre;

-- Guardias Disponibles (no asignadas)
SELECT g.id, g.nombre, g.codigo, g.ubicacion
FROM guardias g
WHERE g.seccion_id = :seccionId
  AND g.id NOT IN (
    SELECT guardia_id FROM guardia_usuario WHERE usuario_id = :usuarioId
  )
ORDER BY g.nombre;

-- Información del Usuario
SELECT u.id, u.username, u.nombre_completo, u.email
FROM users u
WHERE u.id = :usuarioId;
```

### **Para Endpoint 2 (Usuarios por Guardia)**

El backend debe consultar:

```sql
-- Usuarios con Acceso
SELECT u.id, u.username, u.nombre_completo, u.email, gu.observaciones
FROM guardia_usuario gu
JOIN users u ON gu.usuario_id = u.id
WHERE gu.guardia_id = :guardiaId
  AND gu.asignada = TRUE
  AND gu.restringida = FALSE
ORDER BY u.nombre_completo;

-- Usuarios Restringidos
SELECT u.id, u.username, u.nombre_completo, u.email, gu.motivo_restriccion, gu.observaciones
FROM guardia_usuario gu
JOIN users u ON gu.usuario_id = u.id
WHERE gu.guardia_id = :guardiaId
  AND gu.restringida = TRUE
ORDER BY u.nombre_completo;

-- Usuarios Disponibles (no asignados)
SELECT u.id, u.username, u.nombre_completo, u.email
FROM users u
WHERE u.seccion_id = :seccionId
  AND 'USUARIO' = ANY(u.roles)
  AND u.id NOT IN (
    SELECT usuario_id FROM guardia_usuario WHERE guardia_id = :guardiaId
  )
ORDER BY u.nombre_completo;

-- Información de la Guardia
SELECT g.id, g.nombre, g.codigo, g.ubicacion
FROM guardias g
WHERE g.id = :guardiaId;
```

---

## 🔒 SEGURIDAD Y VALIDACIONES

### **Validaciones Requeridas**

1. ✅ **Autenticación**: Verificar token JWT válido
2. ✅ **Autorización**: Usuario debe tener permisos de lectura en la sección
3. ✅ **Validar parámetros**: Todos los IDs deben existir
4. ✅ **Contexto de sección**: Verificar que usuario tiene acceso a la sección
5. ✅ **Límite de filas**: Máximo 10,000 registros por reporte (configurar si es necesario)

### **Manejo de Errores**

```json
// 400 Bad Request - Parámetros inválidos
{
  "error": "BAD_REQUEST",
  "message": "El usuarioId es requerido",
  "timestamp": "2025-12-01T10:30:00Z"
}

// 404 Not Found - Recurso no existe
{
  "error": "NOT_FOUND",
  "message": "Usuario con ID 'xxx' no encontrado",
  "timestamp": "2025-12-01T10:30:00Z"
}

// 403 Forbidden - Sin permisos
{
  "error": "FORBIDDEN",
  "message": "No tiene permisos para generar reportes de esta sección",
  "timestamp": "2025-12-01T10:30:00Z"
}

// 500 Internal Server Error
{
  "error": "INTERNAL_SERVER_ERROR",
  "message": "Error al generar el reporte Excel",
  "timestamp": "2025-12-01T10:30:00Z"
}
```

---

## 📚 LIBRERÍAS RECOMENDADAS

### **Para Java/Spring Boot**
```xml
<!-- Apache POI para Excel -->
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.5</version>
</dependency>
```

### **Para Node.js/NestJS**
```json
{
  "dependencies": {
    "exceljs": "^4.4.0"
  }
}
```

### **Para Python/Django**
```txt
openpyxl==3.1.2
xlsxwriter==3.1.9
```

---

## 📝 EJEMPLO DE IMPLEMENTACIÓN (Referencia)

### **Estructura del Servicio (Java)**

```java
@Service
public class GuardiasReporteService {
    
    @Autowired
    private GuardiaUsuarioRepository guardiaUsuarioRepo;
    
    @Autowired
    private GuardiaRepository guardiaRepo;
    
    @Autowired
    private UserRepository userRepo;
    
    public byte[] generarReporteGuardiasPorUsuario(String usuarioId, String seccionId) {
        // 1. Consultar datos
        Usuario usuario = userRepo.findById(usuarioId)
            .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        
        List<GuardiaRelacion> asignadas = guardiaUsuarioRepo
            .findGuardiasAsignadasByUsuario(usuarioId);
        
        List<GuardiaRelacion> restringidas = guardiaUsuarioRepo
            .findGuardiasRestringidasByUsuario(usuarioId);
        
        List<Guardia> disponibles = guardiaRepo
            .findGuardiasDisponiblesParaUsuario(usuarioId, seccionId);
        
        // 2. Crear workbook
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Informe de Guardias");
        
        // 3. Crear estilos
        CellStyle estiloTitulo = crearEstiloTitulo(workbook);
        CellStyle estiloSeccion = crearEstiloSeccion(workbook);
        // ... más estilos
        
        // 4. Escribir datos
        int rowNum = 0;
        
        // Título principal
        Row row = sheet.createRow(rowNum++);
        Cell cell = row.createCell(0);
        cell.setCellValue("SISTEMA DE GESTIÓN DE GUARDIAS");
        cell.setCellStyle(estiloTitulo);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 4));
        
        // ... continuar con resto del informe
        
        // 5. Convertir a bytes
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();
        
        return out.toByteArray();
    }
    
    private CellStyle crearEstiloTitulo(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        
        // Fuente
        Font font = workbook.createFont();
        font.setFontName("Calibri");
        font.setFontHeightInPoints((short) 18);
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        
        // Fondo
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        
        // Alineación
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        
        // Bordes
        style.setBorderTop(BorderStyle.MEDIUM);
        style.setBorderBottom(BorderStyle.MEDIUM);
        style.setBorderLeft(BorderStyle.MEDIUM);
        style.setBorderRight(BorderStyle.MEDIUM);
        
        return style;
    }
    
    // ... más métodos de creación de estilos
}
```

### **Controller (Java)**

```java
@RestController
@RequestMapping("/api/reportes")
public class ReportesController {
    
    @Autowired
    private GuardiasReporteService reporteService;
    
    @PostMapping("/guardias-usuario")
    @PreAuthorize("hasAuthority('READ_GUARDIAS')")
    public ResponseEntity<Resource> generarReporteGuardiasUsuario(
        @RequestBody @Valid ReporteGuardiasUsuarioRequest request
    ) {
        byte[] excelBytes = reporteService.generarReporteGuardiasPorUsuario(
            request.getUsuarioId(),
            request.getSeccionId()
        );
        
        ByteArrayResource resource = new ByteArrayResource(excelBytes);
        
        String fecha = LocalDate.now().toString();
        String filename = String.format(
            "Informe_Guardias_%s_%s.xlsx",
            request.getUsername(),
            fecha
        );
        
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, 
                   "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .contentLength(excelBytes.length)
            .body(resource);
    }
    
    @PostMapping("/usuarios-guardia")
    @PreAuthorize("hasAuthority('READ_GUARDIAS')")
    public ResponseEntity<Resource> generarReporteUsuariosGuardia(
        @RequestBody @Valid ReporteUsuariosGuardiaRequest request
    ) {
        // Implementación similar
    }
}
```

---

## ✅ CRITERIOS DE ACEPTACIÓN

1. ✅ **Funcionalidad**
   - Los endpoints responden correctamente con archivo Excel descargable
   - Los datos mostrados son exactos y completos
   - Las secciones vacías muestran mensaje "No hay..." apropiado

2. ✅ **Formato**
   - Todos los estilos (colores, fuentes, bordes) coinciden con especificación
   - Las celdas están fusionadas según especificación
   - Los anchos de columna son los especificados
   - Las alturas de fila son las especificadas

3. ✅ **Rendimiento**
   - Genera reportes de hasta 1,000 registros en menos de 3 segundos
   - Maneja correctamente reportes con 0 registros (vacíos)

4. ✅ **Seguridad**
   - Valida autenticación y autorización
   - No permite acceso a datos de otras secciones/organizaciones
   - Registra en logs quién genera reportes

5. ✅ **Nombres de Archivo**
   - Sigue el formato especificado con username/código y fecha
   - No contiene caracteres especiales problemáticos

---

## 🧪 CASOS DE PRUEBA

### **Test Case 1: Usuario con guardias asignadas y restringidas**
```
Input:
  usuarioId: "user-123"
  seccionId: "seccion-456"

Expected Output:
  - Excel descargable
  - Sección "Guardias Asignadas" con N registros
  - Sección "Guardias Restringidas" con M registros
  - Sección "Guardias Disponibles" con P registros
  - Totales correctos
```

### **Test Case 2: Usuario sin guardias**
```
Input:
  usuarioId: "user-new"
  seccionId: "seccion-456"

Expected Output:
  - Excel descargable
  - "No hay guardias asignadas" en sección 1
  - "No hay guardias restringidas" en sección 2
  - Lista de guardias disponibles en sección 3
  - Total Asignadas: 0, Total Restringidas: 0
```

### **Test Case 3: Guardia con muchos usuarios**
```
Input:
  guardiaId: "guardia-789"
  seccionId: "seccion-456"

Expected Output:
  - Excel descargable
  - Todos los usuarios listados correctamente
  - Números de fila secuenciales
  - Totales correctos
```

### **Test Case 4: Error - Usuario no encontrado**
```
Input:
  usuarioId: "user-inexistente"

Expected Output:
  - HTTP 404
  - JSON con error: "Usuario no encontrado"
```

### **Test Case 5: Error - Sin permisos**
```
Input:
  usuarioId: "user-123"
  seccionId: "seccion-otra"  <- Usuario no tiene acceso

Expected Output:
  - HTTP 403
  - JSON con error de permisos
```

---

## 📅 ENTREGABLES

1. ✅ **Código Backend**
   - Servicios de generación de Excel
   - Controllers con endpoints
   - DTOs de request/response
   - Tests unitarios (>80% cobertura)

2. ✅ **Documentación**
   - Swagger/OpenAPI de los endpoints
   - Comentarios en código
   - README con instrucciones de uso

3. ✅ **Testing**
   - Tests unitarios de servicios
   - Tests de integración de endpoints
   - Tests de casos edge (vacíos, muchos registros)

4. ✅ **Deploy**
   - Endpoints desplegados en ambiente de desarrollo
   - Validación con equipo frontend

---

## 🤝 COORDINACIÓN CON FRONTEND

### **Frontend hará:**
```typescript
// Servicio Angular
exportarGuardiasUsuarioAExcel(): void {
  const request = {
    usuarioId: this.usuarioSeleccionadoDetalle.id,
    seccionId: this.seccionId,
    organizacionId: this.organizacionId
  };

  this.http.post('/api/reportes/guardias-usuario', request, {
    responseType: 'blob'
  }).subscribe({
    next: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Informe_Guardias_${fecha}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    error: (err) => {
      console.error('Error al descargar reporte', err);
    }
  });
}
```

---

## 📞 CONTACTOS

- **Solicitante Frontend**: [Nombre del solicitante]
- **Product Owner**: [Nombre]
- **Slack Channel**: #dev-backend-reportes

---

## 📌 NOTAS ADICIONALES

1. **Formato de fechas**: Usar formato español largo para "Fecha de Generación" (ej: "30 de noviembre de 2025, 22:39")
2. **Encoding**: UTF-8 para caracteres especiales (tildes, ñ)
3. **Tamaño máximo**: Si un reporte excede 10MB, considerar paginación o filtros
4. **Cache**: Considerar cachear reportes idénticos por 5 minutos para optimizar
5. **Logs**: Registrar cada generación con timestamp, usuario y parámetros
6. **Métricas**: Instrumentar con métricas (tiempo de generación, tamaño archivo, etc.)

---

**Fin del requerimiento técnico**

_Documento generado el 2025-12-01_

