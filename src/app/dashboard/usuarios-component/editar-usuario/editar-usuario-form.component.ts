import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, Usuario } from '../../../service/usuario-service/usuarios-service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-editar-usuario-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TooltipModule],
  templateUrl: './editar-usuario-form.component.html',
  styleUrls: ['./editar-usuario-form.component.css'],
  providers: [MessageService]
})
export class EditarUsuarioFormComponent implements OnInit, OnChanges {
  @Input() correo: string = '';
  usuario: Usuario | null = null;
  mensaje: string = '';
  roles: string[] = ['USUARIO', 'GUARDIA', 'ADMIN'];
  estados: string[] = ['ACTIVO', 'INACTIVO'];
  documentoTipos: string[] = ['CC', 'TI', 'CE', 'PAS'];
  intentoGuardar: boolean = false;
  usuarioLogueado: Usuario | null = null;
  busqueda: string = '';
  snackbarVisible: boolean = false;
  snackbarMensaje: string = '';

  constructor(
    private usuariosService: UsuariosService,
    private router: Router,
    private messageService: MessageService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.usuarioLogueado = { rol: 'ADMIN' } as Usuario;
    // Si no hay input, obtener de la ruta
    if (!this.correo) {
      this.correo = this.route.snapshot.paramMap.get('correo') || '';
    }
    if (this.correo) {
      this.cargarUsuarioPorCorreo();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['correo'] && changes['correo'].currentValue) {
      this.cargarUsuarioPorCorreo();
    }
  }

  cargarUsuarioPorCorreo() {
    if (!this.correo) {
      this.usuario = null;
      return;
    }
    this.usuariosService.getUsuarios().subscribe((usuarios: Usuario[]) => {
      this.usuario = usuarios.find((u: Usuario) => u.correo === this.correo) || null;
      this.mensaje = this.usuario ? '' : 'Usuario no encontrado.';
    });
  }

  editarUsuario() {
    if (!this.usuario) return;
    this.intentoGuardar = true;
    // Transformar campos de texto a mayúsculas antes de guardar
    this.usuario.nombreCompleto = this.usuario.nombreCompleto?.toUpperCase() || '';
    this.usuario.documentoNumero = this.usuario.documentoNumero?.toUpperCase() || '';
    this.usuario.casa = this.usuario.casa?.toUpperCase() || '';
    this.usuario.telefono = this.usuario.telefono?.toUpperCase() || '';
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
        next: () => {
          this.mensaje = '';
          this.snackbarMensaje = 'Usuario editado exitosamente.';
          this.snackbarVisible = true;
          setTimeout(() => this.snackbarVisible = false, 3500);
        },
        error: () => {
          this.mensaje = 'Error al editar usuario.';
          this.snackbarMensaje = 'Error al editar usuario.';
          this.snackbarVisible = true;
          setTimeout(() => this.snackbarVisible = false, 3500);
        }
      });
    } else {
      this.mensaje = 'No se encontró el ID del usuario.';
      this.snackbarMensaje = 'No se encontró el ID del usuario.';
      this.snackbarVisible = true;
      setTimeout(() => this.snackbarVisible = false, 3500);
    }
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

  irMostrarTabla() {
    this.router.navigate(['/dashboard/usuarios/ver']);
  }
}
