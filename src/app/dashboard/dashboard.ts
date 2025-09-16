import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClickOutsideDirective } from '../utils/click-outside.directive';
import { PanelMenuModule } from 'primeng/panelmenu';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ClickOutsideDirective, PanelMenuModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  correo: string = '';
  rol: string = '';
  menu: any[] = [
    {
      label: 'Inicio',
      icon: 'pi pi-home',
      command: () => this.vistaActual = 'dashboard'
    },
    {
      label: 'Perfil',
      icon: 'pi pi-user',
      command: () => this.vistaActual = 'perfil'
    },
    {
      label: 'Usuarios',
      icon: 'pi pi-users',
      items: [
        { label: 'Crear/editar/eliminar', command: () => this.router.navigate(['/dashboard/usuarios']) },
        { label: 'Asignar roles' },
        { label: 'Activar/Desactivar' }
      ]
    },
    {
      label: 'Vehículos',
      icon: 'pi pi-car',
      items: [
        { label: 'Lista global' },
        { label: 'Cambiar estado' },
        { label: 'Reasignar propietario' }
      ]
    },
    {
      label: 'Guardias',
      icon: 'pi pi-id-card',
      items: [
        { label: 'Gestión de credenciales' },
        { label: 'Turnos' }
      ]
    },
    {
      label: 'Reportes',
      icon: 'pi pi-chart-bar',
      items: [
        { label: 'Entradas/Salidas por fecha' },
        { label: 'Invitados por usuario' },
        { label: 'Vehículos activos/inactivos' },
        { label: 'Exportar PDF/Excel' }
      ]
    },
    {
      label: 'Configuración del sistema',
      icon: 'pi pi-cog',
      items: [
        { label: 'Parámetros de seguridad' }
      ]
    },
    {
      label: 'Generar invitación QR',
      icon: 'pi pi-qrcode',
      command: () => this.vistaActual = 'qr'
    },
    {
      label: 'Cerrar sesión',
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    }
  ];
  sidebarExpanded: boolean = true;
  openSubmenus: Set<number> = new Set();
  sidebarMobileOpen: boolean = false;
  showUserMenu: boolean = false;
  vistaActual: string = 'dashboard';

  constructor(private router: Router) {
    this.correo = localStorage.getItem('correo') || '';
    this.rol = localStorage.getItem('rol') || 'USUARIO';
    this.menu = this.getMenuByRol(this.rol);
  }

  getMenuByRol(rol: string) {
    switch (rol) {
      case 'GUARDIA':
        return [
          { label: 'Inicio', icon: 'pi pi-home' },
          { label: 'Perfil', icon: 'pi pi-user', sub: [] },
          { label: 'Escanear QR', icon: 'pi pi-qrcode' },
          { label: 'Accesos', icon: 'pi pi-sign-in' },
          { label: 'Consultar usuario/vehículo', icon: 'pi pi-search' },
          { label: 'Historial de accesos', icon: 'pi pi-history' },
          { label: 'Cerrar sesión', icon: 'pi pi-sign-out', action: () => this.logout() }
        ];
      case 'ADMIN':
        return [
          { label: 'Inicio', icon: 'pi pi-home', action: () => this.vistaActual = 'dashboard' },
          { label: 'Perfil', icon: 'pi pi-user', sub: [] },
          { label: 'Usuarios', icon: 'pi pi-users', sub: [
            { label: 'Crear/editar/eliminar', action: () => this.router.navigate(['/dashboard/usuarios']) },
            { label: 'Asignar roles' },
            { label: 'Activar/Desactivar' }
          ] },
          { label: 'Vehículos', icon: 'pi pi-car', sub: [
            { label: 'Lista global' },
            { label: 'Cambiar estado' },
            { label: 'Reasignar propietario' }
          ] },
          { label: 'Guardias', icon: 'pi pi-id-card', sub: [
            { label: 'Gestión de credenciales' },
            { label: 'Turnos' }
          ] },
          { label: 'Reportes', icon: 'pi pi-chart-bar', sub: [
            { label: 'Entradas/Salidas por fecha' },
            { label: 'Invitados por usuario' },
            { label: 'Vehículos activos/inactivos' },
            { label: 'Exportar PDF/Excel' }
          ] },
          { label: 'Configuración del sistema', icon: 'pi pi-cog', sub: [
            { label: 'Parámetros de seguridad' }
          ] },
          { label: 'Generar invitación QR', icon: 'pi pi-qrcode' },
          { label: 'Cerrar sesión', icon: 'pi pi-sign-out', action: () => this.logout() }
        ];
      default:
        return [
          { label: 'Inicio', icon: 'pi pi-home' },
          { label: 'Perfil', icon: 'pi pi-user', sub: [] },
          { label: 'Mis vehículos', icon: 'pi pi-car', sub: [
            { label: 'Registrar vehículo' },
            { label: 'Activar/Inactivar' },
            { label: 'Historial de movimientos' }
          ] },
          { label: 'Mis invitados', icon: 'pi pi-users', sub: [
            { label: 'Crear invitación' },
            { label: 'Invitados activos' },
            { label: 'Historial de invitados' }
          ] },
          { label: 'Historial personal', icon: 'pi pi-history' },
          { label: 'Generar invitación QR', icon: 'pi pi-qrcode' },
          { label: 'Cerrar sesión', icon: 'pi pi-sign-out', action: () => this.logout() }
        ];
    }
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

  isSubmenuOpen(idx: number): boolean {
    return this.openSubmenus.has(idx);
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
}
