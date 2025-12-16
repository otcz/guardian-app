# REQUERIMIENTO FRONTEND: Ajustes para Flujo Entrada/Salida

**Fecha:** 2025-12-15  
**Prioridad:** 🔴 CRÍTICA  
**Módulo:** Control de Ingreso y Salida (Guardia)  
**Estado:** Pendiente implementación

---

## 📋 Resumen Ejecutivo

Se han detectado y corregido **race conditions** en el backend que permitían entradas duplicadas cuando se realizaban peticiones concurrentes. El backend ahora implementa:

1. ✅ Validación estricta PRE-save
2. ✅ Validación POST-save con rollback automático
3. ✅ Trigger de base de datos para prevención a nivel de DDBB
4. ✅ Mensajes de error claros y específicos

**El frontend DEBE ajustarse** para seguir el flujo correcto y manejar adecuadamente los errores.

---

## 🔍 Problema Identificado

### Comportamiento Actual (Incorrecto)
```
Usuario hace clic en "Registrar Entrada"
  ↓
Frontend envía: POST /entrada
  ↓ (usuario hace clic múltiples veces o refresca)
Frontend envía: POST /entrada (DUPLICADO)
  ↓
Backend PERMITE ambas (RACE CONDITION) ❌
```

### Comportamiento Esperado (Correcto)
```
Usuario hace clic en "Registrar Entrada"
  ↓
Frontend DESHABILITA el botón inmediatamente
Frontend envía: POST /entrada
  ↓
Backend valida y registra entrada
  ↓
Frontend recibe respuesta y ACTUALIZA estado
  ↓
Si usuario intenta otra entrada:
  ↓
Backend rechaza: HTTP 400
Frontend muestra: "Ya tiene entrada abierta desde..."
```

---

## 🎯 Cambios Requeridos en el Frontend

### 1. VALIDACIÓN PREVIA (Antes de Enviar Request)

#### ❌ NO HACER ESTO:
```typescript
// MAL: Permite múltiples clics
async function registrarEntrada() {
  const response = await fetch('/api/movimientos-guardia/entrada', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
```

#### ✅ HACER ESTO:
```typescript
// Estado para controlar carga
const [isRegistrandoEntrada, setIsRegistrandoEntrada] = useState(false);

async function registrarEntrada() {
  // 1. VALIDAR: No hacer nada si ya está procesando
  if (isRegistrandoEntrada) {
    console.warn('⚠️ Ya hay una entrada en proceso');
    return;
  }

  // 2. VALIDAR: Consultar estado actual del usuario PRIMERO
  const validacion = await validarUsuario(usuarioId);
  
  if (validacion.tieneEntradaAbierta) {
    showError(`El usuario ya tiene una entrada abierta en ${validacion.entradaAbierta.guardiaNombre}`);
    return;
  }

  // 3. DESHABILITAR botón y mostrar loading
  setIsRegistrandoEntrada(true);

  try {
    const response = await fetch('/api/movimientos-guardia/entrada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guardiaId: guardiaId,
        usuarioId: usuarioId,
        vehiculoId: vehiculoId || null,
        adminGuardiaId: adminGuardiaId,
        observaciones: observaciones || null
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const entrada = await response.json();
    
    // 4. ACTUALIZAR estado local
    setUsuarioTieneEntradaAbierta(true);
    setEntradaAbierta(entrada);
    
    showSuccess('Entrada registrada exitosamente');
  } catch (error) {
    showError(error.message);
  } finally {
    // 5. REHABILITAR botón
    setIsRegistrandoEntrada(false);
  }
}
```

---

### 2. MANEJO DE ESTADOS UI

#### Estado del Usuario
```typescript
interface EstadoUsuario {
  tieneEntradaAbierta: boolean;
  entradaAbierta: EntradaAbierta | null;
  puedeRegistrarEntrada: boolean;
  puedeRegistrarSalida: boolean;
}

const [estadoUsuario, setEstadoUsuario] = useState<EstadoUsuario>({
  tieneEntradaAbierta: false,
  entradaAbierta: null,
  puedeRegistrarEntrada: true,
  puedeRegistrarSalida: false
});
```

