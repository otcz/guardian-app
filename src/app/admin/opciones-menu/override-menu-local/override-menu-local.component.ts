import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TableModule } from 'primeng/table';
import { SeccionService, SeccionEntity } from '../../../service/seccion.service';
import { MenuService, MenuNode } from '../../../service/menu.service';
import { NotificationService } from '../../../service/notification.service';

interface Row { label: string; path: string; }
interface OverrideCfg { hidden: boolean; label: string; }

@Component({
  selector: 'app-override-menu-local',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CardModule, ButtonModule, DropdownModule, InputTextModule, InputSwitchModule, TableModule],
  templateUrl: './override-menu-local.component.html',
  styleUrls: ['./override-menu-local.component.scss']
})
export class OverrideMenuLocalComponent implements OnInit {
  enabled = false;
  bySection = false;
  secciones: SeccionEntity[] = [];
  seccionId: string | null = null;

  rows: Row[] = [];
  filtered: Row[] = [];
  overrides: Record<string, OverrideCfg> = {};
  query = '';
  saving = false;

  constructor(private seccionSrv: SeccionService, private menu: MenuService, private notify: NotificationService) {}

  ngOnInit(): void {
    const orgId = localStorage.getItem('currentOrgId');
    if (orgId) {
      this.seccionSrv.list(orgId).subscribe({ next: list => this.secciones = list, error: () => this.secciones = [] });
    }
    const flat = (this.menu as any).flatItems$?.value as MenuNode[] | undefined;
    const list = Array.isArray(flat) ? flat : [];
    this.rows = list.map(n => ({ label: n.label, path: n.path || '' })).filter(r => !!r.path);
    this.filtered = this.rows.slice();
    // Inicializar overrides
    this.rows.forEach(r => { this.overrides[r.path] = { hidden: false, label: '' }; });
  }

  applyFilter() {
    const q = (this.query || '').trim().toLowerCase();
    if (!q) { this.filtered = this.rows.slice(); return; }
    this.filtered = this.rows.filter(r => r.label.toLowerCase().includes(q) || r.path.toLowerCase().includes(q));
  }

  setLabel(path: string, value: string) {
    if (!this.overrides[path]) this.overrides[path] = { hidden: false, label: '' };
    this.overrides[path].label = value || '';
  }

  reset() {
    this.enabled = false;
    this.bySection = false;
    this.seccionId = null;
    Object.keys(this.overrides).forEach(k => this.overrides[k] = { hidden: false, label: '' });
  }

  save() {
    if (this.bySection && !this.seccionId) { this.notify.warn('Atención', 'Seleccione una sección'); return; }
    this.saving = true;
    setTimeout(() => {
      this.saving = false;
      const scope = this.bySection ? `sección ${this.seccionId}` : 'organización';
      this.notify.success('Overrides guardados', `Aplicados para ${scope} (simulado)`);
    }, 600);
  }
}
