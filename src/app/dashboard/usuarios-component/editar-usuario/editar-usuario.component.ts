import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, Usuario } from '../../../service/usuarios-service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Router, ActivatedRoute } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { BuscarUsuarioFormComponent } from '../buscar-suaurio/buscar-usuario-form.component';

@Component({
  selector: 'app-editar-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, TooltipModule, DialogModule, ToastModule, BuscarUsuarioFormComponent],
  providers: [MessageService],
  templateUrl: './editar-usuario.component.html',
  styleUrls: ['./editar-usuario.component.css']
})
export class EditarUsuarioComponent implements OnInit {
  @Input() correo: string = '';
  usuario: Usuario | null = null;
  mensaje: string = '';
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  usuarioLogueado: Usuario | null = null;

  constructor(
    private usuariosService: UsuariosService,
    private router: Router,
    private messageService: MessageService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.usuarioLogueado = { rol: 'ADMIN' } as Usuario;

    this.route.paramMap.subscribe(params => {
      this.correo = params.get('correo') || '';
      if (this.correo) {
        // No cargar usuario aquí, el formulario hijo lo hace
      } else {
        this.usuariosService.getUsuarios().subscribe(usuarios => {
          this.usuarios = usuarios;
          this.usuariosFiltrados = [...usuarios];
        });
      }
    });
  }


  onGlobalFilterInput(event: Event, dt: any) {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      dt.filterGlobal(value, 'contains');
    } else {
      dt.filterGlobal('', 'contains');
    }
  }

  verUsuario(u: Usuario) {
    // Navega al componente de solo vista (EditarUsuarioComponent)
    this.router.navigate(['/dashboard/usuarios/ver', u.correo]);
  }

  editarUsuario(u: Usuario) {
    // Mostrar el formulario de edición tipo "buscar usuario"
    this.router.navigate(['/dashboard/usuarios/editar', u.correo]);
  }

  displayConfirm: boolean = false;
  selectedUsuario: Usuario | null = null;
  // Mensaje dinámico para el diálogo, generado a partir del usuario seleccionado
  get confirmMessage(): string {
    if (!this.selectedUsuario) return '';
    return `¿Deseas eliminar al usuario "${this.selectedUsuario.nombreCompleto}" (${this.selectedUsuario.correo})?`;
  }

  confirmarEliminarUsuario(usuario: Usuario) {
    this.selectedUsuario = usuario;
    this.displayConfirm = true;
  }

  onConfirmYes() {
    if (!this.selectedUsuario) return;
    const correo = this.selectedUsuario.correo;
    this.usuariosService.eliminarUsuario(correo).subscribe({
      next: () => {
        // quitar de los arrays locales
        this.usuarios = this.usuarios.filter(x => x.correo !== correo);
        this.usuariosFiltrados = this.usuariosFiltrados.filter(x => x.correo !== correo);
        this.mensaje = 'Usuario eliminado correctamente.';
        this.displayConfirm = false;
        this.selectedUsuario = null;
        this.messageService.add({severity: 'success', summary: 'Eliminado', detail: 'Usuario eliminado correctamente.'});
      },
      error: (err) => {
        console.error('Error eliminando usuario', err);
        this.mensaje = 'Ocurrió un error al eliminar el usuario.';
        this.displayConfirm = false;
        this.selectedUsuario = null;
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el usuario.'});
      }
    });
  }

  onConfirmNo() {
    // 'No' actúa como una respuesta negativa: no eliminar
    this.mensaje = 'La eliminación fue cancelada.';
    this.displayConfirm = false;
    this.selectedUsuario = null;
    this.messageService.add({severity: 'info', summary: 'Cancelado', detail: 'La eliminación fue cancelada.'});
  }

  onCancel() {
    // 'Cancel' cierra el diálogo sin acciones
    this.displayConfirm = false;
    this.selectedUsuario = null;
    this.messageService.add({severity: 'warn', summary: 'Cerrado', detail: 'Operación cancelada.'});
  }

  eliminarUsuario(u: Usuario) {
    // Mantengo el método por compatibilidad, ahora abre el diálogo
    this.confirmarEliminarUsuario(u);
  }

  volverATabla() {
    this.correo = '';
  }
}
