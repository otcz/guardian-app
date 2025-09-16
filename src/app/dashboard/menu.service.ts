import { Injectable } from '@angular/core';
import { MenuItem } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class MenuService {
  getMenuByRol(rol: string): MenuItem[] {
    switch (rol.toUpperCase()) {
      case 'GUARDIA':
        return [
          { label: 'Inicio', icon: 'pi pi-home', routerLink: ['/dashboard'] },
          { label: 'Perfil', icon: 'pi pi-user', routerLink: ['/dashboard/perfil'] },
          { label: 'Escanear QR', icon: 'pi pi-qrcode', routerLink: ['/dashboard/escanear-qr'] },
          { label: 'Accesos', icon: 'pi pi-sign-in', routerLink: ['/dashboard/accesos'] },
          { label: 'Consultar usuario/vehículo', icon: 'pi pi-search', routerLink: ['/dashboard/consultar'] },
          { label: 'Historial de accesos', icon: 'pi pi-history', routerLink: ['/dashboard/historial-accesos'] },
          { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => {/* logout en dashboard */} }
        ];
      case 'ADMINISTRADOR':
        return [
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
          { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => {/* logout en dashboard */} }
        ];
      case 'USUARIO':
      case 'RESIDENTE':
      default:
        return [
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
          { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => {/* logout en dashboard */} }
        ];
    }
  }
}

