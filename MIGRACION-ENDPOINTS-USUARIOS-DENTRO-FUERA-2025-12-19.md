# Migración a Nuevos Endpoints - Usuarios Dentro/Fuera
**Fecha:** 19 de Diciembre, 2025  
**Componente:** `entradas-abiertas.component` (Monitoreo de Estados)

---

## 📋 Resumen de la Migración

### ❌ Endpoint ANTIGUO (Deprecado)
```typescript
GET /api/movimientos-guardia/entradas-abiertas
```

**Problemas:**
- ❌ Solo devuelve `MovimientoGuardiaEntity` (datos del movimiento)
- ❌ No incluye email del usuario
- ❌ No incluye información de sección
- ❌ No incluye estado activo del usuario
- ❌ NO puede listar usuarios que están FUERA

### ✅ Endpoints NUEVOS (Implementados)
```typescript
1️⃣ GET /api/movimientos-guardia/usuarios-dentro
2️⃣ GET /api/movimientos-guardia/usuarios-fuera
```

**Ventajas:**
- ✅ Incluye todos los datos del usuario (`UsuarioDentroDTO`)
- ✅ Email del usuario
- ✅ Sección del usuario
- ✅ Estado activo
- ✅ Tipo de identificación
- ✅ Último movimiento completo formateado
- ✅ Separa claramente DENTRO y FUERA

---

## 🔧 Cambios Implementados

### 1. Nuevas Interfaces (models/guardia.models.ts)

#### ✅ `UsuarioDentroDTO` - Interface principal
```typescript
export interface UsuarioDentroDTO {
  id: string;                                // UUID del usuario
  nombreCompleto: string;                    // Nombre completo
  identificacion: string;                    // Número de documento
  tipoIdentificacion: string;                // CEDULA, PASAPORTE, DNI, etc.
  telefono: string;                          // Teléfono
  email: string;                             // ✅ NUEVO - Email
  seccionNombre: string;                     // ✅ NUEVO - Sección
  seccionId: string;                         // UUID de la sección
  activo: boolean;                           // ✅ NUEVO - Estado activo
  tieneEntradaAbierta: boolean;              // true = DENTRO, false = FUERA
  entradaAbierta: MovimientoGuardia | null;  // Objeto completo de entrada
  ultimoMovimiento: UltimoMovimientoDTO | null; // ✅ NUEVO - Último movimiento formateado
}
```

---

### 2. Servicio Actualizado (movimiento-guardia.service.ts)

#### ✅ Nuevos métodos agregados
```typescript
/**
 * Obtener usuarios que están DENTRO (tienen entrada abierta)
 */
getUsuariosDentro(): Observable<UsuarioDentroDTO[]> {
  return this.http.get<UsuarioDentroDTO[]>(`${this.API_URL}/usuarios-dentro`);
}

/**
 * Obtener usuarios que están FUERA (no tienen entrada abierta)
 */
getUsuariosFuera(): Observable<UsuarioDentroDTO[]> {
  return this.http.get<UsuarioDentroDTO[]>(`${this.API_URL}/usuarios-fuera`);
}
```

#### ⚠️ Método deprecado
```typescript
/**
 * @deprecated Usar getUsuariosDentro() en su lugar
 */
listarTodasEntradasAbiertas(): Observable<MovimientoGuardia[]> {
  return this.http.get<MovimientoGuardia[]>(`${this.API_URL}/entradas-abiertas`);
}
```

---

### 3. Componente Refactorizado (entradas-abiertas.component.ts)

#### ANTES (código antiguo):
```typescript
cargarEntradasAbiertas() {
  this.movimientoService.listarTodasEntradasAbiertas().subscribe({
    next: (movimientos) => {
      this.procesarMovimientos(movimientos);
      // ❌ No puede obtener usuarios FUERA
    }
  });
}
```

#### DESPUÉS (código nuevo):
```typescript
cargarEstadosUsuarios() {
  // 1️⃣ Cargar usuarios DENTRO
  this.movimientoService.getUsuariosDentro().subscribe({
    next: (usuarios) => {
      this.usuariosDentro = usuarios.map(u => this.mapearUsuarioDentro(u));
    }
  });

  // 2️⃣ Cargar usuarios FUERA
  this.movimientoService.getUsuariosFuera().subscribe({
    next: (usuarios) => {
      this.usuariosFuera = usuarios.map(u => this.mapearUsuarioFuera(u));
    }
  });
}
```

