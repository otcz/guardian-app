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
  documentoNumero: string = '';
  mensaje: string = '';

  constructor(private usuariosService: UsuariosService) {}

  eliminarUsuario() {
    if (this.correo) {
      // Si contiene al menos una letra, eliminar por correo
      if (/[a-zA-Z]/.test(this.correo)) {
        const endpoint = `DELETE /api/usuarios/correo/${this.correo}`;
        console.log('Endpoint a usar:', endpoint);
        this.usuariosService.eliminarUsuario(this.correo).subscribe({
          next: () => this.mensaje = 'Usuario eliminado exitosamente.',
          error: () => this.mensaje = 'Error al eliminar usuario.'
        });
      } else if (/^\d+$/.test(this.correo)) {
        const endpoint = `DELETE /api/usuarios/documento/${this.correo}`;
        console.log('Endpoint a usar:', endpoint);
        this.usuariosService.eliminarUsuarioPorDocumento(this.correo).subscribe({
          next: () => this.mensaje = 'Usuario eliminado exitosamente por documento.',
          error: () => this.mensaje = 'Error al eliminar usuario por documento.'
        });
      } else {
        this.mensaje = 'Por favor ingrese un correo válido o un número de documento válido.';
      }
    }
  }
}
