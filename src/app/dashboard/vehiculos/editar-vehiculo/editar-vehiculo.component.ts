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
    // Si hay un id en la URL, cargar el vehículo automáticamente
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.usuariosService.getUsuarios().subscribe((usuarios: Usuario[]) => {
        this.usuarios = usuarios;
        this.cargarVehiculoPorId(Number(id));
      });
    }
  }

  cargarVehiculoPorId(id: number) {
    this.vehiculosService.getVehiculos().subscribe((vehiculos: any[]) => {
      const encontrado = vehiculos.find(v => v.id === id);
      if (encontrado) {
        this.vehiculo = { ...encontrado };
        // Extraer usuario asignado desde usuarios (nuevo formato)
        let usuarioAsignado = null;
        if (this.vehiculo.usuarios && this.vehiculo.usuarios.length > 0) {
          usuarioAsignado = this.vehiculo.usuarios[0];
        }
        if (usuarioAsignado && usuarioAsignado.id) {
          // Normalizar usuario asignado si es necesario
          const usuarioNormalizado: Usuario = {
            ...usuarioAsignado,
            documentoNumero: usuarioAsignado.documentoNumero || usuarioAsignado.documentoIdentidad || '',
          };
          // Buscar el usuario en la lista de usuarios
          let usuarioEnLista = this.usuarios.find(u => u.id === usuarioNormalizado.id);
          if (!usuarioEnLista) {
            this.usuarios.push(usuarioNormalizado);
            usuarioEnLista = this.usuarios.find(u => u.id === usuarioNormalizado.id);
          }
          if (usuarioEnLista) {
            this.vehiculo.usuario = usuarioEnLista;
            this.vehiculo.usuarioId = usuarioEnLista.id;
          } else {
            this.vehiculo.usuario = { id: null };
            this.vehiculo.usuarioId = null;
          }
        } else {
          this.vehiculo.usuario = { id: null };
          this.vehiculo.usuarioId = null;
        }
        this.mensaje = '';
        this.intentoGuardar = false;
      } else {
        this.vehiculo = null;
        this.mensaje = 'Vehículo no encontrado.';
      }
    });
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
      console.log('Respuesta del backend buscarVehiculo:', encontrado);
      if (encontrado) {
        this.vehiculo = { ...encontrado };
        // Extraer usuario asignado desde vehiculoUsuarios si existe
        let usuarioAsignado = null;
        if (this.vehiculo.vehiculoUsuarios && this.vehiculo.vehiculoUsuarios.length > 0) {
          usuarioAsignado = this.vehiculo.vehiculoUsuarios[0].usuario;
        }
        if (usuarioAsignado && usuarioAsignado.id) {
          let usuarioEnLista = this.usuarios.find(u => u.id === usuarioAsignado.id);
          if (!usuarioEnLista) {
            usuarioEnLista = { ...usuarioAsignado } as Usuario;
            this.usuarios = [usuarioEnLista, ...this.usuarios];
          }
          this.vehiculo.usuario = usuarioEnLista;
        } else {
          this.vehiculo.usuario = { id: null };
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

    // Limpiar y validar campos de texto
    const placa = (this.vehiculo.placa || '').toString().trim().toUpperCase();
    const tipo = this.vehiculo.tipo;
    const marca = (this.vehiculo.marca || '').toString().trim().toUpperCase();
    const modelo = (this.vehiculo.modelo || '').toString().trim().toUpperCase();
    const color = (this.vehiculo.color || '').toString().trim().toUpperCase();
    const activo = this.vehiculo.activo;
    const usuarioId = Number(this.vehiculo.usuarioId);

    // Validación robusta
    if (!placa) {
      this.mensaje = 'La placa es obligatoria.';
      return;
    }
    if (!tipo) {
      this.mensaje = 'El tipo de vehículo es obligatorio.';
      return;
    }
    if (!marca) {
      this.mensaje = 'La marca es obligatoria.';
      return;
    }
    if (!modelo) {
      this.mensaje = 'El modelo es obligatorio.';
      return;
    }
    if (!color) {
      this.mensaje = 'El color es obligatorio.';
      return;
    }
    if (activo === undefined || activo === null) {
      this.mensaje = 'El estado activo es obligatorio.';
      return;
    }
    // Validación corregida para usuarioId
    if (isNaN(usuarioId) || usuarioId <= 0) {
      this.mensaje = 'El usuario es obligatorio.';
      return;
    }

    // Construir el objeto a enviar al backend con la estructura esperada
    const vehiculoAEnviar = {
      placa,
      tipo,
      color,
      marca,
      modelo,
      activo,
      usuarioId
    };
    this.vehiculosService.actualizarVehiculo(this.vehiculo.id, vehiculoAEnviar).subscribe({
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

  onUsuarioSeleccionado(event: any) {
    this.vehiculo.usuarioId = event.value ? event.value.id : null;
  }
}
