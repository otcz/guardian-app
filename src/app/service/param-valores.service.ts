import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ParamValue {
  id: number;
  orgId: number;
  paramName: string; // ej: TIPOS_LUGAR
  valueText?: string;
  valueNum?: number;
  label?: string; // para listas
  activo: boolean;
  orden: number;
}

@Injectable({ providedIn: 'root' })
export class ParamValoresService {
  private STORAGE_KEY = 'app:paramValues.v1';
  private subjects = new Map<string, BehaviorSubject<ParamValue[]>>();

  list$(orgId: number, paramName: string): BehaviorSubject<ParamValue[]> {
    const key = this.key(orgId, paramName);
    if (!this.subjects.has(key)) {
      this.subjects.set(key, new BehaviorSubject<ParamValue[]>(this.load(orgId, paramName)));
    }
    return this.subjects.get(key)!;
  }

  // upsert flexible: si viene id, fusiona con existente; si no, crea con defaults
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
          orden: item.orden ?? nextList[idx].orden
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
          orden: item.orden ?? (this.nextOrden(nextList))
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
        orden: item.orden ?? (this.nextOrden(nextList))
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
