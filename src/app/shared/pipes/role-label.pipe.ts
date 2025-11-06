import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'roleLabel',
  pure: true,
  standalone: true
})
export class RoleLabelPipe implements PipeTransform {
  transform(role: unknown): string {
    if (role == null) return '-';
    if (typeof role === 'string') {
      const trimmed = role.trim();
      return trimmed.length ? trimmed : '-';
    }
    if (typeof role === 'object') {
      const anyRole = role as Record<string, unknown>;
      const label = anyRole['displayName'] || anyRole['name'] || anyRole['code'] || anyRole['rol'] || anyRole['id'];
      return typeof label === 'string' && label.trim().length ? label as string : '-';
    }
    return '-';
  }
}

