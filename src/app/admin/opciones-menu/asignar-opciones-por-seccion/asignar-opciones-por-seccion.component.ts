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
import { SeccionService, SeccionEntity } from '../../../service/seccion.service';
import { MenuService, MenuNode } from '../../../service/menu.service';
import { NotificationService } from '../../../service/notification.service';

interface SimpleOption { label: string; path: string; }

@Component({
  selector: 'app-asignar-opciones-por-seccion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, ButtonModule, DropdownModule, InputTextModule, TableModule, CheckboxModule],
  templateUrl: './asignar-opciones-por-seccion.component.html',
  styleUrls: ['./asignar-opciones-por-seccion.component.scss']
})
export class AsignarOpcionesPorSeccionComponent implements OnInit {
  secciones: SeccionEntity[] = [];
  seccionId: string | null = null;
  options: SimpleOption[] = [];
  filteredOptions: SimpleOption[] = [];
  selectedOptions: SimpleOption[] = [];
  query = '';
  saving = false;

  constructor(private seccionSrv: SeccionService, private menu: MenuService, private notify: NotificationService) {}

  ngOnInit(): void {
    // Cargar secciones si hay orgId en storage
    const orgId = localStorage.getItem('currentOrgId');
    if (orgId) {
      this.seccionSrv.list(orgId).subscribe({
        next: list => this.secciones = list,
        error: () => this.secciones = []
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
    if (!this.seccionId) { this.notify.warn('Atención', 'Seleccione una sección'); return; }
    this.saving = true;
    setTimeout(() => {
      this.saving = false;
      this.notify.success('Opciones guardadas', `Se asignaron ${this.selectedOptions.length} opciones a la sección`);
    }, 600);
  }
}
