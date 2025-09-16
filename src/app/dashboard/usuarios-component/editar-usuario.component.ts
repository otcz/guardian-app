import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, Usuario } from '../../service/usuarios-service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-editar-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule],
  templateUrl: './editar-usuario.component.html',
  styleUrls: ['./editar-usuario.component.css']
})
export class EditarUsuarioComponent implements OnInit {
  @Input() correo: string = '';
  usuario: Usuario | null = null;
  mensaje: string = '';
  buscarCorreo: string = '';
  usuarioBuscado: boolean = false;
  tipoBusqueda: 'correo' | 'documento' = 'correo';
  valorBusqueda: string = '';
  roles: string[] = ['USUARIO', 'GUARDIA', 'ADMINISTRADOR'];
  estados: string[] = ['ACTIVO', 'INACTIVO'];
  documentoTipos: string[] = ['CC', 'TI', 'CE', 'PAS'];
  intentoGuardar: boolean = false;
  usuarios: Usuario[] = [];
  filtros: any = {
    rol: '',
    estado: '',
    casa: '',
    telefono: ''
  };
  usuariosFiltrados: Usuario[] = [];

  constructor(private usuariosService: UsuariosService) {}

  ngOnInit() {
    if (this.correo) {
      this.usuariosService.getUsuarios().subscribe(usuarios => {
        this.usuario = usuarios.find(u => u.correo === this.correo) || null;
      });
    } else {
      this.usuariosService.getUsuarios().subscribe(usuarios => {
        this.usuarios = usuarios;
        this.usuariosFiltrados = [...usuarios];
      });
    }
  }

  buscarUsuario() {
    this.usuario = null;
    this.mensaje = '';
    this.usuarioBuscado = false;
    if (!this.valorBusqueda || this.valorBusqueda.trim() === '') {
      // Si no hay valor de búsqueda, mostrar todos los usuarios
      this.usuariosService.getUsuarios().subscribe({
        next: usuarios => {
          this.usuarios = usuarios;
          this.usuariosFiltrados = [...usuarios];
          this.usuarioBuscado = true;
        },
        error: () => {
          this.mensaje = 'Error al obtener usuarios.';
          this.usuarioBuscado = true;
        }
      });
      return;
    }
    this.usuarios = [];
    this.usuariosFiltrados = [];
    if (this.tipoBusqueda === 'correo') {
      this.usuariosService.getUsuarioPorCorreo(this.valorBusqueda).subscribe({
        next: usuario => {
          this.usuario = usuario;
          this.usuariosFiltrados = usuario ? [usuario] : [];
          this.usuarioBuscado = true;
        },
        error: () => {
          this.mensaje = 'Usuario no encontrado.';
          this.usuarioBuscado = true;
        }
      });
    } else if (this.tipoBusqueda === 'documento') {
      this.usuariosService.getUsuarioPorDocumento(this.valorBusqueda).subscribe({
        next: usuario => {
          this.usuario = usuario;
          this.usuariosFiltrados = usuario ? [usuario] : [];
          this.usuarioBuscado = true;
        },
        error: () => {
          this.mensaje = 'Usuario no encontrado.';
          this.usuarioBuscado = true;
        }
      });
    }
  }

  aplicarFiltros() {
    this.usuariosFiltrados = this.usuarios.filter(u => {
      return (
        (!this.filtros.rol || u.rol === this.filtros.rol) &&
        (!this.filtros.estado || u.estado === this.filtros.estado) &&
        (!this.filtros.casa || (u.casa && u.casa.toLowerCase().includes(this.filtros.casa.toLowerCase()))) &&
        (!this.filtros.telefono || (u.telefono && u.telefono.toLowerCase().includes(this.filtros.telefono.toLowerCase())))
      );
    });
  }

  detectarTipoBusqueda() {
    if (!this.valorBusqueda) {
      this.tipoBusqueda = 'correo';
      return;
    }
    // Si es solo números, es documento; si tiene letras o @, es correo
    const soloNumeros = /^\d+$/.test(this.valorBusqueda);
    this.tipoBusqueda = soloNumeros ? 'documento' : 'correo';
  }

  editarUsuario() {
    if (!this.usuario) return;
    this.intentoGuardar = true;
    // Validación de todos los campos requeridos (excepto password)
    const camposRequeridos = [
      this.usuario.nombreCompleto,
      this.usuario.documentoTipo,
      this.usuario.documentoNumero,
      this.usuario.correo,
      this.usuario.rol,
      this.usuario.estado,
      this.usuario.casa,
      this.usuario.telefono
    ];
    if (camposRequeridos.some(campo => !campo || campo.toString().trim() === '')) {
      this.mensaje = 'Todos los campos son obligatorios.';
      return;
    }
    // Si el password está vacío, no lo enviamos en la petición
    const usuarioAEnviar: any = { ...this.usuario };
    if (!usuarioAEnviar.password || usuarioAEnviar.password.trim() === '') {
      usuarioAEnviar.password = undefined;
    }
    if (this.usuario.id) {
      this.usuariosService.editarUsuarioPorId(this.usuario.id, usuarioAEnviar).subscribe({
        next: () => this.mensaje = 'Usuario editado exitosamente.',
        error: () => this.mensaje = 'Error al editar usuario.'
      });
    } else {
      this.mensaje = 'No se encontró el ID del usuario.';
    }
  }

  irAEditar(u: Usuario) {
    // Aquí puedes navegar o emitir evento para editar
    // Por ahora solo selecciona el usuario
    this.usuario = { ...u };
    this.mensaje = '';
    this.intentoGuardar = false;
  }

  irAEliminar(u: Usuario) {
    // Aquí puedes navegar o emitir evento para eliminar
    // Por ahora solo muestra mensaje
    this.mensaje = `¿Deseas eliminar al usuario ${u.nombreCompleto}?`;
  }
}
