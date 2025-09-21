import { Component } from '@angular/core';
import { VehiculosService } from '../../../service/vehiculos-service';

@Component({
  selector: 'app-eliminar-vehiculo',
  templateUrl: './eliminar-vehiculo.component.html',
  styleUrls: ['./eliminar-vehiculo.component.css']
})
export class EliminarVehiculoComponent {
  id: string = '';
  mensaje: string = '';

  constructor(private vehiculosService: VehiculosService) {}

  eliminarVehiculo() {
    const valor = this.id.trim().toUpperCase();
    if (!valor) {
      this.mensaje = 'Por favor ingrese un ID o una placa válida.';
      return;
    }
    // Si es numérico, eliminar por ID
    if (/^\d+$/.test(valor)) {
      const idNum = Number(valor);
      this.vehiculosService.eliminarVehiculo(idNum).subscribe({
        next: () => {
          this.mensaje = 'Vehículo eliminado exitosamente por ID.';
          this.id = '';
        },
        error: () => this.mensaje = 'Error al eliminar el vehículo por ID.'
      });
    } else if (/^[A-Z0-9-]+$/.test(valor)) {
      // Si es placa, eliminar por placa usando el endpoint /api/vehiculos/{placa}
      this.vehiculosService.eliminarVehiculoPorPlaca(valor).subscribe({
        next: () => {
          this.mensaje = 'Vehículo eliminado exitosamente por placa.';
          this.id = '';
        },
        error: () => this.mensaje = 'Error al eliminar el vehículo por placa.'
      });
    } else {
      this.mensaje = 'Por favor ingrese un ID o una placa válida.';
    }
  }
}