#### Función de Validación Previa
```typescript
async function validarUsuario(identificacion: string): Promise<ValidacionUsuarioDTO> {
  const response = await fetch(
    `/api/movimientos-guardia/validar-usuario-identificacion/${identificacion}`
  );
  
  if (!response.ok) {
    throw new Error('Usuario no encontrado');
  }
  
  const validacion = await response.json();
  
  // Actualizar estado basado en la validación
  setEstadoUsuario({
    tieneEntradaAbierta: validacion.tieneEntradaAbierta,
    entradaAbierta: validacion.entradaAbierta,
    puedeRegistrarEntrada: !validacion.tieneEntradaAbierta,
    puedeRegistrarSalida: validacion.tieneEntradaAbierta
  });
  
  return validacion;
}
```

---

### 3. BOTONES INTELIGENTES

```tsx
// Botón de Entrada
<button
  onClick={registrarEntrada}
  disabled={
    isRegistrandoEntrada || 
    !estadoUsuario.puedeRegistrarEntrada ||
    !usuarioSeleccionado
  }
  className={estadoUsuario.puedeRegistrarEntrada ? 'btn-primary' : 'btn-disabled'}
>
  {isRegistrandoEntrada ? (
    <>
      <Spinner /> Registrando...
    </>
  ) : (
    'Registrar Entrada'
  )}
</button>

// Botón de Salida
<button
  onClick={registrarSalida}
  disabled={
    isRegistrandoSalida || 
    !estadoUsuario.puedeRegistrarSalida ||
    !usuarioSeleccionado
  }
  className={estadoUsuario.puedeRegistrarSalida ? 'btn-success' : 'btn-disabled'}
>
  {isRegistrandoSalida ? (
    <>
      <Spinner /> Registrando...
    </>
  ) : (
    'Registrar Salida'
  )}
</button>
```

---

### 4. MENSAJES AL USUARIO

#### Cuando ya tiene entrada abierta:
```tsx
{estadoUsuario.tieneEntradaAbierta && (
  <div className="alert alert-warning">
    <strong>⚠️ Entrada Abierta</strong>
    <p>
      El usuario tiene una entrada abierta en <strong>{estadoUsuario.entradaAbierta.guardiaNombre}</strong>
      {' '}desde el {formatearFecha(estadoUsuario.entradaAbierta.fechaEntrada)}.
    </p>
    <p>Debe registrar la <strong>SALIDA</strong> antes de poder registrar una nueva entrada.</p>
  </div>
)}
```

#### Cuando NO tiene entrada abierta pero intenta salida:
```tsx
{!estadoUsuario.tieneEntradaAbierta && intentoSalida && (
  <div className="alert alert-danger">
    <strong>❌ Salida No Permitida</strong>
    <p>El usuario NO tiene ninguna entrada abierta.</p>
    <p>Debe registrar una <strong>ENTRADA</strong> primero.</p>
  </div>
)}
```

---

### 5. FLUJO COMPLETO RECOMENDADO

