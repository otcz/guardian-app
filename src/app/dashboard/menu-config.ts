// Configuración centralizada de menús por rol para el sidebar
export type MenuItem = {
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  roles: string[]; // ['GUARDIA', 'USUARIO', 'ADMIN']
};

export const MENU_CONFIG: MenuItem[] = [
  // GUARDIA
  {
    label: 'Inicio',
    icon: 'pi pi-home',
    route: '/dashboard/inicio',
    roles: ['GUARDIA', 'USUARIO', 'ADMIN']
  },
  {
    label: 'Perfil',
    icon: 'pi pi-user',
    route: '/dashboard/perfil',
    roles: ['GUARDIA', 'USUARIO', 'ADMIN']
  },
  {
    label: 'Escanear QR',
    icon: 'pi pi-qrcode',
    route: '/dashboard/escanear-qr',
    roles: ['GUARDIA']
  },
  {
    label: 'Accesos',
    icon: 'pi pi-sign-in',
    route: '/dashboard/accesos',
    roles: ['GUARDIA']
  },
  {
    label: 'Consultar usuario/vehículo',
    icon: 'pi pi-search',
    route: '/dashboard/consultar',
    roles: ['GUARDIA']
  },
  {
    label: 'Historial de accesos',
    icon: 'pi pi-history',
    route: '/dashboard/historial-accesos',
    roles: ['GUARDIA']
  },
  // USUARIO
  {
    label: 'Mis vehículos',
    icon: 'pi pi-car',
    route: '/dashboard/mis-vehiculos',
    roles: ['USUARIO']
  },
  {
    label: 'Registrar vehículo',
    icon: 'pi pi-plus-circle',
    route: '/dashboard/registrar-vehiculo',
    roles: ['USUARIO']
  },
  {
    label: 'Activar/Inactivar',
    icon: 'pi pi-power-off',
    route: '/dashboard/activar-inactivar',
    roles: ['USUARIO']
  },
  {
    label: 'Historial de movimientos',
    icon: 'pi pi-list',
    route: '/dashboard/historial-movimientos',
    roles: ['USUARIO']
  },
  {
    label: 'Mis invitados',
    icon: 'pi pi-users',
    roles: ['USUARIO'],
    children: [
      {
        label: 'Crear invitación',
        icon: 'pi pi-user-plus',
        route: '/dashboard/crear-invitacion',
        roles: ['USUARIO']
      },
      {
        label: 'Invitados activos',
        icon: 'pi pi-user-check',
        route: '/dashboard/invitados-activos',
        roles: ['USUARIO']
      },
      {
        label: 'Historial de invitados',
        icon: 'pi pi-calendar',
        route: '/dashboard/historial-invitados',
        roles: ['USUARIO']
      }
    ]
  },
  {
    label: 'Historial personal',
    icon: 'pi pi-book',
    route: '/dashboard/historial-personal',
    roles: ['USUARIO']
  },
  {
    label: 'Generar invitación QR',
    icon: 'pi pi-qrcode',
    route: '/dashboard/generar-invitacion-qr',
    roles: ['USUARIO', 'ADMIN']
  },
  // ADMINISTRADOR
  {
    label: 'Usuarios',
    icon: 'pi pi-users',
    roles: ['ADMIN'],
    children: [
      {
        label: 'Nuevo usuario',
        icon: 'pi pi-user-plus',
        route: '/dashboard/usuarios/crear',
        roles: ['ADMIN']
      },
      {
        label: 'Ver usuarios',
        icon: 'pi pi-eye',
        route: '/dashboard/usuarios/ver',
        roles: ['ADMIN']
      },
      {
        label: 'Editar usuarios',
        icon: 'pi pi-user-edit',
        route: '/dashboard/usuarios/editar',
        roles: ['ADMIN']
      },
      {
        label: 'Eliminar usuarios',
        icon: 'pi pi-user-minus',
        route: '/dashboard/usuarios/eliminar',
        roles: ['ADMIN']
      }
    ]
  },
  {
    label: 'Vehículos',
    icon: 'pi pi-car',
    roles: ['ADMIN'],
    children: [
      {
        label: 'Crear',
        icon: 'pi pi-plus',
        route: '/dashboard/vehiculos/crear',
        roles: ['ADMIN']
      },
      {
        label: 'Listar',
        icon: 'pi pi-list',
        route: '/dashboard/vehiculos/listar',
        roles: ['ADMIN']
      },
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        route: '/dashboard/vehiculos/editar',
        roles: ['ADMIN']
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        route: '/dashboard/vehiculos/eliminar',
        roles: ['ADMIN']
      }
    ]
  },
  {
    label: 'Guardias',
    icon: 'pi pi-shield',
    roles: ['ADMIN'],
    children: [
      {
        label: 'Gestión de credenciales',
        icon: 'pi pi-key',
        route: '/dashboard/gestion-credenciales',
        roles: ['ADMIN']
      },
      {
        label: 'Turnos',
        icon: 'pi pi-clock',
        route: '/dashboard/turnos',
        roles: ['ADMIN']
      }
    ]
  },
  {
    label: 'Reportes',
    icon: 'pi pi-chart-bar',
    roles: ['ADMIN'],
    children: [
      {
        label: 'Entradas/Salidas por fecha',
        icon: 'pi pi-calendar',
        route: '/dashboard/reportes-entradas-salidas',
        roles: ['ADMIN']
      },
      {
        label: 'Invitados por usuario',
        icon: 'pi pi-user',
        route: '/dashboard/reportes-invitados',
        roles: ['ADMIN']
      },
      {
        label: 'Vehículos activos/inactivos',
        icon: 'pi pi-car',
        route: '/dashboard/reportes-vehiculos',
        roles: ['ADMIN']
      },
      {
        label: 'Exportar PDF/Excel',
        icon: 'pi pi-file-export',
        route: '/dashboard/exportar',
        roles: ['ADMIN']
      }
    ]
  },
  {
    label: 'Configuración del sistema',
    icon: 'pi pi-cog',
    roles: ['ADMIN'],
    children: [
      {
        label: 'Parámetros de seguridad',
        icon: 'pi pi-lock',
        route: '/dashboard/parametros-seguridad',
        roles: ['ADMIN']
      },
      {
        label: 'Generar invitación QR',
        icon: 'pi pi-qrcode',
        route: '/dashboard/generar-invitacion-qr',
        roles: ['ADMIN']
      }
    ]
  },
  // Cerrar sesión (todos los roles)
  {
    label: 'Cerrar sesión',
    icon: 'pi pi-sign-out',
    route: '/logout',
    roles: ['GUARDIA', 'USUARIO', 'ADMIN']
  }
];
