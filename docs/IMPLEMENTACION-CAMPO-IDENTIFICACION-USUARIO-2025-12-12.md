# Implementación Campo de Identificación de Usuario

**Fecha:** 12 de diciembre de 2025  
**Requerimiento:** REQ-001-FRONTEND-Campo-Identificacion-Usuario  
**Estado:** ✅ COMPLETADO

## Resumen

Se implementaron los campos de **tipo de identificación** y **número de identificación** en el flujo completo de gestión de usuarios (crear, listar y editar) del frontend de Guardian App, alineando los formularios con los cambios realizados en el backend.

## Cambios Realizados

### 1. Servicio de Usuarios (`users.service.ts`)

#### Enum TipoIdentificacion
Se agregó el enum con los tipos de documento soportados:

```typescript
export enum TipoIdentificacion {
  CEDULA = 'CEDULA',       // Cédula de ciudadanía/identidad
  PASAPORTE = 'PASAPORTE', // Pasaporte internacional
  DNI = 'DNI',             // Documento Nacional de Identidad
  RUC = 'RUC',             // Registro Único de Contribuyentes
  LICENCIA = 'LICENCIA',   // Licencia de conducir
  OTRO = 'OTRO'            // Otro tipo de documento
}
```

#### Interfaces Actualizadas

**UserEntity:**
```typescript
export interface UserEntity {
  // ...campos existentes...
  tipoIdentificacion?: TipoIdentificacion | null;
  identificacion?: string | null;
}
```

**CreateUserRequest:**
```typescript
export interface CreateUserRequest {
  // ...campos existentes...
  tipoIdentificacion?: TipoIdentificacion | null;
  identificacion?: string | null;
}
```

**UpdateUserRequest:**
```typescript
export interface UpdateUserRequest {
  // ...campos existentes...
  tipoIdentificacion?: TipoIdentificacion | null;
  identificacion?: string | null;
}
```

#### Métodos Actualizados

- **`ensureUser()`**: Mapea los campos de identificación desde el backend
- **`create()`**: Incluye los campos de identificación en el payload
- **`update()`**: Incluye los campos de identificación en el payload (heredado)

### 2. Componente Crear Usuario

#### TypeScript (`usuarios-crear.component.ts`)

**Importaciones:**
```typescript
import { UsersService, CreateUserRequest, ScopeNivel, UsuariosMeta, TipoIdentificacion } from '../../service/users.service';
```

**Opciones de Tipo de Identificación:**
```typescript
tiposIdentificacion = [
  { label: 'Cédula', value: TipoIdentificacion.CEDULA },
  { label: 'Pasaporte', value: TipoIdentificacion.PASAPORTE },
  { label: 'DNI', value: TipoIdentificacion.DNI },
  { label: 'RUC', value: TipoIdentificacion.RUC },
  { label: 'Licencia', value: TipoIdentificacion.LICENCIA },
  { label: 'Otro', value: TipoIdentificacion.OTRO }
];
```

**Modelo Actualizado:**
```typescript
model: CreateUserRequest = {
  // ...campos existentes...
  tipoIdentificacion: null,
  identificacion: null
} as any;
```

#### HTML (`usuarios-crear.component.html`)

Se agregaron dos nuevos campos en la sección "Información Básica", después del email:

1. **Tipo de Identificación** (dropdown con opciones)
2. **Número de Identificación** (input de texto, máx. 50 caracteres)

Ambos campos son opcionales y tienen mensajes informativos.

### 3. Componente Listar Usuarios

#### HTML (`usuarios-listar.component.html`)

Se reemplazó la columna de "Teléfono" por "Identificación" para mejor aprovechamiento del espacio:

**Header:**
```html
<th style="width: 180px">
  <div class="th-content">
    <i class="pi pi-id-card"></i>
    <span>Identificación</span>
  </div>
</th>
```

**Celda:**
```html
<td>
  <div class="id-cell">
    <ng-container *ngIf="u.tipoIdentificacion && u.identificacion; else noId">
      <p-chip [icon]="'pi pi-id-card'" styleClass="id-chip">
        <span class="id-type">{{ u.tipoIdentificacion }}</span>
        <span class="id-separator">:</span>
        <span class="id-number">{{ u.identificacion }}</span>
      </p-chip>
    </ng-container>
    <ng-template #noId>
      <span class="text-muted">—</span>
    </ng-template>
  </div>
</td>
```

#### CSS (`usuarios-listar.component.scss`)

Se agregaron estilos específicos para la celda de identificación con chip estilizado:

```scss
.id-cell {
  .text-muted {
    color: var(--muted);
    font-size: 0.9rem;
  }

  ::ng-deep .id-chip {
    background: rgba(79, 140, 255, 0.08);
    border: 1px solid rgba(79, 140, 255, 0.2);
    padding: 0.35rem 0.75rem;
    font-size: 0.85rem;
    // ...estilos para tipo, separador y número...
  }
}
```

### 4. Componente Gestionar/Editar Usuario

#### TypeScript (`usuario-gestionar.component.ts`)

**Importaciones:**
```typescript
import { UsersService, UserEntity, UpdateUserRequest, TipoIdentificacion } from '../../service/users.service';
import { DropdownModule } from 'primeng/dropdown';
```

