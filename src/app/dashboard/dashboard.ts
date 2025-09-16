import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PanelMenuModule, TooltipModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  correo: string = '';
  rol: string = '';
  menu: any[] = [];
  sidebarExpanded: boolean = true;
  openSubmenus: Set<number> = new Set();
  hoverSubmenu: number|null = null;
  sidebarMobileOpen: boolean = false;
  showUserMenu: boolean = false;
  vistaActual: string = 'dashboard';

  constructor(private router: Router) {
    this.correo = localStorage.getItem('correo') || '';
    this.rol = localStorage.getItem('rol') || 'USUARIO';
    this.menu = this.getMenuByRol(this.rol);
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
    if (!this.sidebarExpanded && this.menu[idx]?.items) {
      this.openSubmenus.add(idx);
      this.hoverSubmenu = idx;
    }
  }

  onSidebarItemLeave(idx: number) {
    if (!this.sidebarExpanded && this.menu[idx]?.items) {
      this.openSubmenus.delete(idx);
      this.hoverSubmenu = null;
    }
  }

  getMenuByRol(rol: string): any[] {
    // Asegurar que cada submenú tenga icono (opcional, para consistencia visual)
    function addIconToSubmenus(items: any[], defaultIcon: string) {
      for (const item of items) {
        if (item.items) addIconToSubmenus(item.items, item.icon || defaultIcon);
        if (!item.icon) item.icon = defaultIcon;
      }
    }
    let menu = [];
    switch (rol.toUpperCase()) {
      case 'GUARDIA':
        menu = [
          { label: 'Inicio', icon: 'pi pi-home', routerLink: ['/dashboard'] },
          { label: 'Perfil', icon: 'pi pi-user', routerLink: ['/dashboard/perfil'] },
          { label: 'Escanear QR', icon: 'pi pi-qrcode', routerLink: ['/dashboard/escanear-qr'] },
          { label: 'Accesos', icon: 'pi pi-sign-in', routerLink: ['/dashboard/accesos'] },
          { label: 'Consultar usuario/vehículo', icon: 'pi pi-search', routerLink: ['/dashboard/consultar'] },
          { label: 'Historial de accesos', icon: 'pi pi-history', routerLink: ['/dashboard/historial-accesos'] },
          { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => this.logout() }
        ];
        break;
      case 'ADMINISTRADOR':
        menu = [
          { label: 'Inicio', icon: 'pi pi-home', routerLink: ['/dashboard'] },
          { label: 'Perfil', icon: 'pi pi-user', routerLink: ['/dashboard/perfil'] },
          { label: 'Usuarios', icon: 'pi pi-users', items: [
            { label: 'Crear/editar/eliminar', routerLink: ['/dashboard/usuarios'] },
            { label: 'Asignar roles', routerLink: ['/dashboard/usuarios/asignar-roles'] },
            { label: 'Activar/Desactivar', routerLink: ['/dashboard/usuarios/activar-desactivar'] }
          ]},
          { label: 'Vehículos', icon: 'pi pi-car', items: [
            { label: 'Lista global', routerLink: ['/dashboard/vehiculos'] },
            { label: 'Cambiar estado', routerLink: ['/dashboard/vehiculos/cambiar-estado'] },
            { label: 'Reasignar propietario', routerLink: ['/dashboard/vehiculos/reasignar'] }
          ]},
          { label: 'Guardias', icon: 'pi pi-id-card', items: [
            { label: 'Gestión de credenciales', routerLink: ['/dashboard/guardias/credenciales'] },
            { label: 'Turnos', routerLink: ['/dashboard/guardias/turnos'] }
          ]},
          { label: 'Reportes', icon: 'pi pi-chart-bar', items: [
            { label: 'Entradas/Salidas por fecha', routerLink: ['/dashboard/reportes/entradas-salidas'] },
            { label: 'Invitados por usuario', routerLink: ['/dashboard/reportes/invitados-usuario'] },
            { label: 'Vehículos activos/inactivos', routerLink: ['/dashboard/reportes/vehiculos-activos-inactivos'] },
            { label: 'Exportar PDF/Excel', routerLink: ['/dashboard/reportes/exportar'] }
          ]},
          { label: 'Configuración del sistema', icon: 'pi pi-cog', items: [
            { label: 'Parámetros de seguridad', routerLink: ['/dashboard/configuracion/seguridad'] }
          ]},
          { label: 'Generar invitación QR', icon: 'pi pi-qrcode', routerLink: ['/dashboard/generar-invitacion-qr'] },
          { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => this.logout() }
        ];
        break;
      case 'USUARIO':
      case 'RESIDENTE':
      default:
        menu = [
          { label: 'Inicio', icon: 'pi pi-home', routerLink: ['/dashboard'] },
          { label: 'Perfil', icon: 'pi pi-user', routerLink: ['/dashboard/perfil'] },
          { label: 'Mis vehículos', icon: 'pi pi-car', items: [
            { label: 'Registrar vehículo', routerLink: ['/dashboard/vehiculos/registrar'] },
            { label: 'Activar/Inactivar', routerLink: ['/dashboard/vehiculos/activar-inactivar'] },
            { label: 'Historial de movimientos', routerLink: ['/dashboard/vehiculos/historial'] }
          ]},
          { label: 'Mis invitados', icon: 'pi pi-users', items: [
            { label: 'Crear invitación', routerLink: ['/dashboard/invitados/crear'] },
            { label: 'Invitados activos', routerLink: ['/dashboard/invitados/activos'] },
            { label: 'Historial de invitados', routerLink: ['/dashboard/invitados/historial'] }
          ]},
          { label: 'Historial personal', icon: 'pi pi-history', routerLink: ['/dashboard/historial-personal'] },
          { label: 'Generar invitación QR', icon: 'pi pi-qrcode', routerLink: ['/dashboard/generar-invitacion-qr'] },
          { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => this.logout() }
        ];
        break;
    }
    addIconToSubmenus(menu, 'pi pi-angle-right');
    return menu;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('correo');
    this.router.navigate(['/login']);
  }

  onMenuItemClick(item: any, idx: number) {
    if (item.sub && item.sub.length) {
      this.toggleSubmenu(idx);
    } else if (item.action) {
      item.action();
      if (this.sidebarMobileOpen) {
        this.closeSidebarMobile();
      }
    }
  }

  onSubMenuItemClick(sub: any) {
    if (sub.action) {
      sub.action();
      if (this.sidebarMobileOpen) {
        this.closeSidebarMobile();
      }
    }
  }

  openSidebarMobile() {
    this.sidebarMobileOpen = true;
  }

  closeSidebarMobile() {
    this.sidebarMobileOpen = false;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }
}
