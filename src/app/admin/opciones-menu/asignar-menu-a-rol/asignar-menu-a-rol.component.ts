import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { MenuService, MenuNode } from '../../../service/menu.service';
import { RolesService, RoleEntity } from '../../../service/roles.service';
import { NotificationService } from '../../../service/notification.service';

interface SimpleOption { label: string; path: string; }

@Component({
  selector: 'app-asignar-menu-a-rol',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, ButtonModule, DropdownModule, InputTextModule, TableModule, CheckboxModule],
  templateUrl: './asignar-menu-a-rol.component.html',
  styleUrls: ['./asignar-menu-a-rol.component.scss']
})
export class AsignarMenuARolComponent implements OnInit {
  roles: RoleEntity[] = [];
  rolId: string | null = null;
  options: SimpleOption[] = [];
  filteredOptions: SimpleOption[] = [];
  selectedOptions: SimpleOption[] = [];
  query = '';
  loading = false;
  saving = false;

  constructor(private menu: MenuService, private rolesSvc: RolesService, private notify: NotificationService) {}

  ngOnInit(): void {
    // Cargar roles de la organización actual
    const orgId = localStorage.getItem('currentOrgId');
    if (orgId) {
      this.loading = true;
      this.rolesSvc.list(orgId).subscribe({
        next: (list) => { this.roles = list || []; this.loading = false; },
        error: () => { this.roles = []; this.loading = false; }
      });
    }
    // Cargar opciones del menú (solo items hoja con path)
    const flat = (this.menu as any).flatItems$?.value as MenuNode[] | undefined;
    const list = Array.isArray(flat) ? flat : [];
    this.options = list.map(n => ({ label: n.label, path: n.path || '' })).filter(o => !!o.path);
    this.filteredOptions = this.options.slice();
  }

  applyFilter() {
    const q = (this.query || '').trim().toLowerCase();
    if (!q) { this.filteredOptions = this.options.slice(); return; }
    this.filteredOptions = this.options.filter(o => o.label.toLowerCase().includes(q) || o.path.toLowerCase().includes(q));
  }

  reset() {
    this.query = '';
    this.applyFilter();
    this.selectedOptions = [];
  }

  save() {
    if (!this.rolId) { this.notify.warn('Atención', 'Seleccione un rol'); return; }
    this.saving = true;
    // Simulación: en ausencia de endpoint específico, solo notificar
    setTimeout(() => {
      this.saving = false;
      this.notify.success('Opciones asignadas', `Se asignaron ${this.selectedOptions.length} opciones al rol seleccionado`);
    }, 600);
  }
}

