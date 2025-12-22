# 📊 Estructura del Módulo de Guardia - Movimientos de Guardia
**Fecha:** 19 de Diciembre, 2025  
**Módulo:** Módulo de Guardia - Sistema Guardian  
**Componente Analizado:** `entradas-abiertas.component.ts`

---

## 🏗️ Arquitectura General del Módulo

```
src/app/guardia/
├── constants/                    # Constantes y mensajes
│   └── mensajes.constants.ts     # LABELS y mensajes del módulo
├── gestion-guardias/             # CRUD de Guardias (Admin)
│   ├── guardia-list/            # Listar guardias
│   ├── guardia-form/            # Crear/Editar guardia
│   └── ...
├── gestion-restricciones/        # Gestión de restricciones
│   └── administrar-guardias-usuario/
├── reportes-guardia/             # 📍 MÓDULO DE MOVIMIENTOS
│   ├── entradas-abiertas/       # ✅ Monitoreo de Estados
│   ├── movimientos-list/        # Ver historial de movimientos
│   └── movimientos-abiertos/    # (Posiblemente deprecated)
├── validacion-ingreso/           # Control de acceso
│   ├── control-ingreso-salida/  # Registrar ENTRADA/SALIDA
│   ├── validar-usuario/         # Validar usuario (solo lectura)
│   └── validar-vehiculo/        # Validar vehículo (solo lectura)
└── guardia.routes.ts            # Rutas del módulo
```

---

## 📦 Componente: Entradas Abiertas (Monitoreo de Estados)

### 📂 Ubicación
```
src/app/guardia/reportes-guardia/entradas-abiertas/
├── entradas-abiertas.component.ts     # Lógica del componente
├── entradas-abiertas.component.html   # Template
└── entradas-abiertas.component.css    # Estilos
```

### 🎯 Propósito
Monitorear en tiempo real los usuarios que están:
- **DENTRO:** Usuarios con entrada sin salida (entrada abierta)
- **FUERA:** Usuarios con salida registrada (sin entrada abierta)

---

## 🔧 Servicios Utilizados

### 1️⃣ `MovimientoGuardiaService`
**Ubicación:** `src/app/service/movimiento-guardia.service.ts`

**Métodos utilizados en el componente:**

#### ✅ Nuevos Endpoints (Implementados 2025-12-19)
```typescript
// Obtener usuarios DENTRO
getUsuariosDentro(): Observable<UsuarioDentroDTO[]>
  → GET /api/movimientos-guardia/usuarios-dentro

// Obtener usuarios FUERA
getUsuariosFuera(): Observable<UsuarioDentroDTO[]>
  → GET /api/movimientos-guardia/usuarios-fuera
```

#### ⚠️ Endpoint Antiguo (Fallback)
```typescript
// Endpoint deprecado usado como fallback
listarTodasEntradasAbiertas(): Observable<MovimientoGuardia[]>
  → GET /api/movimientos-guardia/entradas-abiertas
```

**Otros métodos disponibles:**
```typescript
// Operaciones principales
registrarEntrada(dto: RegistrarEntradaDTO): Observable<MovimientoGuardia>
registrarSalida(dto: RegistrarSalidaDTO): Observable<MovimientoGuardia>

// Validaciones
validarUsuario(identificacion: string, guardiaId?: string): Observable<ValidacionUsuarioDTO>
validarVehiculo(vehiculoId: string): Observable<ValidacionVehiculoDTO>

// Consultas
obtenerEntradaAbierta(usuarioId: string): Observable<MovimientoGuardia | null>
contarEntradasAbiertas(usuarioId: string): Observable<ConteoEntradasDTO>
listarPorUsuario(usuarioId: string): Observable<MovimientoGuardia[]>
listarPorSeccion(seccionId: string): Observable<MovimientoGuardia[]>
listarPorGuardiaYFechas(guardiaId: string, fechaInicio: string, fechaFin: string): Observable<MovimientoGuardia[]>
```

### 2️⃣ `MessageService` (PrimeNG)
**Propósito:** Mostrar notificaciones toast al usuario

```typescript
messageService.add({
  severity: 'info' | 'success' | 'warn' | 'error',
  summary: 'Título',
  detail: 'Mensaje detallado',
  life: 3000  // Duración en ms
});
```

---

## 🧩 Interfaces y Modelos

### `UsuarioDentroDTO` (Nuevo - v3.0)
**Ubicación:** `src/app/models/guardia.models.ts`

