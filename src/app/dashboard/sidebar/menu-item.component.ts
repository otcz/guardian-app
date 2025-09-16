import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MenuItem } from './menu.service';
import { CommonModule, NgClass } from '@angular/common';

@Component({
  selector: 'app-menu-item',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './menu-item.component.html',
  styleUrls: ['./menu-item.component.scss']
})
export class MenuItemComponent {
  @Input() item!: MenuItem;
  @Input() isExpanded: boolean = true;
  @Output() itemClick = new EventEmitter<string>();
  submenuOpen = false;

  onItemClick(event: Event) {
    event.stopPropagation();
    if (this.item.items && this.item.items.length > 0) {
      this.submenuOpen = !this.submenuOpen;
    } else if (this.item.routerLink) {
      this.itemClick.emit(this.item.routerLink);
    }
  }

  onSubItemClick(route: string | undefined, event: Event) {
    event.stopPropagation();
    if (route) {
      this.itemClick.emit(route);
      this.submenuOpen = false;
    }
  }
}
