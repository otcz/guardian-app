import { Pipe, PipeTransform } from '@angular/core';

// Tipo de severidad compatible con p-tag de PrimeNG
export type TagSeverity = 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast';

@Pipe({
  name: 'roleSeverity',
  pure: true,
  standalone: true
})
export class RoleSeverityPipe implements PipeTransform {
  private readonly map = new Map<string, TagSeverity>([
    ['admin', 'danger'],
    ['administrator', 'danger'],
    ['superadmin', 'danger'],
    ['owner', 'danger'],
    ['manager', 'warning'],
    ['responsable', 'warning'],
    ['moderator', 'warning'],
    ['mod', 'warning'],
    ['user', 'success'],
    ['usuario', 'success'],
    ['guest', 'info'],
    ['invitado', 'info']
  ]);

  transform(role: unknown): TagSeverity {
    if (!role) return 'info';
    let key = '';
    if (typeof role === 'string') key = role;
    else if (typeof role === 'object' && role !== null) {
      const r = role as Record<string, unknown>;
      key = String(r['code'] || r['name'] || r['displayName'] || r['rol'] || '').toLowerCase();
    }
    key = key.toString().trim().toLowerCase();
    return this.map.get(key) || 'info';
  }
}
