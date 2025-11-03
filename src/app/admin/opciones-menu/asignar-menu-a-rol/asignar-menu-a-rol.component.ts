import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { RolesService, RoleEntity } from '../../../service/roles.service';
import { NotificationService } from '../../../service/notification.service';
import { OpcionesService, OpcionEntity } from '../../../service/opciones.service';
import { lastValueFrom, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { OrgContextService } from '../../../service/org-context.service';
import { AuthService } from '../../../service/auth.service';
import { RolesGlobalStore } from '../../../service/roles-global.store';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-asignar-menu-a-rol',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, ButtonModule, DropdownModule, InputTextModule, CheckboxModule, TableModule, TagModule],
  templateUrl: './asignar-menu-a-rol.component.html',
  styleUrls: ['./asignar-menu-a-rol.component.scss']
})
export class AsignarMenuARolComponent implements OnInit {
  roles: RoleEntity[] = [];
  rolId: string | null = null;
  orgId: string | null = null; // En modo SYSADMIN, se toma del rol seleccionado

  allOptions: OpcionEntity[] = [];
  filteredOptions: OpcionEntity[] = [];

  // Selección y asignaciones
  assignedIds = new Set<string>(); // estado del backend
  selectedIds = new Set<string>(); // estado de UI
  selectedRows: OpcionEntity[] = []; // solo informativo

  query = '';
  loading = false;
  saving = false;
  errorMsg: string | null = null;

  // Filtro y visibilidad
  private filteredIdSet = new Set<string>();
  onlyActive = false;
  onlyMenus = false;

  // SYSADMIN
  isSysAdmin = false;
  roleQuery = '';
  private roleQuery$ = new Subject<string>();
  roleById = new Map<string, RoleEntity>();

  // Índices del árbol
  private byId = new Map<string, OpcionEntity>();
  private children = new Map<string, OpcionEntity[]>();

  // Ids visibles segun filtro/árbol y expansión por grupo
  private visibleIdSet = new Set<string>();
  expanded = new Set<string>();

  // Filas visibles agrupadas (agrega rootId y isMenu)
  tableRows: Array<{ id: string; nombre: string; ruta?: string | null; tipo?: string | null; activo?: boolean; icono?: string | null; nivel: number; parentId?: string | null; rootId: string; isMenu: boolean; ref: OpcionEntity }> = [];

  constructor(
    private rolesSvc: RolesService,
    private opcionesSvc: OpcionesService,
    private notify: NotificationService,
    private orgCtx: OrgContextService,
    private auth: AuthService,
    private rolesStore: RolesGlobalStore
  ) {}

  ngOnInit(): void {
    this.isSysAdmin = this.auth.hasRole('SYSADMIN');

    this.roleQuery$
      .pipe(debounceTime(150), distinctUntilChanged(), switchMap((q) => this.rolesStore.filterLocal(q || '')))
      .subscribe({
        next: (list) => {
          this.roles = list || [];
          this.roleById.clear();
          for (const r of this.roles) this.roleById.set(String(r.id), r);
          if (this.rolId && !this.roleById.has(String(this.rolId))) {
            this.rolId = null;
            this.resetData();
          }
        }
      });

    if (this.isSysAdmin) {
      this.loading = true;
      this.rolesStore.loadOnce().subscribe({
        next: (list) => {
          this.roles = list || [];
          this.roleById.clear();
          for (const r of this.roles) this.roleById.set(String(r.id), r);
          this.onRoleQueryChange();
        },
        error: (e) => { this.errorMsg = e?.error?.message || e?.message || 'No se pudieron obtener los roles'; },
        complete: () => { this.loading = false; }
      });
      return;
    }

    this.orgId = this.orgCtx.value || localStorage.getItem('currentOrgId');
    if (!this.orgId) { this.resetData(); return; }
    this.loading = true;
    this.rolesSvc.list(this.orgId).subscribe({
      next: (list) => {
        this.roles = list || [];
        this.roleById.clear();
        for (const r of this.roles) this.roleById.set(String(r.id), r);
        if (this.rolId && this.roles.some(r => String(r.id) === String(this.rolId))) {
          this.onRolChange();
        } else if (!this.rolId && this.roles.length === 1) {
          this.rolId = String(this.roles[0].id);
          this.onRolChange();
        } else {
          this.resetData();
        }
      },
      error: (e) => { this.errorMsg = e?.error?.message || e?.message || 'No se pudieron obtener los roles'; this.resetData(); },
      complete: () => { this.loading = false; }
    });
  }

