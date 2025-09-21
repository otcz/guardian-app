import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VehiculosService } from '../../../service/vehiculos-service';
import { UsuariosService, Usuario } from '../../../service/usuario-service/usuarios-service';
import { TipoVehiculo, TipoVehiculoLabels } from '../../../utils/tipos-vehiculo-enums';

@Component({
  selector: 'app-editar-vehiculo',
  templateUrl: './editar-vehiculo.component.html',
  styleUrls: ['./editar-vehiculo.component.css']
})
export class EditarVehiculoComponent implements OnInit {
  vehiculo: any = null;
  tipos: TipoVehiculo[] = Object.values(TipoVehiculo);
  intentoGuardar: boolean = false;
  mensaje: string = '';
  snackbarVisible: boolean = false;
  snackbarMensaje: string = '';
  busqueda: string = '';
  public TipoVehiculoLabels = TipoVehiculoLabels;
  usuarios: Usuario[] = [];

  constructor(
    private vehiculosService: VehiculosService,
    private usuariosService: UsuariosService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Ya no se carga el vehículo automáticamente por id
  }

  buscarVehiculo() {
    this.mensaje = '';
    this.intentoGuardar = false;
    this.vehiculo = null;
    const placa = this.busqueda?.trim().toUpperCase();
    if (!placa) {
      this.mensaje = 'Ingrese la placa del vehículo.';
      return;
    }
    // Siempre cargar usuarios antes de buscar el vehículo
    this.usuariosService.getUsuarios().subscribe((usuarios: Usuario[]) => {
      this.usuarios = usuarios;
      this.buscarVehiculoInterno(placa);
    });
  }

  buscarVehiculoInterno(placa: string) {
    this.vehiculosService.getVehiculos().subscribe((vehiculos: any[]) => {
      const encontrado = vehiculos.find(v => v.placa?.toUpperCase() === placa);
      if (encontrado) {
        this.vehiculo = { ...encontrado };
        // Si existe 'usuario' y tiene id, poblar usuario con esos datos
        if (this.vehiculo.usuario && this.vehiculo.usuario.id) {
          this.vehiculo.usuario = {
            id: this.vehiculo.usuario.id,
            nombreCompleto: this.vehiculo.usuario.nombreCompleto,
            correo: this.vehiculo.usuario.correo
          };
        }
        // Si no tiene usuario, inicializarlo
        if (!this.vehiculo.usuario) {
          this.vehiculo.usuario = { id: null };
        }
        // Si el usuario asignado no está en la lista, agregarlo al inicio
        const usuarioAsignado = this.usuarios.find(u => u.id === this.vehiculo.usuario.id);
        if (!usuarioAsignado && this.vehiculo.usuario.id) {
          this.usuarios = [
            {
              id: this.vehiculo.usuario.id,
              nombreCompleto: this.vehiculo.usuario.nombreCompleto || `ID ${this.vehiculo.usuario.id} (no encontrado)`,
              correo: this.vehiculo.usuario.correo || '',
              password: '',
              rol: '',
              estado: '',
              documentoTipo: '',
              documentoNumero: '',
              casa: '',
              telefono: ''
            },
            ...this.usuarios
          ];
        }
        // Forzar el tipo de id a number para evitar problemas de comparación
        if (this.vehiculo.usuario.id) {
          this.vehiculo.usuario.id = Number(this.vehiculo.usuario.id);
        }
        this.mensaje = '';
        this.intentoGuardar = false;
      } else {
        this.vehiculo = null;
        this.mensaje = 'Vehículo no encontrado.';
      }
    });
  }

  editarVehiculo() {
    if (!this.vehiculo) return;
    this.intentoGuardar = true;
    // Validar campos requeridos
    const campos = [
      this.vehiculo.placa,
      this.vehiculo.tipo,
      this.vehiculo.marca,
      this.vehiculo.modelo,
      this.vehiculo.color,
      this.vehiculo.activo,
      this.vehiculo.usuarioEntity?.id
    ];
    if (campos.some(c => c === undefined || c === null || c.toString().trim() === '')) {
      this.mensaje = 'Todos los campos son obligatorios.';
      return;
    }
    // Transformar a mayúsculas los campos de texto
    this.vehiculo.placa = this.vehiculo.placa?.toUpperCase() || '';
    this.vehiculo.marca = this.vehiculo.marca?.toUpperCase() || '';
    this.vehiculo.modelo = this.vehiculo.modelo?.toUpperCase() || '';
    this.vehiculo.color = this.vehiculo.color?.toUpperCase() || '';
    this.vehiculosService.actualizarVehiculo(this.vehiculo.id, this.vehiculo).subscribe({
      next: () => {
        this.mensaje = '';
        this.snackbarMensaje = 'Vehículo editado exitosamente.';
        this.snackbarVisible = true;
        setTimeout(() => this.snackbarVisible = false, 3500);
      },
      error: () => {
        this.mensaje = 'Error al editar vehículo.';
        this.snackbarMensaje = 'Error al editar vehículo.';
        this.snackbarVisible = true;
        setTimeout(() => this.snackbarVisible = false, 3500);
      }
    });
  }

  irMostrarTabla() {
    this.router.navigate(['/dashboard/vehiculos/ver']);
  }
}
