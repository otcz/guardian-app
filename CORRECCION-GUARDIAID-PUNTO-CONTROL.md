# ✅ CORRECCIÓN: guardiaId Ahora Obtiene el ID Correcto del Punto de Control

**Fecha:** 15 de diciembre de 2025  
**Problema identificado:** El código usaba `this.usuarioId` como `guardiaId`, cuando debería obtener el ID del punto de control asignado al usuario.

---

## ❌ PROBLEMA ANTERIOR

```typescript
// ❌ INCORRECTO
cargarGuardiaUsuario(): void {
  this.guardiaId = this.usuarioId;  // ❌ Usaba el ID del usuario como ID de la guardia
}
```

### Consecuencia:
- El DTO enviaba el mismo UUID para `guardiaId` y `adminGuardiaId`
- El backend no encontraba el punto de control porque el ID no existía en la tabla `guardias`
- Error 500 (Internal Server Error)

---

## ✅ SOLUCIÓN IMPLEMENTADA

### 1. **Importaciones Agregadas**

```typescript
import { GuardiaUsuarioService } from '../../../service/guardia-usuario.service';
import { GuardiaUsuario } from '../../../models/guardia.models';
```

### 2. **Servicio Inyectado**

```typescript
constructor(
  private guardiaService: GuardiaService,
  private guardiaUsuarioService: GuardiaUsuarioService,  // ✅ NUEVO
  private movimientoService: MovimientoGuardiaService,
  private orgContextService: OrgContextService,
  private messageService: MessageService
) {}
```

### 3. **Método Corregido: `cargarGuardiaUsuario()`**

```typescript
cargarGuardiaUsuario(): void {
  if (!this.usuarioId) {
    console.error('No hay usuarioId para cargar guardias');
    return;
  }

  this.cargandoGuardias = true;
  
  // ✅ Obtener guardias asignadas al usuario desde el backend
  this.guardiaUsuarioService.listarDisponiblesPorUsuario(this.usuarioId).subscribe({
    next: (guardiasUsuario) => {
      console.log('Guardias disponibles:', guardiasUsuario);
      
      // Filtrar solo guardias activas, asignadas y no restringidas
      const guardiasActivas = guardiasUsuario.filter(gu => 
        gu.asignada && !gu.restringida && gu.guardia?.activa
      );

      if (guardiasActivas.length === 0) {
        // Sin guardias asignadas
        this.messageService.add({
          severity: 'error',
          summary: 'Sin Guardias Asignadas',
          detail: 'No tienes guardias activas asignadas. Contacta al administrador.',
          life: 5000
        });
        this.cargandoGuardias = false;
        return;
      }

      if (guardiasActivas.length === 1) {
        // ✅ Una sola guardia: selección automática
        this.guardiaId = guardiasActivas[0].guardiaId;
        const nombreGuardia = guardiasActivas[0].guardia?.nombre || 'Guardia';
        
        console.log('Guardia seleccionada:', this.guardiaId, nombreGuardia);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Bienvenido',
          detail: `${this.nombreGuardiaUsuario} - ${nombreGuardia}`,
          life: 3000
        });
      } else {
        // ✅ Múltiples guardias: mostrar selector
        this.guardias = guardiasActivas.map(gu => gu.guardia!);
        
        this.messageService.add({
          severity: 'info',
          summary: 'Múltiples Guardias',
          detail: `Tienes ${guardiasActivas.length} guardias asignadas. Por favor selecciona una.`,
          life: 5000
        });
      }

      this.cargandoGuardias = false;
    },
    error: (error) => {
      console.error('Error al cargar guardias:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar guardias asignadas',
        life: 5000
      });
      this.cargandoGuardias = false;
    }
  });
}
```

---

## 🎯 FLUJO CORRECTO AHORA

### **Caso 1: Usuario con UNA guardia asignada**

1. Se carga el componente
2. Se llama a `listarDisponiblesPorUsuario(usuarioId)`
3. Backend retorna las guardias asignadas
4. Se selecciona automáticamente la única guardia disponible
5. `this.guardiaId` = UUID del punto de control
6. Mensaje: "Bienvenido - [Nombre de la Guardia]"
7. Usuario puede empezar a buscar usuarios inmediatamente

### **Caso 2: Usuario con MÚLTIPLES guardias asignadas**

1. Se carga el componente
2. Se llama a `listarDisponiblesPorUsuario(usuarioId)`
3. Backend retorna las guardias asignadas
4. Se muestran en un dropdown para selección
5. Usuario selecciona una guardia
6. `this.guardiaId` = UUID de la guardia seleccionada
7. Usuario puede empezar a buscar usuarios

### **Caso 3: Usuario SIN guardias asignadas**

1. Se carga el componente
2. Se llama a `listarDisponiblesPorUsuario(usuarioId)`
3. Backend retorna array vacío
4. Mensaje de error: "No tienes guardias activas asignadas"
5. No se puede usar el sistema hasta que se asigne una guardia

---

## 📋 PARÁMETROS CORRECTOS AHORA

### Antes (INCORRECTO):
```json
{
  "guardiaId": "b20ca23c-4649-494d-8d64-ee03faa11727",      // ❌ ID del usuario
  "usuarioId": "3b8536c4-c5b6-4298-879e-338e925bbfdc",     // ✅ ID del usuario que entra
  "vehiculoId": null,
  "adminGuardiaId": "b20ca23c-4649-494d-8d64-ee03faa11727", // ❌ Mismo que guardiaId
  "observaciones": null
}
```

