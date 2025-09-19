import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, Usuario } from '../../../service/usuarios-service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { Router } from '@angular/router';

@Component({
  selector: 'app-editar-usuario-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TooltipModule],
  templateUrl: './editar-usuario-form.component.html',
  styleUrls: ['./editar-usuario-form.component.css']
})
export class EditarUsuarioFormComponent implements OnInit {
  @Input() correo: string = '';
  usuario: Usuario | null = null;
  mensaje: string = '';
  roles: string[] = ['USUARIO', 'GUARDIA', 'ADMIN'];
  estados: string[] = ['ACTIVO', 'INACTIVO'];
  documentoTipos: string[] = ['CC', 'TI', 'CE', 'PAS'];
  intentoGuardar: boolean = false;
  usuarioLogueado: Usuario | null = null;
  busqueda: string = '';

  constructor(private usuariosService: UsuariosService, private router: Router) {}

  ngOnInit() {
    this.usuarioLogueado = { rol: 'ADMIN' } as Usuario;
    if (this.correo) {
      this.usuariosService.getUsuarios().subscribe((usuarios: Usuario[]) => {
        this.usuario = usuarios.find((u: Usuario) => u.correo === this.correo) || null;
      });
    }
  }

  editarUsuario() {
    if (!this.usuario) return;
    this.intentoGuardar = true;
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

  mostrarTabla() {
    this.usuario = null;
    this.mensaje = '';
    this.intentoGuardar = false;
  }

  buscarUsuario() {
    if (!this.busqueda || this.busqueda.trim() === '') {
      this.mensaje = 'Ingrese un correo o identificación.';
      this.usuario = null;
      return;
    }
    this.usuariosService.getUsuarios().subscribe((usuarios: Usuario[]) => {
      const term = this.busqueda.trim().toLowerCase();
      const encontrado = usuarios.find(u =>
        u.correo.toLowerCase() === term ||
        (u.documentoNumero && u.documentoNumero.toLowerCase() === term)
      );
      if (encontrado) {
        this.usuario = { ...encontrado };
        this.mensaje = '';
        this.intentoGuardar = false;
      } else {
        this.usuario = null;
        this.mensaje = 'Usuario no encontrado.';
      }
    });
  }
}