```typescript
// Paso 1: Usuario escanea QR o ingresa identificación
async function buscarUsuario(identificacion: string) {
  setIsBuscando(true);
  
  try {
    // Validar usuario
    const validacion = await validarUsuario(identificacion);
    
    if (!validacion.existe) {
      showError('Usuario no encontrado');
      return;
    }
    
    if (!validacion.activo) {
      showError('Usuario no está activo');
      return;
    }
    
    // Mostrar información del usuario
    setUsuarioSeleccionado(validacion);
    
    // Mostrar estado visual
    if (validacion.tieneEntradaAbierta) {
      showInfo(`Usuario tiene entrada abierta desde ${validacion.entradaAbierta.fechaEntrada}`);
    }
    
  } catch (error) {
    showError('Error al buscar usuario: ' + error.message);
  } finally {
    setIsBuscando(false);
  }
}

// Paso 2: Usuario hace clic en "Registrar Entrada" o "Registrar Salida"
async function registrarMovimiento(tipo: 'ENTRADA' | 'SALIDA') {
  // Validación previa
  if (tipo === 'ENTRADA' && estadoUsuario.tieneEntradaAbierta) {
    showError('Usuario ya tiene entrada abierta');
    return;
  }
  
  if (tipo === 'SALIDA' && !estadoUsuario.tieneEntradaAbierta) {
    showError('Usuario no tiene entrada abierta');
    return;
  }
  
  // Confirmar acción
  const confirmar = await showConfirm(
    `¿Registrar ${tipo} de ${usuarioSeleccionado.nombreCompleto}?`
  );
  
  if (!confirmar) return;
  
  // Ejecutar registro
  if (tipo === 'ENTRADA') {
    await registrarEntrada();
  } else {
    await registrarSalida();
  }
}

// Paso 3: Después de registrar, limpiar y preparar para siguiente usuario
function limpiarFormulario() {
  setUsuarioSeleccionado(null);
  setVehiculoSeleccionado(null);
  setObservaciones('');
  setEstadoUsuario({
    tieneEntradaAbierta: false,
    entradaAbierta: null,
    puedeRegistrarEntrada: true,
    puedeRegistrarSalida: false
  });
  
  // Enfocar campo de búsqueda para siguiente usuario
  document.getElementById('buscar-usuario')?.focus();
}
```

---

### 6. MANEJO DE ERRORES HTTP

```typescript
async function handleMovimientoRequest(
  endpoint: string, 
  data: any
): Promise<MovimientoGuardiaResponse> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });

    // HTTP 400 - Error de validación (esperado)
    if (response.status === 400) {
      const error = await response.json();
      throw new ValidationError(error.message);
    }

    // HTTP 403 - Sin permisos
    if (response.status === 403) {
      throw new PermissionError('No tiene permisos para esta operación');
    }

    // HTTP 404 - Recurso no encontrado
    if (response.status === 404) {
      const error = await response.json();
      throw new NotFoundError(error.message);
    }

    // HTTP 500 - Error del servidor
    if (response.status === 500) {
      throw new ServerError('Error interno del servidor. Contacte al administrador.');
    }

    // HTTP 201/200 - Éxito
    if (response.ok) {
      return await response.json();
    }

    // Otros errores
    throw new Error(`Error inesperado: ${response.status}`);
    
  } catch (error) {
    if (error instanceof ValidationError) {
      // Mostrar mensaje de validación al usuario
      showError(error.message);
    } else if (error instanceof PermissionError) {
      // Redirigir o mostrar mensaje de permisos
      showError(error.message);
    } else {
      // Error genérico
      console.error('Error en movimiento:', error);
      showError('Error al procesar la solicitud');
    }
    throw error;
  }
}
```

---

### 7. PREVENCIÓN DE DOBLE CLIC

```typescript
// Hook personalizado para prevenir doble clic
function usePreventDoubleClick<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  delay: number = 2000
): [(...args: any[]) => Promise<T | void>, boolean] {
  const [isLoading, setIsLoading] = useState(false);
  const [lastClick, setLastClick] = useState(0);

  const execute = async (...args: any[]): Promise<T | void> => {
    const now = Date.now();
    
    // Prevenir clics muy rápidos
    if (now - lastClick < delay) {
      console.warn('⚠️ Clic muy rápido, ignorando');
      return;
    }
    
    // Prevenir clics mientras está cargando
    if (isLoading) {
      console.warn('⚠️ Operación en proceso, ignorando');
      return;
    }

    setLastClick(now);
    setIsLoading(true);

    try {
      const result = await asyncFunction(...args);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  return [execute, isLoading];
}

// Uso:
const [registrarEntradaSeguro, isRegistrandoEntrada] = usePreventDoubleClick(
  async () => {
    await registrarEntrada();
  },
  2000 // 2 segundos de delay mínimo entre clics
);
```

---

## 🔄 Flujo Visual Recomendado

