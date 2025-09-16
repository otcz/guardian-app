import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { TooltipModule } from 'primeng/tooltip';
import { MENU_CONFIG, MenuItem } from './menu-config';
import { AuthService } from '../service/auth-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PanelMenuModule, TooltipModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnDestroy {
  correo: string = '';
  rol: string = '';
  menu: MenuItem[] = [];
  sidebarExpanded: boolean = true;
  openSubmenus: Set<number> = new Set();
  hoverSubmenu: number|null = null;
  sidebarMobileOpen: boolean = false;
  showUserMenu: boolean = false;
  vistaActual: string = 'dashboard';
  private rolSub: Subscription | undefined;

  constructor(private router: Router, private authService: AuthService) {
    this.correo = localStorage.getItem('correo') || '';
    this.rol = this.authService.getRol();
    this.menu = this.getMenuByRol(this.rol);
    // Suscribirse a cambios de rol (por si cambia en tiempo real)
    this.rolSub = this.authService.rol$.subscribe(rol => {
      this.rol = rol;
      this.menu = this.getMenuByRol(rol);
    });
  }

  ngOnDestroy() {
    this.rolSub?.unsubscribe();
  }

  getMenuByRol(rol: string): MenuItem[] {
    // Filtra los menús y submenús según el rol
    const filterMenu = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter(item => item.roles.includes(rol))
        .map(item => {
          if (item.children) {
            const filteredChildren = filterMenu(item.children);
            return { ...item, children: filteredChildren };
          }
          return { ...item };
        });
    };
    return filterMenu(MENU_CONFIG);
  }

  toggleSidebar() {
    this.sidebarExpanded = !this.sidebarExpanded;
  }

  toggleSubmenu(idx: number) {
    if (this.openSubmenus.has(idx)) {
      this.openSubmenus.delete(idx);
    } else {
      this.openSubmenus.add(idx);
    }
  }

  onSidebarItemHover(idx: number) {
    if (!this.sidebarExpanded && this.menu[idx]?.children) {
      this.openSubmenus.add(idx);
      this.hoverSubmenu = idx;
    }
  }

  onSidebarItemLeave(idx: number) {
    if (!this.sidebarExpanded) {
      this.openSubmenus.delete(idx);
      this.hoverSubmenu = null;
    }
  }

  // Devuelve true si el item o subitem está activo según la ruta actual
  isActive(item: MenuItem): boolean {
    if (!item) return false;
    if (item.route && this.router.isActive(this.router.createUrlTree([item.route]), false)) {
      return true;
    }
    if (item.children) {
      return item.children.some((sub: MenuItem) => this.isActive(sub));
    }
    return false;
  }

  onSidebarItemClick() {
    // Cierra el sidebar en móvil al seleccionar una opción
    if (window.innerWidth <= 900) {
      this.sidebarMobileOpen = false;
    }
    this.closeUserMenu();
  }

  openSidebarMobile() {
    this.sidebarMobileOpen = true;
  }

  closeSidebarMobile() {
    this.sidebarMobileOpen = false;
  }

  // Permite abrir/cerrar submenús con teclado (Enter/Espacio)
  onSubmenuKeydown(event: KeyboardEvent, idx: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleSubmenu(idx);
    }
  }

  // Métodos para el menú de usuario
  closeUserMenu() {
    this.showUserMenu = false;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  logout() {
    this.authService.setRol('USUARIO');
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('correo');
    this.router.navigate(['/login']);
  }
}
