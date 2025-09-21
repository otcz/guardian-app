import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { VehiculosService } from '../../../service/vehiculos-service';
import { UsuariosService } from '../../../service/usuario-service/usuarios-service';

@Component({
  selector: 'app-asignar-vehiculo',
  templateUrl: './asignar-vehiculo.component.html',
  styleUrls: ['./asignar-vehiculo.component.css'],
  providers: [MessageService]
})
export class AsignarVehiculoComponent implements OnInit {
  usuarios: any[] = [];
  vehiculos: any[] = [];
  usuarioSeleccionado: number | null = null;
  vehiculoSeleccionado: number | null = null;

  constructor(
    private usuariosService: UsuariosService,
    private vehiculosService: VehiculosService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.cargarUsuarios();
    this.cargarVehiculos();
  }

  cargarUsuarios() {
    this.usuariosService.getUsuarios().subscribe({
      next: (data) => this.usuarios = data,
      error: () => this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios.'})
    });
  }

  cargarVehiculos() {
    this.vehiculosService.getVehiculos().subscribe({
      next: (data) => this.vehiculos = data,
      error: () => this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los vehículos.'})
    });
  }

  asignarVehiculo() {
    if (!this.usuarioSeleccionado || !this.vehiculoSeleccionado) return;
    this.usuariosService.asignarVehiculo(this.usuarioSeleccionado, this.vehiculoSeleccionado).subscribe({
      next: () => {
        this.messageService.add({severity: 'success', summary: 'Éxito', detail: 'Vehículo asignado correctamente.'});
        this.usuarioSeleccionado = null;
        this.vehiculoSeleccionado = null;
      },
      error: () => this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudo asignar el vehículo.'})
    });
  }
}

