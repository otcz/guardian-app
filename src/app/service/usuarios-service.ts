import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Usuario {
  correo: string;
  passwordHash: string;
  rol: string;
  estado: string;
  nombreCompleto: string;
  documentoTipo: string;
  documentoNumero: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private apiUrl = 'http://localhost:8080/api/usuarios';

  constructor(private http: HttpClient) {}

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  crearUsuario(usuario: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, usuario);
  }

  editarUsuario(correo: string, usuario: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${correo}`, usuario);
  }

  eliminarUsuario(correo: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${correo}`);
  }
}