  onRoleQueryChange() { this.roleQuery$.next(this.roleQuery); }

  async onRolChange() {
    this.errorMsg = null;
    if (!this.rolId) { this.resetData(); return; }

    const selectedRole = this.roleById.get(String(this.rolId));
    const effectiveOrgId = this.isSysAdmin ? (selectedRole?.orgId ?? null) : (this.orgId ?? null);
    if (!effectiveOrgId) { this.resetData(); return; }

    this.orgId = effectiveOrgId;
    this.loading = true;
    try {
      const catalog = await lastValueFrom(this.opcionesSvc.ensureOrgOptions(this.orgId));
      this.allOptions = Array.isArray(catalog) ? catalog : [];
      this.buildIndex();

      const assignedList = await lastValueFrom(this.opcionesSvc.listRoleOptions(this.orgId, this.rolId));
      const assignedSet = new Set((assignedList || []).map(o => String(o.id)));
      this.assignedIds = assignedSet;
      this.selectedIds = new Set(assignedSet);

      this.applyFilter();
      this.syncSelectedRows();
    } catch (e: any) {
      this.errorMsg = e?.error?.message || e?.message || 'No se pudieron cargar las opciones del rol';
      this.resetData(false);
    } finally { this.loading = false; }
  }

  private buildIndex() {
    this.byId = new Map<string, OpcionEntity>();
    this.children = new Map<string, OpcionEntity[]>();
    for (const o of this.allOptions) {
      const id = String(o.id);
      this.byId.set(id, o);
      const p = o?.padreId ? String(o.padreId) : '';
      if (p) { if (!this.children.has(p)) this.children.set(p, []); this.children.get(p)!.push(o); }
    }
  }

  applyFilter() {
    const q = (this.query || '').trim().toLowerCase();
    const match = (o: OpcionEntity): boolean => {
      if (this.onlyActive && o?.activo === false) return false;
      if (this.onlyMenus && (o?.tipo || '').toUpperCase() !== 'MENU') return false;
      if (!q) return true;
      const nombre = (o?.nombre || '').toLowerCase();
      const ruta = (o?.ruta || '').toLowerCase();
      const codigo = (o?.codigo || '').toLowerCase();
      return nombre.includes(q) || ruta.includes(q) || codigo.includes(q);
    };

    if (!this.allOptions?.length) {
      this.filteredOptions = [];
      this.filteredIdSet = new Set<string>();
      this.tableRows = [];
      this.visibleIdSet = new Set<string>();
      this.expanded.clear();
      return;
    }

    this.filteredOptions = this.allOptions.filter(match);
    this.filteredIdSet = new Set(this.filteredOptions.map(o => String(o.id)));

    this.buildTableRows();
  }

