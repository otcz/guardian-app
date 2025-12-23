import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MovimientoGuardia,
  RegistrarEntradaDTO,
  RegistrarSalidaDTO,
  ValidacionUsuarioDTO,
  ValidacionVehiculoDTO,
  ConteoEntradasDTO,
  UsuarioDentroDTO
} from '../models/guardia.models';

/**
 * Servicio para gestión de Movimientos de Guardia (Entrada/Salida)
 */
@Injectable({
  providedIn: 'root'
})
export class MovimientoGuardiaService {
  private readonly API_URL = '/api/movimientos-guardia';

  constructor(private http: HttpClient) {}

  // ========== OPERACIONES PRINCIPALES ==========

  /**
   * Registrar ENTRADA
   */
  registrarEntrada(dto: RegistrarEntradaDTO): Observable<MovimientoGuardia> {
    return this.http.post<MovimientoGuardia>(`${this.API_URL}/entrada`, dto);
  }

  /**
   * Registrar SALIDA
   */
  registrarSalida(dto: RegistrarSalidaDTO): Observable<MovimientoGuardia> {
    return this.http.post<MovimientoGuardia>(`${this.API_URL}/salida`, dto);
  }

  // ========== VALIDACIONES (SOLO LECTURA) ==========

  /**
   * Validar usuario por número de identificación o UUID
   * @param identificacion Número de documento (cédula, pasaporte, DNI, etc.) o UUID
   * @returns Observable con información de validación del usuario
   * @description Endpoint: GET /api/movimientos-guardia/validar-usuario/{usuarioIdOIdentificacion}
   * Acepta tanto UUID como número de identificación
   */
  validarUsuario(identificacion: string): Observable<ValidacionUsuarioDTO> {
    const valor = encodeURIComponent(identificacion.trim());
    return this.http.get<ValidacionUsuarioDTO>(`${this.API_URL}/validar-usuario/${valor}`);
  }

  /**
   * Validar usuario por número de identificación específicamente
   * @param identificacion Número de documento (cédula, pasaporte, DNI, etc.)
   * @returns Observable con información de validación
   * @description Endpoint: GET /api/movimientos-guardia/validar-usuario-identificacion/{identificacion}
   * Busca específicamente por número de identificación
   */
  validarUsuarioPorIdentificacion(identificacion: string): Observable<ValidacionUsuarioDTO> {
    const valor = encodeURIComponent(identificacion.trim());
    return this.http.get<ValidacionUsuarioDTO>(`${this.API_URL}/validar-usuario-identificacion/${valor}`);
  }

  /**
   * Validar vehículo (no registra movimiento)
   */
  validarVehiculo(vehiculoId: string): Observable<ValidacionVehiculoDTO> {
    return this.http.get<ValidacionVehiculoDTO>(`${this.API_URL}/validar-vehiculo/${vehiculoId}`);
  }

  /**
   * 🆕 Validación manual unificada (documento de usuario O placa de vehículo)
   * @param documentoOPlaca Número de documento (cédula) o placa de vehículo
   * @returns Observable con ValidacionManualDTO que indica si es usuario, vehículo o no encontrado
   * @description Endpoint: GET /api/movimientos-guardia/validar-manual/{documentoOPlaca}
   * @version 3.0 - Validación unificada con detección automática
   */
  validarManual(documentoOPlaca: string): Observable<any> {
    const valor = encodeURIComponent(documentoOPlaca.trim());
    return this.http.get<any>(`${this.API_URL}/validar-manual/${valor}`);
  }

  /**
   * 🆕 Buscar vehículo por placa (información completa)
   * @param placa Placa del vehículo
   * @returns Observable con VehiculoCompletoDTO que incluye usuarios asignados y último movimiento
   * @description Endpoint: GET /api/movimientos-guardia/vehiculo/placa/{placa}
   * @version 2.0 - Búsqueda por placa con información completa
   * @permission ITEM_CONTROL_DE_INGRESO_Y_SALIDA o ITEM_VER_MOVIMIENTOS_GUARDIA
   */
  buscarVehiculoPorPlaca(placa: string): Observable<any> {
    const placaNormalizada = encodeURIComponent(placa.trim().toUpperCase());
    return this.http.get<any>(`${this.API_URL}/vehiculo/placa/${placaNormalizada}`);
  }

  // ========== CONSULTAS ==========

