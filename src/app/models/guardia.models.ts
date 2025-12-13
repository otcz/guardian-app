/**
 * Modelo: Guardia (Punto de Control)
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
}

/**
 * Modelo: Relación Guardia-Usuario
 */
export interface GuardiaUsuario {
  id: string;
  guardiaId: string;
  usuarioId: string;
  seccionId: string;
  organizacionId: string;
  asignada: boolean;
  restringida: boolean;
  motivoRestriccion?: string;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
  // Datos anidados para UI
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
 */
export interface MovimientoGuardia {
  id: string;
  organizacionId: string;
  seccionId: string;
  guardiaId: string;
  usuarioId: string;
  vehiculoId?: string;
  adminGuardiaId: string;
  tipo: 'ENTRADA' | 'SALIDA';
  timestampMovimiento: string; // ISO 8601
  observaciones?: string;
  entradaAsociadaId?: string; // Solo para SALIDA
  permanenciaMinutos?: number; // Solo para SALIDA
  registroVehiculoIncluido: boolean;
  createdAt: string;
  // Datos anidados para UI
  guardia?: Guardia;
  usuario?: Usuario;
  vehiculo?: Vehiculo;
  adminGuardia?: Usuario;
  entradaAsociada?: MovimientoGuardia;
}

/**
 * DTO para registrar entrada
 */
export interface RegistrarEntradaDTO {
  guardiaId: string;
  usuarioId: string;
  vehiculoId?: string;
  adminGuardiaId: string;
  observaciones?: string;
}

/**
 * DTO para registrar salida
 */
export interface RegistrarSalidaDTO {
  guardiaId: string;
  usuarioId: string;
  vehiculoId?: string;
  adminGuardiaId: string;
  observaciones?: string;
}

/**
 * Respuesta de validación de usuario
 * @version 2.0 - Actualizado con campos de identificación (REQ-001-FRONTEND-ADDENDUM-GUARDIA)
 */
export interface ValidacionUsuarioDTO {
  existe: boolean;
  activo: boolean;
  nombreCompleto: string | null;
  username: string | null;  // ⚠️ ACTUALIZADO: antes era 'documento'
  // ✨ NUEVO: Campos de identificación (REQ-001)
  tipoIdentificacion: 'CEDULA' | 'PASAPORTE' | 'DNI' | 'RUC' | 'LICENCIA' | 'OTRO' | null;
  identificacion: string | null;
  seccion: string | null;
  restricciones: string[];
  vehiculos: string[];
  tieneEntradaAbierta: boolean;
  entradaAbierta: MovimientoGuardia | null;
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
  marca?: string;
  modelo?: string;
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

