import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../service/usuarios-service';

@Component({
  selector: 'app-eliminar-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './eliminar-usuario.component.html',
  styleUrls: ['./eliminar-usuario.component.css']
})
export class EliminarUsuarioComponent {
  @Input() correo: string = '';
  mensaje: string = '';

  constructor(private usuariosService: UsuariosService) {}

  eliminarUsuario() {
    if (this.correo) {
      this.usuariosService.eliminarUsuario(this.correo).subscribe({
        next: () => this.mensaje = 'Usuario eliminado exitosamente.',
        error: () => this.mensaje = 'Error al eliminar usuario.'
      });
    }
  }
}
