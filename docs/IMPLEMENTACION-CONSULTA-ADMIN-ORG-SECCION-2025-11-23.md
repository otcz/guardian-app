# 📋 Implementación: Consulta de Administrador de Organización y Sección

**Fecha:** 2025-11-23  
**Prioridad:** ALTA  
**Estado:** ✅ IMPLEMENTADO  
**Módulo:** Servicios de Organización y Sección  
**Requerimiento:** Backend Team

---

## 📋 Resumen Ejecutivo

Se han implementado métodos en los servicios de frontend para consultar el administrador actual de una **ORGANIZACIÓN** y de una **SECCIÓN**. Estos métodos consumen los nuevos endpoints GET proporcionados por el backend.

---

## 🎯 Endpoints Implementados

### 1. **Consultar Administrador de Organización** ✅

**Endpoint Backend:**
```
GET /api/orgs/{orgId}/administrador
```

**Método Frontend:**
```typescript
getOrgAdmin(orgId: string | number): Observable<AdminResponse>
```

**Archivo:** `organization.service.ts`

**Respuesta del Backend:**
```typescript
{
  message: "ORG_GET_OK" | "Sin administrador asignado",
  data: {
    id: "uuid-del-usuario",
    username: "ADMIN_USER",
    nombreCompleto: "Juan Pérez",
    email: "admin@ejemplo.com"
  } | null
}
```

**Permisos requeridos:**
- ✅ SYSADMIN (puede consultar cualquier organización)
- ✅ ORGADMIN de la organización consultada

---

### 2. **Consultar Administrador de Sección** ✅

**Endpoint Backend:**
```
GET /api/orgs/{orgId}/secciones/{seccionId}/administrador
```

**Método Frontend:**
```typescript
getSectionAdmin(orgId: string, seccionId: string): Observable<{ message: string; data: AdminInfo | null }>
```

**Archivo:** `seccion.service.ts`

**Respuesta del Backend:**
```typescript
{
  message: "SECCION_GET_OK" | "Sin administrador asignado",
  data: {
    id: "uuid-del-usuario",
    username: "ADMIN_SECC1",
    nombreCompleto: "María García",
    email: "maria@ejemplo.com"
  } | null
}
```

**Permisos requeridos:**
- ✅ SYSADMIN (puede consultar cualquier sección)
- ✅ ORGADMIN de la organización a la que pertenece la sección

---

## 🔧 Interfaces TypeScript Implementadas

### AdminInfo Interface

```typescript
export interface AdminInfo {
  id: string;
  username: string;
  nombreCompleto: string;
  email: string;
}
```

### AdminResponse Interface

```typescript
export interface AdminResponse {
  message: string;
  data: AdminInfo | null;
}
```

**Ubicación:** `organization.service.ts` (exportadas)

---

## 💻 Implementación de Servicios

### 1. OrganizationService.getOrgAdmin()

```typescript
/**
 * Obtener el administrador actual de una organización.
 * Endpoint: GET /{orgId}/administrador
 * Auth: SYSADMIN o ORGADMIN de la organización
 * 
 * @param orgId - ID de la organización
 * @returns Observable con AdminResponse que contiene el administrador o null si no hay
 */
getOrgAdmin(orgId: string | number): Observable<AdminResponse> {
  const url = `${this.collectionUrl()}/${orgId}/administrador`;
  return this.http.get<any>(url, { headers: this.acceptJsonHeaders() }).pipe(
    map((resp: any) => {
      if (resp && resp.success === false) { 
        throw { error: { message: resp.message } }; 
      }
      const message = resp?.message || 'OK';
      const data = resp?.data || null;
      return { message, data } as AdminResponse;
    }),
    catchError(err => throwError(() => ({ 
      error: { message: (err?.error?.message ?? err?.message) as string | undefined }, 
      status: err?.status 
    })))
  );
}
```

**Características:**
- ✅ Manejo de errores robusto
- ✅ Normalización de respuesta
- ✅ TypeScript tipado
- ✅ Compatible con envoltorio `success: false`

---

### 2. SeccionService.getSectionAdmin()