```typescript
interface UsuarioDentroDTO {
  id: string;                                // UUID del usuario
  nombreCompleto: string;                    // Nombre completo
  identificacion: string;                    // Número de documento
  tipoIdentificacion: string;                // CEDULA, PASAPORTE, etc.
  telefono: string;                          // Teléfono
  email: string;                             // ✅ NUEVO - Email
  seccionNombre: string;                     // ✅ NUEVO - Sección
  seccionId: string;                         // UUID de la sección
  activo: boolean;                           // ✅ NUEVO - Estado activo
  tieneEntradaAbierta: boolean;              // true = DENTRO, false = FUERA
  entradaAbierta: MovimientoGuardia | null;  // Objeto entrada completo
  ultimoMovimiento: UltimoMovimientoDTO | null; // Último movimiento formateado
}
```

### `EstadoUsuario` (Interface Interna del Componente)
```typescript
interface EstadoUsuario {
  usuarioId: string;
  nombreCompleto: string;
  identificacion: string;
  tipoIdentificacion: string;
  telefono: string;
  email: string;                      // ✅ Agregado
  seccionNombre: string;              // ✅ Agregado
  activo: boolean;                    // ✅ Agregado
  guardiaNombre: string;
  fechaHoraMovimiento: string;
  tiempoTranscurrido: string;         // Calculado en frontend
  observaciones?: string;
  tipoMovimiento: 'ENTRADA' | 'SALIDA';
  permanenciaMinutos?: number | null;
  ultimoMovimiento?: any;             // Compatibilidad
}
```

### `MovimientoGuardia` (Modelo Principal)
```typescript
interface MovimientoGuardia {
  id: string;
  organizacionId?: string;
  seccionId?: string;
  seccionNombre?: string;
  guardiaId: string;
  guardiaCodigo?: string;
  guardiaNombre?: string;
  usuarioId: string;
  usuarioNombre?: string;
  usuarioUsername?: string;
  usuarioIdentificacion?: string;
  usuarioTelefono?: string;
  vehiculoId?: string | null;
  vehiculoPlaca?: string | null;
  adminGuardiaId?: string;
  adminGuardiaNombre?: string;
  tipoMovimiento?: 'ENTRADA' | 'SALIDA';
  tipo?: 'ENTRADA' | 'SALIDA';
  fechaHora?: string;
  timestampMovimiento?: string;
  observaciones?: string | null;
  entradaAsociadaId?: string | null;
  permanenciaMinutos?: number | null;
  registroVehiculoIncluido?: boolean;
  createdAt?: string;
}
```

---

## 🔄 Flujo de Datos del Componente

### 1️⃣ Inicialización (`ngOnInit`)
```typescript
ngOnInit() {
  this.cargarEstadosUsuarios();
}
```

### 2️⃣ Carga de Estados (Paralela)
```typescript
cargarEstadosUsuarios() {
  // Petición 1: Usuarios DENTRO
  getUsuariosDentro() → mapearUsuarioDentro() → usuariosDentro[]
  
  // Petición 2: Usuarios FUERA
  getUsuariosFuera() → mapearUsuarioFuera() → usuariosFuera[]
  
  // Cuando ambas terminan:
  finalizarCarga() → Mostrar mensaje de éxito
}
```

### 3️⃣ Fallback Automático (Si falla `/usuarios-dentro`)
```typescript
Error en getUsuariosDentro()
  ↓
cargarUsuariosDentroFallback()
  ↓
listarTodasEntradasAbiertas() [endpoint antiguo]
  ↓
Filtrar solo ENTRADAS
  ↓
mapearMovimientoAEstado() → usuariosDentro[]
```

### 4️⃣ Métodos de Mapeo
```typescript
mapearUsuarioDentro(dto: UsuarioDentroDTO): EstadoUsuario
  → Mapea DTO nuevo a interface interna
  → Calcula tiempo transcurrido
  → Tipo: 'ENTRADA'

mapearUsuarioFuera(dto: UsuarioDentroDTO): EstadoUsuario
  → Mapea DTO nuevo a interface interna
  → Calcula tiempo transcurrido
  → Tipo: 'SALIDA'

mapearMovimientoAEstado(mov: any, tipo): EstadoUsuario
  → Mapea endpoint antiguo (fallback)
  → Datos limitados (sin email, sin sección)
  → Usa valores por defecto
```

---

## 🎨 Componentes de UI (PrimeNG)

