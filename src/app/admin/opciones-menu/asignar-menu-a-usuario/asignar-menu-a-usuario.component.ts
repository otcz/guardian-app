import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { UsersService, UserEntity } from '../../../service/users.service';
import { NotificationService } from '../../../service/notification.service';
import { OpcionesService, OpcionEntity } from '../../../service/opciones.service';
import { lastValueFrom } from 'rxjs';
import { OrgContextService } from '../../../service/org-context.service';

@Component({
  selector: 'app-asignar-menu-a-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, ButtonModule, DropdownModule, InputTextModule, CheckboxModule],
  templateUrl: './asignar-menu-a-usuario.component.html',
  styleUrls: ['./asignar-menu-a-usuario.component.scss']
})
export class AsignarMenuAUsuarioComponent implements OnInit {
  users: UserEntity[] = [];
  usuarioId: string | null = null;
  orgId: string | null = null;

  allOptions: OpcionEntity[] = [];
  filteredOptions: OpcionEntity[] = [];

  // Selección y asignaciones
  assignedIds = new Set<string>(); // opcionId asignadas actualmente
  assignedMap = new Map<string, string>(); // opcionId -> opcionUsuarioId
  selectedIds = new Set<string>(); // estado de UI
  selectedRows: OpcionEntity[] = []; // binding para p-table (compatibilidad)

  query = '';
  loading = false;
  saving = false;
  errorMsg: string | null = null;

  private filteredIdSet = new Set<string>();
  grouped: Array<{ parentId: string; parent: OpcionEntity | null; items: OpcionEntity[] }> = [];

  constructor(
    private usersSvc: UsersService,
    private opcionesSvc: OpcionesService,
    private notify: NotificationService,
    private orgCtx: OrgContextService
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value || localStorage.getItem('currentOrgId');
    if (!this.orgId) { this.resetData(); return; }

    this.loading = true;
    this.usersSvc.list(this.orgId).subscribe({
      next: (list) => {
        this.users = list || [];
        this.loading = false;
        if (this.usuarioId && this.users.some(u => String(u.id) === String(this.usuarioId))) {
          this.onUsuarioChange();
        } else if (!this.usuarioId && this.users.length === 1) {
          this.usuarioId = String(this.users[0].id);
          this.onUsuarioChange();
        } else {
          this.resetData();
        }
      },
      error: (e) => {
        this.loading = false;
        this.errorMsg = e?.error?.message || e?.message || 'No se pudieron obtener los usuarios';
        this.resetData();
      }
    });
  }

  async onUsuarioChange() {
    if (!this.orgId || !this.usuarioId) { this.resetData(); return; }
    this.loading = true; this.errorMsg = null;
    try {
      const all = await lastValueFrom(this.opcionesSvc.ensureOrgOptions(this.orgId));
      this.allOptions = Array.isArray(all) ? all : [];

      try {
        const assigned = await lastValueFrom(this.opcionesSvc.listUserAssignments(this.orgId, this.usuarioId));
        this.assignedIds = new Set((assigned || []).map(a => String(a.opcionId ?? a.opcion?.id ?? '')));
        this.assignedMap = new Map((assigned || []).map(a => [String(a.opcionId ?? a.opcion?.id ?? ''), String(a.id)]) as any);
      } catch (e: any) {
        this.assignedIds = new Set<string>();
        this.assignedMap.clear();
        const msg = e?.error?.message || e?.message || 'No se pudieron obtener las asignaciones del usuario.';
        this.notify.warn('Asignaciones no disponibles', msg + ' Se mostrará el catálogo sin asignaciones.');
      }

      this.selectedIds = new Set(this.assignedIds);
      this.syncSelectedRows();
      this.applyFilter();
    } catch (e: any) {
      this.errorMsg = e?.error?.message || e?.message || 'No se pudieron cargar las opciones de la organización';
      this.allOptions = []; this.filteredOptions = []; this.assignedIds.clear(); this.selectedIds.clear(); this.selectedRows = [];
      this.filteredIdSet.clear(); this.grouped = [];
    } finally {
      this.loading = false;
    }
  }

  resetData() {
    this.allOptions = []; this.filteredOptions = []; this.assignedIds.clear(); this.assignedMap.clear(); this.selectedIds.clear(); this.selectedRows = [];
    this.query = '';
    this.filteredIdSet.clear(); this.grouped = [];
  }

  applyFilter() {
    const q = (this.query || '').trim().toLowerCase();
    if (!q) { this.filteredOptions = [...this.allOptions]; }
    else {
      this.filteredOptions = this.allOptions.filter(o => (o.nombre || '').toLowerCase().includes(q) || (o.ruta || '').toLowerCase().includes(q));
    }
    this.filteredIdSet = new Set(this.filteredOptions.map(o => String(o.id)));
    this.buildGroups();
  }