```typescript
/**
 * Obtener el administrador actual de una sección.
 * Endpoint: GET /orgs/{orgId}/secciones/{seccionId}/administrador
 * Auth: SYSADMIN o ORGADMIN de la organización
 * 
 * @param orgId - ID de la organización que contiene la sección
 * @param seccionId - ID de la sección
 * @returns Observable con AdminResponse que contiene el administrador o null si no hay
 */
getSectionAdmin(orgId: string, seccionId: string): Observable<{ message: string; data: AdminInfo | null }> {
  const url = `${this.base}/orgs/${orgId}/secciones/${seccionId}/administrador`;
  
  try {
    console.log('[SeccionService] 📡 GET', url);
  } catch {}
  
  return this.http.get<any>(url, { headers: this.accept }).pipe(
    map((resp: any) => {
      if (resp && resp.success === false) { 
        throw { error: { message: resp.message }, status: 400 }; 
      }
      const message = resp?.message || 'OK';
      const data = resp?.data || null;
      
      try {
        if (data) {
          console.log('[SeccionService] ✅ Administrador obtenido:', data);
        } else {
          console.log('[SeccionService] ℹ️ Sin administrador asignado');
        }
      } catch {}
      
      return { message, data };
    }),
    catchError((err) => {
      try {
        console.error('[SeccionService] ❌ Error al obtener administrador:', err?.status, err?.error?.message);
      } catch {}
      return throwError(() => ({ 
        error: { message: err?.error?.message || err?.message || 'Error al obtener administrador' }, 
        status: err?.status 
      }));
    })
  );
}
```

**Características:**
- ✅ Logging detallado para debugging
- ✅ Manejo de errores con status code
- ✅ Mensajes claros en consola
- ✅ TypeScript tipado

---

## 💡 Casos de Uso

### Caso 1: Mostrar Administrador en Vista de Organización

```typescript
import { Component, OnInit } from '@angular/core';
import { OrganizationService, AdminInfo } from './service/organization.service';

@Component({
  selector: 'app-org-detail',
  template: `
    <div class="admin-section">
      <h4>Administrador de la Organización</h4>
      
      <div *ngIf="loading">
        <i class="pi pi-spin pi-spinner"></i> Cargando...
      </div>
      
      <div *ngIf="!loading && admin" class="admin-info">
        <i class="pi pi-user"></i>
        <div>
          <p><strong>{{ admin.nombreCompleto }}</strong></p>
          <p>@{{ admin.username }}</p>
          <p>{{ admin.email }}</p>
        </div>
      </div>
      
      <div *ngIf="!loading && !admin" class="no-admin">
        <i class="pi pi-exclamation-circle"></i>
        <p>Sin administrador asignado</p>
      </div>
      
      <button 
        *ngIf="canManage" 
        (click)="openAssignDialog()"
        class="p-button">
        {{ admin ? 'Cambiar' : 'Asignar' }} Administrador
      </button>
    </div>
  `
})
export class OrgDetailComponent implements OnInit {
  orgId: string = 'org-123'; // De route params
  admin: AdminInfo | null = null;
  loading = false;
  canManage = true; // Basado en permisos del usuario
  
  constructor(private orgService: OrganizationService) {}
  
  ngOnInit() {
    this.loadAdmin();
  }
  
  loadAdmin() {
    this.loading = true;
    this.orgService.getOrgAdmin(this.orgId).subscribe({
      next: (response) => {
        this.admin = response.data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar administrador:', err);
        this.loading = false;
        if (err?.status === 403) {
          // Sin permisos - ocultar sección
          this.canManage = false;
        }
      }
    });
  }
  
  openAssignDialog() {
    // Abrir modal para asignar/cambiar administrador
  }
}
```

---

### Caso 2: Mostrar Administrador en Vista de Sección

```typescript
import { Component, OnInit } from '@angular/core';
import { SeccionService } from './service/seccion.service';
import { AdminInfo } from './service/organization.service';

@Component({
  selector: 'app-seccion-detail',
  template: `
    <div class="admin-section">
      <h4>Administrador de la Sección</h4>
      
      <div *ngIf="loading">Cargando...</div>
      
      <div *ngIf="!loading && admin" class="admin-card">
        <div class="flex align-items-center gap-3">
          <i class="pi pi-user text-primary" style="font-size: 2rem"></i>
          <div>
            <h5>{{ admin.nombreCompleto }}</h5>
            <p class="text-muted">@{{ admin.username }}</p>
            <p class="text-sm">{{ admin.email }}</p>
          </div>
        </div>
      </div>
      
      <div *ngIf="!loading && !admin">
        <p class="text-muted">Sin administrador asignado</p>
      </div>
    </div>
  `
})
export class SeccionDetailComponent implements OnInit {
  orgId: string = 'org-123';
  seccionId: string = 'seccion-456';
  admin: AdminInfo | null = null;
  loading = false;
  
  constructor(private seccionService: SeccionService) {}
  
  ngOnInit() {
    this.loadAdmin();
  }
  
  loadAdmin() {
    this.loading = true;
    this.seccionService.getSectionAdmin(this.orgId, this.seccionId).subscribe({
      next: (response) => {
        this.admin = response.data;
        this.loading = false;
        console.log('Administrador de sección:', this.admin);
      },
      error: (err) => {
        console.error('Error:', err);
        this.loading = false;
      }
    });
  }
}
```