#### ✅ Interface `EstadoUsuario` actualizada
```typescript
interface EstadoUsuario {
  usuarioId: string;
  nombreCompleto: string;
  identificacion: string;              // ✅ Ahora requerido
  tipoIdentificacion: string;          // ✅ NUEVO
  telefono: string;                    // ✅ Ahora requerido
  email: string;                       // ✅ NUEVO
  seccionNombre: string;               // ✅ NUEVO
  activo: boolean;                     // ✅ NUEVO
  guardiaNombre: string;
  fechaHoraMovimiento: string;
  tiempoTranscurrido: string;
  observaciones?: string;
  tipoMovimiento: 'ENTRADA' | 'SALIDA';
  permanenciaMinutos?: number | null;
  ultimoMovimiento?: any;
}
```

#### ✅ Nuevos métodos de mapeo
```typescript
private mapearUsuarioDentro(dto: UsuarioDentroDTO): EstadoUsuario {
  const ultimoMov = dto.ultimoMovimiento;
  return {
    usuarioId: dto.id,
    nombreCompleto: dto.nombreCompleto,
    identificacion: dto.identificacion,
    tipoIdentificacion: dto.tipoIdentificacion,
    telefono: dto.telefono,
    email: dto.email,                    // ✅ NUEVO
    seccionNombre: dto.seccionNombre,    // ✅ NUEVO
    activo: dto.activo,                  // ✅ NUEVO
    guardiaNombre: ultimoMov?.guardiaNombre || 'N/A',
    fechaHoraMovimiento: ultimoMov?.fechaMovimiento || '',
    tiempoTranscurrido: this.calcularTiempoTranscurrido(ultimoMov?.fechaMovimiento || ''),
    observaciones: ultimoMov?.observaciones || undefined,
    tipoMovimiento: 'ENTRADA',
    permanenciaMinutos: ultimoMov?.permanenciaMinutos || null,
    ultimoMovimiento: ultimoMov
  };
}

private mapearUsuarioFuera(dto: UsuarioDentroDTO): EstadoUsuario {
  // Similar a mapearUsuarioDentro pero con tipoMovimiento: 'SALIDA'
}
```

---

### 4. Template Actualizado (entradas-abiertas.component.html)

#### ✅ Búsqueda global actualizada
```html
<!-- ANTES -->
[globalFilterFields]="['nombreCompleto', 'guardiaNombre', 'observaciones']"

<!-- DESPUÉS -->
[globalFilterFields]="['nombreCompleto', 'identificacion', 'email', 'telefono', 'guardiaNombre', 'observaciones', 'seccionNombre']"
```

#### ✅ Tabla simplificada (antes tenía código condicional complejo)
```html
<!-- ANTES -->
<small *ngIf="estado.ultimoMovimiento.usuarioIdentificacion" class="documento-usuario">
  <i class="pi pi-id-card"></i> {{ estado.ultimoMovimiento.usuarioIdentificacion }}
</small>
<small *ngIf="!estado.ultimoMovimiento.usuarioIdentificacion && estado.ultimoMovimiento.usuario?.documento" class="documento-usuario">
  <i class="pi pi-id-card"></i> {{ estado.ultimoMovimiento.usuario?.documento }}
</small>

<!-- DESPUÉS -->
<small *ngIf="estado.identificacion" class="documento-usuario">
  <i class="pi pi-id-card"></i> {{ estado.identificacion }}
</small>
```

#### ✅ Modal de detalle con nuevos campos
```html
<!-- Email -->
<div class="campo-detalle">
  <strong><i class="pi pi-at"></i> Email:</strong>
  <span>{{ usuarioSeleccionado.email || 'No registrado' }}</span>
</div>

<!-- Sección -->
<div class="campo-detalle">
  <strong><i class="pi pi-building"></i> Sección:</strong>
  <span>{{ usuarioSeleccionado.seccionNombre }}</span>
</div>

<!-- Tipo de identificación -->
<div class="campo-detalle" *ngIf="usuarioSeleccionado.identificacion">
  <strong><i class="pi pi-credit-card"></i> {{ usuarioSeleccionado.tipoIdentificacion }}:</strong>
  <span class="badge-identificacion">{{ usuarioSeleccionado.identificacion }}</span>
</div>

<!-- Estado activo -->
<div class="campo-detalle">
  <strong><i class="pi pi-info-circle"></i> Estado:</strong>
  <p-tag
    [value]="usuarioSeleccionado.activo ? 'Activo' : 'Inactivo'"
    [severity]="usuarioSeleccionado.activo ? 'success' : 'danger'"
    [rounded]="true"
  ></p-tag>
</div>

<!-- Permanencia -->
<div class="campo-detalle" *ngIf="usuarioSeleccionado.permanenciaMinutos">
  <strong><i class="pi pi-hourglass"></i> Permanencia:</strong>
  <span>{{ usuarioSeleccionado.permanenciaMinutos }} minutos</span>
</div>
```

---

## 📊 Logs de Consola Mejorados

