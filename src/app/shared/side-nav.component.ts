import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { MenuService, MenuOption, MenuGroup } from '../service/menu.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive, TooltipModule],
  template: `
  <aside class="sidenav" [class.collapsed]="collapsed()" [attr.aria-expanded]="!collapsed()">
    <div class="sidenav__header">
      <button class="sidenav__toggle" (click)="toggle()" [pTooltip]="collapsed() ? 'Expandir' : 'Colapsar'" tooltipPosition="right">
        <i class="mdi" [ngClass]="collapsed() ? 'mdi-menu-open' : 'mdi-menu' "></i>
      </button>
      <span class="sidenav__title" *ngIf="!collapsed()">{{ title }}</span>
    </div>

    <!-- Hierarchical rendering if groups exist -->
    <ng-container *ngIf="(groups$ | async) as groups; else flatNav">
      <ng-container *ngIf="groups.length > 0; else flatNav">
        <nav class="sidenav__nav grouped">
          <div *ngFor="let g of groups" class="sidenav__group">
            <div class="sidenav__group-title" *ngIf="!collapsed()" (click)="toggleGroup(g, $event)" [attr.aria-expanded]="isExpanded(g)">
              <button class="sidenav__group-toggle" (click)="toggleGroup(g, $event)" [attr.aria-label]="isExpanded(g) ? 'Contraer' : 'Expandir'">
                <i class="mdi" [ngClass]="isExpanded(g) ? 'mdi-chevron-down' : 'mdi-chevron-right'"></i>
              </button>
              <a *ngIf="g.path; else plainTitle" [routerLink]="g.path" class="sidenav__group-link" (click)="$event.stopPropagation()">
                <i *ngIf="g.icon" class="mdi" [ngClass]="g.icon"></i>
                <span>{{ g.descripcion }}</span>
              </a>
              <ng-template #plainTitle>
                <i *ngIf="g.icon" class="mdi" [ngClass]="g.icon"></i>
                <span>{{ g.descripcion }}</span>
              </ng-template>
            </div>
            <div *ngIf="collapsed() || isExpanded(g)">
              <a *ngFor="let opt of g.children"
                 class="sidenav__item"
                 [routerLink]="opt.path || '/'"
                 routerLinkActive="active"
                 [pTooltip]="collapsed() ? opt.descripcion : ''"
                 tooltipPosition="right">
                <i class="mdi sidenav__icon" [ngClass]="opt.icon || 'mdi-circle-outline'"></i>
                <span class="sidenav__label" *ngIf="!collapsed()">{{ opt.descripcion }}</span>
              </a>
            </div>
          </div>
        </nav>
      </ng-container>
    </ng-container>

    <!-- Fallback: flat nav when no groups info provided -->
    <ng-template #flatNav>
      <nav class="sidenav__nav">
        <a *ngFor="let opt of (menu$ | async) || []"
           class="sidenav__item"
           [routerLink]="opt.path || '/'"
           routerLinkActive="active"
           [pTooltip]="collapsed() ? opt.descripcion : ''"
           tooltipPosition="right">
          <i class="mdi sidenav__icon" [ngClass]="opt.icon || 'mdi-circle-outline'"></i>
          <span class="sidenav__label" *ngIf="!collapsed()">{{ opt.descripcion }}</span>
        </a>
      </nav>
    </ng-template>

    <div class="sidenav__footer" *ngIf="!collapsed()">
      <small class="muted">© Guardian</small>
    </div>
  </aside>
  `,
  styles: [
    `
    :host { display:block; height: 100%; }
    .sidenav { width: 260px; min-width: 260px; transition: width .18s ease, min-width .18s ease, box-shadow .18s ease; height: 100%; min-height: 100vh; position: sticky; top: 0; align-self: stretch; background: linear-gradient(160deg, color-mix(in srgb, var(--secondary) 82%, black) 0%, color-mix(in srgb, var(--secondary) 35%, black) 100%); color: #fff; border-radius: 14px; box-shadow: 0 10px 24px rgba(0,0,0,0.18); }
    .sidenav.collapsed { width: 72px; min-width: 72px; }

    .sidenav__header { display:flex; align-items:center; gap:10px; padding: 14px 12px; border-bottom: 1px solid rgba(255,255,255,.08); backdrop-filter: blur(6px); }
    .sidenav__toggle { display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius: 10px; background: rgba(255,255,255,.08); color:#fff; border: none; cursor: pointer; transition: background .15s ease, transform .15s ease; }
    .sidenav__toggle:hover { background: rgba(255,255,255,.14); transform: translateY(-1px); }
    .sidenav__title { font-weight:800; letter-spacing:.3px; }

    .sidenav__nav { display:flex; flex-direction:column; padding: 8px; gap: 6px; }
    .sidenav__nav.grouped { gap: 10px; }
    .sidenav__group { display:flex; flex-direction:column; gap:6px; }
    .sidenav__group-title { display:flex; align-items:center; gap:6px; padding: 6px 8px; opacity: .9; font-weight: 800; text-transform: uppercase; font-size: .78rem; letter-spacing: .4px; color: rgba(255,255,255,.92); cursor: pointer; }
    .sidenav__group-link { display:flex; align-items:center; gap:8px; color: inherit; text-decoration: none; }
    .sidenav__group-title .mdi { opacity:.9; }
    .sidenav__group-toggle { background: transparent; border: none; color: inherit; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; cursor: pointer; }
    .sidenav__group-toggle:hover { background: rgba(255,255,255,.08); }

    .sidenav__item { display:flex; align-items:center; gap:12px; padding: 10px 10px; color:#fff; opacity: .95; text-decoration:none; border-radius: 10px; transition: background .15s ease, transform .15s ease, opacity .15s ease; }
    .sidenav__item:hover { background: rgba(255,255,255,.10); transform: translateX(1px); opacity: 1; }
    .sidenav__item.active { background: rgba(255,255,255,.16); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
    .sidenav__icon { font-size: 20px; width: 24px; text-align:center; }
    .sidenav__label { font-weight: 700; }

    .sidenav__footer { margin-top: auto; padding: 10px 12px; border-top: 1px solid rgba(255,255,255,.08); }

    @media (max-width: 960px) {
      .sidenav { position: sticky; top: 0; }
    }
    `
  ]
})
export class SideNavComponent implements OnInit {
  @Input() title = 'Administración';
  private STORAGE_KEY = 'ui:sideNavCollapsed';
  private EXPANDED_KEY = 'ui:sideNavExpanded';
  collapsed = signal<boolean>(false);
  private expandedState = signal<Record<string, boolean>>({});
  menu$!: Observable<MenuOption[]>;
  groups$!: Observable<MenuGroup[]>;
  private currentGroups: MenuGroup[] = [];

