import { Component, OnInit } from '@angular/core';
import { UsuariosService, Usuario } from '../../service/usuarios-service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface UsuarioAutoComplete extends Usuario {
  nombreCompletoMayus: string;
}

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
  usuarios: UsuarioAutoComplete[] = [];
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
  usuariosFiltrados: UsuarioAutoComplete[] = [];
  usuarioSeleccionado: UsuarioAutoComplete | null = null;

  constructor(private usuariosService: UsuariosService, private http: HttpClient) {}

  ngOnInit() {
    this.usuariosService.getUsuarios().subscribe({
      next: (usuarios: Usuario[]) => {
        this.usuarios = usuarios
          .map(u => ({ ...u, nombreCompletoMayus: u.nombreCompleto.toUpperCase() }))
          .sort((a, b) => a.nombreCompletoMayus.localeCompare(b.nombreCompletoMayus));
        this.usuariosFiltrados = [...this.usuarios];
        if (!usuarios || usuarios.length === 0) {
          this.mensaje = 'No hay usuarios disponibles.';
        }
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
        this.mensaje = err?.error?.mensaje || 'Error al cargar usuarios.';
      }
    });
  }

  filtrarUsuarios(event: any) {
    const query = (event.query || '').toLowerCase().replace(/\s+/g, '');
    this.usuariosFiltrados = query.length === 0
      ? [...this.usuarios]
      : this.usuarios.filter(u =>
          u.nombreCompletoMayus.replace(/\s+/g, '').toLowerCase().includes(query) ||
          (u.documentoTipo + u.documentoNumero).replace(/\s+/g, '').toLowerCase().includes(query) ||
          (u.documentoNumero || '').replace(/\s+/g, '').toLowerCase().includes(query)
        );
  }

  limpiarSeleccionUsuario() {
    this.usuarioSeleccionado = null;
    this.vehiculo.usuarioId = null;
  }

  asignarUsuario(event: any) {
    this.vehiculo.usuarioId = event.value?.id || null;
  }

  crearVehiculo() {
    if (!this.vehiculo.usuarioId) {
      this.mensaje = 'Debe seleccionar un usuario.';
      return;
    }
    // Ya no se transforma a mayúsculas aquí, solo se envía el valor del modelo
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

  // Si el usuario ya estaba seleccionado (por ejemplo, en edición), sincronizar selección
  ngAfterViewInit() {
    if (this.vehiculo.usuarioId) {
      const user = this.usuarios.find(u => u.id === this.vehiculo.usuarioId);
      if (user) this.usuarioSeleccionado = user;
    }
  }
}
