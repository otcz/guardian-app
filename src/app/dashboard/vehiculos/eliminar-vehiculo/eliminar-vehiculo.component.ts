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
    if (this.id && /^\d+$/.test(this.id)) {
      const idNum = Number(this.id);
      this.vehiculosService.eliminarVehiculo(idNum).subscribe({
        next: () => this.mensaje = 'Vehículo eliminado exitosamente.',
        error: () => this.mensaje = 'Error al eliminar el vehículo.'
      });
    } else {
      this.mensaje = 'Por favor ingrese un ID válido.';
    }
  }
}