  private buildGroups() {
    const isMenu = (o: OpcionEntity) => (o?.codigo || '').toUpperCase().startsWith('MENU_');
    const isItem = (o: OpcionEntity) => (o?.codigo || '').toUpperCase().startsWith('ITEM_');

    const normalizePath = (p?: string | null): string => {
      if (!p) return '';
      let s = String(p).trim();
      if (!s.startsWith('/')) s = '/' + s;
      if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
      return s.toLowerCase();
    };

    const allMenus = this.allOptions.filter(isMenu);
    const menusById = new Map(allMenus.map(m => [String(m.id), m] as const));
    const menusByPath = new Map(allMenus.map(m => [normalizePath(m.ruta), m] as const));

    const filteredMenus = this.filteredOptions.filter(isMenu);
    const filteredItems = this.filteredOptions.filter(isItem);

    const groups = new Map<string, { parentId: string; parent: OpcionEntity | null; items: OpcionEntity[] }>();

    for (const m of filteredMenus) {
      const id = String(m.id);
      if (!groups.has(id)) groups.set(id, { parentId: id, parent: m, items: [] });
    }

    const findBestMenuForItem = (it: OpcionEntity): OpcionEntity | null => {
      const itPath = normalizePath(it.ruta);
      let best: OpcionEntity | null = null;
      let bestLen = -1;
      if (itPath) {
        for (const [mpath, menu] of menusByPath) {
          if (!mpath) continue;
          if (itPath === mpath || itPath.startsWith(mpath + '/')) {
            if (mpath.length > bestLen) { best = menu; bestLen = mpath.length; }
          }
        }
        if (best) return best;
      }
      const toTokens = (s: string) => s.toUpperCase().replace(/^ITEM_/, '').replace(/^MENU_/, '')
        .replaceAll('DE ', ' ').replaceAll(' DEL ', ' ').replaceAll(' Y ', ' ').replaceAll('_', ' ').split(/\s+/).filter(Boolean)
        .filter(t => !['CREAR','LISTAR','ASIGNAR','VER','GESTIONAR','CONFIGURAR','DESACTIVAR','FILTRAR','REGISTRAR','PERMISO','GLOBAL','MENU','OPCION','OPCIONES','INVITACION','INVITACIONES'].includes(t));
      const itemTokens = new Set(toTokens(it.codigo || it.nombre || ''));
      let maxOverlap = 0; let bestMenu: OpcionEntity | null = null;
      for (const m of allMenus) {
        const menuTokens = new Set(toTokens(m.codigo || m.nombre || ''));
        let overlap = 0; for (const t of itemTokens) if (menuTokens.has(t)) overlap++;
        if (overlap > maxOverlap) { maxOverlap = overlap; bestMenu = m; }
      }
      return bestMenu;
    };

    const standaloneItems: OpcionEntity[] = [];
    for (const it of filteredItems) {
      const menu = findBestMenuForItem(it);
      if (menu) {
        const gid = String(menu.id);
        if (!groups.has(gid)) groups.set(gid, { parentId: gid, parent: menusById.get(gid) || menu, items: [] });
        groups.get(gid)!.items.push(it);
      } else {
        standaloneItems.push(it);
      }
    }

    for (const it of standaloneItems) {
      const id = String(it.id);
      if (!groups.has(id)) groups.set(id, { parentId: id, parent: it, items: [] });
    }

    const sorted = Array.from(groups.values()).sort((a, b) => (a.parent?.nombre || '').localeCompare(b.parent?.nombre || ''));
    for (const g of sorted) g.items.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    this.grouped = sorted;
  }

  private groupVisibleIds(g: { parentId: string; parent: OpcionEntity | null; items: OpcionEntity[] }): string[] {
    const ids: string[] = [];
    if (g.parent && this.filteredIdSet.has(String(g.parent.id))) ids.push(String(g.parent.id));
    for (const it of g.items) ids.push(String(it.id));
    return ids;
  }

  isParentVisible(g: { parentId: string; parent: OpcionEntity | null; items: OpcionEntity[] }): boolean {
    return !!(g.parent && this.filteredIdSet.has(String(g.parent.id)));
  }

  isGroupFullySelected(g: { parentId: string; parent: OpcionEntity | null; items: OpcionEntity[] }): boolean {
    const ids = this.groupVisibleIds(g);
    if (!ids.length) return false;
    for (const id of ids) if (!this.selectedIds.has(id)) return false;
    return true;
  }

  groupSelectedCount(g: { parentId: string; parent: OpcionEntity | null; items: OpcionEntity[] }): number {
    let c = 0; const ids = this.groupVisibleIds(g);
    for (const id of ids) if (this.selectedIds.has(id)) c++;
    return c;
  }

