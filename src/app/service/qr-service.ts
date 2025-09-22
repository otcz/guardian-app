import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QrService {
  private readonly baseUrl = 'http://localhost:8080/api/qr/generar';

  constructor(private http: HttpClient) {}

  generarQr(placa?: string): Observable<any> {
    let params = new HttpParams();
    if (placa) {
      params = params.set('placa', placa);
    }
    return this.http.post<any>(this.baseUrl, null, { params });
  }
}

