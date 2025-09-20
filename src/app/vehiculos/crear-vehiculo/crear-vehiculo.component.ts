import { Component, OnInit } from '@angular/core';
import { UsuariosService, Usuario } from '../../service/usuarios-service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface VehiculoForm {
  usuarioId: number | null;
  placa: string;
  tipo: string;
  color: string;
  marca: string;
  modelo: string;
  activo: boolean;
  fechaRegistro: string;
}

@Component({
  selector: 'app-crear-vehiculo',
  templateUrl: './crear-vehiculo.component.html',
  styleUrls: ['./crear-vehiculo.component.css']
})
export class CrearVehiculoComponent implements OnInit {
  usuarios: Usuario[] = [];
  vehiculo: VehiculoForm = {
    usuarioId: null,
    placa: '',
    tipo: '',
    color: '',
    marca: '',
    modelo: '',
    activo: true,
    fechaRegistro: new Date().toISOString().slice(0, 16) // formato yyyy-MM-ddTHH:mm
  };
  tipos = ['CARRO', 'MOTO', 'BICICLETA', 'OTRO'];
  mensaje = '';
  snackbarVisible = false;
  snackbarMensaje = '';

  constructor(private usuariosService: UsuariosService, private http: HttpClient) {}

  ngOnInit() {
    this.usuariosService.getUsuarios().subscribe({
      next: (usuarios: Usuario[]) => this.usuarios = usuarios,
      error: () => this.mensaje = 'Error al cargar usuarios.'
    });
  }

  crearVehiculo() {
    if (!this.vehiculo.usuarioId) {
      this.mensaje = 'Debe seleccionar un usuario.';
      return;
    }
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    const vehiculoAEnviar = {
      usuarioEntity: { id: this.vehiculo.usuarioId },
      placa: this.vehiculo.placa,
      tipo: this.vehiculo.tipo,
      color: this.vehiculo.color,
      marca: this.vehiculo.marca,
      modelo: this.vehiculo.modelo,
      activo: this.vehiculo.activo,
      fechaRegistro: this.vehiculo.fechaRegistro
    };
    this.http.post('/api/vehiculos/crear', vehiculoAEnviar, { headers }).subscribe({
      next: () => {
        this.snackbarMensaje = 'Vehículo creado exitosamente.';
        this.snackbarVisible = true;
        setTimeout(() => this.snackbarVisible = false, 4000);
        this.mensaje = '';
        this.vehiculo = {
          usuarioId: null,
          placa: '',
          tipo: '',
          color: '',
          marca: '',
          modelo: '',
          activo: true,
          fechaRegistro: new Date().toISOString().slice(0, 16)
        };
      },
      error: (err) => {
        this.mensaje = err?.error?.mensaje || 'Error al crear vehículo.';
      }
    });
  }
}