---

### Caso 3: Dashboard con Múltiples Administradores

```typescript
import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  template: `
    <div class="dashboard">
      <h3>Dashboard de Administradores</h3>
      
      <div class="cards">
        <div class="card" *ngFor="let org of organizaciones">
          <h4>{{ org.nombre }}</h4>
          <div *ngIf="org.admin; else noAdmin">
            <p>Admin: {{ org.admin.nombreCompleto }}</p>
          </div>
          <ng-template #noAdmin>
            <p class="text-danger">⚠️ Sin administrador</p>
          </ng-template>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  organizaciones: any[] = [];
  
  constructor(
    private orgService: OrganizationService
  ) {}
  
  ngOnInit() {
    // Primero obtener lista de organizaciones
    this.orgService.list().subscribe({
      next: (orgs) => {
        // Luego obtener admin de cada una
        const requests = orgs.map(org => 
          this.orgService.getOrgAdmin(org.id!)
        );
        
        forkJoin(requests).subscribe({
          next: (admins) => {
            this.organizaciones = orgs.map((org, i) => ({
              ...org,
              admin: admins[i].data
            }));
          }
        });
      }
    });
  }
}
```

---

## 🔍 Manejo de Errores

### Estados HTTP Esperados

| Status | Descripción | Acción Frontend |
|--------|-------------|-----------------|
| **200** | OK - Con o sin administrador | Mostrar data o "Sin asignar" |
| **403** | PROHIBIDO - Sin permisos | Ocultar sección / Mostrar mensaje |
| **404** | No encontrado | Mostrar error |
| **500** | Error interno | Mostrar error genérico |

### Ejemplo de Manejo Completo

```typescript
loadAdmin() {
  this.loading = true;
  this.error = null;
  
  this.orgService.getOrgAdmin(this.orgId).subscribe({
    next: (response) => {
      this.loading = false;
      
      if (response.data) {
        this.admin = response.data;
        this.showMessage('success', 'Administrador cargado');
      } else {
        this.admin = null;
        this.showMessage('info', 'Sin administrador asignado');
      }
    },
    error: (err) => {
      this.loading = false;
      const status = err?.status;
      const message = err?.error?.message || 'Error desconocido';
      
      switch (status) {
        case 403:
          this.error = 'No tienes permisos para ver esta información';
          this.canManage = false;
          break;
        case 404:
          this.error = 'Organización no encontrada';
          break;
        default:
          this.error = `Error al cargar: ${message}`;
      }
      
      this.showMessage('error', this.error);
    }
  });
}
```

---

## 📊 Archivos Modificados

### 1. `organization.service.ts`
**Cambios:**
- ✅ Interface `AdminInfo` agregada
- ✅ Interface `AdminResponse` agregada
- ✅ Método `getOrgAdmin()` implementado
- ✅ Documentación JSDoc completa

### 2. `seccion.service.ts`
**Cambios:**
- ✅ Import de `AdminInfo` desde `organization.service`
- ✅ Método `getSectionAdmin()` implementado
- ✅ Logging detallado para debugging
- ✅ Documentación JSDoc completa

---

## ✅ Checklist de Implementación

### Servicios (Backend Integration)
- [x] Interface `AdminInfo` creada
- [x] Interface `AdminResponse` creada
- [x] Método `getOrgAdmin()` en OrganizationService
- [x] Método `getSectionAdmin()` en SeccionService
- [x] Manejo de errores HTTP
- [x] TypeScript tipado completo
- [x] Documentación JSDoc

### Casos de Uso (Pendiente - Según necesidad)
- [ ] Componente para vista de detalles de organización
- [ ] Componente para vista de detalles de sección
- [ ] Dashboard de administradores
- [ ] Integración con modal de asignación existente
- [ ] Indicadores visuales para entidades sin admin
- [ ] Avatar o icono del administrador
- [ ] Tooltip con información completa
- [ ] Botón "Ver perfil" del administrador

---

## 🚀 Uso en Componentes

### Importar el Servicio

```typescript
import { OrganizationService, AdminInfo, AdminResponse } from './service/organization.service';
import { SeccionService } from './service/seccion.service';
```

### Inyectar en Constructor

```typescript
constructor(
  private orgService: OrganizationService,
  private seccionService: SeccionService
) {}
```

### Llamar al Método

```typescript
// Para organización
this.orgService.getOrgAdmin(orgId).subscribe({
  next: (response: AdminResponse) => {
    if (response.data) {
      console.log('Admin:', response.data.nombreCompleto);
    } else {
      console.log('Sin administrador');
    }
  },
  error: (err) => {
    console.error('Error:', err);
  }
});

