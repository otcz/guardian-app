import { Injectable } from '@angular/core';

export type AppRole = 'SYSTEM_ADMIN' | 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'GUARD';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private get roles(): AppRole[] {
    try {
      const raw = localStorage.getItem('roles');
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return Array.isArray(arr) ? (arr as AppRole[]) : [];
    } catch { return []; }
  }

  has(role: AppRole) { return this.roles.includes(role); }

  // Parámetros (TABLA_PARAMETROS)
  canCreateParam(): boolean {
    return this.has('SYSTEM_ADMIN') || this.has('SUPER_ADMIN');
  }
  canEditParam(porDefecto?: boolean): boolean {
    if (this.has('SYSTEM_ADMIN')) return true;
    if (this.has('SUPER_ADMIN')) return porDefecto !== true; // no permite si es por defecto
    return false;
  }
  canDeleteParam(porDefecto?: boolean): boolean {
    return this.canEditParam(porDefecto); // mismas reglas
  }

  // Valores de parámetro (TABLA_VALOR_PARAMETRO)
  canCreateValue(paramPorDefecto?: boolean): boolean {
    if (this.has('SYSTEM_ADMIN')) return true;
    if (this.has('SUPER_ADMIN')) return paramPorDefecto !== true;
    if (this.has('ADMIN')) return true; // ADMIN puede crear valores de su sección (frontend verifica section)
    return false;
  }
  canEditValue(paramPorDefecto?: boolean, valuePorDefecto?: boolean): boolean {
    if (this.has('SYSTEM_ADMIN')) return true;
    if (this.has('SUPER_ADMIN')) return (paramPorDefecto !== true) && (valuePorDefecto !== true);
    if (this.has('ADMIN')) return valuePorDefecto !== true; // ADMIN no puede tocar valores por defecto
    return false;
  }
  canDeleteValue(paramPorDefecto?: boolean, valuePorDefecto?: boolean): boolean {
    return this.canEditValue(paramPorDefecto, valuePorDefecto);
  }

  // Toggle activo puede usar mismas reglas de edición
  canToggleParam(porDefecto?: boolean) { return this.canEditParam(porDefecto); }
  canToggleValue(paramPorDefecto?: boolean, valuePorDefecto?: boolean) { return this.canEditValue(paramPorDefecto, valuePorDefecto); }

  // ===================== Usuarios/Roles (RBAC) =====================
  // Lectura general
  canViewUsers(): boolean { return this.has('SYSTEM_ADMIN') || this.has('SUPER_ADMIN') || this.has('ADMIN'); }
  canCreateUser(): boolean { return this.has('SYSTEM_ADMIN') || this.has('SUPER_ADMIN') || this.has('ADMIN'); }
  canEditUser(): boolean { return this.has('SYSTEM_ADMIN') || this.has('SUPER_ADMIN') || this.has('ADMIN'); }
  canChangeUserStatus(): boolean { return this.has('SYSTEM_ADMIN') || this.has('SUPER_ADMIN') || this.has('ADMIN'); }
  canAssignRoles(): boolean { return this.has('SYSTEM_ADMIN') || this.has('SUPER_ADMIN'); }
  canAssignSections(): boolean { return this.has('SYSTEM_ADMIN') || this.has('SUPER_ADMIN') || this.has('ADMIN'); }
  canViewUserAudit(): boolean { return this.has('SYSTEM_ADMIN') || this.has('SUPER_ADMIN'); }

  // Roles
  canViewRoles(): boolean { return this.has('SYSTEM_ADMIN') || this.has('SUPER_ADMIN'); }
  canCreateRole(): boolean { return this.has('SYSTEM_ADMIN') || this.has('SUPER_ADMIN'); }
  canEditRole(): boolean { return this.has('SYSTEM_ADMIN') || this.has('SUPER_ADMIN'); }
  canDeleteRole(): boolean { return this.has('SYSTEM_ADMIN') || this.has('SUPER_ADMIN'); }
}