### ✅ Log de Usuarios DENTRO
```javascript
console.log('%c========== USUARIOS DENTRO (NUEVO ENDPOINT) ==========', 'color: #10b981; font-weight: bold;');
console.log('%c  → nombreCompleto:', 'color: #3b82f6;', usuarios[0].nombreCompleto);
console.log('%c  → identificacion:', 'color: #3b82f6; font-weight: bold;', usuarios[0].identificacion);
console.log('%c  → email:', 'color: #3b82f6; font-weight: bold;', usuarios[0].email);
console.log('%c  → telefono:', 'color: #3b82f6;', usuarios[0].telefono);
console.log('%c  → seccionNombre:', 'color: #8b5cf6;', usuarios[0].seccionNombre);
console.log('%c  → activo:', 'color: #10b981;', usuarios[0].activo);
console.log('%c  → tieneEntradaAbierta:', 'color: #ec4899;', usuarios[0].tieneEntradaAbierta);
console.log('%c  → ultimoMovimiento:', 'color: #6366f1;', usuarios[0].ultimoMovimiento);
```

### ✅ Tabla resumen procesada
```javascript
console.table(this.usuariosDentro.slice(0, 3).map(u => ({
  nombre: u.nombreCompleto,
  identificacion: u.identificacion,
  email: u.email,              // ✅ NUEVO
  telefono: u.telefono,
  seccion: u.seccionNombre,    // ✅ NUEVO
  guardia: u.guardiaNombre
})));
```

---

## 🎯 Resultado Esperado

### Consola del Navegador

#### ✅ Usuarios DENTRO: 1
```javascript
[
  {
    nombre: "OSCAR TOMAS",
    identificacion: "1073995283",
    email: "oscar@example.com",      // ✅ NUEVO
    telefono: "+57 3135331533",
    seccion: "SECC1_ICFE",           // ✅ NUEVO
    guardia: "PUENTE TABLA",
    activo: true                     // ✅ NUEVO
  }
]
```

#### ✅ Usuarios FUERA: 1
```javascript
[
  {
    nombre: "JUAN PEREZ",
    identificacion: "0987654321",
    email: "juan@example.com",       // ✅ NUEVO
    telefono: "0988888888",
    seccion: "SECC1_ICFE",          // ✅ NUEVO
    guardia: "PUENTE TABLA",
    activo: true,                   // ✅ NUEVO
    ultimoMovimiento: "SALIDA"      // ✅ Indica que está FUERA
  }
]
```

### UI - Modal de Detalle

```
╔════════════════════════════════════════════════════════╗
║  👤 Información del Usuario                            ║
╠════════════════════════════════════════════════════════╣
║  🆔 Nombre Completo:    OSCAR TOMAS                    ║
║  💳 CEDULA:            [1073995283] ← Badge Azul       ║
║  📧 Email:              oscar@example.com              ║ ✅ NUEVO
║  📞 Teléfono:           +57 3135331533                 ║
║  🏢 Sección:            SECC1_ICFE                     ║ ✅ NUEVO
║  📍 Guardia Actual:     PUENTE TABLA                   ║
║  ℹ️  Estado:            [Activo] ← Tag Verde           ║ ✅ NUEVO
╠════════════════════════════════════════════════════════╣
║  🕒 Último Movimiento                                  ║
╠════════════════════════════════════════════════════════╣
║  ↔️  Tipo:              [ENTRADA] ← Tag Verde          ║
║  📅 Fecha y Hora:       18/12/2025, 17:58              ║
║  ⏱️  Tiempo Transcurrido: [5h 30m] ← Tag Amarillo      ║
║  ⌛ Permanencia:        120 minutos                    ║ ✅ NUEVO
║  📝 Observaciones:      -                              ║
╚════════════════════════════════════════════════════════╝
```

---

## ✅ Checklist de Migración

### Modelos
- [x] Interface `UsuarioDentroDTO` creada
- [x] Interface `UltimoMovimientoDTO` ya existía
- [x] Interface `EstadoUsuario` actualizada con nuevos campos

### Servicio
- [x] Método `getUsuariosDentro()` agregado
- [x] Método `getUsuariosFuera()` agregado
- [x] Método `listarTodasEntradasAbiertas()` marcado como `@deprecated`
- [x] Import de `UsuarioDentroDTO` agregado

### Componente
- [x] Método `cargarEstadosUsuarios()` refactorizado
- [x] Método `procesarMovimientos()` eliminado
- [x] Método `mapearUsuarioDentro()` creado
- [x] Método `mapearUsuarioFuera()` creado
- [x] Logs de consola mejorados con colores y formato
- [x] Import de `UsuarioDentroDTO` en lugar de `MovimientoGuardia`

