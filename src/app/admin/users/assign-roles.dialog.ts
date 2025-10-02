import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { RolesService, Role } from '../../service/roles.service';
import { NotificationService } from '../../service/notification.service';
import { UsersService } from '../../service/users.service';

@Component({
  selector: 'app-assign-roles-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, MultiSelectModule, ButtonModule, FormsModule],
  template: `
    <p-dialog [(visible)]="visible" [modal]="true" [dismissableMask]="true" [style]="{width: '520px'}"
              [draggable]="false" [resizable]="false" header="Asignar roles" (onHide)="cancel()">
      <div class="form-field">
        <label for="roles">Roles</label>
        <p-multiSelect inputId="roles" [options]="roles" optionLabel="name" optionValue="id"
                       [(ngModel)]="selected" display="chip" placeholder="Selecciona roles">
        </p-multiSelect>
      </div>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-outlined" (click)="cancel()"></button>
        <button pButton type="button" label="Guardar" (click)="save()" [disabled]="!userId"></button>
      </ng-template>
    </p-dialog>
  `
})
export class AssignRolesDialogComponent implements OnChanges {
  @Input() userId: number | null = null;
  @Input() roleIds: number[] = [];
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  roles: Role[] = [];
  selected: number[] = [];

  constructor(private rolesApi: RolesService, private users: UsersService, private notify: NotificationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.load();
      this.selected = Array.isArray(this.roleIds) ? [...this.roleIds] : [];
    }
  }

  private load() { this.rolesApi.list().subscribe({ next: (r: Role[]) => this.roles = r, error: () => {} }); }
  cancel() { this.visible = false; this.visibleChange.emit(false); }

  save() {
    if (!this.userId) return;
    this.users.setRoles(this.userId, this.selected).subscribe({
      next: () => { this.notify.success('Roles asignados.'); this.saved.emit(); this.cancel(); },
      error: (e: any) => { this.notify.fromApiError(e, 'No se pudo asignar roles.'); }
    });
  }
}