  private buildTableRows() {
    const isMenu = (o: OpcionEntity) => (o?.tipo || '').toUpperCase() === 'MENU' || (!o.padreId);
    const cmp = (a: OpcionEntity, b: OpcionEntity) => {
      const at = isMenu(a) ? 0 : 1; const bt = isMenu(b) ? 0 : 1;
      if (at !== bt) return at - bt;
      return (a.nombre || '').localeCompare(b.nombre || '');
    };

    const roots: OpcionEntity[] = [];
    for (const o of this.allOptions) if (!o?.padreId) roots.push(o);

    const visible = (id: string): boolean => {
      if (this.filteredIdSet.size === 0) return true;
      if (this.filteredIdSet.has(id)) return true;
      const kids = this.children.get(id) || [];
      for (const k of kids) if (visible(String(k.id))) return true;
      return false;
    };

    const rows: typeof this.tableRows = [];
    const visibleIds = new Set<string>();

    const walk = (node: OpcionEntity, nivel: number, rootId: string) => {
      const id = String(node.id);
      if (!visible(id)) return;
      // incluir siempre la cabecera de grupo (nivel 0) y cualquier nodo con match/hijos visibles
      rows.push({ id, nombre: node.nombre, ruta: node.ruta, tipo: node.tipo, activo: node.activo, icono: node.icono, nivel, parentId: node.padreId ?? null, rootId, isMenu: isMenu(node), ref: node });
      visibleIds.add(id);
      const kids = (this.children.get(id) || []).sort(cmp);
      for (const ch of kids) walk(ch, nivel + 1, rootId);
    };
    for (const r of roots.sort(cmp)) walk(r, 0, String(r.id));

    this.tableRows = rows;
    this.visibleIdSet = visibleIds;

    // Expandir por defecto cabeceras
    const rootIds = new Set(rows.filter(r => r.nivel === 0).map(r => r.id));
    for (const rid of rootIds) if (!this.expanded.has(rid)) this.expanded.add(rid);
  }

  private syncSelectedRows() {
    if (!this.allOptions?.length || !this.selectedIds.size) { this.selectedRows = []; return; }
    this.selectedRows = this.allOptions.filter(o => this.selectedIds.has(String(o.id)));
  }

  allFilteredSelected(): boolean {
    const selectable = this.tableRows.filter(r => r.activo !== false);
    if (!selectable.length) return false;
    return selectable.every(r => this.selectedIds.has(r.id));
  }

  onToggleSelectAllFiltered(checked: boolean) {
    const selectable = this.tableRows.filter(r => r.activo !== false);
    if (checked) { for (const r of selectable) this.selectedIds.add(r.id); }
    else { for (const r of selectable) this.selectedIds.delete(r.id); }
    this.syncSelectedRows();
  }

  private getDescendantIds(id: string, includeSelf = true, onlyVisible = true): string[] {
    const out: string[] = [];
    const pushIf = (val: string) => { if (!onlyVisible || this.visibleIdSet.has(val)) out.push(val); };
    const walk = (nid: string) => { pushIf(nid); const kids = this.children.get(nid) || []; for (const ch of kids) walk(String(ch.id)); };
    if (includeSelf) walk(String(id)); else { const kids = this.children.get(String(id)) || []; for (const ch of kids) walk(String(ch.id)); }
    return out;
  }

  private isMenuById(id: string): boolean {
    const o = this.byId.get(String(id));
    if (!o) return false;
    const t = (o?.tipo || '').toUpperCase();
    return t === 'MENU' || !o.padreId || (this.children.get(String(id)) || []).length > 0;
  }

  toggleOne(id: string, checked: boolean) {
    id = String(id);
    if (this.isMenuById(id)) {
      const ids = this.getDescendantIds(id, true, true);
      if (checked) {
        for (const did of ids) {
          const row = this.tableRows.find(r => r.id === did);
          if (!row || row.activo === false) continue;
          this.selectedIds.add(did);
        }
      } else {
        for (const did of ids) this.selectedIds.delete(did);
      }
    } else {
      if (checked) this.selectedIds.add(String(id));
      else this.selectedIds.delete(String(id));
    }
    this.syncSelectedRows();
  }

