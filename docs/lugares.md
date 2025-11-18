# Gestión de Lugares (Frontend)

Backend: `/api/orgs/{orgId}/lugares`

Entidades
- LugarEntity: { id: string, nombre: string, tipoLugar: 'APARTAMENTO' | 'CASA' | 'ALMACEN' | 'AULA' | 'BODEGA' | 'DEPOSITO' | 'LOCAL' | 'OFICINA' | 'SALON' | 'OTRO' }
- CreateLugarRequest: { nombre: string, tipoLugar?: enum }
- UpdateLugarRequest: { nombre?: string, tipoLugar?: enum }

Reglas importantes
- Nombre obligatorio (<=200). Duplicados (case-insensitive) retornan 409.
- tipoLugar por defecto: CASA.

Endpoints
- POST /api/orgs/{orgId}/lugares
  Body: { "nombre": "Parque Central", "tipoLugar": "OFICINA" }
  Respuesta: 201 { id, nombre, tipoLugar }
- GET /api/orgs/{orgId}/lugares
  200: [ { id, nombre, tipoLugar }, ... ]
- GET /api/orgs/{orgId}/lugares/{lugarId}
  200: { id, nombre, tipoLugar }
- PATCH /api/orgs/{orgId}/lugares/{lugarId}
  Body: { nombre?: string, tipoLugar?: string }
  200: { id, nombre, tipoLugar }
- DELETE /api/orgs/{orgId}/lugares/{lugarId}
  200: { message: 'PLACE_DELETE_OK' }

Códigos de permiso sugeridos
- Listar: ITEM_LISTAR_LUGARES
- Gestionar: ITEM_GESTIONAR_LUGARES

UI
- Listado: `LugaresListComponent` con alta inline, editar y eliminar.
- Formulario: `LugarFormComponent` con validaciones y soporte claro/oscuro.
