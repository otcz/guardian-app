import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeccionService, UsuarioSeccionEntity } from '../../service/seccion.service';
import { OrganizationService } from '../../service/organization.service';



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
  loadingStrategy = false;
  loadingUsuarios = false;
  errorMsg = '';
  disabledByStrategy = false;

  constructor(private seccionService: SeccionService, private orgService: OrganizationService) {}

  ngOnInit(): void {
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
        const msg = err?.error?.message || '';
        if (status === 400 && /ESTRATEGIA DE GOBERNANZA/i.test(msg)) {
          this.errorMsg = 'Acción no permitida por la estrategia de gobernanza';
          this.disabledByStrategy = true;
        } else if (status === 404) {
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