  // Helpers de grupo
  groupRows(rootId: string) { return this.tableRows.filter(r => r.rootId === rootId); }
  groupAllSelectedById(rootId: string): boolean {
    const rows = this.groupRows(rootId).filter(r => r.activo !== false);
    if (!rows.length) return false;
    return rows.every(r => this.selectedIds.has(r.id));
  }
  groupSomeSelectedById(rootId: string): boolean {
    const rows = this.groupRows(rootId).filter(r => r.activo !== false);
    if (!rows.length) return false;
    const selected = rows.filter(r => this.selectedIds.has(r.id));
    return selected.length > 0 && selected.length < rows.length;
  }
  groupSelectedCount(rootId: string): number {
    const rows = this.groupRows(rootId);
    if (!rows.length) return 0;
    return rows.filter(r => r.id !== rootId && this.selectedIds.has(r.id)).length;
  }
  onToggleGroup(rootId: string, checked: boolean) {
    const rows = this.groupRows(rootId).filter(r => r.activo !== false);
    if (checked) { for (const r of rows) this.selectedIds.add(r.id); }
    else { for (const r of rows) this.selectedIds.delete(r.id); }
    this.syncSelectedRows();
  }
  toggleExpand(rootId: string) { if (this.expanded.has(rootId)) this.expanded.delete(rootId); else this.expanded.add(rootId); }

  get totalSelected(): number { return this.selectedIds.size; }
  get totalAssigned(): number { return this.assignedIds.size; }
  get hasChanges(): boolean {
    if (this.assignedIds.size !== this.selectedIds.size) return true;
    for (const id of this.selectedIds) if (!this.assignedIds.has(id)) return true;
    return false;
  }

  revert() { this.selectedIds = new Set(this.assignedIds); this.syncSelectedRows(); }

  async save() {
    if (!this.orgId || !this.rolId) { this.notify.warn('Atención', 'Seleccione un rol'); return; }
    const adds: string[] = []; const removes: string[] = [];
    for (const id of this.selectedIds) if (!this.assignedIds.has(id)) adds.push(id);
    for (const id of this.assignedIds) if (!this.selectedIds.has(id)) removes.push(id);
    if (!adds.length && !removes.length) { this.notify.info('Sin cambios', 'No hay nada para guardar'); return; }

    this.saving = true; let ok = 0; const fails: string[] = [];
    try {
      for (const id of removes) { try { await lastValueFrom(this.opcionesSvc.unassignOptionFromRole(this.orgId!, this.rolId!, id)); ok++; } catch (e: any) { fails.push(e?.error?.message || e?.message || `Error al quitar ${id}`); } }
      for (const id of adds) { try { await lastValueFrom(this.opcionesSvc.assignOptionToRole(this.orgId!, this.rolId!, id)); ok++; } catch (e: any) { fails.push(e?.error?.message || e?.message || `Error al asignar ${id}`); } }
      if (ok > 0) { try { const assigned = await lastValueFrom(this.opcionesSvc.listRoleOptions(this.orgId!, this.rolId!)); this.assignedIds = new Set((assigned || []).map(o => String(o.id))); this.selectedIds = new Set(this.assignedIds); } catch {} }
      if (fails.length) { this.notify.warn('Parcial', `${ok} cambios aplicados. ${fails.length} con error.`); this.notify.error('Detalle', fails[0]); }
      else { this.notify.success('Listo', `${ok} cambios aplicados`); }
    } finally { this.saving = false; this.syncSelectedRows(); }
  }

  resetData(clearAll: boolean = true) {
    if (clearAll) { this.allOptions = []; this.filteredOptions = []; }
    this.assignedIds.clear();
    this.selectedIds.clear();
    this.selectedRows = [];
    this.filteredIdSet = new Set();
    this.tableRows = [];
    this.byId.clear();
    this.children.clear();
    this.visibleIdSet = new Set();
    this.expanded.clear();
  }

  async seedNow() {
    if (!this.orgId) { this.notify.warn('Atención', 'No hay organización activa'); return; }
    try { this.saving = true; await lastValueFrom(this.opcionesSvc.seedOrgOptions(this.orgId)); this.notify.success('Catálogo creado', 'Se creó el catálogo de opciones de la organización'); await this.onRolChange(); }
    catch (e: any) { const msg = e?.error?.message || e?.message || 'No se pudo sembrar el catálogo de opciones'; this.notify.error('Error', msg); }
    finally { this.saving = false; }
  }
}
