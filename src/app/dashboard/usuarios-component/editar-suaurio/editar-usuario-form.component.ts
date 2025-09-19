import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, Usuario } from '../../../service/usuarios-service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-editar-usuario-form',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, TooltipModule],
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
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((event: any) => {
      if (event.urlAfterRedirects && event.urlAfterRedirects.includes('/dashboard/editar-usuario')) {
        this.mostrarTabla();
      }
    });
    this.usuarioLogueado = { rol: 'ADMIN' } as Usuario;
    if (this.correo) {
      this.usuariosService.getUsuarios().subscribe((usuarios: Usuario[]) => {
        this.usuario = usuarios.find((u: Usuario) => u.correo === this.correo) || null;
      });
    } else {
      this.usuariosService.getUsuarios().subscribe((usuarios: Usuario[]) => {
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
    this.usuariosFiltrados = this.usuarios.filter((u: Usuario) => {
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

  irAEditar(u: Usuario) {
    this.usuario = { ...u };
    this.mensaje = '';
    this.intentoGuardar = false;
  }

  irAEliminar(u: Usuario) {
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

  esAdmin(): boolean {
    return this.usuarioLogueado?.rol === 'ADMIN';
  }
  puedeEditar(u: Usuario): boolean {
    return this.usuarioLogueado?.rol === 'ADMIN';
  }
  puedeEliminar(u: Usuario): boolean {
    return this.usuarioLogueado?.rol === 'ADMIN';
  }
  puedeVer(u: Usuario): boolean {
    return true;
  }
  verUsuario(u: Usuario) {
    this.mensaje = `Ver usuario: ${u.nombreCompleto}`;
  }
}