  groupVisibleCount(g: { parentId: string; parent: OpcionEntity | null; items: OpcionEntity[] }): number {
    return this.groupVisibleIds(g).length;
  }

  toggleGroup(g: { parentId: string; parent: OpcionEntity | null; items: OpcionEntity[] }, checked: boolean) {
    const ids = this.groupVisibleIds(g);
    if (checked) { for (const id of ids) this.selectedIds.add(id); }
    else { for (const id of ids) this.selectedIds.delete(id); }
    this.syncSelectedRows();
  }

  toggleOne(id: string, checked: boolean) {
    if (checked) this.selectedIds.add(String(id));
    else this.selectedIds.delete(String(id));
    this.syncSelectedRows();
  }

  // IDs visibles (en el filtro actual) que pertenecen al grupo (incluye padre si está visible)
  private syncSelectedRows() {
    if (!this.allOptions?.length) { this.selectedRows = []; return; }
    const sel = this.selectedIds;
    this.selectedRows = this.allOptions.filter(o => sel.has(String(o.id)));
  }

  // --- Métodos añadidos: helpers para selección masiva según filtro ---
  allFilteredSelected(): boolean {
    if (!this.filteredOptions.length) return false;
    const selected = this.selectedIds;
    return this.filteredOptions.every(o => selected.has(String(o.id)));
  }

  onToggleSelectAllFiltered(checked: boolean) {
    if (checked) {
      for (const o of this.filteredOptions) this.selectedIds.add(String(o.id));
    } else {
      for (const o of this.filteredOptions) this.selectedIds.delete(String(o.id));
    }
    this.syncSelectedRows();
  }

  get totalSelected(): number { return this.selectedIds.size; }
  get totalAssigned(): number { return this.assignedIds.size; }
  get hasChanges(): boolean {
    if (this.assignedIds.size !== this.selectedIds.size) return true;
    for (const id of this.selectedIds) if (!this.assignedIds.has(id)) return true;
    return false;
  }

  revert() {
    this.selectedIds = new Set(this.assignedIds);
    this.syncSelectedRows();
  }

  async save() {
    if (!this.orgId || !this.usuarioId) { this.notify.warn('Atención', 'Seleccione un usuario'); return; }
    const adds: string[] = []; const removes: string[] = [];
    for (const id of this.selectedIds) if (!this.assignedIds.has(id)) adds.push(id);
    for (const id of this.assignedIds) if (!this.selectedIds.has(id)) removes.push(id);
    if (adds.length === 0 && removes.length === 0) { this.notify.info('Sin cambios', 'No hay nada para guardar'); return; }

    this.saving = true; let ok = 0; const fails: string[] = [];
    try {
      // Ejecutar removes primero (usando los ids de asignación)
      for (const opcionId of removes) {
        const asignId = this.assignedMap.get(String(opcionId));
        if (!asignId) { fails.push(`No se encontró asignación para ${opcionId}`); continue; }
        try { await lastValueFrom(this.opcionesSvc.deleteUserAssignment(this.orgId!, asignId)); ok++; }
        catch (e: any) { fails.push(e?.error?.message || e?.message || `Error al quitar ${opcionId}`); }
      }
      for (const opcionId of adds) {
        try { await lastValueFrom(this.opcionesSvc.assignOptionToUser(this.orgId!, this.usuarioId!, opcionId)); ok++; }
        catch (e: any) { fails.push(e?.error?.message || e?.message || `Error al asignar ${opcionId}`); }
      }

      if (ok > 0) {
        try {
          const assigned = await lastValueFrom(this.opcionesSvc.listUserAssignments(this.orgId!, this.usuarioId!));
          this.assignedIds = new Set((assigned || []).map(a => String(a.opcionId ?? a.opcion?.id ?? '')));
          this.assignedMap = new Map((assigned || []).map(a => [String(a.opcionId ?? a.opcion?.id ?? ''), String(a.id)]) as any);
        } catch {}
      }

      if (fails.length) {
        this.notify.warn('Parcial', `${ok} cambios aplicados. ${fails.length} con error.`);
        this.notify.error('Detalle', fails[0]);
      } else {
        this.notify.success('Listo', `${ok} cambios aplicados`);
      }
    } finally {
      this.saving = false;
      this.syncSelectedRows();
    }
  }

  async seedNow() {
    if (!this.orgId) { this.notify.warn('Atención', 'No hay organización activa'); return; }
    try {
      this.saving = true;
      await lastValueFrom(this.opcionesSvc.seedOrgOptions(this.orgId));
      this.notify.success('Catálogo creado', 'Se creó el catálogo de opciones de la organización');
      await this.onUsuarioChange();
    } catch (e: any) {
      const msg = e?.error?.message || e?.message || 'No se pudo sembrar el catálogo de opciones';
      this.notify.error('Error', msg);
    } finally {
      this.saving = false;
    }
  }
}
