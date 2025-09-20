import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, Usuario } from '../../../service/usuario-service/usuarios-service';
import { Rol, EstadoUsuario, DocumentoTipo } from '../../../utils/usuario-enums';

@Component({
  selector: 'app-crear-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-usuario.component.html',
  styleUrls: ['./crear-usuario.component.css']
})
export class CrearUsuarioComponent {
  usuario: Usuario = {
    correo: '',
    password: '',
    rol: Rol.USUARIO,
    estado: EstadoUsuario.ACTIVO,
    nombreCompleto: '',
    documentoTipo: DocumentoTipo.CC,
    documentoNumero: '',
    casa: '',
    telefono: ''
  };
  roles = Object.values(Rol);
  estados = Object.values(EstadoUsuario);
  documentoTipos = Object.values(DocumentoTipo);
  mensaje: string = '';
  snackbarVisible = false;
  snackbarMensaje = '';

  constructor(private usuariosService: UsuariosService) {}

  crearUsuario() {
    // Transformar campos de texto a mayúsculas antes de enviar
    this.usuario.nombreCompleto = this.usuario.nombreCompleto?.toUpperCase() || '';
    this.usuario.documentoNumero = this.usuario.documentoNumero?.toUpperCase() || '';
    this.usuario.correo = this.usuario.correo?.toUpperCase() || '';
    this.usuario.casa = this.usuario.casa?.toUpperCase() || '';
    const token = localStorage.getItem('token');
    const usuarioAEnviar = {
      ...this.usuario,
      rol: String(this.usuario.rol),
      estado: String(this.usuario.estado),
      documentoTipo: String(this.usuario.documentoTipo)
    };
    this.usuariosService.crearUsuario(usuarioAEnviar).subscribe({
      next: (resp) => {
        // Si el backend retorna un objeto usuario, no tendrá 'mensaje'.
        this.mensaje = 'Usuario creado exitosamente.';
        this.snackbarMensaje = 'Usuario creado exitosamente.';
        this.snackbarVisible = true;
        setTimeout(() => this.snackbarVisible = false, 4000);
      },
      error: (err) => {
        this.mensaje = 'Error al crear usuario.';
        let backendMsg = '';
        if (err.error) {
          try {
            const errorObj = typeof err.error === 'string' ? JSON.parse(err.error) : err.error;
            backendMsg = errorObj.message || errorObj.mensaje || this.mensaje;
          } catch (e) {
            backendMsg = err.error;
          }
        }
        this.snackbarMensaje = backendMsg;
        this.snackbarVisible = true;
        setTimeout(() => this.snackbarVisible = false, 4000);
        console.error('Error backend:', err);
      }
    });
  }
}
