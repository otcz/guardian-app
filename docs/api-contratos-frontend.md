Guía de contratos API para Frontend

Objetivo
- Esta guía define contratos y convenciones para integrar el frontend con el backend, incluyendo rutas, inputs, respuestas (shapes), códigos de estado, mensajes y reglas de autorización.
- El backend envía todo procesado; el front solo muestra la información y los mensajes provistos en el campo message cuando exista.

Convenciones globales
- Base API: /api
- Rutas por organización: /api/orgs/{orgId}/...
- Autenticación: Authorization: Bearer {JWT}
- Fallback de headers aceptados por algunos endpoints: X-User, X-Username, X-User-Name
- Roles/Permisos: SYSADMIN, ORGADMIN, ADMIN, GUARDIA. Puede existir un servicio de permisos por “opciones” de menú que condicione visibilidad/uso de endpoints.
- Formas de respuesta esperadas:
  - Envoltorio ApiResponse: { success: boolean, message: string, data: any }
  - Envoltorio simple: { message: string, data: any }
  - Cuerpo crudo: DTO/Entidad directa (sin message)
  - 204 No Content: sin cuerpo
- Errores y manejo homogéneo en front:
  - Validación/binding y DomainValidationException: 400 con { timestamp, status, message }
  - Integridad de datos: 400 con message “Violación de integridad de datos” o mensaje raíz
  - Cualquier otra excepción: 500 con { ..., message: “Error interno” }
  - Nota: algunos controladores retornan 403/404/409 con body string (por ej. "PROHIBIDO") o con { message, ... }. El front debe manejar ambos.
- Reglas de UI para mensajes:
  - Si el body tiene message: mostrarlo como feedback (success/warn/error según status)
  - Si es lista/objeto sin message: mostrar contenido directo; el mensaje puede inferirse (p.ej., “Listado OK”)
  - 204: tratar como éxito silencioso (sin mensaje)

Mensajes estándar relevantes (archivo Messages)
- Vehículos: VEHICLE_CREATE_OK, VEHICLE_NOT_CREATE, VEHICLE_LIST_OK, VEHICLE_GET_OK, VEHICLE_UPDATE_OK, VEHICLE_NOT_UPDATE, VEHICLE_ACTIVATE_OK, VEHICLE_DEACTIVATE_OK, VEHICLE_SECTION_SET_OK, VEHICLE_SECTION_CLEAR_OK, VEHICLE_NOT_FOUND, VEHICLE_PLATE_DUPLICATE, SECTION_NOT_FOUND, SECTION_PARENT_INVALID_ORG, ORG_NOT_FOUND, PROHIBIDO, VALIDACION_FALLIDA
- Otros dominios (Usuarios/Secciones/Parámetros/Organización/Invitaciones): múltiples; listados en los contratos abajo cuando aplican

Controladores y contratos

AuthController (Base: /api/auth)
- POST /login
  - Body: { username: string, password: string }
  - 200: AuthResponse { token, tokenType, expiresIn, username, roles[], opcionesDetalle[], scopeNivel, seccionPrincipalId, capabilities[], orgCreadoraId, orgAdministraId }
  - 428: RequirePasswordResponse { code: "USER_NEEDS_PASSWORD", message: Messages.USER_NEEDS_PASSWORD, setupToken, username }
  - 401: { message: "Credenciales inválidas" }
  - 403: { message: Messages.LOGIN_USER_INACTIVE | LOGIN_ROLES_REQUIRED | LOGIN_ORG_REQUIRED | LOGIN_ORG_INACTIVE | LOGIN_ORGADMIN_REQUIRED }
- POST /password/first-set
  - Body: { setupToken, newPassword, confirmPassword }
  - 200: { message: Messages.PASSWORD_SET_OK }
  - 400: { message: PASSWORD_TOKEN_INVALID | PASSWORD_MISMATCH | PASSWORD_WEAK }
  - 409: { message: PASSWORD_ALREADY_SET }

OrganizacionController (Base: /api/orgs)
- POST /
  - Auth: SYSADMIN
  - Body: { nombre }
  - 201: { message: Messages.ORG_CREATE_OK, data: OrganizacionEntity }
  - 403: { message: Messages.PROHIBIDO }
