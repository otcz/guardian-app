// Tipos de dominio para Lugares
export type LugarTipo = 'APARTAMENTO' | 'CASA' | 'ALMACEN' | 'AULA' | 'BODEGA' | 'DEPOSITO' | 'LOCAL' | 'OFICINA' | 'SALON' | 'OTRO' | string;

export interface LugarEntity {
  id: string;
  nombre: string;
  tipoLugar: LugarTipo;
}

export interface CreateLugarRequest {
  nombre: string;
  tipoLugar?: LugarTipo;
}

export interface UpdateLugarRequest {
  nombre?: string;
  tipoLugar?: LugarTipo;
}
