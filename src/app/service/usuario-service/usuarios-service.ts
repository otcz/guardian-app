import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Usuario {
  id?: number;
  correo: string;
  password: string;
  rol: string;
  estado: string;
  nombreCompleto: string;
  documentoTipo: string;
  documentoNumero: string;
  casa: string;
  telefono: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private apiUrl = 'http://localhost:8080/api/usuarios';

  constructor(private http: HttpClient) {}

  getUsuarios(): Observable<Usuario[]> {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
    return this.http.get<Usuario[]>(this.apiUrl, { headers });
  }

  crearUsuario(usuario: Usuario): Observable<Usuario> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.post<Usuario>(this.apiUrl, usuario, { headers });
  }

  editarUsuario(correo: string, usuario: Usuario): Observable<Usuario> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.put<Usuario>(`${this.apiUrl}/${correo}`, usuario, { headers });
  }

  eliminarUsuario(correo: string): Observable<void> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.delete<void>(`${this.apiUrl}/correo/${correo}`, { headers });
  }

  getUsuariosConToken(token: string | null): Observable<Usuario[]> {
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
    return this.http.get<Usuario[]>(this.apiUrl, { headers });
  }

  editarUsuarioPorId(id: number, usuario: Usuario): Observable<Usuario> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, usuario, { headers });
  }

  eliminarUsuarioPorDocumento(documentoNumero: string): Observable<void> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.delete<void>(`${this.apiUrl}/documento/${documentoNumero}`, { headers });
  }

  buscarUsuarioPorCorreoOCedula(termino: string): Observable<Usuario> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    // Se asume que el backend tiene un endpoint que permite buscar por correo o documento
    return this.http.get<Usuario>(`${this.apiUrl}/buscar?termino=${encodeURIComponent(termino)}`, { headers });
  }

  asignarVehiculo(usuarioId: number, vehiculoId: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    // Ajusta el endpoint según tu backend
    return this.http.post(`${this.apiUrl}/${usuarioId}/asignar-vehiculo`, { vehiculoId }, { headers });
  }
}