  /**
   * Buscar entrada abierta de un usuario
   */
  obtenerEntradaAbierta(usuarioId: string): Observable<MovimientoGuardia | null> {
    return this.http.get<MovimientoGuardia | null>(`${this.API_URL}/entrada-abierta/${usuarioId}`);
  }

  /**
   * Contar entradas abiertas de un usuario
   */
  contarEntradasAbiertas(usuarioId: string): Observable<ConteoEntradasDTO> {
    return this.http.get<ConteoEntradasDTO>(`${this.API_URL}/entradas-abiertas/count/${usuarioId}`);
  }

  /**
   * Listar movimientos de un usuario
   */
  listarPorUsuario(usuarioId: string): Observable<MovimientoGuardia[]> {
    return this.http.get<MovimientoGuardia[]>(`${this.API_URL}/usuario/${usuarioId}`);
  }

  /**
   * Listar movimientos de una guardia
   */
  listarPorGuardia(guardiaId: string): Observable<MovimientoGuardia[]> {
    return this.http.get<MovimientoGuardia[]>(`${this.API_URL}/guardia/${guardiaId}`);
  }

  /**
   * Listar movimientos de una sección
   */
  listarPorSeccion(seccionId: string): Observable<MovimientoGuardia[]> {
    return this.http.get<MovimientoGuardia[]>(`${this.API_URL}/seccion/${seccionId}`);
  }

  /**
   * Listar movimientos con paginación y filtros
   * Endpoint: GET /api/movimientos-guardia
   * @param guardiaId ID de guardia (opcional, null = todas)
   * @param tipo Tipo de movimiento: 'ENTRADA' | 'SALIDA' (opcional, null = todos)
   * @param fechaInicio Fecha inicio en formato ISO-8601 (opcional)
   * @param fechaFin Fecha fin en formato ISO-8601 (opcional)
   * @param page Número de página (0-based)
   * @param size Tamaño de página (default: 20)
   * @param sort Ordenamiento (default: timestampMovimiento,desc)
   */
  listarPaginado(params: {
    guardiaId?: string | null;
    tipo?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();

    if (params.guardiaId) httpParams = httpParams.set('guardiaId', params.guardiaId);
    if (params.tipo) httpParams = httpParams.set('tipo', params.tipo);
    if (params.fechaInicio) httpParams = httpParams.set('fechaInicio', params.fechaInicio);
    if (params.fechaFin) httpParams = httpParams.set('fechaFin', params.fechaFin);
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    if (params.sort) httpParams = httpParams.set('sort', params.sort);

    // Endpoint correcto según documentación del backend
    return this.http.get<any>(`${this.API_URL}`, { params: httpParams });
  }

  /**
   * Detectar todas las entradas abiertas (inconsistencias)
   * @deprecated Usar getUsuariosDentro() en su lugar - Endpoint antiguo sin información completa
   */
  listarTodasEntradasAbiertas(): Observable<MovimientoGuardia[]> {
    return this.http.get<MovimientoGuardia[]>(`${this.API_URL}/entradas-abiertas`);
  }

  /**
   * 🆕 Obtener usuarios que están DENTRO (tienen entrada abierta)
   * @returns Observable con lista de usuarios con entrada sin salida
   * @description Endpoint: GET /api/movimientos-guardia/usuarios-dentro
   * @version 3.0 - Reemplaza el endpoint antiguo /entradas-abiertas
   */
  getUsuariosDentro(): Observable<UsuarioDentroDTO[]> {
    return this.http.get<UsuarioDentroDTO[]>(`${this.API_URL}/usuarios-dentro`);
  }

  /**
   * 🆕 Obtener usuarios que están FUERA (no tienen entrada abierta)
   * @returns Observable con lista de usuarios sin entrada abierta
   * @description Endpoint: GET /api/movimientos-guardia/usuarios-fuera
   * @version 3.0 - Nuevo endpoint para monitoreo completo
   */
  getUsuariosFuera(): Observable<UsuarioDentroDTO[]> {
    return this.http.get<UsuarioDentroDTO[]>(`${this.API_URL}/usuarios-fuera`);
  }

  /**
   * Movimientos por rango de fechas
   */
  listarPorGuardiaYFechas(
    guardiaId: string,
    desde: string,
    hasta: string
  ): Observable<MovimientoGuardia[]> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<MovimientoGuardia[]>(`${this.API_URL}/guardia/${guardiaId}/fechas`, {
      params
    });
  }
}

