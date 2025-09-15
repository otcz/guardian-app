/**
 * Centraliza los endpoints de la API REST del backend.
 * Agrupa las rutas por entidad para facilitar su uso y mantenimiento.
 */
export namespace ApiEndpoints {
  /** Endpoints para gestión de usuarios */
  export namespace Usuario {
    export const BASE = '/api/usuarios';
    export const POR_ID = '/{id}';
    export const POR_CORREO = '/correo/{correo}';
    export const POR_ROL = '/rol/{rol}';
    export const POR_ESTADO = '/estado/{estado}';
    export const POR_DOCUMENTO = '/documento/{documentoNumero}';
    export const ASIGNAR_VEHICULO = '/{usuarioId}/asignar-vehiculo';
  }

  /** Endpoints para gestión de vehículos */
  export namespace Vehiculo {
    export const BASE = '/api/vehiculos';
    export const POR_ID = '/{id}';
    export const POR_PLACA = '/{placa}';
    export const POR_USUARIO = '/usuario/{usuarioId}';
    export const POR_TIPO = '/tipo/{tipo}';
    export const ACTIVOS_POR_USUARIO = '/usuario/{usuarioId}/activos';
    export const CREAR = '/crear'; // POST /api/vehiculos/crear
    export const MODIFICAR = '/{id}'; // PUT /api/vehiculos/{id}
    export const ELIMINAR = '/{id}'; // DELETE /api/vehiculos/{id}
  }

  /** Endpoints para gestión de invitados */
  export namespace Invitado {
    export const BASE = '/api/invitados';
    export const POR_ID = BASE + '/{id}';
    export const POR_QR = BASE + '/qr/{codigoQR}';
    export const POR_USUARIO = BASE + '/usuario/{usuarioId}';
    export const ACTIVOS_POR_USUARIO = BASE + '/usuario/{usuarioId}/activos';
    export const VALIDOS = BASE + '/validos';
  }

  /** Endpoints para registros de acceso */
  export namespace RegistroAcceso {
    export const BASE = '/api/registros';
    export const POR_USUARIO = '/usuario/{usuarioId}';
    export const POR_INVITADO = '/invitado/{invitadoId}';
    export const POR_VEHICULO = '/vehiculo/{vehiculoId}';
    export const POR_RESULTADO = '/resultado/{resultado}';
    export const ENTRE_FECHAS = '/fechas';
  }

  /** Endpoints para autenticación y perfil */
  export namespace Auth {
    export const BASE = '/api/auth';
    export const LOGIN = '/login';
    export const CAMBIO_PASSWORD = '/cambio-password';
    export const PERFIL = '/perfil';
  }

  /** Endpoints para gestión de QR */
  export namespace Qr {
    export const BASE = '/api/qr';
    export const GENERAR = '/generar';
    export const VALIDAR = '/validar';
  }
}