### Ahora (CORRECTO):
```json
{
  "guardiaId": "a1b2c3d4-5678-90ab-cdef-1234567890ab",      // ✅ ID del punto de control
  "usuarioId": "3b8536c4-c5b6-4298-879e-338e925bbfdc",     // ✅ ID del usuario que entra
  "vehiculoId": null,
  "adminGuardiaId": "b20ca23c-4649-494d-8d64-ee03faa11727", // ✅ ID del usuario logueado
  "observaciones": null
}
```

**Los 3 IDs son DIFERENTES:**
- `guardiaId` → ID del punto de control (tabla `guardias`)
- `usuarioId` → ID del usuario que entra/sale (tabla `usuarios`)
- `adminGuardiaId` → ID del usuario que registra el movimiento (tabla `usuarios`)

---

## 🎨 UI MEJORADA

### Selector de Guardias (cuando hay múltiples)

Se agregó un dropdown con:
- Nombre de la guardia
- Código de la guardia
- Ubicación (si existe)
- Búsqueda por nombre o código
- Estilo visual mejorado

**Template:**
```html
<p-card *ngIf="guardias.length > 0 && !guardiaId" styleClass="selector-guardia-card">
  <div class="selector-guardia">
    <label for="guardiaSelect" class="selector-label">
      <i class="pi pi-map-marker"></i> Selecciona el Punto de Control:
    </label>
    <p-dropdown
      id="guardiaSelect"
      [(ngModel)]="guardiaId"
      [options]="guardias"
      optionLabel="nombre"
      optionValue="id"
      placeholder="-- Seleccionar Guardia --"
      [filter]="true"
      filterBy="nombre,codigo"
      styleClass="w-full"
    >
      <ng-template let-guardia pTemplate="item">
        <div class="guardia-option">
          <strong>{{ guardia.nombre }}</strong>
          <small class="text-muted"> - {{ guardia.codigo }}</small>
          <p-tag *ngIf="guardia.ubicacion" severity="info" [value]="guardia.ubicacion"></p-tag>
        </div>
      </ng-template>
    </p-dropdown>
  </div>
</p-card>
```

---

## 🔍 LOGS PARA VERIFICAR

En la consola del navegador verás:

```
Guardias disponibles para el usuario: [
  {
    id: "...",
    guardiaId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
    usuarioId: "b20ca23c-4649-494d-8d64-ee03faa11727",
    asignada: true,
    restringida: false,
    guardia: {
      id: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
      nombre: "Entrada Principal",
      codigo: "GUARD-001",
      activa: true,
      ...
    }
  }
]

Guardia seleccionada automáticamente: a1b2c3d4-5678-90ab-cdef-1234567890ab Entrada Principal

🚀 Registrando entrada: {
  guardiaId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",      // ✅ ID del punto de control
  usuarioId: "3b8536c4-c5b6-4298-879e-338e925bbfdc",     // ✅ ID del usuario
  vehiculoId: null,
  adminGuardiaId: "b20ca23c-4649-494d-8d64-ee03faa11727", // ✅ ID del guardia
  observaciones: null
}
```

---

## ✅ VERIFICACIÓN COMPLETA

### 1. **Backend debe tener datos correctos**

```sql
-- Verificar que el usuario tiene guardias asignadas
SELECT * FROM guardia_usuarios 
WHERE usuario_id = 'b20ca23c-4649-494d-8d64-ee03faa11727'
  AND asignada = true
  AND restringida = false;

-- Verificar que las guardias existen y están activas
SELECT * FROM guardias 
WHERE id IN (
  SELECT guardia_id FROM guardia_usuarios 
  WHERE usuario_id = 'b20ca23c-4649-494d-8d64-ee03faa11727'
    AND asignada = true
)
AND activa = true;
```

### 2. **Probar en el frontend**

1. Recargar la aplicación
2. Iniciar sesión con un usuario que tenga guardias asignadas
3. Ir a "Control de Ingreso y Salida"
4. Verificar que se muestre el nombre de la guardia seleccionada
5. Buscar un usuario
6. Verificar en DevTools → Network que el `guardiaId` sea correcto
7. Intentar registrar entrada

---

## 📝 ARCHIVOS MODIFICADOS

1. **`control-ingreso-salida.component.ts`**
   - Importado `GuardiaUsuarioService`
   - Corregido método `cargarGuardiaUsuario()`
   - Agregada lógica para múltiples guardias

2. **`control-ingreso-salida.component.html`**
   - Agregado selector de guardias (dropdown)

3. **`control-ingreso-salida.component.scss`**
   - Agregados estilos para el selector de guardias

---

## 🎯 ESTADO FINAL

✅ `guardiaId` ahora contiene el UUID correcto del punto de control  
✅ `adminGuardiaId` contiene el UUID del usuario logueado  
✅ `usuarioId` contiene el UUID del usuario que entra/sale  
✅ Los 3 IDs son diferentes y corresponden a entidades diferentes  
✅ El usuario puede tener múltiples guardias asignadas  
✅ Selección automática si solo tiene una guardia  
✅ Selector visual si tiene múltiples guardias  

---

## 📞 PRÓXIMOS PASOS

1. **Recargar la aplicación**
2. **Probar el flujo completo**
3. **Verificar los logs** en la consola
4. **Verificar que el error 500 se resolvió**

Si el error persiste, revisar los logs del backend para identificar otros problemas (ej: validaciones de negocio, permisos, etc.)

