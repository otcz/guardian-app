# ✅ IMPLEMENTACIÓN: VALIDACIÓN MANUAL UNIFICADA

**Fecha:** 2025-12-16  
**Estado:** ✅ COMPLETADO  
**Prioridad:** Alta

---

## 🎯 Requerimiento Cumplido

Se ha implementado el endpoint de validación manual unificada que acepta **documento de usuario O placa de vehículo** en un solo input.

---

## 📋 Cambios Realizados

### 1. Servicio (MovimientoGuardiaService)

**Archivo:** `src/app/service/movimiento-guardia.service.ts`

```typescript
/**
 * 🆕 Validación manual unificada (documento de usuario O placa de vehículo)
 * @param documentoOPlaca Número de documento (cédula) o placa de vehículo
 * @returns Observable con ValidacionManualDTO
 * @description Endpoint: GET /api/movimientos-guardia/validar-manual/{documentoOPlaca}
 */
validarManual(documentoOPlaca: string): Observable<any> {
  const valor = encodeURIComponent(documentoOPlaca.trim());
  return this.http.get<any>(`${this.API_URL}/validar-manual/${valor}`);
}
```

✅ **Agregado método** `validarManual()`

---

### 2. Modelos (guardia.models.ts)

**Archivo:** `src/app/models/guardia.models.ts`

**Interfaces agregadas:**

```typescript
/**
 * 🆕 Usuario asignado a un vehículo (para dropdown de selección)
 */
export interface UsuarioAsignadoDTO {
  id: string;
  nombreCompleto: string;
  identificacion: string;
  tipoIdentificacion: 'CEDULA' | 'PASAPORTE' | 'DNI' | 'RUC' | 'LICENCIA' | 'OTRO';
  activo: boolean;
  tieneEntradaAbierta: boolean;
}

/**
 * 🆕 Vehículo con lista de usuarios asignados
 */
export interface VehiculoConUsuariosDTO {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  tipo: 'AUTOMOVIL' | 'MOTOCICLETA' | 'BICICLETA' | 'CAMION' | 'OTRO';
  activo: boolean;
  usuariosAsignados: UsuarioAsignadoDTO[];
}

/**
 * 🆕 Respuesta de validación manual unificada (documento O placa)
 */
export interface ValidacionManualDTO {
  tipoBusqueda: 'USUARIO' | 'VEHICULO' | 'NO_ENCONTRADO';
  usuario?: ValidacionUsuarioDTO;
  vehiculo?: ValidacionVehiculoDTO;
  vehiculoDetalle?: VehiculoConUsuariosDTO;
}
```

✅ **Agregadas 3 nuevas interfaces**

---

### 3. Componente TypeScript

**Archivo:** `src/app/guardia/validacion-ingreso/control-ingreso-salida/control-ingreso-salida.component.ts`

#### Imports actualizados:
```typescript
import {
  Guardia,
  GuardiaUsuario,
  ValidacionUsuarioDTO,
  ValidacionManualDTO,         // ✅ NUEVO
  VehiculoConUsuariosDTO,      // ✅ NUEVO
  UsuarioAsignadoDTO,          // ✅ NUEVO
  RegistrarEntradaDTO,
  RegistrarSalidaDTO
} from '../../../models/guardia.models';
```

#### Propiedades agregadas:
```typescript
// 🆕 Validación manual unificada
resultadoValidacion: ValidacionManualDTO | null = null;
usuarioSeleccionadoId: string = '';
vehiculoSeleccionadoParaRegistro: string | null = null;
```

#### Métodos nuevos/modificados:

**1. `buscarUsuario()` - Reescrito completamente**
```typescript
buscarUsuario(): void {
  // Valida guardiaId e identificador
  // Llama a validarManual() del servicio
  // Procesa resultado según tipoBusqueda
}
```

**2. `procesarResultadoValidacion()` - NUEVO**
```typescript
procesarResultadoValidacion(validacion: ValidacionManualDTO): void {
  switch (validacion.tipoBusqueda) {
    case 'USUARIO':
      // Procesar usuario encontrado
      break;
    case 'VEHICULO':
      // Mostrar selector de usuario
      break;
    case 'NO_ENCONTRADO':
      // Mostrar error
      break;
  }
}
```

**3. `confirmarUsuarioVehiculo()` - NUEVO**
```typescript
confirmarUsuarioVehiculo(): void {
  // Valida selección de usuario
  // Construye ValidacionUsuarioDTO desde UsuarioAsignadoDTO
  // Registra con vehículo automáticamente
}
```

