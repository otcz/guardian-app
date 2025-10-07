// filepath: c:\Users\oscar.carrillo\WebstormProjects\guardian-app\src\app\admin\organization-list.component.ts
import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterModule, ActivatedRoute} from '@angular/router';
import {Organization, OrganizationService} from '../../service/organization.service';
import {TableModule} from 'primeng/table';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TagModule} from 'primeng/tag';
import {FormsModule} from '@angular/forms';
import {TooltipModule} from 'primeng/tooltip';
import { OrgContextService } from '../../service/org-context.service';
import { MessageService } from 'primeng/api';
import { InputSwitchModule } from 'primeng/inputswitch';

@Component({
  selector: 'app-organization-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, InputTextModule, TagModule, FormsModule, TooltipModule, InputSwitchModule],
  templateUrl: './organization-list.component.html',
  styleUrls: ['./organization-list.component.scss']
})
export class OrganizationListComponent implements OnInit {
  loading = false;
  orgs: Organization[] = [];
  filtered: Organization[] = [];
  filter = '';
  error: string | null = null;
  private returnUrl: string | null = null;

  // Edición / creación en línea
  adding = false;
  saving = false;
  newDraft: Organization = this.blank();
  editingId: string | null = null;
  editDraft: Organization | null = null;
  flashRowId: string | null = null;

  constructor(private orgService: OrganizationService, private router: Router, private orgCtx: OrgContextService, private route: ActivatedRoute, private messages: MessageService) {
  }

  ngOnInit() {
    // Preferir navigation state, con fallback a query param (legacy)
    const stateReturn: string | null = (this.router.getCurrentNavigation()?.extras?.state as any)?.returnUrl ?? (history && (history.state as any)?.returnUrl) ?? null;
    const qpReturn = this.route.snapshot.queryParamMap.get('returnUrl');
    this.returnUrl = stateReturn || qpReturn || null;
    // Limpiar la URL si venía por query param legacy
    if (qpReturn) {
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
    this.load(true);
  }

  load(silent: boolean = false) {
    this.loading = true;
    this.error = null;
    this.orgService.list().subscribe({
      next: (data) => {
        this.orgs = data || [];
        this.applyFilter();
        this.loading = false;
        if (!silent) {
          const count = this.orgs.length;
          this.messages.add({ severity: 'success', summary: 'Actualizado', detail: `Datos actualizados (${count})`, life: 2500 });
        }
      },
      error: (e) => {
        this.error = e?.error?.message || 'Error al cargar organizaciones';
        this.loading = false;
        const msg = this.error || 'Error al cargar organizaciones';
        this.messages.add({ severity: 'error', summary: 'Error', detail: msg, life: 4500 });
      }
    });
  }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    if (!f) {
      this.filtered = [...this.orgs];
      return;
    }
    this.filtered = this.orgs.filter(o => (o.nombre || '').toLowerCase().includes(f));
  }

  // ====== Inline Add / Edit ======
  private blank(): Organization { return { id: '', nombre: '', activa: true }; }

  get rows(): Organization[] { return this.adding ? [this.newDraft, ...this.filtered] : this.filtered; }

  startAdd() { if (this.editingId) return; this.adding = true; this.newDraft = this.blank(); }
  cancelAdd() { this.adding = false; this.newDraft = this.blank(); }
  saveAdd() {
    const err = this.validate(this.newDraft);
    if (err) { this.messages.add({ severity: 'warn', summary: 'Validación', detail: err, life: 3500 }); return; }
    this.saving = true;
    const body = { nombre: (this.newDraft.nombre || '').trim(), activa: !!this.newDraft.activa };
    this.orgService.create(body).subscribe({
      next: (res) => {
        const created = res.org; this.orgs.push(created); this.applyFilter();
        this.saving = false; this.adding = false; this.newDraft = this.blank();
        this.flash(created.id);
        const msg = res?.message || 'Organización creada';
        this.messages.add({ severity: 'success', summary: 'Creado', detail: msg, life: 3500 });
      },
      error: (e) => {
        const msg = e?.error?.message || 'Error al crear organización';
        this.saving = false;
        this.messages.add({ severity: 'error', summary: 'Error', detail: msg, life: 4500 });
      }
    });
  }

  startEdit(row: Organization) { if (this.adding) return; this.editingId = row.id || null; this.editDraft = { ...row }; }
  cancelEdit() { this.editingId = null; this.editDraft = null; }
  saveEdit() {
    if (!this.editDraft || !this.editingId) return;
    const err = this.validate(this.editDraft);
    if (err) { this.messages.add({ severity: 'warn', summary: 'Validación', detail: err, life: 3500 }); return; }
    this.saving = true;
    const body = { nombre: (this.editDraft.nombre || '').trim(), activa: !!this.editDraft.activa };
    this.orgService.update(this.editingId, body).subscribe({
      next: (res) => {
        const idx = this.orgs.findIndex(o => o.id === this.editingId);
        if (idx >= 0) this.orgs[idx] = { ...this.orgs[idx], ...res.org } as Organization;
        this.applyFilter();
        const flashId = this.editingId;
        this.cancelEdit();
        this.saving = false;
        if (flashId) this.flash(flashId);
        const msg = res?.message || 'Organización actualizada';
        this.messages.add({ severity: 'success', summary: 'Actualizado', detail: msg, life: 3500 });
      },
      error: (e) => {
        const msg = e?.error?.message || 'Error al actualizar organización';
        this.saving = false;
        this.messages.add({ severity: 'error', summary: 'Error', detail: msg, life: 4500 });
      }
    });
  }

  validate(model: Organization): string | null {
    const name = (model?.nombre || '').trim();
    if (!name || name.length < 3) return 'EL NOMBRE ES REQUERIDO (MÍN. 3 CARACTERES)';
    return null;
  }

  onEditChange<K extends keyof Organization>(key: K, value: Organization[K]) { if (this.editDraft) (this.editDraft as any)[key] = value as any; }
  onKeyAdd(ev: KeyboardEvent) { if (ev.key === 'Enter') this.saveAdd(); if (ev.key === 'Escape') this.cancelAdd(); }
  onKeyEdit(ev: KeyboardEvent) { if (ev.key === 'Enter') this.saveEdit(); if (ev.key === 'Escape') this.cancelEdit(); }

  private flash(id: string | undefined | null) { if (!id) return; this.flashRowId = id; setTimeout(() => this.flashRowId = null, 1200); }

  goCreate() {
    this.router.navigate(['/crear-organizacion']);
  }

  manage(org: Organization) {
    if (org.id) {
      localStorage.setItem('currentOrgId', org.id);
      this.orgCtx.set(org.id);
    }
    this.messages.add({ severity: 'success', summary: 'Organización seleccionada', detail: org.nombre, life: 2200 });
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }
    this.router.navigate(['/gestionar-organizacion'], {queryParams: {id: org.id}});
  }

  strategy(org: Organization) {
    if (org.id) {
      localStorage.setItem('currentOrgId', org.id);
      this.orgCtx.set(org.id);
    }
    this.messages.add({ severity: 'success', summary: 'Organización seleccionada', detail: org.nombre, life: 2200 });
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }
    this.router.navigate(['/cambiar-estrategia-de-gobernanza'], { queryParams: { id: org.id } });
  }
}
