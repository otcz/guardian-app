import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { ApiResponse } from './auth.service';

export interface Section { id: number; orgId: number; name: string; code?: string; description?: string; }

@Injectable({ providedIn: 'root' })
export class SectionsService {
  private readonly base = 'http://localhost:8081';
  constructor(private http: HttpClient) {}
  private org(): number { return Number(localStorage.getItem('orgId') ?? '0'); }

  list(): Observable<Section[]> {
    const url = `${this.base}/orgs/${encodeURIComponent(String(this.org()))}/sections`;
    return this.http.get<ApiResponse<Section[]>>(url).pipe(map((r: any) => (Array.isArray(r?.data) ? r.data : (r ?? [])) as Section[]));
  }
}

