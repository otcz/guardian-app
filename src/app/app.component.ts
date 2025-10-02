import { Component } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { ThemeService } from './service/theme.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ThemeToggleComponent } from './shared/theme-toggle.component';
import { MenuService, MenuOption } from './service/menu.service';
import { Observable, map, BehaviorSubject, combineLatest, filter } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.css'],
  imports: [RouterModule, CommonModule, ButtonModule, TableModule, ThemeToggleComponent, InputTextModule, FormsModule]
})
export class AppComponent {
  title = 'guardian';
  // Lógica migrada del antiguo DashboardComponent
  sidebarOpen = true;
  menus$!: Observable<MenuOption[]>;   // menús raíz
  filteredMenus$!: Observable<MenuOption[]>;
  searchQuery = '';
  private searchTerm$ = new BehaviorSubject<string>('');
  private readonly LS_KEY = 'menuExpandedState';
  expanded: Record<string, boolean> = {};
  isAuthScreen = false; // para ocultar layout en login/register

  constructor(private theme: ThemeService, private menu: MenuService, private router: Router) {
    this.menus$ = this.menu.treeObservable$.pipe(
      map(tree => tree.filter(m => (m.children && m.children.length > 0)))
    );
    this.loadExpandedState();
    this.filteredMenus$ = combineLatest([this.menus$, this.searchTerm$]).pipe(
      map(([menus, term]) => this.applySearch(menus, term))
    );

    // Detectar pantallas de auth para no mostrar layout
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const url = this.router.url.split('?')[0];
      this.isAuthScreen = url.startsWith('/login') || url.startsWith('/register');
    });
  }

  toggleMenu(key: string) {
    const currently = this.expanded[key];
    if (!currently) {
      Object.keys(this.expanded).forEach(k => { if (k !== key) this.expanded[k] = false; });
      this.expanded[key] = true;
    } else {
      this.expanded[key] = false;
    }
    this.persistExpandedState();
  }
  isExpanded(key: string): boolean {
    if (!(key in this.expanded)) { this.expanded[key] = true; }
    return this.expanded[key];
  }
  onSearchChange(value: string) {
    this.searchQuery = value;
    const term = (value || '').trim();
    this.searchTerm$.next(term);
    if (term.length === 0) return;
    Object.keys(this.expanded).forEach(k => this.expanded[k] = true);
  }
  expandAll() { this.ensureAllKeys(); Object.keys(this.expanded).forEach(k => this.expanded[k] = true); this.persistExpandedState(); }
  collapseAll() { this.ensureAllKeys(); Object.keys(this.expanded).forEach(k => this.expanded[k] = false); this.persistExpandedState(); }
  private ensureAllKeys() { this.menu.tree.forEach(m => { if (!(m.key in this.expanded)) this.expanded[m.key] = true; }); }

  private applySearch(menus: MenuOption[], term: string): MenuOption[] {
    if (!term) return menus;
    const normTerm = this.normalize(term);
    return menus.map(menu => {
      const matchedChildren = (menu.children || []).filter(ch => this.normalize(ch.label).includes(normTerm));
      if (matchedChildren.length > 0) return { ...menu, children: matchedChildren };
      return { ...menu, children: [] };
    }).filter(m => (m.children && m.children.length > 0));
  }
  private persistExpandedState() { try { localStorage.setItem(this.LS_KEY, JSON.stringify(this.expanded)); } catch {} }
  private loadExpandedState() { try { const raw = localStorage.getItem(this.LS_KEY); if (raw) this.expanded = JSON.parse(raw) || {}; } catch { this.expanded = {}; } }
  private normalize(txt: string): string { return (txt || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
}
