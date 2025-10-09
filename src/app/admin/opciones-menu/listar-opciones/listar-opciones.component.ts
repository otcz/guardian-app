import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { MenuService, MenuNode } from '../../../service/menu.service';

interface Row { label: string; path: string; }

@Component({
  selector: 'app-listar-opciones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CardModule, ButtonModule, InputTextModule, TableModule],
  templateUrl: './listar-opciones.component.html',
  styleUrls: ['./listar-opciones.component.scss']
})
export class ListarOpcionesComponent implements OnInit {
  rows: Row[] = [];
  filtered: Row[] = [];
  query = '';

  constructor(private menu: MenuService) {}

  ngOnInit(): void {
    const flat = (this.menu as any).flatItems$?.value as MenuNode[] | undefined;
    const list = Array.isArray(flat) ? flat : [];
    this.rows = list.map(n => ({ label: n.label, path: n.path || '' })).filter(r => !!r.path);
    this.filtered = this.rows.slice();
    console.log('[UI] ListarOpcionesComponent cargado', this.filtered.length);
  }

  applyFilter() {
    const q = (this.query || '').trim().toLowerCase();
    if (!q) { this.filtered = this.rows.slice(); return; }
    this.filtered = this.rows.filter(r => r.label.toLowerCase().includes(q) || r.path.toLowerCase().includes(q));
  }
}
