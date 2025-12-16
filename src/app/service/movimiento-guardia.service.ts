import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MovimientoGuardia,
  RegistrarEntradaDTO,
  RegistrarSalidaDTO,
  ValidacionUsuarioDTO,
  ValidacionVehiculoDTO,
  ConteoEntradasDTO
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
   * Validar usuario por número de identificación
   * @param identificacion Número de documento (cédula, pasaporte, DNI, etc.) o UUID
   * @param guardiaId ID de la guardia donde se valida (opcional pero recomendado)
   * @returns Observable con información de validación del usuario (incluye campo 'id' con UUID)
   * @description Endpoint: GET /api/movimientos-guardia/validar-usuario-identificacion/{identificacion}
   * @version 2.2 - Incluye guardiaId como query param para que backend determine acción permitida
   */
  validarUsuario(identificacion: string, guardiaId?: string): Observable<ValidacionUsuarioDTO> {
    const valor = identificacion.trim();
    let url = `${this.API_URL}/validar-usuario-identificacion/${valor}`;

    // Si se proporciona guardiaId, enviarlo al backend como query param
    if (guardiaId) {
      url += `?guardiaId=${guardiaId}`;
    }

    return this.http.get<ValidacionUsuarioDTO>(url);
  }

  /**
   * Validar usuario por número de identificación (ALIAS)
   * @param identificacion Número de documento (cédula, pasaporte, DNI, etc.)
   * @param guardiaId ID de la guardia donde se valida (opcional)
   * @returns Observable con información de validación
   * @description Alias del método validarUsuario() para compatibilidad con código existente
   */
  validarUsuarioPorIdentificacion(identificacion: string, guardiaId?: string): Observable<ValidacionUsuarioDTO> {
    return this.validarUsuario(identificacion, guardiaId);
  }

  /**
   * Validar vehículo (no registra movimiento)
   */
  validarVehiculo(vehiculoId: string): Observable<ValidacionVehiculoDTO> {
    return this.http.get<ValidacionVehiculoDTO>(`${this.API_URL}/validar-vehiculo/${vehiculoId}`);
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
   * Detectar todas las entradas abiertas (inconsistencias)
   */
  listarTodasEntradasAbiertas(): Observable<MovimientoGuardia[]> {
    return this.http.get<MovimientoGuardia[]>(`${this.API_URL}/entradas-abiertas`);
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

