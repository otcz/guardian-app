import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { OrgContextService } from '../../service/org-context.service';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { UsersService, UserEntity } from '../../service/users.service';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-seccion-asignar-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, DropdownModule, ButtonModule, TagModule, TooltipModule],
  templateUrl: './seccion-asignar-admin.component.html',
  styleUrls: ['./seccion-asignar-admin.component.scss']
})
export class SeccionAsignarAdminComponent implements OnInit {
  orgId: string | null = null;
  secciones: SeccionEntity[] = [];
  usuarios: UserEntity[] = [];
  seccionId: string | null = null;
  usuarioId: string | null = null;
  loading = true;
  saving = false;
  private pendingLoads = 0;

  constructor(
    private orgCtx: OrgContextService,
    private seccionesSrv: SeccionService,
    private usuariosSrv: UsersService,
    private notify: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value || localStorage.getItem('currentOrgId');
    if (!this.orgId) { this.notify.warn('Atención', 'Seleccione una organización'); this.router.navigate(['/listar-organizaciones']); return; }

    this.loading = true;
    this.pendingLoads = 2;
    // Cargar catálogos
    this.usuariosSrv.list(this.orgId).subscribe({
      next: list => this.usuarios = list,
      error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar usuarios'),
      complete: () => { this.pendingLoads--; this.loading = this.pendingLoads > 0; }
    });
    this.seccionesSrv.list(this.orgId).subscribe({
      next: list => this.secciones = list,
      error: e => this.notify.error('Error', e?.error?.message || 'No se pudieron listar secciones'),
      complete: () => { this.pendingLoads--; this.loading = this.pendingLoads > 0; }
    });

    // Prefill desde query
    this.route.queryParamMap.subscribe(qm => {
      this.seccionId = qm.get('seccionId');
      this.usuarioId = qm.get('usuarioId');
    });
  }

  get selectedUser(): UserEntity | null {
    if (!this.usuarioId) return null;
    return this.usuarios.find(u => String(u.id) === String(this.usuarioId)) || null;
  }

  get selectedSection(): SeccionEntity | null {
    if (!this.seccionId) return null;
    return this.secciones.find(s => String(s.id) === String(this.seccionId)) || null;
  }

  assign() {
    if (!this.orgId || !this.seccionId || !this.usuarioId) return;
    this.saving = true;
    this.seccionesSrv.assignAdministrador(this.orgId, this.seccionId, this.usuarioId).subscribe({
      next: res => {
        this.saving = false;
        this.notify.success('Éxito', 'Administrador asignado');
      },
      error: e => {
        this.saving = false;
        this.notify.error('Error', e?.error?.message || 'No se pudo asignar el administrador');
      }
    });
  }
}
