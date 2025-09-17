import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, Usuario } from '../../service/usuarios-service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

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
  usuarioLogueado: Usuario | null = null;

  constructor(private usuariosService: UsuariosService, private router: Router) {}

  ngOnInit() {
    // Suscribirse a cambios de ruta para forzar la tabla si corresponde
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((event: any) => {
      if (event.urlAfterRedirects && event.urlAfterRedirects.includes('/dashboard/editar-usuario')) {
        this.mostrarTabla();
      }
    });
    // Simulación: obtener usuario logueado (reemplaza por tu AuthService real)
    this.usuarioLogueado = { rol: 'ADMINISTRADOR' } as Usuario; // <-- Ajusta según tu lógica real

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

  mostrarTabla() {
    if (this.usuario) {
      this.usuario = null;
      this.mensaje = '';
      this.intentoGuardar = false;
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

  onFilterInput(event: Event, field: string, dt: any) {
    const value = (event.target as HTMLInputElement).value;
    dt.filter(value, field, 'contains');
  }

  onGlobalFilterInput(event: Event, dt: any) {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      dt.filterGlobal(value, 'contains');
    } else {
      dt.filterGlobal('', 'contains');
    }
  }

  puedeEditar(u: Usuario): boolean {
    // Ejemplo: solo admins pueden editar
    return this.usuarioLogueado?.rol === 'ADMINISTRADOR';
  }
  puedeEliminar(u: Usuario): boolean {
    // Ejemplo: solo admins pueden eliminar
    return this.usuarioLogueado?.rol === 'ADMINISTRADOR';
  }
  puedeVer(u: Usuario): boolean {
    // Todos pueden ver
    return true;
  }
  verUsuario(u: Usuario) {
    // Lógica para ver detalles del usuario (puedes mostrar modal, navegar, etc)
    this.mensaje = `Ver usuario: ${u.nombreCompleto}`;
  }
}