### Template
- [x] `globalFilterFields` actualizado para ambas tablas
- [x] Tabla usuarios DENTRO: acceso directo a `estado.identificacion`
- [x] Tabla usuarios FUERA: acceso directo a `estado.identificacion`
- [x] Modal: campo Email agregado
- [x] Modal: campo Sección agregado
- [x] Modal: Tipo de identificación dinámico
- [x] Modal: Estado activo con tag
- [x] Modal: Permanencia en minutos
- [x] Modal: Sección de vehículo eliminada (no disponible en DTO)

---

## 📈 Ventajas de la Migración

| Característica | Endpoint Antiguo | Endpoints Nuevos |
|---------------|------------------|------------------|
| Lista usuarios DENTRO | ✅ | ✅ |
| Lista usuarios FUERA | ❌ | ✅ |
| Email del usuario | ❌ | ✅ |
| Sección del usuario | ❌ | ✅ |
| Estado activo | ❌ | ✅ |
| Tipo de identificación | ❌ | ✅ |
| Último movimiento formateado | ❌ | ✅ |
| Objeto entrada completo | ❌ | ✅ |
| Datos estructurados | ❌ | ✅ |
| Permanencia en minutos | ❌ | ✅ |

---

## 🚀 Testing Recomendado

### 1. Verificar Datos del Backend
- [ ] Abrir consola del navegador (F12)
- [ ] Recargar componente de Monitoreo
- [ ] Verificar que se muestren los logs con colores:
  - `========== USUARIOS DENTRO (NUEVO ENDPOINT) ==========`
  - `========== USUARIOS FUERA (NUEVO ENDPOINT) ==========`
- [ ] Confirmar que cada usuario tiene:
  - ✅ email
  - ✅ seccionNombre
  - ✅ activo (boolean)
  - ✅ tipoIdentificacion

### 2. Verificar UI - Tablas
- [ ] Tab "Usuarios Dentro" muestra usuarios con entrada sin salida
- [ ] Tab "Usuarios Fuera" muestra usuarios con salida registrada
- [ ] Campo de identificación se muestra correctamente en ambas tablas
- [ ] Búsqueda global funciona con email y sección

### 3. Verificar UI - Modal de Detalle
- [ ] Hacer clic en "Ver detalles" (ícono 👁️)
- [ ] Confirmar que se muestran:
  - Nombre completo
  - Tipo de identificación + número (badge azul)
  - Email
  - Teléfono
  - Sección
  - Guardia
  - Estado (tag verde/rojo)
  - Tipo de movimiento (ENTRADA/SALIDA)
  - Fecha y hora
  - Tiempo transcurrido
  - Permanencia (si aplica)
  - Observaciones (si aplica)

### 4. Verificar Búsqueda
- [ ] Buscar por nombre
- [ ] Buscar por identificación
- [ ] Buscar por email
- [ ] Buscar por teléfono
- [ ] Buscar por guardia
- [ ] Buscar por sección
- [ ] Limpiar búsqueda con botón X

---

## 🐛 Posibles Problemas y Soluciones

### Problema 1: Backend devuelve 404
**Causa:** El backend aún no tiene los endpoints nuevos implementados  
**Solución:** Verificar con el equipo de backend que los endpoints estén desplegados:
```
GET /api/movimientos-guardia/usuarios-dentro
GET /api/movimientos-guardia/usuarios-fuera
```

### Problema 2: Email o sección vienen null
**Causa:** Usuarios antiguos sin email o sección asignada  
**Solución:** El componente ya maneja esto mostrando "No registrado" o el valor por defecto

### Problema 3: No se muestran usuarios en ninguna tab
**Causa:** Error en la respuesta del backend  
**Solución:** Revisar logs de consola para ver el error específico

---

## 👨‍💻 Autor
**GitHub Copilot**  
Ing. Frontend Developer - Experto en Angular, TypeScript y Arquitectura de Software

---

## 📅 Fecha de Implementación
**19 de Diciembre, 2025**

---

## 🔗 Referencias

### Endpoints Backend
- `GET /api/movimientos-guardia/usuarios-dentro`
- `GET /api/movimientos-guardia/usuarios-fuera`
- ~~`GET /api/movimientos-guardia/entradas-abiertas`~~ (DEPRECADO)

### Archivos Modificados
1. `src/app/models/guardia.models.ts` - Interface `UsuarioDentroDTO` agregada
2. `src/app/service/movimiento-guardia.service.ts` - Métodos nuevos agregados
3. `src/app/guardia/reportes-guardia/entradas-abiertas/entradas-abiertas.component.ts` - Refactorizado
4. `src/app/guardia/reportes-guardia/entradas-abiertas/entradas-abiertas.component.html` - Actualizado

### Documentación Relacionada
- `MEJORAS-ENTRADAS-ABIERTAS-2025-12-18.md`
- `UNIFICACION-VISUAL-MONITOREO-ESTADOS-2025-12-18.md`
- `api-contratos-frontend.md`

