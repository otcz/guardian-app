export enum TipoVehiculo {
  CARRO = 'CARRO',
  MOTO = 'MOTO',
  BICICLETA = 'BICICLETA',
  CAMIONETA = 'CAMIONETA'
}

export const TipoVehiculoLabels: Record<TipoVehiculo, string> = {
  [TipoVehiculo.CARRO]: 'CARRO',
  [TipoVehiculo.MOTO]: 'MOTO',
  [TipoVehiculo.BICICLETA]: 'BICICLETA',
  [TipoVehiculo.CAMIONETA]: 'CAMIONETA'
};
