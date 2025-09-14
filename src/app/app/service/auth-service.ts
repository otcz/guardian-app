import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiEndpoints } from '../utils/api-endpoints';

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  usuario?: any;
  // Puedes agregar más campos según la respuesta de tu backend
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      this.baseUrl + ApiEndpoints.Auth.BASE + ApiEndpoints.Auth.LOGIN,
      data
    ).pipe(
      map(resp => resp),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let msg = 'Error de conexión';
    if (error.error?.message) {
      msg = error.error.message;
    } else if (error.status === 401) {
      msg = 'Credenciales incorrectas';
    }
    return throwError(() => new Error(msg));
  }
}