- GET /
  - Auth: SYSADMIN → todas; otros → solo su organización (creadora o administrada)
  - 200: { message: Messages.ORG_LIST_OK, data: OrganizacionEntity[] }
- GET /{orgId}
  - 200: { message: Messages.ORG_GET_OK, data: OrganizacionEntity }
  - 403: { message: Messages.PROHIBIDO | NO_AUTORIZADO }
- PATCH /{orgId}
  - Auth: SYSADMIN u ORGADMIN (no edita DEFAULT_ORG)
  - Body: { nombre?, activa? }
  - 200: { message: Messages.ORG_UPDATE_OK, data: OrganizacionEntity }
  - 403: { message: Messages.PROHIBIDO }
- PATCH /{orgId}/activo?value=boolean
  - 200: { message: Messages.ORG_STATE_OK, data: OrganizacionEntity }
- GET /{orgId}/administrador/candidatos
  - Auth: SYSADMIN
  - 200: { message: Messages.USER_LIST_OK, data: { total: number, items: UsuarioEntity[] } }
  - 403: { message: Messages.PROHIBIDO }

UsuarioController (Base: /api/orgs/{orgId}/usuarios)
- POST /
  - Auth: SYSADMIN o permiso ITEM_CREAR_USUARIO o ORGADMIN
  - Body: { username, nombreCompleto?, email?, scopeNivel? [ORGANIZACION|SECCION], seccionPrincipalId? }
  - 201: { message: Messages.USER_CREATE_OK, data: UsuarioDetailDto como Map }
  - 400/403: { message: … }
- GET /
  - Query: excludeAdmins?=boolean
  - Auth: SYSADMIN, ORGADMIN o ADMIN (o permiso ITEM_LISTAR_USUARIOS)
  - 200: { message: Messages.USER_LIST_OK, data: UsuarioListDto[] }
- GET /{usuarioId}
  - Auth: SYSADMIN; o el propio usuario; o permiso ITEM_LISTAR_USUARIOS; o ORGADMIN/ADMIN
  - 200: { message: Messages.USER_GET_OK, data: UsuarioDetailDto }
  - 403: { message: Messages.PROHIBIDO }
- PATCH /{usuarioId}
  - Auth: SYSADMIN o (permiso ITEM_GESTIONAR_USUARIO o ORGADMIN). No puedes editarte a ti mismo salvo SYSADMIN
  - Body: { username?, nombreCompleto?, email?, scopeNivel?, seccionPrincipalId? }
  - 200: { message: Messages.USER_UPDATE_OK, data: UsuarioDetailDto }
- PATCH /{usuarioId}/activo?value=boolean
  - 200: { message: Messages.USER_ACTIVATE_OK | USER_DEACTIVATE_OK, data: UsuarioDetailDto }
- PATCH /{usuarioId}/seccion-principal?seccionId=UUID|null
  - 200: { message: USER_SECTION_SET_OK | USER_SECTION_CLEAR_OK, data: UsuarioDetailDto }
- GET /meta
  - 200: { message: Messages.USER_GET_OK, data: { defaultScopeNivel, allowedScopeNiveles[], requiresSeccionPrincipalWhen[] } }

SeccionController (Base: /api/orgs/{orgId}/secciones)
- POST /
  - Auth: SYSADMIN u ORGADMIN
  - Body: { nombre, descripcion?, autonomiaConfigurada?, seccionPadreId? }
  - 201: ApiResponse { success: true, message: Messages.OK_CREADA, data: SeccionEntity }
  - 400/403/500: ApiResponse { success: false, message: … }
- GET /
  - Auth: SYSADMIN u ORGADMIN o permisos de usuarios/vehículos; si no, lista restringida a subárbol del admin local
  - 200: ApiResponse { success: true, message: Messages.OK_LISTAR, data: SeccionEntity[] }
- GET /{seccionId}
  - 200: SeccionEntity
  - 403: body: Messages.PROHIBIDO