// Para sección
this.seccionService.getSectionAdmin(orgId, seccionId).subscribe({
  next: (response) => {
    this.admin = response.data;
  }
});
```

---

## 📝 Notas Técnicas

1. **Permisos:** Los endpoints ya validan permisos en el backend (SYSADMIN u ORGADMIN)
2. **Retorno null:** Si no hay administrador, `data` será `null` pero status será `200 OK`
3. **Seguridad:** Solo se exponen campos básicos del usuario (id, username, nombreCompleto, email)
4. **Logging:** Los métodos incluyen logging en consola para facilitar debugging
5. **Relación con POST:** Estos GET complementan los POST existentes para asignar administrador

---

## 🔗 Integración con Funcionalidad Existente

### Modal de Asignación de Administrador

Ahora puedes consultar el administrador actual antes de abrir el modal:

```typescript
openAssignAdminDialog(org: Organization) {
  // Primero consultar el administrador actual
  this.orgService.getOrgAdmin(org.id!).subscribe({
    next: (response) => {
      this.currentAdmin = response.data;
      this.showAdminDialog = true;
      // Cargar candidatos...
      this.loadAdminCandidates();
    }
  });
}
```

Mostrar en el modal:

```html
<p-dialog [(visible)]="showAdminDialog">
  <ng-template pTemplate="header">
    <h3>Asignar Administrador</h3>
  </ng-template>
  
  <div class="current-admin" *ngIf="currentAdmin">
    <h4>Administrador Actual</h4>
    <p>{{ currentAdmin.nombreCompleto }} (@{{ currentAdmin.username }})</p>
  </div>
  
  <div class="no-admin" *ngIf="!currentAdmin">
    <p class="text-muted">Sin administrador asignado</p>
  </div>
  
  <!-- Dropdown de candidatos... -->
</p-dialog>
```

---

## 🆘 Troubleshooting

### Error 403 - Sin Permisos

**Problema:** El usuario no tiene SYSADMIN ni ORGADMIN  
**Solución:** Ocultar la sección o mostrar mensaje amigable

```typescript
if (err?.status === 403) {
  this.showAdminSection = false;
  // O mostrar: "No tienes permisos para ver esta información"
}
```

### Data null pero Status 200

**Problema:** El backend retorna `data: null` cuando no hay administrador  
**Solución:** Esto es esperado, mostrar "Sin administrador asignado"

```typescript
if (response.data === null) {
  this.showNoAdminMessage();
}
```

### Error de CORS

**Problema:** El navegador bloquea la petición  
**Solución:** Verificar configuración de proxy.conf.json

---

## 📚 Referencias

- **Requerimiento Backend:** `REQUERIMIENTO FRONTEND - CONSULTA ADMINISTRADOR DE ORGANIZACIÓN Y SECCIÓN`
- **Controladores Backend:** 
  - `OrganizacionController.java` - línea ~276
  - `SeccionController.java` - línea ~334
- **Servicios Frontend:**
  - `src/app/service/organization.service.ts`
  - `src/app/service/seccion.service.ts`

---

## 🎉 Conclusión

Los servicios están implementados y listos para usar. Ahora puedes:

1. ✅ Consultar el administrador de cualquier organización
2. ✅ Consultar el administrador de cualquier sección
3. ✅ Mostrar esta información en componentes de UI
4. ✅ Integrar con funcionalidad de asignación existente
5. ✅ Crear dashboards con información de administradores

**Estado:** ✅ IMPLEMENTACIÓN COMPLETA - LISTO PARA INTEGRACIÓN EN COMPONENTES

