import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Guardia,
  CrearGuardiaDTO,
  CrearGuardiaConGestorDTO,
  ActualizarGuardiaDTO
} from '../models/guardia.models';

/**
 * Servicio para gestión de Guardias (Puntos de Control)
 */
@Injectable({
  providedIn: 'root'
})
export class GuardiaService {
  private readonly API_URL = '/api/guardias';

  constructor(private http: HttpClient) {}

  /**
   * Listar todas las guardias de una organización
   */
  listarPorOrganizacion(organizacionId: string): Observable<Guardia[]> {
    const params = new HttpParams().set('organizacionId', organizacionId);
    return this.http.get<Guardia[]>(this.API_URL, { params });
  }

  /**
   * Listar guardias de una sección
   */
  listarPorSeccion(seccionId: string): Observable<Guardia[]> {
    return this.http.get<Guardia[]>(`${this.API_URL}/seccion/${seccionId}`);
  }

  /**
   * Listar solo guardias activas de una sección
   */
  listarActivasPorSeccion(seccionId: string): Observable<Guardia[]> {
    return this.http.get<Guardia[]>(`${this.API_URL}/seccion/${seccionId}/activas`);
  }

  /**
   * Obtener una guardia por ID
   */
  obtenerPorId(guardiaId: string): Observable<Guardia> {
    return this.http.get<Guardia>(`${this.API_URL}/${guardiaId}`);
  }

  /**
   * Crear nueva guardia
   */
  crear(dto: CrearGuardiaDTO): Observable<Guardia> {
    return this.http.post<Guardia>(this.API_URL, dto);
  }

  /**
   * Crear nueva guardia con gestor asignado
   */
  crearConGestor(dto: CrearGuardiaConGestorDTO): Observable<Guardia> {
    return this.http.post<Guardia>(`${this.API_URL}/con-gestor`, dto);
  }

  /**
   * Verificar si un código ya existe
   */
  existeCodigo(organizacionId: string, codigo: string): Observable<{ existe: boolean }> {
    const params = new HttpParams()
      .set('organizacionId', organizacionId)
      .set('codigo', codigo);
    return this.http.get<{ existe: boolean }>(`${this.API_URL}/existe-codigo`, { params });
  }

  /**
   * Actualizar guardia
   */
  actualizar(guardiaId: string, dto: ActualizarGuardiaDTO): Observable<Guardia> {
    return this.http.put<Guardia>(`${this.API_URL}/${guardiaId}`, dto);
  }

  /**
   * Activar guardia
   */
  activar(guardiaId: string): Observable<Guardia> {
    return this.http.put<Guardia>(`${this.API_URL}/${guardiaId}/activar`, {});
  }

  /**
   * Desactivar guardia
   */
  desactivar(guardiaId: string): Observable<Guardia> {
    return this.http.put<Guardia>(`${this.API_URL}/${guardiaId}/desactivar`, {});
  }

  /**
   * Eliminar guardia (solo si no tiene movimientos)
   */
  eliminar(guardiaId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${guardiaId}`);
  }

  /**
   * Verificar si un código ya existe en la organización
   */
  verificarCodigoUnico(codigo: string, organizacionId: string): Observable<boolean> {
    return new Observable(observer => {
      this.listarPorOrganizacion(organizacionId).subscribe({
        next: (guardias) => {
          const existe = guardias.some(
            g => g.codigo.toUpperCase() === codigo.toUpperCase()
          );
          observer.next(!existe); // Retorna true si es único
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }
}

