import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VehiculoCrearRequest {
  usuarioEntity: { id: number };
  placa: string;
  tipo: string;
  color: string;
  marca: string;
  modelo: string;
  activo: boolean;
  fechaRegistro: string;
}

@Injectable({ providedIn: 'root' })
export class VehiculosService {
  private apiUrl = 'http://localhost:8080/api/vehiculos';

  constructor(private http: HttpClient) {}

  crearVehiculo(vehiculo: VehiculoCrearRequest): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.post(`${this.apiUrl}/crear`, vehiculo, { headers });
  }

  getVehiculos(): Observable<any[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get<any[]>(`${this.apiUrl}`, { headers });
  }

  getVehiculoPorId(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
  }

  actualizarVehiculo(id: number, vehiculo: any): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.put(`${this.apiUrl}/${id}`, vehiculo, { headers });
  }

  eliminarVehiculo(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.delete(`${this.apiUrl}/id/${id}`, { headers });
  }

  eliminarVehiculoPorPlaca(placa: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.delete(`${this.apiUrl}/placa/${placa}`, { headers });
  }

  getMisVehiculos(): Observable<any[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get<any[]>(`${this.apiUrl}/mis-vehiculos`, { headers });
  }
}