### Importados en el Componente:
```typescript
- CommonModule          // Directivas Angular básicas
- FormsModule          // [(ngModel)] bindings

// PrimeNG
- TableModule          // p-table (tablas de datos)
- ButtonModule         // p-button (botones)
- TagModule            // p-tag (badges/tags)
- ToastModule          // Notificaciones
- CardModule           // p-card (tarjetas)
- TooltipModule        // pTooltip (tooltips)
- TabViewModule        // p-tabView (tabs DENTRO/FUERA)
- DialogModule         // p-dialog (modal de detalle)
- InputTextModule      // p-inputText (búsqueda)
- IconFieldModule      // Iconos en inputs
- InputIconModule      // Iconos en inputs
```

### Estructura Visual:
```
┌─────────────────────────────────────────────────────┐
│  🔄 Monitoreo de Estados - Usuarios en Guardia     │
│  [Actualizar]                                       │
├─────────────────────────────────────────────────────┤
│  [🟢 Usuarios Dentro] [🟡 Usuarios Fuera]          │
├─────────────────────────────────────────────────────┤
│  🔍 [Buscar...]                          [X]        │
├─────────────────────────────────────────────────────┤
│  Tabla de datos:                                    │
│  - Usuario (nombre + identificación)                │
│  - Teléfono                                         │
│  - Guardia                                          │
│  - Fecha/Hora                                       │
│  - Tiempo Transcurrido (badge con color)           │
│  - Observaciones                                    │
│  - Acción: [👁️ Ver detalle]                        │
└─────────────────────────────────────────────────────┘

Modal de Detalle:
┌─────────────────────────────────────────────────────┐
│  Detalle del Usuario                      [X]       │
├─────────────────────────────────────────────────────┤
│  👤 Información del Usuario                         │
│  - Nombre: OSCAR TOMAS                              │
│  - CEDULA: 1073995283                              │
│  - Email: oscar@example.com                         │
│  - Teléfono: +57 3135331533                        │
│  - Sección: SECC1_ICFE                             │
│  - Guardia: PUENTE TABLA                           │
│  - Estado: [Activo]                                │
│                                                     │
│  🕒 Último Movimiento                               │
│  - Tipo: [ENTRADA]                                 │
│  - Fecha: 18/12/2025, 17:58                        │
│  - Tiempo: 5h 30m                                  │
│  - Permanencia: 120 minutos                        │
│  - Observaciones: -                                │
│                                                     │
│                                    [Cerrar]         │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Métodos Principales del Componente

### Carga de Datos
```typescript
cargarEstadosUsuarios()              // Carga paralela DENTRO + FUERA
cargarUsuariosDentroFallback()       // Fallback si falla nuevo endpoint
```

### Mapeo de Datos
```typescript
mapearUsuarioDentro(dto)             // DTO → EstadoUsuario (DENTRO)
mapearUsuarioFuera(dto)              // DTO → EstadoUsuario (FUERA)
mapearMovimientoAEstado(mov, tipo)   // Endpoint antiguo → EstadoUsuario
```

### Cálculos y Formateo
```typescript
calcularTiempoTranscurrido(fecha)    // Retorna: "5h 30m" o "2d 3h 15m"
getSeverityTiempo(fecha)             // Retorna: 'success' | 'warn' | 'danger'
formatearFecha(fecha)                // Retorna: "18/12/2025, 17:58"
```

### Interacción UI
```typescript
verDetalle(estado)                   // Abre modal con detalles
cerrarDetalle()                      // Cierra modal
onGlobalFilterDentro(table, event)  // Filtro búsqueda DENTRO
onGlobalFilterFuera(table, event)   // Filtro búsqueda FUERA
clearFilter(table, tipo)             // Limpia filtro
```

---

## 🔐 Seguridad y Permisos

### Ruta
```typescript
path: 'ver-entradas-abiertas'
```

### Roles Permitidos
```typescript
roles: ['ADMIN', 'ORGADMIN']
permission: 'ITEM_VER_ENTRADAS_ABIERTAS'
```

### Guard
```typescript
canActivate: [AuthGuard]
```

**⚠️ IMPORTANTE:** Solo usuarios ADMIN y ORGADMIN pueden acceder a este componente.

---

## 📡 Endpoints del Backend

### ✅ Endpoints Nuevos (Producción)
```
GET /api/movimientos-guardia/usuarios-dentro
GET /api/movimientos-guardia/usuarios-fuera
```

### ⚠️ Endpoint Antiguo (Fallback)
```
GET /api/movimientos-guardia/entradas-abiertas
```

### 🔧 Otros Endpoints Disponibles
```
POST /api/movimientos-guardia/entrada
POST /api/movimientos-guardia/salida
GET  /api/movimientos-guardia/validar-usuario-identificacion/{identificacion}
GET  /api/movimientos-guardia/validar-vehiculo/{vehiculoId}
GET  /api/movimientos-guardia/usuario/{usuarioId}/entrada-abierta
GET  /api/movimientos-guardia/usuario/{usuarioId}/conteo-entradas-abiertas
GET  /api/movimientos-guardia/usuario/{usuarioId}
GET  /api/movimientos-guardia/seccion/{seccionId}
GET  /api/movimientos-guardia/guardia/{guardiaId}/rango
```

---

## 🎨 Temas Soportados

El componente soporta 3 modos de tema:

### 1. Tema Claro (`.theme-light`)
```css
- Fondo: #ffffff (blanco)
- Texto: #23272f (negro)
- Tabs no seleccionados: negro
```

### 2. Tema Oscuro (`.theme-dark`)
```css
- Fondo: #232336 (gris oscuro)
- Texto: #e0e6ed (blanco)
- Tabs no seleccionados: blanco
```

### 3. Tema Negro (`.theme-black`)
```css
- Fondo: #131313 (negro puro)
- Texto: #e6e6e6 (blanco)
- Tabs no seleccionados: blanco
```

---

## 📊 Otros Componentes del Módulo Guardia

### 1️⃣ Control de Ingreso/Salida
**Componente:** `control-ingreso-salida.component`  
**Ruta:** `/guardia/control-de-ingreso-y-salida`  
**Propósito:** Registrar ENTRADAS y SALIDAS de usuarios/vehículos  
**Roles:** GUARDIA, ADMIN, ORGADMIN

### 2️⃣ Ver Movimientos Guardia
**Componente:** `movimientos-list.component`  
**Ruta:** `/guardia/ver-movimientos-guardia`  
**Propósito:** Ver historial de movimientos con filtros  
**Roles:** GUARDIA, ADMIN, ORGADMIN

### 3️⃣ Validar Usuarios
**Componente:** `validar-usuario.component`  
**Ruta:** `/guardia/validar-usuarios`  
**Propósito:** Consultar información de usuario (solo lectura)  
**Roles:** GUARDIA, ADMIN, ORGADMIN

### 4️⃣ Validar Vehículos
**Componente:** `validar-vehiculo.component`  
**Ruta:** `/guardia/validar-vehiculos`  
**Propósito:** Consultar información de vehículo (solo lectura)  
**Roles:** GUARDIA, ADMIN, ORGADMIN

### 5️⃣ Gestión de Guardias
**Componentes:** `guardia-list.component`, `guardia-form.component`  
**Ruta:** `/guardia/gestion`  
**Propósito:** CRUD de guardias (puntos de control)  
**Roles:** ADMIN, ORGADMIN

---

## 🔄 Estado Actual del Componente (19 Dic 2025)

### ✅ Implementado
- Carga paralela de usuarios DENTRO y FUERA
- Fallback automático al endpoint antiguo
- Mapeo de DTOs nuevos
- Cálculo de tiempo transcurrido
- Severidad visual por tiempo (verde/amarillo/rojo)
- Modal de detalle con toda la información
- Búsqueda global en ambas tablas
- Soporte para 3 temas (claro, oscuro, negro)
- Logs de error para debugging

### ⚠️ Conocido
- Endpoint `/usuarios-dentro` devuelve error 500 (backend)
- Sistema usa fallback automáticamente
- Datos limitados en modo fallback (sin email, sin sección)

### 📝 Pendiente Backend
- Corregir error 500 en `/usuarios-dentro`
- Implementar estructura `UsuarioDentroDTO` completa

---

## 📚 Documentación Relacionada

- `MIGRACION-ENDPOINTS-USUARIOS-DENTRO-FUERA-2025-12-19.md`
- `ERROR-500-ENDPOINT-USUARIOS-DENTRO-2025-12-19.md`
- `RESUMEN-ESTADO-MIGRACION-2025-12-19.md`
- `CORRECCION-ERRORES-SINTAXIS-2025-12-19.md`
- `api-contratos-frontend.md`

---

**Última actualización:** 19 de Diciembre, 2025  
**Versión del componente:** 3.0  
**Estado:** ✅ Funcional con fallback automático

