import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { SectionsService, Section } from '../../service/sections.service';
import { UsersService } from '../../service/users.service';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-assign-sections-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, MultiSelectModule, ButtonModule, FormsModule],
  template: `
    <p-dialog [(visible)]="visible" [modal]="true" [dismissableMask]="true" [style]="{width: '520px'}"
              [draggable]="false" [resizable]="false" header="Asignar secciones" (onHide)="cancel()">
      <div class="form-field">
        <label for="sections">Secciones</label>
        <p-multiSelect inputId="sections" [options]="sections" optionLabel="name" optionValue="id"
                       [(ngModel)]="selected" display="chip" placeholder="Selecciona secciones"
                       [maxSelectedLabels]="2">
        </p-multiSelect>
        <small class="muted" *ngIf="max > 0">Máximo permitido: {{ max }} secciones.</small>
        <small class="muted danger" *ngIf="max > 0 && selected.length > max">Has superado el máximo permitido.</small>
      </div>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-outlined" (click)="cancel()"></button>
        <button pButton type="button" label="Guardar" (click)="save()" [disabled]="!userId || (max>0 && selected.length>max)"></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`:host { display:block; } .danger { color: var(--danger); }`]
})
export class AssignSectionsDialogComponent implements OnChanges {
  @Input() userId: number | null = null;
  @Input() sectionIds: number[] = [];
  @Input() visible = false;
  @Input() max = 8; // tope configurable en UI
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  sections: Section[] = [];
  selected: number[] = [];

  constructor(private sectionsApi: SectionsService, private users: UsersService, private notify: NotificationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.load();
      this.selected = Array.isArray(this.sectionIds) ? [...this.sectionIds] : [];
    }
  }

  private load() { this.sectionsApi.list().subscribe({ next: (r: Section[]) => this.sections = r, error: () => {} }); }
  cancel() { this.visible = false; this.visibleChange.emit(false); }

  save() {
    if (!this.userId) return;
    if (this.max > 0 && this.selected.length > this.max) { this.notify.warn('Supera el máximo permitido.'); return; }
    this.users.setSections(this.userId, this.selected).subscribe({
      next: () => { this.notify.success('Secciones asignadas.'); this.saved.emit(); this.cancel(); },
      error: (e: any) => { this.notify.fromApiError(e, 'No se pudo asignar secciones.'); }
    });
  }
}

