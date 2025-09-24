import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ThemeService } from '../service/theme.service';

interface ThemeOption { label: string; value: 'theme-light'|'theme-dark'|'theme-black'; icon: string }

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectButtonModule],
  template: `
    <ng-container *ngIf="mode==='select'; else cycleTpl">
      <p-selectButton [options]="options" [(ngModel)]="selected" optionLabel="label" optionValue="value" (onChange)="onChange($event.value)" styleClass="theme-select">
        <ng-template pTemplate="item" let-opt>
          <span style="display:flex; align-items:center; gap:8px;">
            <i class="pi" [ngClass]="opt.icon"></i>
            <span>{{ opt.label }}</span>
          </span>
        </ng-template>
      </p-selectButton>
    </ng-container>
    <ng-template #cycleTpl>
      <button pButton type="button" class="p-button p-button-rounded p-button-text" (click)="cycle()" [attr.aria-label]="labelFor(selected)">
        <i class="pi" [ngClass]="iconFor(selected)"></i>
        <span style="margin-left:8px">{{ labelFor(selected) }}</span>
      </button>
    </ng-template>
  `,
})
export class ThemeToggleComponent {
  @Input() mode: 'select'|'cycle' = 'select';

  options: ThemeOption[] = [
    { label: 'Claro', value: 'theme-light', icon: 'pi-sun' },
    { label: 'Oscuro', value: 'theme-dark', icon: 'pi-moon' },
    { label: 'Negro', value: 'theme-black', icon: 'pi-moon' }
  ];
  selected: 'theme-light'|'theme-dark'|'theme-black' = 'theme-light';

  constructor(private theme: ThemeService) {
    this.selected = theme.current as any;
    theme.current$.subscribe(t => this.selected = t as any);
  }

  onChange(val: 'theme-light'|'theme-dark'|'theme-black') {
    this.theme.setTheme(val);
  }
  cycle() { this.theme.nextTheme(); }

  labelFor(v: 'theme-light'|'theme-dark'|'theme-black') { return this.options.find(o => o.value===v)?.label || ''; }
  iconFor(v: 'theme-light'|'theme-dark'|'theme-black') { return this.options.find(o => o.value===v)?.icon || ''; }
}
