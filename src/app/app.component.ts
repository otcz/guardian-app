import { Component, HostListener, OnInit } from '@angular/core';
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
import { UserAvatarProComponent } from './shared/user-avatar-pro.component';
import { FeedbackCenterComponent } from './shared/feedback-center.component';
import { UppercaseGlobalService } from './shared/uppercase-global.service';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.css'],
  imports: [
    RouterModule,
    CommonModule,
    ButtonModule,
    TableModule,
    ThemeToggleComponent,
    InputTextModule,
    FormsModule,
    UserAvatarProComponent,
    FeedbackCenterComponent,
    TooltipModule,
    BadgeModule
  ],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('250ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden' }),
        animate('200ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class AppComponent implements OnInit {
  // Lógica migrada del antiguo DashboardComponent
  sidebarOpen = true;
  isMobileView = false;
  menus$!: Observable<MenuOption[]>;
  filteredMenus$!: Observable<MenuOption[]>;
  searchQuery = '';
  private searchTerm$ = new BehaviorSubject<string>('');
  private readonly LS_KEY = 'menuExpandedState';
  private readonly LS_SIDEBAR_KEY = 'sidebarOpen';
  expanded: Record<string, boolean> = {};
  isAuthScreen = false;

  constructor(private theme: ThemeService, private menu: MenuService, private router: Router, _upper: UppercaseGlobalService) {
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

  ngOnInit() {
    this.checkScreenSize();
    this.loadSidebarState();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    const wasMobile = this.isMobileView;
    this.isMobileView = window.innerWidth < 1024;

    // Si cambiamos de móvil a desktop o viceversa
    if (wasMobile !== this.isMobileView) {
      if (this.isMobileView) {
        // En móvil, cerrar por defecto
        this.sidebarOpen = false;
      } else {
        // En desktop, restaurar estado guardado
        this.loadSidebarState();
      }
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    if (!this.isMobileView) {
      this.saveSidebarState();
    }
  }

  closeSidebar() {
    if (this.isMobileView) {
      this.sidebarOpen = false;
    }
  }

  onMobileMenuClick() {
    if (this.isMobileView) {
      this.sidebarOpen = false;
    }
  }

  private saveSidebarState() {
    try {
      localStorage.setItem(this.LS_SIDEBAR_KEY, JSON.stringify(this.sidebarOpen));
    } catch {}
  }

  private loadSidebarState() {
    try {
      const saved = localStorage.getItem(this.LS_SIDEBAR_KEY);
      if (saved !== null) {
        this.sidebarOpen = JSON.parse(saved);
      }
    } catch {
      this.sidebarOpen = true;
    }
  }

  // Expandir sidebar y abrir un menú específico
  expandSidebarAndOpenMenu(menuKey: string) {
    this.sidebarOpen = true;
    this.saveSidebarState();
    // Pequeño delay para permitir que el sidebar se expanda antes de abrir el menú
    setTimeout(() => {
      if (!this.expanded[menuKey]) {
        this.toggleMenu(menuKey);
      }
    }, 100);
  }

  // TrackBy functions para mejor performance
  trackByMenuKey(index: number, menu: MenuOption): string {
    return menu.key;
  }

  trackByChildLabel(index: number, child: MenuOption): string {
    return child.label;
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
  parseQuery(url?: string | null): any {
    try {
      if (!url) return null;
      const base = url.split('?')[0] || '';
      const qIndex = url.indexOf('?');
      if (qIndex >= 0) {
        const query = url.substring(qIndex + 1);
        const params = new URLSearchParams(query);
        const obj: any = {};
        params.forEach((v, k) => { obj[k] = v; });
        return obj;
      }
      // Añadir dinámicamente id para rutas que lo requieren
      const needsId = new Set([
        '/gestionar-organizacion',
        '/configurar-parametros-globales',
        '/ver-auditoria-de-organizacion',
        '/crear-seccion',
        '/listar-secciones',
        '/listar-roles',
        '/crear-rol',
        '/gestionar-rol'
      ]);
      if (needsId.has(base)) {
        try { const id = localStorage.getItem('currentOrgId'); if (id) return { id }; } catch {}
      }
      return null;
    } catch { return null; }
  }
}
