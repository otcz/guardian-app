/**
 * Modelo: Guardia (Punto de Control)
 * @version 2.0 - Alineado con API-MODULO-GUARDIA-FRONTEND-2025-12-13
 */
export interface Guardia {
  id: string;
  organizacionId: string;
  seccionId: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  ubicacion?: string;
  activa: boolean;
  permiteEntrada: boolean;
  permiteSalida: boolean;
  usuarioGestorId?: string | null;
  usuarioGestorNombre?: string | null;
  usuarioGestorUsername?: string | null;
  // Campos adicionales retornados por el backend
  seccionNombre?: string;
  organizacionNombre?: string;
  cantidadUsuariosAsignados?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO para crear una nueva guardia
 */
export interface CrearGuardiaDTO {
  organizacionId: string;
  seccionId: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  ubicacion?: string;
}

/**
 * DTO para crear una guardia con gestor asignado
 */
export interface CrearGuardiaConGestorDTO {
  organizacionId: string;
  seccionId: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  ubicacion?: string;
  usuarioGestorId: string;
  observaciones?: string;
}

/**
 * DTO para actualizar una guardia existente
 */
export interface ActualizarGuardiaDTO {
  nombre?: string;
  descripcion?: string;
  ubicacion?: string;
  permiteEntrada?: boolean;
  permiteSalida?: boolean;
  usuarioGestorId?: string | null;
}

/**
 * Modelo: Relación Guardia-Usuario
 * @version 2.1 - Actualizado con campos planos del backend
 */
export interface GuardiaUsuario {
  id: string;
  guardiaId: string;
  usuarioId: string;
  usuarioNombre?: string;
  usuarioUsername?: string;
  seccionId: string;
  organizacionId: string;
  asignada: boolean;
  fechaAsignacion?: string;  // ISO DateTime - agregado según API backend
  restringida: boolean;
  motivoRestriccion?: string;
  observaciones?: string;
  createdAt?: string;
  updatedAt?: string;
  // Campos planos opcionales (cuando el backend no devuelve objetos anidados)
  guardiaNombre?: string;
  guardiaCodigo?: string;
  seccionNombre?: string;
  // Datos anidados para UI (opcionales)
  guardia?: Guardia;
  usuario?: Usuario;
}

/**
 * DTO para asignar guardia a usuario
 */
export interface AsignarGuardiaDTO {
  observaciones?: string;
}

/**
 * DTO para restringir guardia a usuario
 */
export interface RestringirGuardiaDTO {
  motivoRestriccion: string;
}

/**
 * DTO para verificar si un usuario puede usar una guardia
 */
export interface PuedeUsarGuardiaDTO {
  puedeUsar: boolean;
  motivoRestriccion?: string;
}


/**
 * Estados posibles de una guardia para un usuario
 */
export enum EstadoGuardia {
  ASIGNADA = 'ASIGNADA',
  RESTRINGIDA = 'RESTRINGIDA',
  SIN_ASIGNAR = 'SIN_ASIGNAR'
}

/**
 * Guardia con estado calculado para un usuario específico
 */
export interface GuardiaConEstado extends Guardia {
  estado: EstadoGuardia;
  motivoRestriccion?: string;
  relacionId?: string; // ID de GuardiaUsuario si existe
}

/**
 * Modelo: Movimiento de Guardia (Entrada/Salida)
 * @version 2.0 - Alineado con API-MODULO-GUARDIA-FRONTEND-2025-12-13
 */
export interface MovimientoGuardia {
  id: string;
  organizacionId?: string;  // Opcional según implementación local
  seccionId?: string;  // Opcional según implementación local
  seccionNombre?: string;  // Nombre de la sección
  guardiaId: string;
  guardiaCodigo?: string;  // Agregado según API backend
  guardiaNombre?: string;  // Agregado según API backend
  usuarioId: string;
  usuarioNombre?: string;  // Agregado según API backend
  usuarioUsername?: string;  // Agregado según API backend
  usuarioIdentificacion?: string;  // Documento del usuario
  usuarioTelefono?: string;  // Teléfono del usuario
  vehiculoId?: string | null;
  vehiculoPlaca?: string | null;  // Placa del vehículo
  adminGuardiaId?: string;  // Opcional según implementación local
  adminGuardiaNombre?: string;  // Nombre del admin que registró
  tipoMovimiento?: 'ENTRADA' | 'SALIDA';  // Nombre del backend
  tipo?: 'ENTRADA' | 'SALIDA';  // Nombre local - mantener compatibilidad
  fechaHora?: string;  // ISO DateTime - nombre del backend
  timestampMovimiento?: string; // ISO 8601 - nombre local - mantener compatibilidad
  observaciones?: string | null;
  entradaAsociadaId?: string | null; // Solo para SALIDA
  permanenciaMinutos?: number | null; // Solo para SALIDA
  registroVehiculoIncluido?: boolean;
  createdAt?: string;
  // Datos anidados para UI
  guardia?: Guardia;
  usuario?: Usuario;
  vehiculo?: Vehiculo;
  adminGuardia?: Usuario;
  entradaAsociada?: MovimientoGuardia;
}

/**
 * DTO para registrar entrada
 * El backend determina automáticamente tipo=ENTRADA según el endpoint /entrada
 */
export interface RegistrarEntradaDTO {
  guardiaId: string;
  usuarioId: string;
  vehiculoId?: string | null;  // ✅ Opcional y puede ser null
  adminGuardiaId: string;
  observaciones?: string | null;  // ✅ Opcional y puede ser null
}

/**
 * DTO para registrar salida
 * El backend determina automáticamente tipo=SALIDA según el endpoint /salida
 */
export interface RegistrarSalidaDTO {
  guardiaId: string;
  usuarioId: string;
  vehiculoId?: string | null;  // ✅ Opcional y puede ser null
  adminGuardiaId: string;
  observaciones?: string | null;  // ✅ Opcional y puede ser null
}

/**
 * Respuesta de validación de usuario
 * @version 2.1 - Actualizado con UUID del usuario (REQUERIMIENTO-FRONTEND-AJUSTE-API-MOVIMIENTOS-GUARDIA)
 */
/**
 * DTO de entrada abierta (estructura real del backend)
 */
export interface EntradaAbiertaDTO {
  id: string;
  guardiaNombre: string;
  guardiaId: string;
  fechaEntrada: string;  // ISO 8601
  vehiculoPlaca?: string | null;
  observaciones?: string | null;
}

/**
 * Respuesta de validación de usuario
 */
export interface ValidacionUsuarioDTO {
  id: string;  // ⭐ NUEVO - UUID del usuario (REQUERIDO para registrar movimientos)
  existe: boolean;
  activo: boolean;
  nombreCompleto: string | null;
  username: string | null;  // ⚠️ ACTUALIZADO: antes era 'documento'
  // ✨ NUEVO: Campos de identificación (REQ-001)
  tipoIdentificacion: 'CEDULA' | 'PASAPORTE' | 'DNI' | 'RUC' | 'LICENCIA' | 'OTRO' | null;
  identificacion: string | null;
  seccion: string | null;
  restricciones: string[];
  vehiculos: Vehiculo[]; // ✅ ACTUALIZADO: Cambiado de string[] a Vehiculo[]
  tieneEntradaAbierta: boolean;
  entradaAbierta: EntradaAbiertaDTO | null;  // ⭐ ACTUALIZADO: usar interfaz correcta
}

/**
 * Respuesta de validación de vehículo
 */
export interface ValidacionVehiculoDTO {
  existe: boolean;
  estado: string;
  placa: string;
  usuarioAsociado: string;
  usuarioId?: string;
  ultimaActividad: string;
}

/**
 * 🆕 Vehículo completo con usuarios asignados y último movimiento
 * @version 2.0 - Búsqueda por placa con información completa
 */
export interface VehiculoCompletoDTO {
  id: string;                          // UUID del vehículo
  placa: string;                       // Placa del vehículo
  marca: string;                       // Marca del vehículo
  modelo: string;                      // Modelo del vehículo
  color: string;                       // Color del vehículo
  tipo: string;                        // AUTOMOVIL, MOTOCICLETA, CAMION, etc.
  activo: boolean;                     // Si está activo
  bloqueado: boolean;                  // Si está bloqueado
  usuariosAsignados: UsuarioAsignadoDTO[];  // Usuarios autorizados
  ultimoMovimiento: UltimoMovimientoDTO | null;  // Último movimiento (puede ser null)
}

/**
 * Usuario asignado a un vehículo con su estado actual
 */
export interface UsuarioAsignadoDTO {
  id: string;                          // UUID del usuario
  nombreCompleto: string;              // Nombre completo
  identificacion: string;              // Número de documento
  tipoIdentificacion: string;          // CEDULA, PASAPORTE, RUC, etc.
  activo: boolean;                     // Si está activo
  tieneEntradaAbierta: boolean;        // Si tiene entrada sin salida
}

/**
 * Último movimiento registrado del vehículo
 */
export interface UltimoMovimientoDTO {
  id: string;                          // UUID del movimiento
  tipo: string;                        // "ENTRADA" o "SALIDA"
  fechaMovimiento: string;             // Timestamp ISO 8601
  guardiaNombre: string;               // Nombre de la guardia
  usuarioNombre: string;               // Nombre del usuario
  observaciones: string | null;        // Observaciones
  permanenciaMinutos: number | null;   // Minutos de permanencia (solo SALIDA)
  esEntradaAbierta: boolean;           // Si es entrada sin salida
}

/**
 * 🆕 DTO para usuarios dentro o fuera (nuevos endpoints unificados)
 * @version 3.0 - Endpoints /usuarios-dentro y /usuarios-fuera
 * @description Reemplaza el endpoint antiguo /entradas-abiertas
 */
export interface UsuarioDentroDTO {
  id: string;                                // UUID del usuario
  nombreCompleto: string;                    // Nombre completo del usuario
  identificacion: string;                    // Número de documento
  tipoIdentificacion: string;                // CEDULA, PASAPORTE, DNI, etc.
  telefono: string;                          // Teléfono del usuario
  email: string;                             // Email del usuario
  seccionNombre: string;                     // Nombre de la sección
  seccionId: string;                         // UUID de la sección
  activo: boolean;                           // Si el usuario está activo
  tieneEntradaAbierta: boolean;              // true = DENTRO, false = FUERA
  entradaAbierta: MovimientoGuardia | null;  // Objeto completo de entrada (solo si está DENTRO)
  ultimoMovimiento: UltimoMovimientoDTO | null; // Último movimiento formateado
}

/**
 * 🆕 Vehículo con lista de usuarios asignados
 * @version 3.0 - Validación manual unificada
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
 * @version 3.0 - Validación manual unificada
 * @description Permite buscar por documento de usuario o placa de vehículo en un solo endpoint
 */
export interface ValidacionManualDTO {
  tipoBusqueda: 'USUARIO' | 'VEHICULO' | 'NO_ENCONTRADO';
  usuario?: ValidacionUsuarioDTO;          // Si tipoBusqueda = "USUARIO"
  vehiculo?: ValidacionVehiculoDTO;        // Si tipoBusqueda = "VEHICULO"
  vehiculoDetalle?: VehiculoConUsuariosDTO; // Si tipoBusqueda = "VEHICULO"
}

/**
 * Respuesta de verificación de permiso
 */
export interface PuedeUsarGuardiaDTO {
  puedeUsar: boolean;
  motivo?: string;
}

/**
 * DTO para conteo de entradas abiertas
 */
export interface ConteoEntradasDTO {
  count: number;
}

/**
 * Modelo Usuario simplificado (para no duplicar)
 */
export interface Usuario {
  id: string;
  username: string;
  email: string;
  nombreCompleto?: string;
  documento?: string;
  activo: boolean;
  roles?: string[];
}

/**
 * Modelo Vehiculo simplificado
 */
export interface Vehiculo {
  id: string;
  placa: string;
  tipo?: string; // ✅ NUEVO: Tipo de vehículo
  marca?: string;
  modelo?: string;
  linea?: string; // ✅ AGREGADO: Línea del vehículo
  color?: string;
  estado: 'ACTIVO' | 'BLOQUEADO' | 'INACTIVO';
  usuarioId?: string;
}

/**
 * Estados para checkboxes de administración
 */
export type EstadoGuardiaUsuario = 'ASIGNADA' | 'RESTRINGIDA' | 'SIN_ASIGNAR';

/**
 * Interface para administración de guardias por usuario
 */
export interface GuardiaCheckbox {
  guardiaId: string;
  nombre: string;
  codigo: string;
  estado: EstadoGuardiaUsuario;
  motivoRestriccion?: string;
  estadoAnterior?: EstadoGuardiaUsuario;
}