**4. `registrarEntradaConModal()` - Actualizado**
```typescript
registrarEntradaConModal(vehiculoId?: string): void {
  // ✅ Usa vehiculoSeleccionadoParaRegistro si existe
  const vehiculoFinal = vehiculoId || this.vehiculoSeleccionadoParaRegistro || null;
  // ... resto del código
}
```

---

### 4. Template HTML

**Archivo:** `src/app/guardia/validacion-ingreso/control-ingreso-salida/control-ingreso-salida.component.html`

#### Input de búsqueda actualizado:
```html
<label for="identificador">Documento o Placa *</label>
<input
  type="text"
  pInputText
  [(ngModel)]="identificador"
  placeholder="Ingrese documento de usuario o placa de vehículo"
/>
```

#### Nueva sección: Vehículo Encontrado
```html
<p-card *ngIf="resultadoValidacion?.tipoBusqueda === 'VEHICULO'">
  <!-- Datos del vehículo -->
  <div class="info-row">
    <label>Placa:</label>
    <strong>{{ resultadoValidacion.vehiculoDetalle.placa }}</strong>
  </div>
  
  <!-- Dropdown de usuarios -->
  <p-dropdown
    [(ngModel)]="usuarioSeleccionadoId"
    [options]="resultadoValidacion.vehiculoDetalle.usuariosAsignados"
    optionLabel="nombreCompleto"
    optionValue="id"
    placeholder="Seleccione el conductor"
  >
    <ng-template pTemplate="item" let-usuario>
      <div>
        <strong>{{ usuario.nombreCompleto }}</strong>
        <small>{{ usuario.tipoIdentificacion }}: {{ usuario.identificacion }}</small>
        <p-tag [value]="usuario.tieneEntradaAbierta ? 'ADENTRO' : 'AFUERA'"></p-tag>
      </div>
    </ng-template>
  </p-dropdown>
  
  <!-- Botones -->
  <button (click)="confirmarUsuarioVehiculo()">Confirmar</button>
  <button (click)="cancelar()">Cancelar</button>
</p-card>
```

---

## 🔄 Flujo de Operación

### Caso 1: Usuario busca por Documento

```
Usuario ingresa: "1073995282"
    ↓
Frontend llama: GET /api/movimientos-guardia/validar-manual/1073995282
    ↓
Backend responde: { tipoBusqueda: "USUARIO", usuario: {...} }
    ↓
Frontend muestra:
  - Datos del usuario
  - Lista de vehículos (opcional)
  - Botón de registrar entrada/salida
```

### Caso 2: Usuario busca por Placa

```
Usuario ingresa: "ABC-123"
    ↓
Frontend llama: GET /api/movimientos-guardia/validar-manual/ABC-123
    ↓
Backend responde: { tipoBusqueda: "VEHICULO", vehiculoDetalle: {...} }
    ↓
Frontend muestra:
  - Datos del vehículo
  - Dropdown: "¿Quién conduce?" (REQUERIDO)
  - Botón "Confirmar" (disabled hasta seleccionar)
    ↓
Usuario selecciona conductor
    ↓
Frontend ejecuta: confirmarUsuarioVehiculo()
    ↓
Construye ValidacionUsuarioDTO con vehículo incluido
    ↓
Registra entrada/salida automáticamente
```

### Caso 3: No Encontrado

```
Usuario ingresa: "XYZ-999"
    ↓
Frontend llama: GET /api/movimientos-guardia/validar-manual/XYZ-999
    ↓
Backend responde: { tipoBusqueda: "NO_ENCONTRADO" }
    ↓
Frontend muestra:
  - Modal de error
  - "No se encontró ningún usuario ni vehículo con: XYZ-999"
```

---

## ✅ Validaciones Implementadas

### Frontend

1. ✅ **Guardia seleccionada:** Verifica que haya una guardia antes de buscar
2. ✅ **Identificador no vacío:** Valida que el input no esté vacío
3. ✅ **Usuario seleccionado (placa):** Valida que se haya seleccionado un conductor antes de confirmar
4. ✅ **Vehículo sin usuarios:** Muestra error si el vehículo no tiene usuarios asignados

### Backend

El backend maneja:
- Detección automática (documento vs placa)
- Validación de existencia
- Validación de estado activo
- Detección de entrada abierta

---

## 📊 Tabla de Decisión

| Entrada | tipoBusqueda | Usuario ID | Vehículo ID | Acción Frontend |
|---------|--------------|------------|-------------|-----------------|
| 1073995282 | USUARIO | usuario.id | vehiculos[0].id (opcional) | Registrar con usuario |
| ABC-123 | VEHICULO | Seleccionar dropdown | vehiculoDetalle.id | Registrar con usuario seleccionado |
| XYZ-999 | NO_ENCONTRADO | - | - | Mostrar error |

---

## 🎨 UI Dinámica

