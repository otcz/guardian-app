import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';

/**
 * Interfaz para la respuesta de GuardiaUsuario del backend
 */
export interface GuardiaUsuarioRelacion {
  // IDs
  id: string;
  guardiaId: string;
  usuarioId: string;
  seccionId: string;
  organizacionId: string;

  // Estados
  asignada: boolean;
  restringida: boolean;

  // Información adicional
  motivoRestriccion: string | null;
  observaciones: string | null;

  // Datos anidados
  guardiaNombre: string;
  guardiaCodigo: string;
  usuarioNombre: string;
  usuarioUsername: string;
  seccionNombre: string;
}

/**
 * Servicio para consultar relaciones entre guardias y usuarios
 */
@Injectable({
  providedIn: 'root'
})
export class GuardiaUsuarioConsultaService {
  private baseUrl = `${environment.apiBaseUrl}/guardias-usuarios`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth-token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  /**
   * Obtener guardias disponibles (asignadas y no restringidas) para un usuario
   */
  getGuardiasDisponiblesPorUsuario(usuarioId: string): Observable<GuardiaUsuarioRelacion[]> {
    return this.http.get<GuardiaUsuarioRelacion[]>(
      `${this.baseUrl}/usuario/${usuarioId}/disponibles`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener guardias restringidas para un usuario
   */
  getGuardiasRestringidasPorUsuario(usuarioId: string): Observable<GuardiaUsuarioRelacion[]> {
    return this.http.get<GuardiaUsuarioRelacion[]>(
      `${this.baseUrl}/usuario/${usuarioId}/restringidas`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener usuarios asignados a una guardia
   */
  getUsuariosPorGuardia(guardiaId: string): Observable<GuardiaUsuarioRelacion[]> {
    return this.http.get<GuardiaUsuarioRelacion[]>(
      `${this.baseUrl}/guardia/${guardiaId}/usuarios`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Verificar si un usuario puede usar una guardia
   */
  puedeUsarGuardia(guardiaId: string, usuarioId: string): Observable<{ puedeUsar: boolean }> {
    return this.http.get<{ puedeUsar: boolean }>(
      `${this.baseUrl}/${guardiaId}/usuarios/${usuarioId}/puede-usar`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener relación específica entre guardia y usuario
   */
  getRelacion(guardiaId: string, usuarioId: string): Observable<GuardiaUsuarioRelacion> {
    return this.http.get<GuardiaUsuarioRelacion>(
      `${this.baseUrl}/${guardiaId}/usuarios/${usuarioId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener todas las relaciones de una sección
   */
  getRelacionesPorSeccion(seccionId: string): Observable<GuardiaUsuarioRelacion[]> {
    return this.http.get<GuardiaUsuarioRelacion[]>(
      `${this.baseUrl}/seccion/${seccionId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener todas las guardias asignadas a un usuario (disponibles + restringidas)
   */
  getTodasGuardiasPorUsuario(usuarioId: string): Observable<GuardiaUsuarioRelacion[]> {
    // Combinar disponibles y restringidas
    return new Observable(observer => {
      Promise.all([
        this.getGuardiasDisponiblesPorUsuario(usuarioId).toPromise(),
        this.getGuardiasRestringidasPorUsuario(usuarioId).toPromise()
      ]).then(([disponibles, restringidas]) => {
        const todas = [...(disponibles || []), ...(restringidas || [])];
        observer.next(todas);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }
}