  constructor(private menu: MenuService, private router: Router) {}

  ngOnInit(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      this.collapsed.set(saved === '1');
    } catch {}
    // cargar estado expandido
    try {
      const raw = localStorage.getItem(this.EXPANDED_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === 'object') this.expandedState.set(parsed);
    } catch {}

    this.menu$ = this.menu.list$;
    this.groups$ = this.menu.tree$;
    // Suscribirse para auto-expansión del grupo activo y cache de grupos
    this.menu.tree$.subscribe(gs => {
      this.currentGroups = Array.isArray(gs) ? gs : [];
      this.autoExpandActiveGroup();
    });
  }

  private persistExpanded() {
    try { localStorage.setItem(this.EXPANDED_KEY, JSON.stringify(this.expandedState())); } catch {}
  }

  isExpanded(g: MenuGroup): boolean {
    const map = this.expandedState();
    return !!map[g.codigo];
  }

  toggleGroup(g: MenuGroup, ev?: Event) {
    ev?.stopPropagation();
    const map = { ...this.expandedState() };
    map[g.codigo] = !map[g.codigo];
    this.expandedState.set(map);
    this.persistExpanded();
  }

  private autoExpandActiveGroup() {
    const url = (this.router.url || '').split('?')[0];
    if (!url || this.currentGroups.length === 0) return;
    const already = this.expandedState();
    // Si ya hay estado guardado para algún grupo, no forzar; solo expandir cuando ninguno se guardó
    const hasAny = Object.keys(already).length > 0;
    if (hasAny) return;
    for (const g of this.currentGroups) {
      if ((g.children || []).some(c => (c.path || '').split('?')[0] === url)) {
        const map = { ...already, [g.codigo]: true };
        this.expandedState.set(map);
        this.persistExpanded();
        break;
      }
    }
  }

  toggle() {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try { localStorage.setItem(this.STORAGE_KEY, next ? '1' : '0'); } catch {}
  }
}
