import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subscription, combineLatest } from 'rxjs';
import { OrgContextService } from '../../service/org-context.service';
import { OrganizationService } from '../../service/organization.service';
import { LugarEntity, LugarTipo } from '../../models/lugar.models';
import { LugarService } from '../../service/lugar.service';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { LugaresImportDialogComponent } from './lugares-import-dialog.component';

@Component({
  selector: 'app-lugares-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, InputTextModule, FormsModule, DropdownModule, ReactiveFormsModule, ConfirmDialogModule, LugaresImportDialogComponent],
  templateUrl: './lugares-list.component.html',
  styleUrls: ['./lugares-list.component.scss']
})
export class LugaresListComponent implements OnInit, OnDestroy {
  orgId: string | null = null;
  seccionId: string | null = null;
  orgName: string | null = null;
  loading = false;
  saving = false;
  loadingSecciones = false;

  // Secciones disponibles
  secciones: SeccionEntity[] = [];
  seccionOptions: { label: string; value: string }[] = [];

  items: LugarEntity[] = [];
  filtered: LugarEntity[] = [];
  filter = '';

  // Importación desde Excel
  showImportDialog = false;
  importing = false;

  adding = false;
  draft: { nombre: string; tipoLugar: LugarTipo } = { nombre: '', tipoLugar: 'CASA' };
  editingId: string | null = null;
  editDraft: { nombre: string; tipoLugar: LugarTipo } = { nombre: '', tipoLugar: 'CASA' };

