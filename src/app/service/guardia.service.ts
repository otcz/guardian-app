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
   * Listar guardias de una sección específica
   * Endpoint: GET /api/guardias/seccion/{seccionId}
   * Permisos: ITEM_LISTAR_GUARDIAS
   */
  listarPorSeccion(seccionId: string): Observable<Guardia[]> {
    return this.http.get<Guardia[]>(`${this.API_URL}/seccion/${seccionId}`);
  }

  /**
   * Listar solo guardias activas de una sección
   * Endpoint: GET /api/guardias/seccion/{seccionId}/activas
   * Permisos: ITEM_LISTAR_GUARDIAS, ITEM_CONTROL_DE_INGRESO_Y_SALIDA
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
   * Buscar guardias con filtros múltiples
   */
  buscar(filtros: {
    organizacionId?: string;
    seccionId?: string;
    codigo?: string;
    nombre?: string;
    activa?: boolean;
  }): Observable<Guardia[]> {
    let params = new HttpParams();

    if (filtros.organizacionId) params = params.set('organizacionId', filtros.organizacionId);
    if (filtros.seccionId) params = params.set('seccionId', filtros.seccionId);
    if (filtros.codigo) params = params.set('codigo', filtros.codigo);
    if (filtros.nombre) params = params.set('nombre', filtros.nombre);
    if (filtros.activa !== undefined) params = params.set('activa', filtros.activa.toString());

    return this.http.get<Guardia[]>(`${this.API_URL}/buscar`, { params });
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

