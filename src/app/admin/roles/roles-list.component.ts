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
  template: `
  <div class="admin-grid">
    <app-side-nav title="Administración"></app-side-nav>
    <div class="card">
      <div class="header-row">
        <h2>Roles</h2>
        <span class="spacer"></span>
        <button pButton label="Crear rol" icon="pi pi-plus" (click)="goNew()" *ngIf="perm.canCreateRole()"></button>
      </div>

      <p-table [value]="items">
        <ng-template pTemplate="header">
          <tr><th>Nombre</th><th>Código</th><th>Descripción</th><th class="actions">Acciones</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>{{ row.name }}</td>
            <td>{{ row.code || '-' }}</td>
            <td>{{ row.description || '-' }}</td>
            <td class="actions">
              <button pButton icon="pi pi-pencil" class="p-button-text" (click)="edit(row)" [disabled]="!perm.canEditRole()"></button>
              <button pButton icon="pi pi-trash" class="p-button-text" (click)="remove(row)" [disabled]="!perm.canDeleteRole()"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-confirmDialog></p-confirmDialog>
    </div>
  </div>
  `,
  styles: [`.admin-grid{display:grid;grid-template-columns:auto 1fr;gap:16px}.header-row{display:flex;align-items:center;gap:10px}.spacer{flex:1 1 auto} td.actions{white-space:nowrap}`]
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