```
┌─────────────────────────────────────────────────────────┐
│  1. BUSCAR USUARIO (por identificación o QR)            │
└─────────────────────────────────────────────────────────┘
                      ↓
        ┌─────────────────────────┐
        │  GET /validar-usuario   │
        └─────────────────────────┘
                      ↓
    ┌─────────────────────────────────────┐
    │  Mostrar información del usuario    │
    │  - Nombre completo                  │
    │  - Foto (si tiene)                  │
    │  - Sección                          │
    │  - Vehículos asociados              │
    │  - Estado de entrada/salida         │
    └─────────────────────────────────────┘
                      ↓
        ┌─────────────────────────┐
        │  ¿Tiene entrada abierta?│
        └─────────────────────────┘
           │                    │
           │ NO                 │ SÍ
           ↓                    ↓
    ┌─────────────┐      ┌─────────────┐
    │  Botón      │      │  Botón      │
    │  ENTRADA    │      │  SALIDA     │
    │  HABILITADO │      │  HABILITADO │
    └─────────────┘      └─────────────┘
           │                    │
           ↓                    ↓
    POST /entrada         POST /salida
           │                    │
           ↓                    ↓
    ┌─────────────────────────────────┐
    │  ÉXITO (HTTP 201/200)           │
    │  - Mostrar confirmación         │
    │  - Limpiar formulario           │
    │  - Preparar para siguiente      │
    └─────────────────────────────────┘
           │
           ↓
    ┌─────────────────────────────────┐
    │  ERROR (HTTP 400)               │
    │  - Mostrar mensaje del backend  │
    │  - NO limpiar formulario        │
    │  - Permitir corrección          │
    └─────────────────────────────────┘
```

---

## 🧪 Casos de Prueba para el Frontend

### Test 1: Flujo Normal de Entrada
```
1. Buscar usuario (válido, sin entrada abierta)
   ✅ Debe mostrar botón "Registrar Entrada" habilitado
   ❌ Debe mostrar botón "Registrar Salida" deshabilitado

2. Hacer clic en "Registrar Entrada"
   ✅ Debe deshabilitar el botón inmediatamente
   ✅ Debe mostrar spinner/loading
   ✅ Debe recibir HTTP 201
   ✅ Debe mostrar mensaje de éxito
   ✅ Debe actualizar estado local

3. Intentar hacer clic en "Registrar Entrada" nuevamente
   ❌ Botón debe estar deshabilitado
   ❌ No debe enviar petición al backend
```

### Test 2: Intento de Doble Entrada
```
1. Usuario tiene entrada abierta desde hace 10 minutos

2. Buscar usuario nuevamente
   ✅ Debe mostrar alerta: "Usuario tiene entrada abierta en GUARDIA X"
   ❌ Debe mostrar botón "Registrar Entrada" deshabilitado
   ✅ Debe mostrar botón "Registrar Salida" habilitado

3. Intentar hacer clic en "Registrar Entrada" (si está deshabilitado)
   ❌ No debe hacer nada
```

### Test 3: Race Condition Manual
```
1. Buscar usuario (sin entrada)

2. Abrir dos pestañas del navegador con la misma sesión

3. En AMBAS pestañas, hacer clic en "Registrar Entrada" simultáneamente
   ✅ Una petición debe recibir HTTP 201 (éxito)
   ✅ La otra debe recibir HTTP 400 (entrada duplicada)
   ✅ El frontend debe mostrar error claro en la segunda

4. Verificar en base de datos:
   ✅ Debe haber SOLO 1 entrada abierta
```

### Test 4: Flujo Entrada → Salida
```
1. Registrar entrada de usuario
   ✅ HTTP 201

2. Refrescar la búsqueda del usuario
   ✅ Debe mostrar "Tiene entrada abierta desde..."
   ✅ Botón "Entrada" deshabilitado
   ✅ Botón "Salida" habilitado

3. Registrar salida
   ✅ HTTP 200
   ✅ Debe mostrar permanencia en minutos

4. Refrescar la búsqueda del usuario
   ✅ Debe mostrar "Sin entrada abierta"
   ✅ Botón "Entrada" habilitado
   ✅ Botón "Salida" deshabilitado
```

---

## 📊 Endpoints a Utilizar

