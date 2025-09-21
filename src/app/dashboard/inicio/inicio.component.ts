import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehiculosService } from '../../service/vehiculos-service';
import { UsuariosService } from '../../service/usuario-service/usuarios-service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements OnInit {
  totalUsuarios: number = 0;
  totalVehiculos: number = 0;
  cargando: boolean = true;

  constructor(
    private vehiculosService: VehiculosService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.usuariosService.getUsuarios().subscribe({
      next: usuarios => {
        this.totalUsuarios = usuarios.length;
        this.vehiculosService.getVehiculos().subscribe({
          next: vehiculos => {
            this.totalVehiculos = vehiculos.length;
            this.cargando = false;
          },
          error: () => { this.cargando = false; }
        });
      },
      error: () => { this.cargando = false; }
    });
  }
}
