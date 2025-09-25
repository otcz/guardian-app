import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type LoginPayload = { username: string; password: string; orgCode?: string };
export type RegisterPayload = {
  orgCode?: string;
  username: string;
  password: string;
  nombres: string;
  apellidos: string;
  documentoIdentidad: string;
  tipoDocumento: string; // CC, TI, etc.
  email?: string;
  telefono?: string;
};
export interface ApiResponse<T> { success: boolean; message: string | null; data: T; timestamp?: string; path?: string }
export interface LoginData { token: string; refreshToken?: string; expiresAt?: string; userId?: number; orgId?: number; username?: string; roles?: string[] }

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  login(data: LoginPayload): Observable<ApiResponse<LoginData>> {
    // Endpoint directo del backend (sin proxy)
    return this.http.post<ApiResponse<LoginData>>('http://localhost:8081/auth/login', data);
  }

  register(data: RegisterPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('http://localhost:8081/auth/register', data);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('username');
    localStorage.removeItem('orgId');
    localStorage.removeItem('roles');
  }
}
