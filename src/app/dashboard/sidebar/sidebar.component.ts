import { Component, Input, OnInit } from '@angular/core';
import { MenuService, MenuItem } from './menu.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarModule } from 'primeng/sidebar';
import { MenuItemComponent } from './menu-item.component';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, SidebarModule, MenuItemComponent, NgClass],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  @Input() rol: string = '';
  menu: MenuItem[] = [];
  isExpanded = true;
  isMobile = false;
  menuVisible = false;

  constructor(private menuService: MenuService, private router: Router) {}

  ngOnInit() {
    this.menu = this.menuService.getMenuByRol(this.rol);
    this.isMobile = window.innerWidth < 900;
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    this.isMobile = window.innerWidth < 900;
    if (!this.isMobile) this.menuVisible = false;
  }

  toggleSidebar() {
    this.isExpanded = !this.isExpanded;
  }

  openSidebarMobile() {
    this.menuVisible = true;
  }
  closeSidebarMobile() {
    this.menuVisible = false;
  }

  onItemClick(route: string) {
    if (route) this.router.navigate([route]);
    if (this.isMobile) this.menuVisible = false;
  }
}
