import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeccionService, UsuarioSeccionEntity } from '../../service/seccion.service';
import { OrganizationService } from '../../service/organization.service';

export type EstrategiaNombre = 'CENTRALIZADA' | 'HIBRIDA' | 'FEDERADA' | 'CUSTOM' | '';

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

  estrategia: EstrategiaNombre = '';
  usuarios: UsuarioSeccionEntity[] = [];
  loadingStrategy = false;
  loadingUsuarios = false;
  errorMsg = '';
  disabledByStrategy = false;

  constructor(private seccionService: SeccionService, private orgService: OrganizationService) {}

  ngOnInit(): void {
    this.fetchEstrategia();
  }

  private fetchEstrategia() {
    this.loadingStrategy = true;
    this.errorMsg = '';
    this.orgService.getOrgStrategyName(this.orgId).subscribe({
      next: (nombre: any) => {
        const n = (nombre || '').toString().toUpperCase();
        this.estrategia = (['CENTRALIZADA', 'HIBRIDA', 'FEDERADA', 'CUSTOM'].includes(n) ? n : 'CUSTOM') as EstrategiaNombre;
        this.loadingStrategy = false;
        if (this.estrategia === 'CENTRALIZADA') {
          this.disabledByStrategy = true;
        } else {
          this.loadUsuarios();
        }
      },
      error: (_err) => {
        this.loadingStrategy = false;
        this.errorMsg = 'Error al consultar la estrategia de gobernanza.';
      }
    });
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
