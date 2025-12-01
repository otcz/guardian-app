import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';

/**
 * Request para reporte de guardias por usuario
 */
export interface ReporteGuardiasUsuarioRequest {
  usuarioId: string;
  seccionId: string;
  organizacionId: string;
}

/**
 * Request para reporte de usuarios por guardia
 */
export interface ReporteUsuariosGuardiaRequest {
  guardiaId: string;
  seccionId: string;
  organizacionId: string;
}

/**
 * Servicio para descargar reportes Excel del módulo de Guardias
 *
 * @description
 * Este servicio consume los endpoints del backend que generan reportes Excel
 * con formato profesional. Maneja la descarga de archivos binarios y la
 * generación de nombres de archivo apropiados.
 *
 * @author Frontend Team
 * @version 1.0
 * @since 2025-12-01
 */
@Injectable({
  providedIn: 'root'
})
export class GuardiasReporteService {

  private apiUrl = `${environment.apiBaseUrl}/reportes`;

  constructor(private http: HttpClient) { }

  /**
   * Descarga reporte Excel de guardias asignadas a un usuario
   *
   * @param request - Datos necesarios para generar el reporte
   * @returns Observable con el blob del archivo Excel
   */
  descargarReporteGuardiasUsuario(request: ReporteGuardiasUsuarioRequest): Observable<Blob> {
    return this.http.post(
      `${this.apiUrl}/guardias-usuario`,
      request,
      {
        responseType: 'blob',
        observe: 'body'
      }
    );
  }

  /**
   * Descarga reporte Excel de usuarios autorizados en una guardia
   *
   * @param request - Datos necesarios para generar el reporte
   * @returns Observable con el blob del archivo Excel
   */
  descargarReporteUsuariosGuardia(request: ReporteUsuariosGuardiaRequest): Observable<Blob> {
    return this.http.post(
      `${this.apiUrl}/usuarios-guardia`,
      request,
      {
        responseType: 'blob',
        observe: 'body'
      }
    );
  }

  /**
   * Helper privado para descargar archivo blob en el navegador
   *
   * @param blob - Archivo binario a descargar
   * @param nombreArchivo - Nombre con el que se guardará el archivo
   */
  private descargarArchivo(blob: Blob, nombreArchivo: string): void {
    // Crear URL temporal del blob
    const url = window.URL.createObjectURL(blob);

    // Crear elemento <a> temporal
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;

    // Simular click para iniciar descarga
    link.click();

    // Limpiar URL temporal para liberar memoria
    window.URL.revokeObjectURL(url);
  }

  /**
   * Genera nombre de archivo con fecha actual en formato ISO
   *
   * @param prefijo - Prefijo del archivo (ej: "Informe_Guardias")
   * @param identificador - Identificador único (ej: username o código)
   * @returns Nombre completo del archivo (ej: "Informe_Guardias_USER1_2025-12-01.xlsx")
   */
  private generarNombreArchivo(prefijo: string, identificador: string): string {
    const fecha = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${prefijo}_${identificador}_${fecha}.xlsx`;
  }

  /**
   * Método completo para exportar guardias de un usuario
   * Descarga el archivo con nombre apropiado y maneja el proceso completo
   *
   * @param usuarioId - ID del usuario
   * @param username - Username para nombrar el archivo
   * @param seccionId - ID de la sección
   * @param organizacionId - ID de la organización
   * @returns Observable que completa cuando la descarga termina
   */
  exportarGuardiasUsuario(
    usuarioId: string,
    username: string,
    seccionId: string,
    organizacionId: string
  ): Observable<Blob> {
    const request: ReporteGuardiasUsuarioRequest = {
      usuarioId,
      seccionId,
      organizacionId
    };

    return new Observable(observer => {
      this.descargarReporteGuardiasUsuario(request).subscribe({
        next: (blob) => {
          // Validar que el blob es un Excel válido
          if (blob.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              blob.type === 'application/octet-stream') {

            const nombreArchivo = this.generarNombreArchivo('Informe_Guardias', username);
            this.descargarArchivo(blob, nombreArchivo);

            observer.next(blob);
            observer.complete();
          } else {
            observer.error(new Error('El archivo recibido no es un Excel válido'));
          }
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  /**
   * Método completo para exportar usuarios de una guardia
   * Descarga el archivo con nombre apropiado y maneja el proceso completo
   *
   * @param guardiaId - ID de la guardia
   * @param codigoGuardia - Código de la guardia para nombrar el archivo
   * @param seccionId - ID de la sección
   * @param organizacionId - ID de la organización
   * @returns Observable que completa cuando la descarga termina
   */
  exportarUsuariosGuardia(
    guardiaId: string,
    codigoGuardia: string,
    seccionId: string,
    organizacionId: string
  ): Observable<Blob> {
    const request: ReporteUsuariosGuardiaRequest = {
      guardiaId,
      seccionId,
      organizacionId
    };

    return new Observable(observer => {
      this.descargarReporteUsuariosGuardia(request).subscribe({
        next: (blob) => {
          // Validar que el blob es un Excel válido
          if (blob.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              blob.type === 'application/octet-stream') {

            const nombreArchivo = this.generarNombreArchivo('Informe_Usuarios', codigoGuardia);
            this.descargarArchivo(blob, nombreArchivo);

            observer.next(blob);
            observer.complete();
          } else {
            observer.error(new Error('El archivo recibido no es un Excel válido'));
          }
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  /**
   * Validar tamaño del archivo blob
   * Útil para alertar sobre archivos muy grandes antes de descargar
   *
   * @param blob - Archivo a validar
   * @param maxSizeMB - Tamaño máximo en MB (default: 10MB)
   * @returns true si el tamaño es válido
   */
  validarTamanoArchivo(blob: Blob, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return blob.size <= maxSizeBytes;
  }

  /**
   * Obtener tamaño legible del archivo
   *
   * @param blob - Archivo
   * @returns Tamaño formateado (ej: "2.5 MB")
   */
  obtenerTamanoLegible(blob: Blob): string {
    const bytes = blob.size;

    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

