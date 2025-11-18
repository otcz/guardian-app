// Tipos de dominio para Lugares
export type LugarTipo = 'APARTAMENTO' | 'CASA' | 'ALMACEN' | 'AULA' | 'BODEGA' | 'DEPOSITO' | 'LOCAL' | 'OFICINA' | 'SALON' | 'OTRO';

export interface LugarEntity {
  id: string;
  nombre: string;
  tipoLugar: LugarTipo;
  seccionId: string;
  orgId?: string;
}

export interface CreateLugarRequest {
  nombre: string;
  seccionId: string; // requerido según backend
  tipoLugar?: LugarTipo;
}

export interface UpdateLugarRequest {
  nombre?: string;
  tipoLugar?: LugarTipo;
  seccionId?: string; // mover de sección opcional
}
