import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import type { ApiResponse } from './auth.service';

export interface ParamValue {
  id: number;
  orgId: number;
  paramName: string; // ej: TIPOS_LUGAR
  valueText?: string;
  valueNum?: number;
  label?: string; // para listas
  activo: boolean;
  orden: number;
  sectionId?: number | null;
  descripcion?: string;
  porDefecto?: boolean; // agregado: true si proviene de SYSTEM (solo lectura para SUPER_ADMIN/ADMIN)
}

@Injectable({ providedIn: 'root' })
export class ParamValoresService {
  private STORAGE_KEY = 'app:paramValues.v1';
  private subjects = new Map<string, BehaviorSubject<ParamValue[]>>();
  private readonly defsUrl = 'http://localhost:8081/params/admin/defs';

  constructor(private http: HttpClient) {}

  list$(orgId: number, paramName: string): BehaviorSubject<ParamValue[]> {
    const key = this.key(orgId, paramName);
    if (!this.subjects.has(key)) {
      this.subjects.set(key, new BehaviorSubject<ParamValue[]>(this.load(orgId, paramName)));
    }
    return this.subjects.get(key)!;
  }

  // Sincroniza todos los valores (siembra desde backend)
  setAll(orgId: number, paramName: string, items: ParamValue[]) {
    const normalized = (items || []).map((v, i) => ({
      id: v.id ?? this.genId(items) + i,
      orgId,
      paramName,
      label: v.label,
      valueText: v.valueText,
      valueNum: v.valueNum,
      activo: v.activo ?? true,
      orden: v.orden ?? (i + 1),
      sectionId: typeof v.sectionId === 'number' ? v.sectionId : (v.sectionId ?? null),
      descripcion: v.descripcion,
      porDefecto: v.porDefecto === true
    })) as ParamValue[];
    // Dedupe por (orgId, sectionId, valor)
    const seen = new Set<string>();
    const dedup: ParamValue[] = [];
    for (const it of normalized) {
      const valKey = (it.label ?? it.valueText ?? (typeof it.valueNum === 'number' ? String(it.valueNum) : ''));
      const key = `${it.orgId}|${typeof it.sectionId === 'number' ? it.sectionId : 'null'}|${valKey}`;
      if (!seen.has(key)) { seen.add(key); dedup.push(it); }
    }
    this.persist(orgId, paramName, dedup);
    this.subject(orgId, paramName).next(dedup);
  }

  // upsert local (para reflejar cambios inmediatos si se desea)
  upsert(orgId: number, paramName: string, item: Partial<ParamValue> & { id?: number }): ParamValue {
    const list = this.load(orgId, paramName);
    const nextList = list.slice();
    let target: ParamValue;

    if (item.id != null) {
      const idx = nextList.findIndex(x => x.id === item.id);
      if (idx >= 0) {
        const merged: ParamValue = {
          ...nextList[idx],
          ...item,
          orgId,
          paramName,
          id: nextList[idx].id,
          activo: item.activo ?? nextList[idx].activo,
          orden: item.orden ?? nextList[idx].orden,
          porDefecto: typeof item.porDefecto === 'boolean' ? item.porDefecto : nextList[idx].porDefecto
        };
        nextList[idx] = merged;
        target = merged;
      } else {
        // si no existe, crear uno nuevo con defaults
        const nuevo: ParamValue = {
          id: this.genId(nextList),
          orgId,
          paramName,
          label: item.label,
          valueText: item.valueText,
          valueNum: item.valueNum,
          activo: item.activo ?? true,
          orden: item.orden ?? (this.nextOrden(nextList)),
          sectionId: typeof item.sectionId === 'number' ? item.sectionId : (item.sectionId ?? null),
          descripcion: item.descripcion,
          porDefecto: item.porDefecto === true
        };
        nextList.push(nuevo);
        target = nuevo;
      }
    } else {
      const nuevo: ParamValue = {
        id: this.genId(nextList),
        orgId,
        paramName,
        label: item.label,
        valueText: item.valueText,
        valueNum: item.valueNum,
        activo: item.activo ?? true,
        orden: item.orden ?? (this.nextOrden(nextList)),
        sectionId: typeof item.sectionId === 'number' ? item.sectionId : (item.sectionId ?? null),
        descripcion: item.descripcion,
        porDefecto: item.porDefecto === true
      };
      nextList.push(nuevo);
      target = nuevo;
    }

    this.persist(orgId, paramName, nextList);
    this.subject(orgId, paramName).next(nextList);
    return target;
  }

  remove(orgId: number, paramName: string, id: number) {
    const list = this.load(orgId, paramName).filter(v => v.id !== id);
    this.persist(orgId, paramName, list);
    this.subject(orgId, paramName).next(list);
  }

  // Remoto: UPSERT valor (PUT)
  upsertValue(nombre: string, body: { orgId: number; sectionId?: number | null; valor: string; activo?: boolean; descripcion?: string }): Observable<ApiResponse<any>> {
    const url = `${this.defsUrl}/${encodeURIComponent(nombre)}/values`;
    return this.http.put<ApiResponse<any>>(url, body);
  }

  // Remoto: DELETE valor
  deleteValue(nombre: string, orgId: number, sectionId?: number | null): Observable<ApiResponse<any>> {
    const q = new URLSearchParams();
    q.set('orgId', String(orgId));
    if (typeof sectionId === 'number') q.set('sectionId', String(sectionId));
    const url = `${this.defsUrl}/${encodeURIComponent(nombre)}/values?${q.toString()}`;
    return this.http.delete<ApiResponse<any>>(url);
  }

  // Remoto: Activar/Desactivar valor (PATCH)
  setActiveValue(nombre: string, body: { orgId: number; sectionId?: number | null; activo: boolean }): Observable<ApiResponse<any>> {
    const url = `${this.defsUrl}/${encodeURIComponent(nombre)}/values/active`;
    // No enviar sectionId si es null/undefined
    const payload: any = { orgId: body.orgId, activo: body.activo };
    if (typeof body.sectionId === 'number') payload.sectionId = body.sectionId;
    return this.http.patch<ApiResponse<any>>(url, payload);
  }

  private subject(orgId: number, paramName: string): BehaviorSubject<ParamValue[]> {
    const key = this.key(orgId, paramName);
    if (!this.subjects.has(key)) {
      this.subjects.set(key, new BehaviorSubject<ParamValue[]>(this.load(orgId, paramName)));
    }
    return this.subjects.get(key)!;
  }

  private key(orgId: number, paramName: string) { return `${this.STORAGE_KEY}:${orgId}:${paramName}`; }

  private load(orgId: number, paramName: string): ParamValue[] {
    try {
      const raw = localStorage.getItem(this.key(orgId, paramName));
      const arr = raw ? (JSON.parse(raw) as ParamValue[]) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  private persist(orgId: number, paramName: string, items: ParamValue[]) {
    localStorage.setItem(this.key(orgId, paramName), JSON.stringify(items));
  }

  private genId(list: ParamValue[]): number {
    return list.reduce((m, x) => Math.max(m, x.id ?? 0), 0) + 1;
  }

  private nextOrden(list: ParamValue[]): number { return list.reduce((m, x) => Math.max(m, x.orden || 0), 0) + 1; }
}
