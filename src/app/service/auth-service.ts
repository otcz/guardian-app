import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiEndpoints } from '../utils/api-endpoints';

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  rol?: string;
  correo?: string;
}

/**
 * Servicio para la autenticación y gestión de sesión de usuarios.
 *
 * @author OSCAR TOMAS CARRILLO ZULETA
 * @version 1.0.0
 * @since 2025-09-14
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /**
   * URL base del backend para autenticación.
   */
  private readonly baseUrl = 'http://localhost:8080';

  private rolSubject = new BehaviorSubject<string>(localStorage.getItem('rol') || 'USUARIO');

  /**
   * Observable del rol actual del usuario.
   */
  public rol$ = this.rolSubject.asObservable();

  /**
   * Devuelve el rol actual del usuario (sincrónico).
   */
  public getRol(): string {
    return this.rolSubject.value;
  }

  /**
   * Actualiza el rol del usuario (por ejemplo, tras login/logout).
   */
  public setRol(rol: string) {
    this.rolSubject.next(rol);
    localStorage.setItem('rol', rol);
  }

  /**
   * Constructor del servicio de autenticación.
   * @param http Cliente HTTP para peticiones REST.
   */
  constructor(protected http: HttpClient) {}

  /**
   * Realiza el login del usuario.
   * @param data Credenciales de acceso (usuario y password).
   * @returns Observable<LoginResponse> Respuesta del backend con token y datos de usuario.
   */
  public login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      this.baseUrl + ApiEndpoints.Auth.BASE + ApiEndpoints.Auth.LOGIN,
      data
    ).pipe(
      map(resp => {
        if (resp.rol) {
          this.setRol(resp.rol);
        }
        return resp;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Maneja los errores de las peticiones HTTP.
   * @param error Error HTTP recibido.
   * @returns Observable<never> Lanza un error con mensaje personalizado.
   */
  protected handleError(error: HttpErrorResponse): Observable<never> {
    let msg = 'Error de conexión';
    if (error.error?.message) {
      msg = error.error.message;
    } else if (error.status === 401) {
      msg = 'Credenciales incorrectas';
    }
    return throwError(() => new Error(msg));
  }
}
