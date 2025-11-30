/**
 * Constantes de mensajes para el módulo Guardia
 */

export const MENSAJES_EXITO = {
  ENTRADA_REGISTRADA: '✅ Entrada registrada exitosamente',
  SALIDA_REGISTRADA: (minutos: number) => `✅ Salida registrada exitosamente. Permanencia: ${minutos} minutos`,
  GUARDIA_CREADA: '✅ Guardia creada exitosamente',
  GUARDIA_ACTUALIZADA: '✅ Guardia actualizada exitosamente',
  GUARDIA_ELIMINADA: '✅ Guardia eliminada exitosamente',
  GUARDIA_ACTIVADA: '✅ Guardia activada exitosamente',
  GUARDIA_DESACTIVADA: '✅ Guardia desactivada exitosamente',
  ASIGNACION_EXITOSA: '✅ Guardia asignada al usuario exitosamente',
  RESTRICCION_APLICADA: '✅ Restricción aplicada exitosamente',
  RESTRICCION_REMOVIDA: '✅ Restricción removida exitosamente',
  ASIGNACION_REVOCADA: '✅ Asignación revocada exitosamente',
  CAMBIOS_GUARDADOS: '✅ Cambios guardados exitosamente'
};

export const MENSAJES_ERROR = {
  ENTRADA_ABIERTA_EXISTE: '🚫 Ya existe una entrada abierta para este usuario',
  ENTRADA_NO_EXISTE: '🚫 No existe entrada abierta — no es posible registrar la salida',
  USUARIO_NO_ACTIVO: '🚫 El usuario no está activo — acceso denegado',
  USUARIO_NO_ENCONTRADO: '🚫 Usuario no encontrado',
  VEHICULO_NO_ENCONTRADO: '🚫 Vehículo no encontrado',
  GUARDIA_NO_ASIGNADA: '🚫 Guardia no asignada al usuario — operación bloqueada',
  GUARDIA_INACTIVA: '🚫 La guardia no está activa',
  CODIGO_DUPLICADO: '🚫 Ya existe una guardia con ese código',
  GUARDIA_CON_MOVIMIENTOS: '🚫 No se puede eliminar la guardia porque tiene movimientos registrados',
  ERROR_GENERICO: '❌ Ha ocurrido un error. Por favor intente nuevamente',
  GUARDIA_NO_SELECCIONADA: '🚫 Debe seleccionar una guardia',
  IDENTIFICADOR_REQUERIDO: '🚫 Debe ingresar un identificador',
  CAMPOS_REQUERIDOS: '🚫 Debe completar todos los campos obligatorios',
  MOTIVO_RESTRICCION_REQUERIDO: '🚫 Debe indicar el motivo de la restricción'
};

export const MENSAJES_ADVERTENCIA = {
  USUARIO_CON_VEHICULOS: '⚠️ Este usuario tiene vehículo(s). ¿Desea registrar también el ingreso del vehículo?',
  ENTRADA_ABIERTA_24H: '⚠️ El usuario tiene una entrada abierta desde hace más de 24 horas',
  MULTIPLES_ENTRADAS: '⚠️ Usuario tiene múltiples entradas abiertas (inconsistencia detectada)',
  CONFIRMAR_DESACTIVAR: '¿Está seguro? Los usuarios no podrán usar esta guardia mientras esté inactiva',
  CONFIRMAR_ELIMINAR: '¿Está seguro? Esta acción no se puede deshacer',
  CONFIRMAR_ACTIVAR: '¿Está seguro que desea activar esta guardia?'
};

export const MENSAJES_INFO = {
  VALIDACION_EXITOSA: 'ℹ️ Validación completada',
  ENTRADA_ABIERTA_INFO: (timestamp: string, guardia: string, horas: number, minutos: number) =>
    `ℹ️ El usuario tiene una entrada abierta desde: ${timestamp} en ${guardia}. Tiempo transcurrido: ${horas}h ${minutos}m`,
  ACCESO_DENEGADO: '🚫 ACCESO DENEGADO',
  USUARIO_INACTIVO: 'El usuario no está activo en el sistema',
  GUARDIA_RESTRINGIDA: (motivo?: string) =>
    `Guardia no asignada al usuario — operación bloqueada${motivo ? '\nMotivo: ' + motivo : ''}`
};

export const LABELS = {
  // Formulario Crear/Editar Guardia
  SECCION: 'Sección',
  CODIGO: 'Código',
  NOMBRE: 'Nombre',
  DESCRIPCION: 'Descripción',
  UBICACION: 'Ubicación',
  PERMITE_ENTRADA: 'Permite registrar entradas',
  PERMITE_SALIDA: 'Permite registrar salidas',
  ACTIVA: 'Activa',

  // Formulario Control Ingreso
  GUARDIA_ACTUAL: 'Guardia Actual',
  IDENTIFICADOR: 'Documento / Placa / QR',
  OBSERVACIONES: 'Observaciones',
  INCLUIR_VEHICULO: 'Incluir vehículo',

  // Estados
  ESTADO_ACTIVO: 'ACTIVO',
  ESTADO_INACTIVO: 'INACTIVO',
  ESTADO_BLOQUEADO: 'BLOQUEADO',
  ESTADO_RESTRINGIDO: 'RESTRINGIDO',

  // Tipos de movimiento
  ENTRADA: 'ENTRADA',
  SALIDA: 'SALIDA',

  // Botones
  BTN_GUARDAR: 'Guardar',
  BTN_CANCELAR: 'Cancelar',
  BTN_BUSCAR: 'Buscar',
  BTN_REGISTRAR_ENTRADA: '✅ Registrar Entrada',
  BTN_REGISTRAR_SALIDA: '🚪 Registrar Salida',
  BTN_ACTIVAR: 'Activar',
  BTN_DESACTIVAR: 'Desactivar',
  BTN_ELIMINAR: 'Eliminar',
  BTN_NUEVA_GUARDIA: '+ Nueva Guardia',
  BTN_EDITAR: 'Editar',
  BTN_VER: 'Ver',
  BTN_EXPORTAR: 'Exportar',
  BTN_LIMPIAR: 'Limpiar',

  // Placeholders
  PH_BUSCAR_USUARIO: 'Nombre, documento o username',
  PH_CODIGO: 'GUARDIA-ENTRADA-PRINCIPAL',
  PH_NOMBRE: 'Guardia Entrada Principal',
  PH_DESCRIPCION: 'Descripción detallada de la guardia',
  PH_UBICACION: 'Edificio A, Piso 1',
  PH_IDENTIFICADOR: 'Ingrese documento, placa o escanee QR',
  PH_OBSERVACIONES: 'Observaciones sobre el ingreso/salida',
  PH_MOTIVO_RESTRICCION: 'Indique el motivo de la restricción'
};

export const AYUDA = {
  SECCION: 'Sección a la que pertenecerá la guardia',
  CODIGO: 'Código único identificador (solo mayúsculas, números, guiones)',
  IDENTIFICADOR: 'Presione Enter o click en Buscar'
};