**Opciones y Helpers:**
```typescript
tiposIdentificacion = [
  { label: 'Cédula', value: TipoIdentificacion.CEDULA },
  // ...otros tipos...
];

getTipoIdentificacionLabel(tipo: TipoIdentificacion | null | undefined): string {
  if (!tipo) return 'Sin definir';
  const found = this.tiposIdentificacion.find(t => t.value === tipo);
  return found ? found.label : tipo;
}
```

**Método `toggleEdit()` actualizado:**
```typescript
toggleEdit() {
  if (!this.user) return;
  this.editing = true;
  this.draft = { 
    // ...campos existentes...
    tipoIdentificacion: this.user.tipoIdentificacion || null,
    identificacion: this.user.identificacion || ''
  } as UpdateUserRequest;
}
```

**Método `save()` actualizado:**
```typescript
save() {
  // ...
  const body: UpdateUserRequest = {
    // ...campos existentes...
    tipoIdentificacion: this.draft.tipoIdentificacion || undefined,
    identificacion: this.draft.identificacion ? String(this.draft.identificacion).trim() : undefined
  };
  // ...
}
```

#### HTML (`usuario-gestionar.component.html`)

**Formulario de edición:**
Se agregaron dos campos después del teléfono:
1. **Tipo de Identificación** (dropdown)
2. **Número de Identificación** (input con botón copiar)

**Vista de solo lectura:**
Se agregaron dos líneas después del teléfono:
```html
<div class="kv" *ngIf="isPresent(user.tipoIdentificacion)">
  <span>Tipo de Identificación</span>
  <b>{{ getTipoIdentificacionLabel(user.tipoIdentificacion) }}</b>
</div>
<div class="kv" *ngIf="isPresent(user.identificacion)">
  <span>Número de Identificación</span>
  <div class="value-row">
    <b>{{ user.identificacion }}</b>
    <button pButton icon="pi pi-copy" (click)="copy(user.identificacion)"></button>
  </div>
</div>
```

## Validaciones

### Frontend
- El número de identificación tiene un máximo de 50 caracteres
- Ambos campos son opcionales (pueden ser null)
- El tipo de identificación solo acepta valores del enum
- Se muestra un mensaje informativo indicando que debe ser único en el sistema

### Backend (según REQ-001)
- El número de identificación debe ser único en el sistema
- Se valida en la capa de servicio al crear/actualizar
- Se devuelve error 409 (Conflict) si ya existe

## Flujos Implementados

### ✅ Crear Usuario
1. Usuario selecciona tipo de identificación (opcional)
2. Usuario ingresa número de identificación (opcional)
3. Al enviar, los campos se incluyen en el payload POST
4. Backend valida unicidad y crea el usuario

### ✅ Listar Usuarios
1. La tabla muestra una columna "Identificación"
2. Si el usuario tiene identificación, se muestra en un chip estilizado con formato: `TIPO: NÚMERO`
3. Si no tiene identificación, se muestra "—"

### ✅ Editar Usuario
1. En modo lectura, se muestran los campos con opción de copiar
2. En modo edición, se pueden modificar ambos campos
3. Al guardar, los campos se incluyen en el payload PATCH
4. Backend valida unicidad y actualiza el usuario

## Testing

### Casos de Prueba Recomendados

1. **Crear usuario sin identificación** → ✅ Debe permitir y dejar campos null
2. **Crear usuario con identificación completa** → ✅ Debe almacenar correctamente
3. **Crear usuario con identificación duplicada** → ⚠️ Debe rechazar (409)
4. **Editar identificación existente** → ✅ Debe actualizar
5. **Editar y duplicar identificación** → ⚠️ Debe rechazar (409)
6. **Listar usuarios con y sin identificación** → ✅ Debe mostrar correctamente
7. **Limpiar identificación existente** → ✅ Debe permitir dejar en null

## Archivos Modificados

```
src/app/service/users.service.ts
src/app/admin/usuarios-crear-component/
  ├── usuarios-crear.component.ts
  └── usuarios-crear.component.html
src/app/admin/usuarios-listar-component/
  ├── usuarios-listar.component.html
  └── usuarios-listar.component.scss
src/app/admin/usuario-gestionar-component/
  ├── usuario-gestionar.component.ts
  └── usuario-gestionar.component.html
```

## Notas Técnicas

1. **Compatibilidad**: Los cambios son retrocompatibles con usuarios existentes que no tienen identificación
2. **Validación de unicidad**: Se realiza en el backend, no en el frontend
3. **Formato**: El número de identificación se almacena como string sin formato específico
4. **Visualización**: Se usa un chip estilizado con tipografía monoespaciada para el número
5. **UX**: Ambos campos tienen hints informativos y el número incluye botón de copiar

## Próximos Pasos

1. ✅ Implementación frontend completada
2. 🔄 Testing end-to-end con backend actualizado
3. 📋 Validar manejo de errores 409 (duplicado)
4. 📊 Considerar agregar búsqueda por identificación en el filtro de usuarios

## Referencias

- **Requerimiento**: `REQ-001-FRONTEND-Campo-Identificacion-Usuario.md`
- **Backend**: Entity Usuario actualizada con campos `tipo` y `numero` (base de datos)
- **API**: Endpoints `/api/orgs/{orgId}/usuarios` (POST/PATCH) actualizados

---

**Implementado por:** GitHub Copilot  
**Fecha de implementación:** 12 de diciembre de 2025  
**Versión:** 1.0

