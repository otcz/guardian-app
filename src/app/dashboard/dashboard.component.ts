import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ThemeToggleComponent } from '../shared/theme-toggle.component';
import { RouterModule } from '@angular/router';
import { MenuService, MenuOption } from '../service/menu.service';
import { Observable } from 'rxjs';
import { UserAvatarComponent } from '../shared/user-avatar.component';
import { SideNavComponent } from '../shared/side-nav.component';
import { Observable, map, BehaviorSubject, combineLatest } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, TableModule, ThemeToggleComponent, InputTextModule, FormsModule],
  imports: [CommonModule, RouterModule, ButtonModule, TableModule, ThemeToggleComponent, UserAvatarComponent, SideNavComponent],
  templateUrl: './dashboard.component.html',
  styles: [`
    .admin-grid { display:grid; grid-template-columns: auto 1fr; gap: 16px; align-items: stretch; }
    /* Solo en modo claro, aplicar look claro a la tabla 'Actividad reciente' */
    :host-context(.theme-light) .recent-activity .p-datatable-wrapper table { background: var(--surface); color: var(--text); }
    :host-context(.theme-light) .recent-activity .p-datatable-thead > tr > th { background: color-mix(in srgb, var(--surface) 96%, var(--primary) 4%); color: var(--text); border-bottom: 1px solid var(--border); font-weight: 700; }
    :host-context(.theme-light) .recent-activity .p-datatable-tbody > tr > td { background: var(--surface); color: var(--text); border-top: 1px solid var(--border); }
    :host-context(.theme-light) .recent-activity { border-radius: 12px; overflow: hidden; }
  `]
})
export class DashboardComponent {
  sidebarOpen = true;
  options$!: Observable<MenuOption[]>; // plano (compatibilidad)
  menus$!: Observable<MenuOption[]>;   // jerárquico (solo MENUs con hijos)
  get options$(): Observable<MenuOption[]> { return this.menu.list$; }
  activities = [
    { fecha: '2025-09-24 10:21', evento: 'Login', detalle: 'sysadmin' },
    { fecha: '2025-09-24 10:25', evento: 'Creó usuario', detalle: 'juan.perez' },
    { fecha: '2025-09-24 10:40', evento: 'Asignó vehículo', detalle: 'ABC-123' }
  ];
  searchQuery = '';
  private searchTerm$ = new BehaviorSubject<string>('');
  filteredMenus$!: Observable<MenuOption[]>; // resultado final que usa el template

  private readonly LS_KEY = 'menuExpandedState';
  expanded: Record<string, boolean> = {}; // estado de expansión por key

  constructor(private menu: MenuService) {
    this.options$ = this.menu.list$; // lista plana si la quisieras usar
    this.menus$ = this.menu.treeObservable$.pipe(
      map(tree => tree.filter(m => (m.children && m.children.length > 0)))
    );
    this.loadExpandedState();
    this.filteredMenus$ = combineLatest([this.menus$, this.searchTerm$]).pipe(
      map(([menus, term]) => this.applySearch(menus, term))
    );
  }

  toggleMenu(key: string) {
    const currently = this.expanded[key];
    // Si va a expandirse (estaba false o undefined), colapsar los demás primero
    if (!currently) {
      Object.keys(this.expanded).forEach(k => {
        if (k !== key) this.expanded[k] = false;
      });
      this.expanded[key] = true;
    } else {
      // Si ya estaba expandido, simplemente lo colapsamos
      this.expanded[key] = false;
    }
    this.persistExpandedState();
  }

  isExpanded(key: string): boolean {
    if (!(key in this.expanded)) {
      // Por defecto, expandido si no hay filtro de búsqueda
      this.expanded[key] = true;
    }
    return this.expanded[key];
  }

  onSearchChange(value: string) {
    this.searchQuery = value;
    const term = (value || '').trim();
    this.searchTerm$.next(term);
    if (term.length === 0) {
      // restaurar expansión previa (no cambiamos expanded)
      return;
    }
    // Auto expandir menús que tengan match
    Object.keys(this.expanded).forEach(k => this.expanded[k] = true);
  }

  expandAll() {
    this.ensureAllKeys();
    Object.keys(this.expanded).forEach(k => this.expanded[k] = true);
    this.persistExpandedState();
  }
  collapseAll() {
    this.ensureAllKeys();
    Object.keys(this.expanded).forEach(k => this.expanded[k] = false);
    this.persistExpandedState();
  }
  private ensureAllKeys() {
    // sincroniza keys de menús actuales en expanded
    this.menu.tree.forEach(m => { if (!(m.key in this.expanded)) this.expanded[m.key] = true; });
  }

  private applySearch(menus: MenuOption[], term: string): MenuOption[] {
    if (!term) return menus;
    const normTerm = this.normalize(term);
    return menus.map(menu => {
      const matchedChildren = (menu.children || []).filter(ch => this.normalize(ch.label).includes(normTerm));
      if (matchedChildren.length > 0) {
        return { ...menu, children: matchedChildren };
      }
      return { ...menu, children: [] };
    }).filter(m => (m.children && m.children.length > 0));
  }

  private persistExpandedState() {
    try { localStorage.setItem(this.LS_KEY, JSON.stringify(this.expanded)); } catch {}
  }

  private loadExpandedState() {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      if (raw) this.expanded = JSON.parse(raw) || {};
    } catch { this.expanded = {}; }
  }

  private normalize(txt: string): string {
    return (txt || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