- GET /{seccionId}/ingresos
  - Auth: SYSADMIN/ORGADMIN o ADMIN/GUARDIA con pertenencia contextual
  - 200: IngresoEntity[]
- PATCH /{seccionId}
  - Auth: SYSADMIN u ORGADMIN
  - Body: { nombre?, descripcion?, autonomiaConfigurada?, nuevoPadreId? }
  - 200: SeccionEntity
- PATCH /{seccionId}/estado?estado=string
  - 200: ApiResponse { success: true, message: Messages.SECCION_ESTADO_OK, data: SeccionEntity }
  - 400/403/500: ApiResponse { success: false, message: … }
- POST /{seccionId}/administrador
  - Body: { usuarioId }
  - 200: SeccionEntity (actualizada)
- POST /{seccionId}/usuarios
  - Body: { usuarioId, rolContextualId? }
  - 200: asignación creada (forma de servicio)
- DELETE /{seccionId}
  - Soft-delete: cambia a INACTIVA
  - 200: ApiResponse { success: true, message: Messages.SECCION_ELIMINADA_OK, data: SeccionEntity }
- PATCH /{seccionId}/autonomia?autonomia=boolean
  - 200: ApiResponse { success: true, message: Messages.SECCION_AUTONOMIA_OK, data: SeccionEntity }
- DELETE /{seccionId}/hard-delete
  - Auth: solo SYSADMIN
  - 200: ApiResponse { success: true, message: Messages.SECCION_ELIMINADA_FISICA_OK }

SeccionInvitacionController (Admin bajo: /api/orgs/{orgId}/secciones/{seccionId}/invitaciones)
- POST /
  - Body: { rolContextualId?, expiraEn? | ttlMinutes?, usosMaximos?, emailDestino?, notas? }
  - 201: { message: Messages.INVITE_CREATE_OK, data: InvitaciónDTO con: id, codigo, seccionId, seccionNombre, rolContextualId, expiraEn, usosMaximos, usosActuales, activo, emailDestino, notas, joinUrl, joinRedirectUrl, frontJoinUrl, inviteUrl }
- GET /
  - 200: { message: Messages.OK_LISTAR, data: InvitaciónDTO[] }
- PATCH /{invitacionId}
  - 200: { message: Messages.INVITE_DEACTIVATED_OK, data: InvitaciónDTO }
- Público:
  - GET /api/invitaciones/{codigo}
    - 200: { message: Messages.USER_GET_OK, data: { codigo, activo, expiraEn, usosMaximos, usosActuales, seccion{ id,nombre }, organizacion{ id,nombre }, frontJoinUrl, inviteUrl, joinUrl, joinRedirectUrl } }
    - 404: { message: Messages.INVITE_NOT_FOUND }
  - GET /api/invitaciones/{codigo}/go
    - 302: Redirect a frontJoinUrl (sin cuerpo)
  - POST /api/invitaciones/{codigo}/unirse
    - Body: { username, email, nombreCompleto?, createIfNotExists?=true, rolContextualId? }
    - 200: { message: Messages.INVITE_ACCEPT_OK, data: { usuarioSeccionId, usuarioId, seccionId } }

ParametroController (Base: /api/orgs/{orgId}/parametros)
- POST /
  - Auth: SYSADMIN
  - Body: { codigo, descripcion? }
  - 201: ApiResponse { success, message: Messages.PARAM_CREATE, data: ParametroEntity }
- GET /
  - 200: ApiResponse { success, message: "Listado de parámetros OK", data: ParametroEntity[] }
- GET /{parametroId}
  - 200: ApiResponse { success, message: "Parámetro obtenido", data: ParametroEntity }
  - 403/404: ApiResponse { success: false, message: … }
- PATCH /{parametroId}
  - Auth: SYSADMIN
  - Body: { descripcion?, activo? }
  - 200: ApiResponse { success, message: Messages.PARAM_UPDATE, data: ParametroEntity }
- DELETE /{parametroId}
  - Auth: SYSADMIN
  - 200: ApiResponse { success, message: Messages.PARAM_DELETE }
