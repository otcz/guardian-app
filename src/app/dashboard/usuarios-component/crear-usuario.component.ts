import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, Usuario } from '../../service/usuarios-service';
import { Rol, EstadoUsuario, DocumentoTipo } from '../../service/usuario-enums';

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
    passwordHash: '',
    rol: Rol.USUARIO,
    estado: EstadoUsuario.ACTIVO,
    nombreCompleto: '',
    documentoTipo: DocumentoTipo.CC,
    documentoNumero: ''
  };
  roles = Object.values(Rol);
  estados = Object.values(EstadoUsuario);
  documentoTipos = Object.values(DocumentoTipo);
  mensaje: string = '';

  constructor(private usuariosService: UsuariosService) {}

  crearUsuario() {
    this.usuariosService.crearUsuario(this.usuario).subscribe({
      next: () => this.mensaje = 'Usuario creado exitosamente.',
      error: () => this.mensaje = 'Error al crear usuario.'
    });
  }
}