  tipos: LugarTipo[] = ['APARTAMENTO', 'CASA', 'ALMACEN', 'AULA', 'BODEGA', 'DEPOSITO', 'LOCAL', 'OFICINA', 'SALON', 'OTRO'];
  tiposOptions = this.tipos.map(t => ({ label: t, value: t }));

  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgCtx: OrgContextService,
    private orgService: OrganizationService,
    private svc: LugarService,
    private seccionesService: SeccionService,
    private confirm: ConfirmationService,
    private messages: MessageService
  ) {}

  ngOnInit(): void {
    this.sub = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([pm, qm]) => {
      const pId = pm.get('id');
      const qId = qm.get('id');
      const stored = localStorage.getItem('currentOrgId');
      const nextOrgId = this.orgCtx.ensureFromQuery(pId || qId || stored);
      const nextSeccionId = qm.get('seccionId');

      // Verificar si cambió orgId
      const orgChanged = nextOrgId && nextOrgId !== this.orgId;

      if (nextOrgId) {
        this.orgId = nextOrgId;
        this.loadOrgName(nextOrgId);

        // Si cambió la organización, cargar las secciones
        if (orgChanged) {
          this.loadSecciones(nextOrgId);
        }
      }

      // Si viene seccionId por query params, usarlo
      if (nextSeccionId && nextSeccionId !== this.seccionId) {
        this.seccionId = nextSeccionId;
        if (this.orgId) {
          this.load();
        }
      }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private loadOrgName(id: string) {
    this.orgName = null;
    this.orgService.get(id).subscribe({ next: (o) => this.orgName = o?.nombre || null, error: () => this.orgName = null });
  }

  private loadSecciones(orgId: string) {
    this.loadingSecciones = true;
    this.seccionesService.list(orgId).subscribe({
      next: (secciones) => {
        this.secciones = secciones || [];
        this.seccionOptions = this.secciones.map(s => ({
          label: s.nombre || 'Sin nombre',
          value: String(s.id)
        }));
        this.loadingSecciones = false;

        // Si solo hay una sección, seleccionarla automáticamente
        if (this.secciones.length === 1 && !this.seccionId) {
          this.seccionId = String(this.secciones[0].id);
          this.load();
        }
      },
      error: (e) => {
        this.toastError('Error al cargar secciones', e?.error?.message || 'No se pudieron obtener las secciones');
        this.secciones = [];
        this.seccionOptions = [];
        this.loadingSecciones = false;
      }
    });
  }

  onSeccionChange() {
    if (this.seccionId && this.orgId) {
      this.load();
    } else {
      this.items = [];
      this.filtered = [];
    }
  }

  load() {
    if (!this.orgId) {
      this.toastWarn('Sin organización', 'Debes seleccionar una organización');
      return;
    }

    if (!this.seccionId) {
      this.toastWarn('Sin sección', 'Debes seleccionar una sección para ver sus lugares');
      this.items = [];
      this.filtered = [];
      return;
    }

    this.loading = true;
    this.svc.listBySeccion(this.orgId, this.seccionId).subscribe({
      next: (data) => {
        this.items = data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: (e) => {
        this.toastError('ERROR', e?.error?.message || 'No se pudieron obtener los lugares');
        this.loading = false;
      }
    });
  }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    this.filtered = !f ? [...this.items] : this.items.filter(i => i.nombre.toLowerCase().includes(f));
  }

  startAdd() { if (this.editingId) return; this.adding = true; this.draft = { nombre: '', tipoLugar: 'CASA' }; }
  cancelAdd() { this.adding = false; this.draft = { nombre: '', tipoLugar: 'CASA' }; }
  saveAdd() {
    if (!this.orgId) {
      this.toastWarn('VALIDACIÓN', 'Selecciona una organización');
      return;
    }

    if (!this.seccionId) {
      this.toastWarn('VALIDACIÓN', 'Debes seleccionar una sección para crear lugares');
      return;
    }

    const nombre = (this.draft.nombre || '').trim();
    if (nombre.length < 3) {
      this.toastWarn('VALIDACIÓN', 'El nombre debe tener al menos 3 caracteres');
      return;
    }

    this.saving = true;
    this.svc.create(this.orgId, { nombre, tipoLugar: this.draft.tipoLugar, seccionId: this.seccionId }).subscribe({
      next: (res) => {
        this.items.push(res.lugar);
        this.applyFilter();
        this.saving = false;
        this.adding = false;
        this.toastSuccess('¡Lugar creado!', res.message || 'El lugar se ha creado exitosamente');
      },
      error: (e) => {
        this.saving = false;
        this.toastError('Error al crear', e?.error?.message || 'No se pudo crear el lugar');
      }
    });
  }

  startEdit(row: LugarEntity) { if (this.adding) return; this.editingId = row.id; this.editDraft = { nombre: row.nombre, tipoLugar: row.tipoLugar }; }
  cancelEdit() { this.editingId = null; this.editDraft = { nombre: '', tipoLugar: 'CASA' }; }
  saveEdit() {
    if (!this.orgId || !this.editingId) return;
    const nombre = (this.editDraft.nombre || '').trim();
    if (nombre.length < 3) { this.toastWarn('VALIDACIÓN', 'NOMBRE MÍN. 3 CARACTERES'); return; }
    this.saving = true;
    this.svc.update(this.orgId, this.editingId, { nombre, tipoLugar: this.editDraft.tipoLugar }).subscribe({
      next: (res) => { const idx = this.items.findIndex(i => i.id === this.editingId); if (idx>=0) this.items[idx] = res.lugar; this.applyFilter(); this.saving = false; this.cancelEdit(); this.toastSuccess('LUGAR ACTUALIZADO', res.message || 'OK'); },
      error: (e) => { this.saving = false; this.toastError('ERROR', e?.error?.message || 'No se pudo actualizar'); }
    });
  }

  remove(row: LugarEntity) {
    if (!this.orgId) return;
    this.confirm.confirm({
      header: 'Confirmación',
      message: `¿Eliminar el lugar "${row.nombre}"?`,
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        try { this.confirm.close(); } catch {}
        this.saving = true;
        this.svc.delete(this.orgId!, row.id).subscribe({
          next: (res) => { this.items = this.items.filter(i => i.id !== row.id); this.applyFilter(); this.saving = false; this.toastSuccess('LUGAR ELIMINADO', res?.message || 'OK'); },
          error: (e) => { this.saving = false; this.toastError('ERROR', e?.error?.message || 'No se pudo eliminar'); }
        });
      },
      reject: () => { try { this.confirm.close(); } catch {} }
    });
  }

  // Importación desde Excel
  openImportDialog() {
    this.showImportDialog = true;
  }

  onImportLugares(lugares: Array<{ nombre: string; tipo: LugarTipo }>) {
    if (!this.orgId || !this.seccionId) {
      this.toastError('Error', 'Falta organización o sección');
      return;
    }

    this.importing = true;
    let imported = 0;
    let errors = 0;
    const total = lugares.length;

    // Importar lugares uno por uno
    const importNext = (index: number) => {
      if (index >= lugares.length) {
        this.importing = false;
        this.showImportDialog = false;

        if (imported > 0) {
          this.toastSuccess(
            '¡Importación completada!',
            `${imported} de ${total} lugares importados exitosamente${errors > 0 ? '. ' + errors + ' errores.' : ''}`
          );
          this.load(); // Recargar la lista
        } else {
          this.toastError('Error', 'No se pudo importar ningún lugar');
        }
        return;
      }

      const lugar = lugares[index];
      this.svc.create(this.orgId!, {
        nombre: lugar.nombre,
        tipoLugar: lugar.tipo,
        seccionId: this.seccionId!
      }).subscribe({
        next: () => {
          imported++;
          importNext(index + 1);
        },
        error: (e) => {
          console.error(`Error al importar ${lugar.nombre}:`, e);
          errors++;
          importNext(index + 1);
        }
      });
    };

    importNext(0);
  }

  // Toast helpers
  private toastSuccess(summary: string, detail?: string) { this.messages.add({ severity: 'success', summary, detail, life: 3000 }); }
  private toastWarn(summary: string, detail?: string) { this.messages.add({ severity: 'warn', summary, detail, life: 3500 }); }
  private toastError(summary: string, detail?: string) { this.messages.add({ severity: 'error', summary, detail, life: 4500 }); }
}
