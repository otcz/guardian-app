import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { SidebarModule } from 'primeng/sidebar';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, PanelMenuModule, OverlayPanelModule, SidebarModule, TooltipModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Input() mobileVisible = false;
  @Input() menuItems: MenuItem[] = [];
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() mobileVisibleChange = new EventEmitter<boolean>();

  // Para popover de submenús en colapsado
  @ViewChild('overlayPanel') overlayPanel: any;
  popoverItems: MenuItem[] = [];
  popoverTarget: any = null;

  // Accesibilidad
  focusTrapActive = false;

  constructor(private router: Router) {}

  toggleSidebar() {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  openMobileSidebar() {
    this.mobileVisible = true;
    this.mobileVisibleChange.emit(true);
    this.focusTrapActive = true;
  }

  closeMobileSidebar() {
    this.mobileVisible = false;
    this.mobileVisibleChange.emit(false);
    this.focusTrapActive = false;
  }

  // Popover para submenús en colapsado
  showPopover(event: MouseEvent, items: MenuItem[]) {
    this.popoverItems = items;
    this.popoverTarget = event.currentTarget;
    this.overlayPanel.toggle(event);
  }

  // Accesibilidad: teclas
  onKeydown(event: KeyboardEvent, item: MenuItem) {
    if ((event.key === 'Enter' || event.key === ' ') && item.items) {
      event.preventDefault();
      if (this.collapsed) {
        this.showPopover(event as any, item.items);
      }
    }
    if (event.key === 'Escape') {
      this.closeMobileSidebar();
      if (this.overlayPanel) this.overlayPanel.hide();
    }
  }

  navigateTo(route: any[]) {
    if (route) {
      this.router.navigate(route);
    }
  }
}