- Valores
  - POST /{parametroId}/valores
    - Body: { codigo, valor, activo?=true }
    - 201: ApiResponse { success, message: "Valor agregado correctamente.", data: ValorParametroEntity }
  - GET /{parametroId}/valores
    - 200: ApiResponse { success, message: "Listado de valores OK", data: ValorParametroEntity[] }
  - PATCH /valores/{valorId}
    - Body: { valor?, activo? }
    - 200: ApiResponse { success, message: "Valor actualizado correctamente.", data: ValorParametroEntity }
  - DELETE /valores/{valorId}
    - 200: ApiResponse { success, message: "Valor eliminado correctamente." }

RolController (Base: /api/orgs/{orgId}/roles)
- POST /
  - Auth: SYSADMIN u ORGADMIN. No permite crear SYSADMIN/ORGADMIN salvo SYSADMIN
  - Body: { nombre, descripcion? }
  - 201: RolDto { id, nombre, descripcion, orgId }
- GET /
  - Auth: SYSADMIN/ORGADMIN/ADMIN; filtra roles visibles según quien llama
  - 200: RolDto[]
- GET /{rolId}
  - 200: RolDto si permitido; 403 si no
- PATCH /{rolId}
  - Auth: SYSADMIN u ORGADMIN (no puede tocar roles especiales sin SYSADMIN)
  - Body: { nombre?, descripcion? }
  - 200: RolDto
- DELETE /{rolId}
  - 204 No Content

OpcionRolController (Base: /api/orgs/{orgId}/roles/{rolId}/opciones)
- POST /{opcionId}
  - Auth: SYSADMIN o permiso ITEM_ASIGNAR_MENU_A_ROL o ORGADMIN
  - 204 No Content
- DELETE /{opcionId}
  - 204 No Content
- GET /
  - 200: OpcionDto[] { id, codigo, nombre, descripcion, activo, tipo, icono, ruta }

OpcionController (Base: /api/orgs/{orgId}/opciones)
- POST /
  - Auth: SYSADMIN u ORGADMIN
  - Body: { codigo, nombre, descripcion?, tipo? [ITEM|MENU], padreId? } (si tipo=MENU, padreId debe ser null)
  - 201: OpcionEntity
- GET /
  - 200: OpcionEntity[]
- GET /visibles?usuarioId=UUID&seccionId?=UUID
  - 200: OpcionDto[] (mínimo seguro)
- GET /visibles/tree?usuarioId=UUID&seccionId?=UUID
  - 200: MenuNodeDto[]
- GET /{opcionId}
  - 200: OpcionEntity
- PATCH /{opcionId}
  - Body: { nombre?, descripcion?, activo? }
  - 200: OpcionEntity

OpcionUsuarioController (Base: /api/orgs/{orgId}/opciones-usuario)
- POST /
  - Auth: SYSADMIN u ORGADMIN
  - Body: { opcionId, usuarioId, seccionId?, habilitada?=true }
  - 204 No Content
- PATCH /{opcionUsuarioId}/estado?value=boolean
  - 204 No Content
- DELETE /{opcionUsuarioId}
  - 204 No Content
- GET /usuario/{usuarioId}
  - 200: OpcionUsuarioDto[] { id, usuarioId, opcionId, seccionId, habilitada, opcion? }
- GET /
  - 200: OpcionUsuarioDto[] (IDs solamente, sin expandir Opcion)

VehiculoController (Base: /api/orgs/{orgId}/vehiculos)
- POST /
  - Auth: SYSADMIN u ORGADMIN; o usuario perteneciente a la org (se asigna sección por defecto si es posible)
  - Body: { placa }
  - 201: ApiResponse { success: true, message: Messages.VEHICLE_CREATE_OK, data: VehiculoDto { id, placa, marca, modelo, linea, anio, color, activo, seccionId, orgId, fechaCreacion, fechaActualizacion } }
  - 400/404/409: ApiResponse { success: false, message: ORG_NOT_FOUND | VEHICLE_PLATE_DUPLICATE | … }
