import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ParamValueTipo = 'LIST' | 'TEXT' | 'NUM';
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

  seedIfEmpty(orgId: number, paramName: string, tipo: ParamValueTipo) {
    const current = this.load(orgId, paramName);
    if (current.length === 0) {
      const seeded = this.defaultSeed(orgId, paramName, tipo);
      this.persist(orgId, paramName, seeded);
      this.subject(orgId, paramName).next(seeded);
    }
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

  private defaultSeed(orgId: number, paramName: string, tipo: ParamValueTipo): ParamValue[] {
    const mk = (label: string, orden: number, activo = true): ParamValue => ({ id: orden, orgId, paramName, label, activo, orden });
    const singleNum = (val: number): ParamValue => ({ id: 1, orgId, paramName, valueNum: val, activo: true, orden: 1 });
    const singleText = (val: string): ParamValue => ({ id: 1, orgId, paramName, valueText: val, activo: true, orden: 1 });

    switch (paramName) {
      case 'TIPOS_LUGAR':
        return ['Casa','Apartamento','Oficina','Bodega'].map((v, i) => mk(v, i + 1));
      case 'TIPOS_DOCUMENTO_IDENTIDAD':
        return ['CC','TI','RC','Pasaporte'].map((v, i) => mk(v, i + 1));
      case 'ESTADO_USUARIO':
        return ['Activo','Inactivo','Bloqueado','Pendiente'].map((v, i) => mk(v, i + 1));
      case 'ESTADO_VEHICULO':
        return ['Activo','Inactivo','Bloqueado'].map((v, i) => mk(v, i + 1));
      case 'NIVELES_ALERTA':
        return ['Verde','Amarillo','Rojo'].map((v, i) => mk(v, i + 1));
      case 'HORARIO_PERMITIDO_ACCESO':
        return [singleText('08:00-18:00')];
      case 'DURACION_TOKEN_INGRESO':
        return [singleNum(1080)];
      case 'DURACION_TOKEN_ACCESO_SISTEMA':
        return [singleNum(180)];
      case 'TIEMPO_EXPIRACION_INVITADO':
        return [singleNum(1440)];
      case 'MAX_SECCIONES_POR_USUARIO':
        return [singleNum(3)];
      default:
        if (tipo === 'LIST') return [];
        if (tipo === 'NUM') return [singleNum(0)];
        return [singleText('')];
    }
  }
}