### Elementos según tipoBusqueda:

| tipoBusqueda | Card Mostrada | Campos Requeridos |
|--------------|---------------|-------------------|
| USUARIO | Usuario Encontrado | Ninguno (vehículo opcional) |
| VEHICULO | Vehículo Encontrado | Dropdown "¿Quién conduce?" |
| NO_ENCONTRADO | Modal de Error | - |

---

## 🔍 Estructura del Dropdown de Usuarios

```html
┌────────────────────────────────────────┐
│ ¿Quién conduce este vehículo? *        │
├────────────────────────────────────────┤
│ > Juan Pérez                           │
│   CEDULA: 1073995282         [ADENTRO] │
├────────────────────────────────────────┤
│ > María García                         │
│   CEDULA: 1234567890         [AFUERA]  │
└────────────────────────────────────────┘
```

---

## 📝 Ejemplo de Integración

### Request
```typescript
// Usuario ingresa "ABC-123"
const resultado = await validarManual("ABC-123");

if (resultado.tipoBusqueda === 'VEHICULO') {
  // Mostrar dropdown
  const usuarios = resultado.vehiculoDetalle.usuariosAsignados;
  
  // Usuario selecciona
  const usuarioId = "uuid-seleccionado";
  const vehiculoId = resultado.vehiculoDetalle.id;
  
  // Registrar
  await registrarEntrada({
    guardiaId,
    usuarioId,
    vehiculoId,
    adminGuardiaId,
    observaciones
  });
}
```

---

## ✅ Checklist de Implementación

- [x] Agregar método `validarManual()` al servicio
- [x] Crear interfaces `ValidacionManualDTO`, `VehiculoConUsuariosDTO`, `UsuarioAsignadoDTO`
- [x] Crear input único para documento/placa
- [x] Implementar `switch` según `tipoBusqueda`
- [x] Mostrar datos de usuario (caso USUARIO)
- [x] Mostrar datos de vehículo + dropdown usuarios (caso VEHICULO)
- [x] Validar selección de usuario si `tipoBusqueda = VEHICULO`
- [x] Mostrar error si `NO_ENCONTRADO`
- [x] Integrar con endpoints de entrada/salida existentes
- [x] Manejar campo `tieneEntradaAbierta` en dropdown
- [x] Eliminar logs de consola

---

## 🎯 Resultado Final

### Input Unificado
```
┌─────────────────────────────────────┐
│ Documento o Placa *                 │
├─────────────────────────────────────┤
│ Ingrese documento de usuario o      │
│ placa de vehículo                   │
│                                     │
│ [_____________________________] [🔍]│
└─────────────────────────────────────┘
```

### Detección Automática
- ✅ Backend detecta si es documento o placa
- ✅ Frontend renderiza UI apropiada
- ✅ Validaciones antes de registrar
- ✅ Integración con flujo existente

---

## 📦 Archivos Modificados

1. ✅ `src/app/service/movimiento-guardia.service.ts`
   - Agregado método `validarManual()`

2. ✅ `src/app/models/guardia.models.ts`
   - Agregadas interfaces `ValidacionManualDTO`, `VehiculoConUsuariosDTO`, `UsuarioAsignadoDTO`

3. ✅ `src/app/guardia/validacion-ingreso/control-ingreso-salida/control-ingreso-salida.component.ts`
   - Actualizado `buscarUsuario()`
   - Agregado `procesarResultadoValidacion()`
   - Agregado `confirmarUsuarioVehiculo()`
   - Actualizado `registrarEntradaConModal()`
   - Agregadas propiedades para validación unificada

4. ✅ `src/app/guardia/validacion-ingreso/control-ingreso-salida/control-ingreso-salida.component.html`
   - Actualizado placeholder del input
   - Agregada sección de vehículo encontrado
   - Agregado dropdown de usuarios
   - Agregado template customizado para dropdown

---

## ✅ Testing Sugerido

### Caso 1: Buscar por Documento
1. Ingresar documento válido (ej: 1073995282)
2. Verificar que muestra datos del usuario
3. Verificar que muestra vehículos si tiene
4. Registrar entrada/salida

### Caso 2: Buscar por Placa
1. Ingresar placa válida (ej: ABC-123)
2. Verificar que muestra datos del vehículo
3. Verificar que muestra dropdown de usuarios
4. Seleccionar usuario
5. Confirmar y verificar registro

### Caso 3: Buscar Inexistente
1. Ingresar valor que no existe
2. Verificar modal de error
3. Verificar mensaje descriptivo

---

**Implementación completada exitosamente** ✅  
**Compatible con backend según especificación** ✅  
**Sin errores de compilación** ✅  
**Logs de consola eliminados** ✅