- GET /
  - Query: soloMios?=boolean
  - Auth: SYSADMIN/ORGADMIN: lista todo; usuarios: solo vehículos en secciones accesibles si soloMios=true; de lo contrario requiere raíz admin de sección
  - 200: ApiResponse { success: true, message: Messages.VEHICLE_LIST_OK, data: VehiculoDto[] }
- GET /{vehiculoId}
  - Auth: visible si pertenece a una sección accesible o admin
  - 200: ApiResponse { success: true, message: Messages.VEHICLE_GET_OK, data: VehiculoDto }
  - 403/404/400: ApiResponse { success: false, message: … }
- PATCH /{vehiculoId}/estado?value=boolean
  - Auth: SYSADMIN/ORGADMIN o quien pueda ver el vehículo
  - 200: ApiResponse { success: true, message: VEHICLE_ACTIVATE_OK | VEHICLE_DEACTIVATE_OK, data: VehiculoDto }
- PATCH /{vehiculoId}/seccion?seccionId=UUID|null
  - Auth: SYSADMIN/ORGADMIN; si ORGADMIN, restringe al subárbol administrado
  - 200: ApiResponse { success: true, message: VEHICLE_SECTION_SET_OK | VEHICLE_SECTION_CLEAR_OK, data: VehiculoDto }
  - 404/400: ApiResponse { success: false, message: VEHICLE_NOT_FOUND | SECTION_NOT_FOUND | SECTION_PARENT_INVALID_ORG }

IngresoController (Base: /api/orgs/{orgId}/ingresos)
- POST /
  - Auth: SYSADMIN u ORGADMIN; o ADMIN/GUARDIA solo si registran en su sección
  - Body: { seccionId?, vehiculoId?, usuarioId?, origenNivel?, tipo? [ENTRADA|SALIDA], controlEstadoPresencia?, timestampEvento? }
  - 201: IngresoEntity
  - 403: body: Messages.PROHIBIDO
- GET /
  - Query: desde?, hasta? (ISO 8601)
  - 200: IngresoEntity[]
- GET /{ingresoId}
  - 200: IngresoEntity
  - 404: body: Messages.INGRESS_NOT_FOUND
  - 403: body: Messages.PROHIBIDO

AuditoriaController (Base: /api/orgs/{orgId}/auditoria)
- GET /
  - 200: LogAuditoriaEntity[]
- GET /seccion/{seccionId}
  - 200: LogAuditoriaEntity[]
- POST /
  - Body: { seccionId?, usuarioId?, nivelContexto? [ORGANIZACION|SECCION|...], accion, detalle? }
  - 201: LogAuditoriaEntity

Guía de manejo de respuestas heterogéneas en el front
- Detectar forma de respuesta:
  - Si el body tiene message y/o data: usar message para feedback; data para el contenido (entidad o lista)
  - Si el body es una lista/objeto sin message: usar contenido directo; mensaje implícito (por ejemplo: “Listado OK”)
  - 204: no esperar body; éxito silencioso
- Errores:
  - Si el body es string (por ejemplo, "PROHIBIDO"): mostrar tal cual o mapear a i18n
  - Si el body es {message}: usar ese message
  - Si es el manejador global { timestamp, status, message }: usar message
- Autorización en UI:
  - Verificar roles/capabilities/opciones antes de navegar o mostrar acciones sensibles
  - Respetar redirects de 401/403 ya manejados por el interceptor de auth en el front

Notas para implementación en servicios Angular (existente en este repo)
- Los servicios usan environment.apiBase y agregan automáticamente Authorization y contexto via interceptor (X-Org-Id, X-Scope-Nivel, X-Seccion-Id)
- Los servicios vehiculos y usuarios ya soportan respuestas heterogéneas (ApiResponse, Map simple, crudo) y exponen message cuando aplica
- Convención: métodos list/get normalizan entidades a shapes estables para el front (campos id, activo, etc.)

Buenas prácticas para componentes
- Mostrar notify con el message del backend cuando esté disponible, tanto en éxito como en error
- Evitar asumir que siempre vendrá data; validar null/undefined y estados loading
- En operaciones 204, mostrar un toast genérico si hace sentido (p.ej., “Operación realizada”) o silencio si se actualiza UI directamente

Fin de documento

