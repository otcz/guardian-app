import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription, combineLatest } from 'rxjs';
import { RolesService, RoleEntity, UpdateRoleRequest } from '../../service/roles.service';
import { OrgContextService } from '../../service/org-context.service';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService } from '../../service/auth.service';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, InputTextModule, TagModule, FormsModule, TooltipModule, InputSwitchModule, ConfirmDialogModule, CardModule],
  templateUrl: './roles-list.component.html',
  styleUrls: ['./roles-list.component.scss']
})
export class RolesListComponent implements OnInit, OnDestroy {
  orgId: string | null = null;
  loading = false;
  saving = false;
  error: string | null = null;

  items: RoleEntity[] = [];
  filtered: RoleEntity[] = [];
  filter = '';

  adding = false;
  newDraft: RoleEntity = this.blank();
  editingId: string | null = null;
  editDraft: RoleEntity | null = null;
  flashRowId: string | null = null;

  // Nueva propiedad para el flag global
  propagarRolesAHijos: boolean = true;
  togglingPropagar = false;

  private sub?: Subscription;

  private SYSADMIN = 'SYSADMIN';
  private RESERVED_NAMES = ['SYSADMIN'];

  private togglingEstado = new Set<string>();
  private togglingVisible = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: RolesService,
    private orgCtx: OrgContextService,
    private confirm: ConfirmationService,
    private messages: MessageService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.sub = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([pm, qm]) => {
      const pId = pm.get('id');
      const qId = qm.get('id');
      const stored = localStorage.getItem('currentOrgId');
      const next = this.orgCtx.ensureFromQuery(pId || qId || stored);
      if (next && next !== this.orgId) {
        this.orgId = next;
        this.load();
      }
    });
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private blank(): RoleEntity { return { id: '', nombre: '', descripcion: '', estado: 'ACTIVO', activo: true, visibleParaHijos: false } as RoleEntity; }

  load() {
    if (!this.orgId) return;
    this.loading = true;
    this.error = null;
    this.svc.getOrgPropagarRolesAHijos(this.orgId).subscribe(flag => {
      this.propagarRolesAHijos = flag;
      this.svc.list(this.orgId!).subscribe({
        next: (data) => {
          this.items = (data || [])
            // ocultar SYSADMIN en la tabla
            .filter(r => (r.nombre || '').toUpperCase() !== this.SYSADMIN)
            .map(r => ({
              ...r,
              propio: r.orgId === this.orgId,
              heredado: r.orgId !== this.orgId
            }));
          this.applyFilter();
          this.loading = false;
        },
        error: (e) => { this.error = e?.error?.message || 'Error al cargar roles'; this.loading = false; }
      });
    });
  }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    if (!f) { this.filtered = [...this.items]; return; }
    this.filtered = this.items.filter(s => (s.nombre || '').toLowerCase().includes(f) || (s.descripcion || '').toLowerCase().includes(f));
  }

  // Add
  startAdd() { if (this.editingId) return; this.adding = true; this.newDraft = this.blank(); }
  cancelAdd() { this.adding = false; this.newDraft = this.blank(); }
  saveAdd() {
    if (!this.orgId) return;
    const err = this.validate(this.newDraft);
    if (err) { this.toastWarn(err); return; }
    const nombreUp = (this.newDraft.nombre || '').trim().toUpperCase();
    if (this.RESERVED_NAMES.includes(nombreUp)) {
      this.toastWarn('No está permitido crear un rol reservado (por ejemplo SYSADMIN).');
      return;
    }
    const body = {
      nombre: (this.newDraft.nombre || '').trim(),
      descripcion: (this.newDraft.descripcion || '').trim() || null,
      // visibleParaHijos se envía a través del endpoint específico cuando se cambie desde el switch
    };
    this.saving = true;
    this.svc.create(this.orgId, body).subscribe({
      next: (res) => {
        const created = { ...res.role, propio: true, heredado: false } as RoleEntity;
        this.items.push(created);
        this.applyFilter();
        this.saving = false; this.adding = false; this.newDraft = this.blank(); this.flash(created.id);
        this.toastSuccess(res.message || 'Rol creado');
      },
      error: (e) => {
        this.saving = false;
        const msg = e?.error?.message || e?.message || 'No se pudo crear el rol';
        this.toastError(msg);
      }
    });
  }

  // Edit
  startEdit(row: RoleEntity) {
    if (this.adding) return;
    const nameUp = (row.nombre || '').toUpperCase();
    if (nameUp === this.SYSADMIN) {
      this.toastWarn('No está permitido editar el rol SYSADMIN.');
      return;
    }
    this.editingId = row.id;
    this.editDraft = { ...row };
  }
  cancelEdit() { this.editingId = null; this.editDraft = null; }
  saveEdit() {
    if (!this.orgId || !this.editDraft || !this.editingId) return;
    const err = this.validate(this.editDraft);
    if (err) { this.toastWarn(err); return; }
    const nombreUp = (this.editDraft.nombre || '').trim().toUpperCase();
    if (this.RESERVED_NAMES.includes(nombreUp)) {
      this.toastWarn('No está permitido renombrar un rol a SYSADMIN u otro nombre reservado.');
      return;
    }
    const body: UpdateRoleRequest = {
      nombre: (this.editDraft.nombre || '').trim(),
      descripcion: (this.editDraft.descripcion || '').trim() || null
    };
    const optimistic: Partial<RoleEntity> = { nombre: body.nombre!, descripcion: (body.descripcion ?? undefined) as any };
    this.saving = true;
    this.svc.update(this.orgId, this.editingId, body).subscribe({
      next: (res) => {
        const idx = this.items.findIndex(i => i.id === this.editingId);
        if (idx >= 0) this.items[idx] = { ...this.items[idx], ...optimistic, ...res.role } as RoleEntity;
        this.applyFilter(); const flashId = this.editingId; this.cancelEdit(); this.saving = false; if (flashId) this.flash(flashId);
        this.toastSuccess(res.message || 'Rol actualizado');
      },
      error: (e) => {
        this.saving = false;
        const status = e?.status;
        const msg = e?.error?.message || e?.message || (status === 400 ? 'No se pudo actualizar el rol (reglas de roles).' : 'No se pudo actualizar el rol');
        this.toastError(msg);
      }
    });
  }

  // Delete
  remove(row: RoleEntity) {
    if (!this.orgId || !row.id) return;
    const nameUp = (row.nombre || '').toUpperCase();
    if (nameUp === this.SYSADMIN) {
      this.toastWarn('No está permitido eliminar el rol SYSADMIN.');
      return;
    }
    this.confirm.confirm({
      header: 'Confirmación',
      message: `¿Eliminar permanentemente el rol "${row.nombre}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        // Cerrar el diálogo inmediatamente para evitar que quede abierto
        try { this.confirm.close(); } catch {}
        this.saving = true;
        this.svc.delete(this.orgId!, row.id).subscribe({
          next: (res) => {
            this.items = this.items.filter(i => i.id !== row.id);
            this.applyFilter(); this.saving = false;
            this.toastSuccess(res?.message || '');
          },
          error: (e) => { this.saving = false; this.toastError(e?.error?.message || e?.message || ''); }
        });
      },
      reject: () => {
        // Asegurar cierre también en cancelación
        try { this.confirm.close(); } catch {}
      }
    });
  }

  // Helpers de permisos
  get isSysadmin(): boolean { return this.auth.hasRole('SYSADMIN'); }
  canToggle(row: RoleEntity): boolean {
    const nameUp = (row.nombre || '').toUpperCase();
    if (nameUp === this.SYSADMIN) return false; // nunca permitir cambiar SYSADMIN
    if (!this.isSysadmin && (nameUp === 'ORGADMIN')) return false;
    return true;
  }

  // Toggle con confirmación al desactivar y reglas especiales
  onToggleEstado(row: RoleEntity, checked: boolean) {
    if (!this.orgId) return;
    if (!this.canToggle(row)) {
      this.toastWarn('No autorizado para cambiar este rol.');
      return;
    }
    const currentActive = row.activo != null ? !!row.activo : ['ACTIVO'].includes((row.estado || '').toUpperCase());
    const desiredActive = !!checked;
    if (currentActive === desiredActive) return; // sin cambio
    if (currentActive && !desiredActive) {
      this.confirm.confirm({
        header: 'Confirmación',
        message: 'Al restringir este rol en esta organización:\n\n• Dejará de estar disponible para nuevas asignaciones en este ámbito.\n• Se eliminarán las asignaciones existentes (usuarios y secciones de esta organización).\n\n¿Deseas continuar?',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, restringir',
        rejectLabel: 'Cancelar',
        accept: () => {
          this.executeStateChange(row, desiredActive);
        }
      });
      return;
    }
    this.executeStateChange(row, desiredActive);
  }

  private executeStateChange(row: RoleEntity, active: boolean) {
    if (this.togglingEstado.has(row.id)) return;
    this.togglingEstado.add(row.id);
    const targetEstado = active ? 'ACTIVO' : 'INACTIVO';
    // No actualizar visualmente de forma optimista; esperar confirmación del backend
    this.svc.changeState(this.orgId!, row.id, targetEstado as any).subscribe({
      next: (res) => {
        const msg = res.message || (active ? 'Rol activado' : 'Rol desactivado');
        this.toastSuccess(msg);
        // Refrescar rol completo desde backend para asegurar flags actuales
        this.svc.get(this.orgId!, row.id).subscribe({
          next: (fresh) => {
            const idx = this.items.findIndex(i => i.id === row.id);
            if (idx >= 0) {
              const merged = { ...this.items[idx], ...fresh } as RoleEntity;
              this.items[idx] = { ...merged, propio: merged.orgId === this.orgId, heredado: merged.orgId !== this.orgId };
              this.applyFilter();
            }
            this.togglingEstado.delete(row.id);
          },
          error: () => { this.togglingEstado.delete(row.id); }
        });
      },
      error: (e) => {
        const st = e?.status;
        const backendMsg = e?.error?.message || e?.message;
        if (st === 400 || st === 403) this.toastWarn(backendMsg || 'No tienes permiso para cambiar este rol.');
        else if (st === 404) this.toastError('Rol no encontrado');
        else this.toastError(backendMsg || 'No se pudo cambiar el estado del rol');
        this.togglingEstado.delete(row.id);
      }
    });
  }

  // Toggle visibilidad para hijos con confirmación y permisos
  canToggleVisible(row: RoleEntity): boolean {
    // Siempre habilitado (el backend valida permisos)
    return true;
  }

  onToggleVisibleParaHijos(row: RoleEntity, checked: boolean) {
    // Sin restricción por rol propio/heredado
    if (!this.orgId) return;
    const prev = !!row.visibleParaHijos;
    const next = !!checked;
    if (prev === next) return;
    if (this.togglingVisible.has(row.id)) return;
    if (prev && !next) {
      this.confirm.confirm({
        header: 'Confirmación',
        message: `Quitar visibilidad para hijos del rol "${row.nombre}" hará que no pueda asignarse en nuevas entidades hijas derivadas. Si existen asignaciones en subentidades, serán removidas según las reglas del backend. ¿Deseas continuar?`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí',
        rejectLabel: 'No',
        accept: () => this.executeVisibleChange(row, next)
      });
      return;
    }
    this.executeVisibleChange(row, next);
  }

  private executeVisibleChange(row: RoleEntity, value: boolean) {
    this.togglingVisible.add(row.id);
    // No actualizar visualmente de forma optimista; esperar confirmación del backend
    this.svc.setVisibleForChildren(this.orgId!, row.id, value).subscribe({
      next: (res) => {
        const msg = res.message || (value ? 'Visibilidad para hijos activada' : 'Visibilidad para hijos desactivada');
        const idx = this.items.findIndex(i => i.id === row.id);
        if (idx >= 0 && res.role) {
          const merged = { ...this.items[idx], ...res.role } as RoleEntity;
          this.items[idx] = { ...merged, propio: merged.orgId === this.orgId, heredado: merged.orgId !== this.orgId };
          this.applyFilter();
        }
        this.toastSuccess(msg);
        this.togglingVisible.delete(row.id);
      },
      error: (e) => {
        const st = e?.status;
        const backendMsg = e?.error?.message || e?.message;
        if (st === 400 || st === 403) this.toastWarn(backendMsg || 'No tienes permiso para cambiar la visibilidad de este rol.');
        else if (st === 404) this.toastError('Rol no encontrado');
        else this.toastError(backendMsg || 'No se pudo cambiar la visibilidad del rol');
        this.togglingVisible.delete(row.id);
      }
    });
  }

  // Toggle global propagación
  onTogglePropagarRolesAHijos(checked: boolean) {
    if (!this.orgId) return;
    if (!this.isSysadmin && !this.auth.hasRole('ORGADMIN')) { this.toastWarn('No autorizado'); return; }
    const prev = this.propagarRolesAHijos;
    // No mutar el valor hasta confirmación
    this.togglingPropagar = true;
    this.svc.setOrgPropagarRolesAHijos(this.orgId, checked).subscribe({
      next: (res) => {
        this.propagarRolesAHijos = res.value;
        this.togglingPropagar = false;
        this.toastSuccess(res.message || (checked ? 'Propagación activada' : 'Propagación desactivada'));
      },
      error: (e) => {
        // Mantener el valor previo
        this.propagarRolesAHijos = prev;
        this.togglingPropagar = false;
        const st = e?.status;
        if (st === 403) this.toastWarn('PROHIBIDO'); else this.toastError(e?.error?.message || 'Error al cambiar propagación');
      }
    });
  }

  // Utils
  validate(model: RoleEntity): string | null {
    if (!model.nombre || model.nombre.trim().length < 3) return 'El nombre es requerido (mín. 3 caracteres).';
    if (model.descripcion && model.descripcion.length > 160) return 'La descripción excede 160 caracteres.';
    return null;
  }
  // Método requerido por la plantilla para indicar si un toggle está en proceso (estado o visible)
  isToggling(row: RoleEntity, kind: 'estado' | 'visible'): boolean {
    if (kind === 'estado') return this.togglingEstado.has(row.id);
    if (kind === 'visible') return this.togglingVisible.has(row.id);
    return false;
  }
  flash(id: string) { this.flashRowId = id; setTimeout(() => this.flashRowId = null, 1200); }
  toastSuccess(summary: string) { if (summary) this.messages.add({ severity: 'success', summary, life: 3500 }); }
  toastWarn(summary: string) { if (summary) this.messages.add({ severity: 'warn', summary, life: 3500 }); }
  toastError(summary: string) { if (summary) this.messages.add({ severity: 'error', summary, life: 4500 }); }

  get rows(): RoleEntity[] { return this.adding ? [this.newDraft, ...this.filtered] : this.filtered; }
  onEditChange<K extends keyof RoleEntity>(key: K, value: RoleEntity[K]) { if (this.editDraft) (this.editDraft as any)[key] = value as any; }

  /** Separa display en [rol, org] para estilizar la parte de la organización. */
  displayParts(r: RoleEntity | null | undefined): { pre: string; post: string | null } {
    const raw = String(r?.display || r?.nombre || '').trim();
    const idx = raw.indexOf('-');
    if (idx < 0) return { pre: raw, post: null };
    const pre = raw.slice(0, idx);
    const post = raw.slice(idx + 1);
    return { pre: pre.trim(), post: post.trim() || null };
  }
}
