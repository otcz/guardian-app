import { Injectable } from '@angular/core';

export interface MenuItem {
  label: string;
  icon: string;
  routerLink?: string;
  items?: MenuItem[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  // Simulación de menú por rol. En producción, esto puede venir de una API.
  private menus: Record<string, MenuItem[]> = {
    guardia: [
      { label: 'Inicio', icon: 'pi pi-home', routerLink: '/dashboard/inicio' },
      { label: 'Perfil', icon: 'pi pi-user', items: [ { label: 'Ver Perfil', icon: '', routerLink: '/dashboard/perfil' } ] },
      { label: 'Escanear QR', icon: 'pi pi-qrcode', routerLink: '/escanear' },
      { label: 'Accesos', icon: 'pi pi-sign-in', routerLink: '/accesos' },
      { label: 'Consultar usuario/vehículo', icon: 'pi pi-search', routerLink: '/consulta' },
      { label: 'Historial de accesos', icon: 'pi pi-history', routerLink: '/historial-accesos' },
      { label: 'Vehículos', icon: 'pi pi-car', items: [
        { label: 'Registrar vehículo', icon: '', routerLink: '/dashboard/vehiculos/registrar' },
        { label: 'Activar/Inactivar', icon: '', routerLink: '/dashboard/vehiculos/estado' },
        { label: 'Historial de movimientos', icon: '', routerLink: '/dashboard/vehiculos/historial' }
      ] },
      { label: 'Cerrar sesión', icon: 'pi pi-power-off', routerLink: '/logout' }
    ],
    usuario: [
      // { label: 'Inicio', icon: 'pi pi-home', routerLink: '/dashboard/inicio' }, // Ocultamos Inicio para usuario
      { label: 'Perfil', icon: 'pi pi-user', items: [ { label: 'Ver Perfil', icon: '', routerLink: '/dashboard/perfil' } ] },
      { label: 'Mis vehículos', icon: 'pi pi-car', items: [
        { label: 'Ver mis vehículos', icon: '', routerLink: '/dashboard/vehiculos/listar' }
      ] },
      { label: 'Mis invitados', icon: 'pi pi-users', items: [
        { label: 'Crear invitación', icon: '', routerLink: '/invitados/crear' },
        { label: 'Invitados activos', icon: '', routerLink: '/invitados/activos' },
        { label: 'Historial de invitados', icon: '', routerLink: '/invitados/historial' }
      ] },
      { label: 'Historial personal', icon: 'pi pi-list', routerLink: '/historial' },
      { label: 'Generar QR', icon: 'pi pi-qrcode', routerLink: '/dashboard/generar-qr' },
      { label: 'Cerrar sesión', icon: 'pi pi-power-off', routerLink: '/logout' }
    ],
    admin: [
      { label: 'Inicio', icon: 'pi pi-home', routerLink: '/dashboard/inicio' },
      { label: 'Perfil', icon: 'pi pi-user', items: [ { label: 'Ver Perfil', icon: '', routerLink: '/dashboard/perfil' } ] },
      { label: 'Usuarios', icon: 'pi pi-users', items: [
        { label: 'Nuevo usuario', icon: 'pi pi-user-plus', routerLink: '/dashboard/usuarios/crear' },
        { label: 'Ver usuarios', icon: 'pi pi-eye', routerLink: '/dashboard/usuarios' },
        { label: 'Editar usuarios', icon: 'pi pi-user-edit', routerLink: '/dashboard/usuarios/editar' },
        { label: 'Eliminar usuarios', icon: 'pi pi-user-minus', routerLink: '/dashboard/usuarios/eliminar' }
      ] },
      { label: 'Vehículos', icon: 'pi pi-car', items: [
        { label: 'Crear Vehículo', icon: 'pi pi-plus', routerLink: '/dashboard/vehiculos/crear' },
        { label: 'Listar Vehículos', icon: 'pi pi-list', routerLink: '/dashboard/vehiculos/listar' },
        { label: 'Asignar Vehículo', icon: 'pi pi-user-plus', routerLink: '/dashboard/vehiculos/asignar' },
        { label: 'Editar Vehículo', icon: 'pi pi-pencil', routerLink: '/dashboard/vehiculos/editar' },
        { label: 'Eliminar Vehículo', icon: 'pi pi-trash', routerLink: '/dashboard/vehiculos/eliminar' }
      ] },
      // { label: 'Guardias', icon: 'pi pi-id-card', items: [
      //   { label: 'Gestión de credenciales', icon: '', routerLink: '/guardias/credenciales' },
      //   { label: 'Turnos', icon: '', routerLink: '/guardias/turnos' }
      // ] },
      { label: 'Reportes', icon: 'pi pi-chart-bar', items: [
        { label: 'Entradas/Salidas por fecha', icon: '', routerLink: '/reportes/entradas-salidas' },
        { label: 'Invitados por usuario', icon: '', routerLink: '/reportes/invitados' },
        { label: 'Vehículos activos/inactivos', icon: '', routerLink: '/reportes/vehiculos' },
        { label: 'Exportar PDF/Excel', icon: '', routerLink: '/reportes/exportar' }
      ] },
      { label: 'Configuración del sistema', icon: 'pi pi-cog', items: [
        { label: 'Parámetros de seguridad', icon: '', routerLink: '/config/seguridad' },
        { label: 'Generar QR', icon: '', routerLink: '/dashboard/generar-qr' }
      ] },
      { label: 'Cerrar sesión', icon: 'pi pi-power-off', routerLink: '/logout' }
    ]
  };

  getMenuByRol(rol: string): MenuItem[] {
    const key = rol?.toLowerCase() || '';
    return this.menus[key] || [];
  }
}
