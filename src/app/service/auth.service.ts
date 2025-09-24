import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type LoginPayload = { username: string; password: string; orgCode?: string };
export interface ApiResponse<T> { success: boolean; message: string | null; data: T; timestamp?: string; path?: string }
export interface LoginData { token: string; refreshToken?: string; expiresAt?: string; userId?: number; orgId?: number; username?: string; roles?: string[] }

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  login(data: LoginPayload): Observable<ApiResponse<LoginData>> {
    // Usa el proxy de Angular (proxy.conf.json) para evitar CORS y atar al mismo origen
    return this.http.post<ApiResponse<LoginData>>('/auth/login', data);
  }

  loginSystem(data: { username: string; password: string }): Observable<ApiResponse<LoginData>> {
    return this.http.post<ApiResponse<LoginData>>('/system/login', data);
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
