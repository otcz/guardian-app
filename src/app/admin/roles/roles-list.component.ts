import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { RolesService, Role } from '../../service/roles.service';
import { NotificationService } from '../../service/notification.service';
import { PermissionService } from '../../service/permission.service';
import { SideNavComponent } from '../../shared/side-nav.component';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, ConfirmDialogModule, SideNavComponent],
  providers: [ConfirmationService],
  templateUrl: './roles-list.component.html',
  styleUrls: ['./roles-list.component.css']
})
export class RolesListComponent implements OnInit {
  items: Role[] = [];
  constructor(private api: RolesService, private notify: NotificationService, public perm: PermissionService, private router: Router, private confirm: ConfirmationService) {}
  ngOnInit(): void { this.load(); }
  load() { this.api.list().subscribe({ next: (r: Role[]) => this.items = r, error: (e: any) => this.notify.fromApiError(e, 'No fue posible cargar roles.') }); }
  goNew() { this.router.navigate(['/admin/roles/new']); }
  edit(r: Role) { this.router.navigate(['/admin/roles', r.id]); }
  remove(r: Role) {
    this.confirm.confirm({
      message: 'Esta acción eliminará el rol y sus asignaciones. ¿Deseas continuar?',
      header: 'Confirmar eliminación', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button p-button-danger', rejectButtonStyleClass: 'p-button p-button-outlined',
      accept: () => this.api.delete(r.id).subscribe({ next: () => { this.notify.success('Rol eliminado.'); this.load(); }, error: (e: any)=> this.notify.fromApiError(e, 'No se pudo eliminar el rol.') })
    });
  }
}
