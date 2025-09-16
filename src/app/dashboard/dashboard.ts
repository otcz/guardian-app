import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { TooltipModule } from 'primeng/tooltip';
import { SidebarComponent } from './sidebar.component';
import { MenuService } from './menu.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PanelMenuModule, TooltipModule, SidebarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  correo: string = '';
  rol: string = '';
  menu: any[] = [];
  sidebarExpanded: boolean = true;
  sidebarMobileOpen: boolean = false;
  showUserMenu: boolean = false;

  constructor(private router: Router, private menuService: MenuService) {
    this.correo = localStorage.getItem('correo') || '';
    this.rol = localStorage.getItem('rol') || 'USUARIO';
    this.menu = this.menuService.getMenuByRol(this.rol);
  }

  onSidebarCollapsedChange(collapsed: boolean) {
    this.sidebarExpanded = !collapsed;
  }

  onSidebarMobileVisibleChange(visible: boolean) {
    this.sidebarMobileOpen = visible;
  }

  handleSidebarLogout() {
    this.logout();
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('correo');
    this.router.navigate(['/login']);
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }
}
