import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { MenuService, MenuOption } from '../service/menu.service';
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

    <nav class="sidenav__nav">
      <a *ngFor="let opt of (menu$ | async) || []"
         class="sidenav__item"
         [routerLink]="opt.path"
         routerLinkActive="active"
         [pTooltip]="collapsed() ? opt.descripcion : ''"
         tooltipPosition="right">
        <i class="mdi sidenav__icon" [ngClass]="opt.icon"></i>
        <span class="sidenav__label" *ngIf="!collapsed()">{{ opt.descripcion }}</span>
      </a>
    </nav>

    <div class="sidenav__footer" *ngIf="!collapsed()">
      <small class="muted">© Guardian</small>
    </div>
  </aside>
  `,
  styles: [`
    :host { display:block; height: 100%; }
    .sidenav { width: 260px; min-width: 260px; transition: width .18s ease, min-width .18s ease, box-shadow .18s ease; height: 100%; min-height: 100vh; position: sticky; top: 0; align-self: stretch; background: linear-gradient(160deg, color-mix(in srgb, var(--secondary) 82%, black) 0%, color-mix(in srgb, var(--secondary) 35%, black) 100%); color: #fff; border-radius: 14px; box-shadow: 0 10px 24px rgba(0,0,0,0.18); }
    .sidenav.collapsed { width: 72px; min-width: 72px; }

    .sidenav__header { display:flex; align-items:center; gap:10px; padding: 14px 12px; border-bottom: 1px solid rgba(255,255,255,.08); backdrop-filter: blur(6px); }
    .sidenav__toggle { display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius: 10px; background: rgba(255,255,255,.08); color:#fff; border: none; cursor: pointer; transition: background .15s ease, transform .15s ease; }
    .sidenav__toggle:hover { background: rgba(255,255,255,.14); transform: translateY(-1px); }
    .sidenav__title { font-weight:800; letter-spacing:.3px; }

    .sidenav__nav { display:flex; flex-direction:column; padding: 8px; gap: 6px; }
    .sidenav__item { display:flex; align-items:center; gap:12px; padding: 10px 10px; color:#fff; opacity: .95; text-decoration:none; border-radius: 10px; transition: background .15s ease, transform .15s ease, opacity .15s ease; }
    .sidenav__item:hover { background: rgba(255,255,255,.10); transform: translateX(1px); opacity: 1; }
    .sidenav__item.active { background: rgba(255,255,255,.16); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
    .sidenav__icon { font-size: 20px; width: 24px; text-align:center; }
    .sidenav__label { font-weight: 700; }

    .sidenav__footer { margin-top: auto; padding: 10px 12px; border-top: 1px solid rgba(255,255,255,.08); }

    @media (max-width: 960px) {
      .sidenav { position: sticky; top: 0; }
    }
  `]
})
export class SideNavComponent implements OnInit {
  @Input() title = 'Administración';
  private STORAGE_KEY = 'ui:sideNavCollapsed';
  collapsed = signal<boolean>(false);
  menu$!: Observable<MenuOption[]>;

  constructor(private menu: MenuService, private router: Router) {}

  ngOnInit(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      this.collapsed.set(saved === '1');
    } catch {}
    this.menu$ = this.menu.list$;
  }

  toggle() {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try { localStorage.setItem(this.STORAGE_KEY, next ? '1' : '0'); } catch {}
  }
}
