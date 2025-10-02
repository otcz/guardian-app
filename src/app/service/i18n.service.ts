// filepath: c:\Users\OTCZ\WebstormProjects\guardian-app\src\app\service\i18n.service.ts
import { Injectable, Pipe, PipeTransform } from '@angular/core';

export type Lang = 'es';
export type Dict = Record<string, string>;

const es: Dict = {
  'users.title': 'Usuarios',
  'users.create': 'Crear usuario',
  'users.edit': 'Editar usuario',
  'roles.title': 'Roles',
  'roles.create': 'Crear rol',
  'actions.save': 'Guardar',
  'actions.update': 'Editar',
  'actions.cancel': 'Cancelar',
  'audit.title': 'Historial de cambios',
  'audit.empty': 'Sin registros de auditoría.',
  'toast.userCreated': 'Usuario creado correctamente.',
  'toast.saved': 'Cambios guardados.',
  'toast.rolesAssigned': 'Roles asignados.',
  'toast.sectionsAssigned': 'Secciones asignadas.',
  'error.generic': 'No se pudo completar la operación. Intenta nuevamente.'
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private lang: Lang = 'es';
  private dicts: Record<Lang, Dict> = { es };
  t(key: string, params?: Record<string, any>): string {
    const d = this.dicts[this.lang] || {};
    let val = d[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    return val;
  }
}

@Pipe({ name: 't', standalone: true })
export class TranslatePipe implements PipeTransform {
  constructor(private i18n: I18nService) {}
  transform(key: string, params?: Record<string, any>): string { return this.i18n.t(key, params); }
}

