import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeccionService, UsuarioSeccionEntity } from '../../service/seccion.service';

@Component({
  standalone: true,
  selector: 'app-seccion-usuarios',
  templateUrl: './seccion-usuarios.component.html',
  styleUrls: ['./seccion-usuarios.component.scss'],
  imports: [CommonModule]
})
export class SeccionUsuariosComponent implements OnInit {
  @Input({ required: true }) orgId!: string;
  @Input({ required: true }) seccionId!: string;

  usuarios: UsuarioSeccionEntity[] = [];
  loadingUsuarios = false;
  errorMsg = '';

  constructor(private seccionService: SeccionService) {}

  ngOnInit(): void {
    this.loadUsuarios();
  }

  private loadUsuarios() {
    this.loadingUsuarios = true;
    this.errorMsg = '';
    this.seccionService.getUsuariosPorSeccion(this.orgId, this.seccionId).subscribe({
      next: (list) => {
        this.usuarios = Array.isArray(list) ? list : [];
        this.loadingUsuarios = false;
      },
      error: (err) => {
        const status = err?.status;
        if (status === 404) {
          this.errorMsg = 'Sección no encontrada';
        } else if (status === 401 || status === 403) {
          this.errorMsg = 'No autorizado';
        } else {
          this.errorMsg = 'Error al cargar usuarios';
        }
        this.loadingUsuarios = false;
      }
    });
  }
}
