import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'yesNo', standalone: true })
export class YesNoPipe implements PipeTransform {
  transform(value: any): string {
    return this.toBool(value) ? 'Sí' : 'No';
  }

  private toBool(v: any): boolean {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0 && !isNaN(v);
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'si' || s === 'sí';
    }
    return !!v;
  }
}

