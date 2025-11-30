import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  GuardiaUsuario,
  AsignarGuardiaDTO,
  RestringirGuardiaDTO,
  PuedeUsarGuardiaDTO
} from '../models/guardia.models';

/**
 * Servicio para gestión de relaciones Guardia-Usuario
 */
@Injectable({
  providedIn: 'root'
})
export class GuardiaUsuarioService {
  private readonly API_URL = '/api/guardias-usuarios';

  constructor(private http: HttpClient) {}

  /**
   * Asignar guardia a usuario
   */
  asignar(
    guardiaId: string,
    usuarioId: string,
    dto?: AsignarGuardiaDTO
  ): Observable<GuardiaUsuario> {
    return this.http.post<GuardiaUsuario>(
      `${this.API_URL}/${guardiaId}/usuarios/${usuarioId}/asignar`,
      dto || {}
    );
  }

  /**
   * Restringir guardia para usuario
   */
  restringir(
    guardiaId: string,
    usuarioId: string,
    dto: RestringirGuardiaDTO
  ): Observable<GuardiaUsuario> {
    return this.http.post<GuardiaUsuario>(
      `${this.API_URL}/${guardiaId}/usuarios/${usuarioId}/restringir`,
      dto
    );
  }

  /**
   * Quitar restricción
   */
  quitarRestriccion(guardiaId: string, usuarioId: string): Observable<GuardiaUsuario> {
    return this.http.put<GuardiaUsuario>(
      `${this.API_URL}/${guardiaId}/usuarios/${usuarioId}/quitar-restriccion`,
      {}
    );
  }

  /**
   * Revocar asignación
   */
  revocar(guardiaId: string, usuarioId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${guardiaId}/usuarios/${usuarioId}`);
  }

  /**
   * Listar guardias disponibles para un usuario (asignadas y no restringidas)
   */
  listarDisponiblesPorUsuario(usuarioId: string): Observable<GuardiaUsuario[]> {
    return this.http.get<GuardiaUsuario[]>(`${this.API_URL}/usuario/${usuarioId}/disponibles`);
  }

  /**
   * Listar guardias restringidas para un usuario
   */
  listarRestringidasPorUsuario(usuarioId: string): Observable<GuardiaUsuario[]> {
    return this.http.get<GuardiaUsuario[]>(`${this.API_URL}/usuario/${usuarioId}/restringidas`);
  }

  /**
   * Listar usuarios con acceso a una guardia
   */
  listarUsuariosPorGuardia(guardiaId: string): Observable<GuardiaUsuario[]> {
    return this.http.get<GuardiaUsuario[]>(`${this.API_URL}/guardia/${guardiaId}/usuarios`);
  }

  /**
   * Verificar si usuario puede usar guardia
   */
  puedeUsar(guardiaId: string, usuarioId: string): Observable<PuedeUsarGuardiaDTO> {
    return this.http.get<PuedeUsarGuardiaDTO>(
      `${this.API_URL}/${guardiaId}/usuarios/${usuarioId}/puede-usar`
    );
  }
}

