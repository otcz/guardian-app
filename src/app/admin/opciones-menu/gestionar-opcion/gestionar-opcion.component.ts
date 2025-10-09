import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { MenuService, MenuNode } from '../../../service/menu.service';
import { NotificationService } from '../../../service/notification.service';

interface SimpleOption { label: string; path: string; }

@Component({
  selector: 'app-gestionar-opcion',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CardModule, ButtonModule, DropdownModule, InputTextModule],
  templateUrl: './gestionar-opcion.component.html',
  styleUrls: ['./gestionar-opcion.component.scss']
})
export class GestionarOpcionComponent implements OnInit {
  options: SimpleOption[] = [];
  filtered: SimpleOption[] = [];
  query = '';
  private _selectedPath: string | null = null;
  get selectedPath(): string | null { return this._selectedPath; }
  set selectedPath(v: string | null) {
    this._selectedPath = v;
    this.syncModelWithSelection();
  }
  model: { label: string; path: string; icon: string } | null = null;
  saving = false;

  constructor(private menu: MenuService, private notify: NotificationService) {}

  ngOnInit(): void {
    // Cargar opciones disponibles desde el menú (ítems hoja con path)
    const flat = (this.menu as any).flatItems$?.value as MenuNode[] | undefined;
    const list = Array.isArray(flat) ? flat : [];
    this.options = list.map(n => ({ label: n.label, path: n.path || '' })).filter(o => !!o.path);
    this.filtered = this.options.slice();
    // Preselección opcional: mantener última ruta editada
    try {
      const last = localStorage.getItem('lastManagedOptionPath');
      if (last && this.options.some(o => o.path === last)) this.selectedPath = last;
    } catch {}
    console.log('[UI] GestionarOpcionComponent cargado');
  }

  applyFilter() {
    const q = (this.query || '').trim().toLowerCase();
    if (!q) { this.filtered = this.options.slice(); return; }
    this.filtered = this.options.filter(o => o.label.toLowerCase().includes(q) || o.path.toLowerCase().includes(q));
  }

  private syncModelWithSelection() {
    if (!this._selectedPath) { this.model = null; return; }
    const node = this.menu.findByPath(this._selectedPath);
    if (!node) { this.model = null; return; }
    this.model = { label: node.label, path: node.path || '', icon: (node.icon || '').toString() };
    try { localStorage.setItem('lastManagedOptionPath', this._selectedPath); } catch {}
  }

  save() {
    if (!this.model) return;
    this.saving = true;
    // Simulación de guardado
    setTimeout(() => {
      this.saving = false;
      this.notify.success('Cambios guardados', `Opción actualizada: ${this.model?.label}`);
    }, 600);
  }

  cancel() {
    // Revertir cambios recargando del servicio
    this.syncModelWithSelection();
    this.notify.info('Edición cancelada', 'Se revirtieron los cambios locales');
  }
}