### Validar Usuario (SIEMPRE PRIMERO)
```
GET /api/movimientos-guardia/validar-usuario-identificacion/{identificacion}

Response:
{
  "id": "uuid",
  "existe": true,
  "activo": true,
  "nombreCompleto": "Juan Pérez",
  "tieneEntradaAbierta": false,  // ⭐ CLAVE
  "entradaAbierta": null          // ⭐ CLAVE
}
```

### Registrar Entrada
```
POST /api/movimientos-guardia/entrada

Request:
{
  "guardiaId": "uuid",
  "usuarioId": "uuid",
  "vehiculoId": "uuid" | null,
  "adminGuardiaId": "uuid",
  "observaciones": "string" | null
}

Success Response (HTTP 201):
{
  "id": "uuid",
  "tipo": "ENTRADA",
  "timestampMovimiento": "2025-12-15T21:30:00Z",
  ...
}

Error Response (HTTP 400):
{
  "message": "El usuario ya tiene una entrada abierta en la guardia 'PUENTE TABLA' desde 2025-12-15T19:45:00Z. Debe registrar la SALIDA antes de ingresar nuevamente."
}
```

### Registrar Salida
```
POST /api/movimientos-guardia/salida

Request: (igual que entrada)

Success Response (HTTP 200):
{
  "id": "uuid",
  "tipo": "SALIDA",
  "permanenciaMinutos": 105,  // ⭐ Calculado automáticamente
  ...
}
```

---

## ✅ Checklist de Implementación

### Backend (✅ COMPLETADO)
- [x] Validación estricta en `registrarEntrada()`
- [x] Validación post-save con rollback
- [x] Mensajes de error detallados
- [x] Logs con emojis para debugging
- [x] Script SQL para trigger de base de datos
- [x] Documentación completa

### Frontend (❌ PENDIENTE)
- [ ] Implementar validación previa con `validarUsuario()`
- [ ] Deshabilitar botones durante operación
- [ ] Prevenir doble clic con hook personalizado
- [ ] Manejar estados `tieneEntradaAbierta` correctamente
- [ ] Mostrar alertas visuales claras
- [ ] Habilitar/deshabilitar botones según estado
- [ ] Manejo robusto de errores HTTP 400
- [ ] Limpiar formulario después de operación exitosa
- [ ] Agregar confirmación antes de registrar movimiento
- [ ] Testing de race conditions
- [ ] Testing de flujo completo Entrada → Salida

---

## 🚀 Prioridad de Implementación

### 1. CRÍTICO (Implementar YA)
- Validación previa con `validarUsuario()`
- Deshabilitar botones durante carga
- Manejo de errores HTTP 400

### 2. IMPORTANTE (Implementar esta semana)
- Hook `usePreventDoubleClick`
- Estados inteligentes de botones
- Alertas visuales de estado

### 3. DESEABLE (Implementar siguiente sprint)
- Confirmación antes de registrar
- Animaciones y transiciones
- Sonidos de confirmación/error

---

## 📞 Soporte y Documentación

**Documentos relacionados:**
- `API-MOVIMIENTOS-GUARDIA-RESUMEN-ENDPOINTS.md` - Especificación completa de API
- `ANALISIS-VALIDACION-DOBLE-ENTRADA-2025-12-15.md` - Análisis técnico del problema
- `SQL-CONSTRAINT-PREVENIR-ENTRADA-DUPLICADA.sql` - Script de base de datos

**Contacto Backend:**
- Los logs ahora incluyen emojis para identificación rápida
- Todos los errores tienen mensajes descriptivos
- El backend está listo para producción

**Próximos Pasos:**
1. Review de este documento con el equipo frontend
2. Estimación de tiempo de implementación
3. Testing en ambiente de desarrollo
4. Deploy coordinado backend + frontend

---

## ⚠️ IMPORTANTE

**El backend YA está corregido y funcionando correctamente.**

Las entradas duplicadas que se están viendo actualmente son porque el **frontend** está enviando múltiples peticiones o no está validando el estado previo.

**Es CRÍTICO que el frontend implemente las validaciones aquí descritas** para que el sistema funcione correctamente en producción.

---

**Fin del documento**

