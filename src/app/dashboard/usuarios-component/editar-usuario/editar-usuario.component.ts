import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, Usuario } from '../../../service/usuarios-service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Router, NavigationEnd } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-editar-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, TooltipModule],
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

  constructor(private usuariosService: UsuariosService, private router: Router) {}

  ngOnInit() {
    // Simulación: obtener usuario logueado (reemplaza por tu AuthService real)
    this.usuarioLogueado = { rol: 'ADMIN' } as Usuario; // <-- Ajusta según tu lógica real

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
    // Navega al formulario de edición (BuscarUsuarioFormComponent)
    this.router.navigate(['/dashboard/usuarios/editar', u.correo]);
  }

  eliminarUsuario(u: Usuario) {
    // Navega al componente de eliminar usuario
    this.router.navigate(['/dashboard/usuarios/eliminar', u.correo]);
  }
}
