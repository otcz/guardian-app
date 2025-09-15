import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, Usuario } from '../../service/usuarios-service';

@Component({
  selector: 'app-editar-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-usuario.component.html',
  styleUrls: ['./editar-usuario.component.css']
})
export class EditarUsuarioComponent implements OnInit {
  @Input() correo: string = '';
  usuario: Usuario | null = null;
  mensaje: string = '';

  constructor(private usuariosService: UsuariosService) {}

  ngOnInit() {
    if (this.correo) {
      this.usuariosService.getUsuarios().subscribe(usuarios => {
        this.usuario = usuarios.find(u => u.correo === this.correo) || null;
      });
    }
  }

  editarUsuario() {
    if (this.usuario) {
      this.usuariosService.editarUsuario(this.usuario.correo, this.usuario).subscribe({
        next: () => this.mensaje = 'Usuario editado exitosamente.',
        error: () => this.mensaje = 'Error al editar usuario.'
      });
    }
  }
}
