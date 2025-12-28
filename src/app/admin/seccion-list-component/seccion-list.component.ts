import {Component, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {TableModule} from 'primeng/table';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TagModule} from 'primeng/tag';
import {TooltipModule} from 'primeng/tooltip';
import {Subscription, combineLatest} from 'rxjs';
import {SeccionEntity, SeccionService, UpdateSeccionRequest} from '../../service/seccion.service';
import {OrgContextService} from '../../service/org-context.service';
import {OrganizationService, AdminInfo} from '../../service/organization.service';
import {InputSwitchModule} from 'primeng/inputswitch';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {ConfirmationService, MessageService} from 'primeng/api';
import { SeccionUsuariosComponent } from '../seccion-usuarios-component/seccion-usuarios.component';
import { MenuService } from '../../service/menu.service';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-seccion-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, InputTextModule, TagModule, FormsModule, TooltipModule, InputSwitchModule, ConfirmDialogModule, SeccionUsuariosComponent, CardModule],
  templateUrl: './seccion-list.component.html',
  styleUrls: ['./seccion-list.component.scss']
})
export class SeccionListComponent implements OnInit, OnDestroy {
  orgId: string | null = null;
  orgName: string | null = null;
  loading = false;
  saving = false;
  error: string | null = null;

  items: SeccionEntity[] = [];
  filtered: SeccionEntity[] = [];
  filter = '';

  // Inline add/edit state
  adding = false;
  newDraft: SeccionEntity = this.blank();
  editingId: string | null = null;
  editDraft: SeccionEntity | null = null;
  flashRowId: string | null = null;

  // Nueva: selección para panel de usuarios
  selectedSeccionId: string | null = null;

  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: SeccionService,
    private orgCtx: OrgContextService,
    private orgService: OrganizationService,
    private confirm: ConfirmationService,
    private messages: MessageService,
    private menu: MenuService
  ) {
  }

  ngOnInit(): void {
    // Resolver id desde params o query y escuchar cambios
    this.sub = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([pm, qm]) => {
      const pId = pm.get('id');
      const qId = qm.get('id');
      const stored = localStorage.getItem('currentOrgId');
      const next = this.orgCtx.ensureFromQuery(pId || qId || stored);
      if (next && next !== this.orgId) {
        this.orgId = next;
        this.loadOrgName(this.orgId);
        this.load();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private loadOrgName(id: string) {
    this.orgName = null;
    this.orgService.get(id).subscribe({
      next: (org) => this.orgName = org?.nombre || null,
      error: () => this.orgName = null
    });
  }

  load() {
    if (!this.orgId) return;
    this.loading = true;
    this.error = null;
    console.log('🔍 [SeccionList] Cargando secciones para orgId:', this.orgId);
    this.svc.list(this.orgId).subscribe({
      next: (data) => {
        console.log('✅ [SeccionList] Respuesta del backend - Total secciones:', data?.length || 0);
        console.log('📦 [SeccionList] Datos completos recibidos:', JSON.stringify(data, null, 2));

        // Analizar cada sección
        if (data && data.length > 0) {
          data.forEach((seccion, index) => {
            console.log(`\n📋 [SeccionList] Sección ${index + 1}:`, {
              id: seccion.id,
              nombre: seccion.nombre,
              descripcion: seccion.descripcion,
              estado: seccion.estado,
              autonomiaConfigurada: seccion.autonomiaConfigurada,
              seccionPadreId: seccion.seccionPadreId,
              // Campos de administrador
              adminId: seccion.adminId,
              adminNombre: seccion.adminNombre,
              adminInfo: seccion.adminInfo,
              // Mostrar estructura completa si existe
              adminInfoCompleto: seccion.adminInfo ? JSON.stringify(seccion.adminInfo, null, 2) : 'NO EXISTE'
            });
          });
        }

        this.items = data || [];
        this.applyFilter();
        this.loading = false;
        // Cargar información completa de administradores
        this.loadAdminDetails();
      },
      error: (e) => {
        console.error('❌ [SeccionList] Error al cargar secciones:', e);
        this.error = e?.error?.message || 'Error al cargar secciones';
        this.loading = false;
      }
    });
  }

  /**
   * Carga la información completa de los administradores para todas las secciones.
   *
   * ⚠️ IMPORTANTE: El backend NO envía información del administrador en el endpoint
   * GET /orgs/{orgId}/secciones, por lo que debemos hacer una llamada adicional
   * para CADA sección para obtener esta información.
   */
  loadAdminDetails() {
    if (!this.orgId) return;

    // ⚠️ CAMBIO: Cargar para TODAS las secciones, no solo las que tienen adminId
    // porque el backend no envía adminId en el listado inicial
    const seccionesParaCargar = this.items.filter(s => !s.adminInfo);

    console.log(`\n🔄 [SeccionList] Cargando información completa de administradores...`);
    console.log(`📊 [SeccionList] Total secciones: ${this.items.length}`);
    console.log(`📊 [SeccionList] Secciones sin adminInfo: ${seccionesParaCargar.length}`);
    console.log(`⚠️ [SeccionList] NOTA: Backend NO envía adminId en listado, cargando para todas las secciones...`);

    if (seccionesParaCargar.length === 0) {
      console.log('✅ [SeccionList] Todas las secciones ya tienen adminInfo cargado');
      return;
    }

    console.log(`🚀 [SeccionList] Cargando info de administrador para ${seccionesParaCargar.length} sección(es)...`);

    // Cargar información de cada administrador
    seccionesParaCargar.forEach((seccion, index) => {
      console.log(`\n📡 [SeccionList] [${index + 1}/${seccionesParaCargar.length}] Cargando admin de "${seccion.nombre}"...`);
      console.log(`   URL: GET /orgs/${this.orgId}/secciones/${seccion.id}/administrador`);

      this.svc.getSectionAdmin(this.orgId!, seccion.id).subscribe({
        next: (response) => {
          console.log(`✅ [SeccionList] Admin cargado para "${seccion.nombre}":`, response.data);

          if (response.data) {
            // Actualizar la sección con la información completa
            const idx = this.items.findIndex(s => s.id === seccion.id);
            if (idx >= 0) {
              this.items[idx] = {
                ...this.items[idx],
                adminInfo: {
                  id: response.data.id,
                  username: response.data.username,
                  nombreCompleto: response.data.nombreCompleto,
                  email: response.data.email,
                  telefono: response.data.telefono,
                  activo: response.data.activo,
                  scopeNivel: response.data.scopeNivel,
                  tipoIdentificacion: response.data.tipoIdentificacion,
                  identificacion: response.data.identificacion,
                  seccionId: response.data.seccionId,
                  seccionNombre: response.data.seccionNombre,
                  roles: response.data.roles
                }
              };

              console.log(`💾 [SeccionList] Sección actualizada con adminInfo:`, {
                seccionNombre: this.items[idx].nombre,
                adminUsername: this.items[idx].adminInfo?.username,
                adminEmail: this.items[idx].adminInfo?.email
              });

              this.applyFilter();
            }
          }
        },
        error: (e) => {
          console.warn(`⚠️ [SeccionList] No se pudo cargar info del admin de sección "${seccion.nombre}":`, {
            status: e?.status,
            message: e?.error?.message || e?.message,
            error: e
          });
        }
      });
    });
  }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    if (!f) {
      this.filtered = [...this.items];
      return;
    }
    this.filtered = this.items.filter(s => (s.nombre || '').toLowerCase().includes(f) || (s.descripcion || '').toLowerCase().includes(f));
  }

  // Draft helpers
  private blank(): SeccionEntity {
    return {id: '', nombre: '', descripcion: '', estado: 'ACTIVA', autonomiaConfigurada: false, seccionPadreId: null};
  }

  // Add flow
  startAdd() {
    if (this.editingId) return;
    this.adding = true;
    this.newDraft = this.blank();
  }

  cancelAdd() {
    this.adding = false;
    this.newDraft = this.blank();
  }

  saveAdd() {
    if (!this.orgId) return;
    const err = this.validate(this.newDraft);
    if (err) {
      this.toastWarn('Validación', err);
      return;
    }
    const body = {
      nombre: (this.newDraft.nombre || '').trim(),
      descripcion: (this.newDraft.descripcion || '').trim() || undefined,
      seccionPadreId: this.newDraft.seccionPadreId ?? null,
      autonomiaConfigurada: !!this.newDraft.autonomiaConfigurada
    };
    this.saving = true;
    this.svc.create(this.orgId, body).subscribe({
      next: (res) => {
        const created = res.seccion;
        this.items.push(created);
        this.applyFilter();
        this.saving = false;
        this.adding = false;
        this.newDraft = this.blank();
        this.flash(created.id);
        this.toastSuccess('Sección creada', res.message || 'Creada correctamente');
      },
      error: (e) => {
        this.saving = false;
        this.toastError('Error', e?.error?.message || 'No se pudo crear la sección');
      }
    });
  }

  // Edit flow
  startEdit(row: SeccionEntity) {
    if (this.adding) return;
    this.editingId = row.id;
    this.editDraft = {...row};
  }

  cancelEdit() {
    this.editingId = null;
    this.editDraft = null;
  }

  saveEdit() {
    if (!this.orgId || !this.editDraft || !this.editingId) return;
    const err = this.validate(this.editDraft);
    if (err) {
      this.toastWarn('Validación', err);
      return;
    }
    const body: UpdateSeccionRequest = {
      nombre: (this.editDraft.nombre || '').trim(),
      descripcion: (this.editDraft.descripcion || '').trim() || null,
      idSeccionPadre: this.editDraft.seccionPadreId ?? null,
      autonomiaConfigurada: !!this.editDraft.autonomiaConfigurada
    };
    const optimistic: Partial<SeccionEntity> = {
      nombre: body.nombre!,
      descripcion: (body.descripcion ?? undefined) as any,
      seccionPadreId: body.idSeccionPadre ?? null,
      autonomiaConfigurada: body.autonomiaConfigurada
    };
    this.saving = true;
    this.svc.update(this.orgId, this.editingId, body).subscribe({
      next: (res) => {
        const idx = this.items.findIndex(i => i.id === this.editingId);
        if (idx >= 0) {
          // Primero aplicar lo editado (optimista) y luego datos del backend
          this.items[idx] = {...this.items[idx], ...optimistic, ...res.seccion} as SeccionEntity;
        }
        this.applyFilter();
        const flashId = this.editingId;
        this.cancelEdit();
        this.saving = false;
        if (flashId) this.flash(flashId);
        this.toastSuccess('Sección actualizada', res.message || 'Actualizada correctamente');
      },
      error: (e) => {
        this.saving = false;
        this.toastError('Error', e?.error?.message || 'No se pudo actualizar la sección');
      }
    });
  }

  // Remove (logical: set estado INACTIVA)
  remove(row: SeccionEntity) {
    if (!this.orgId || !row.id) return;
    this.confirm.confirm({
      header: 'Confirmación',
      message: `¿Eliminar permanentemente la sección "${row.nombre}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        // Cerrar el diálogo inmediatamente para evitar que quede abierto
        try { this.confirm.close(); } catch {}
        this.saving = true;
        this.svc.delete(this.orgId!, row.id).subscribe({
          next: (res) => {
            if (res?.soft) {
              const idx = this.items.findIndex(i => i.id === row.id);
              if (idx >= 0) this.items[idx] = {...this.items[idx], ...(res.seccion || {} as any)};
              this.applyFilter();
              this.saving = false;
              this.toastSuccess('Sección inactivada', res?.message || 'Se marcó como INACTIVA');
            } else {
              this.items = this.items.filter(i => i.id !== row.id);
              this.applyFilter();
              this.saving = false;
              this.toastSuccess('Sección eliminada', res?.message || 'Eliminada correctamente');
            }
          },
          error: (e) => {
            this.saving = false;
            this.toastError('Error', e?.error?.message || 'No se pudo eliminar la sección');
          }
        });
      },
      reject: () => {
        // Asegurar cierre también en cancelación
        try { this.confirm.close(); } catch {}
      }
    });
  }

  onToggleEstado(row: SeccionEntity, checked: boolean) {
    if (!this.orgId) return;
    const estadoTarget = checked ? 'ACTIVA' : 'INACTIVA';
    const prev = row.estado;
    // Optimista
    row.estado = estadoTarget;
    this.svc.changeState(this.orgId, row.id, estadoTarget).subscribe({
      next: (res) => {
        const idx = this.items.findIndex(i => i.id === row.id);
        if (idx >= 0) this.items[idx] = {...this.items[idx], ...res.seccion};
        this.applyFilter();
        this.toastSuccess('ESTADO ACTUALIZADO', res.message || `SE MARCÓ COMO ${estadoTarget}`);
      },
      error: (e) => {
        // Revertir optimismo
        row.estado = prev;
        this.toastError('Error', e?.error?.message || 'NO SE PUDO CAMBIAR EL ESTADO');
      }
    });
  }

  onToggleAutonomia(row: SeccionEntity, checked: boolean) {
    if (!this.orgId) return;
    const prev = !!row.autonomiaConfigurada;
    // Optimista
    row.autonomiaConfigurada = checked;
    this.svc.setAutonomia(this.orgId, row.id, checked).subscribe({
      next: (res) => {
        const idx = this.items.findIndex(i => i.id === row.id);
        if (idx >= 0) this.items[idx] = {...this.items[idx], ...res.seccion};
        this.applyFilter();
        this.toastSuccess('AUTONOMÍA ACTUALIZADA', checked ? 'CONFIGURADA' : 'NO CONFIGURADA');
      },
      error: (e) => {
        row.autonomiaConfigurada = prev;
        this.toastError('ERROR', e?.error?.message || 'NO SE PUDO ACTUALIZAR LA AUTONOMÍA');
      }
    });
  }

  // Acción: ver usuarios de la sección
  viewUsuarios(row: SeccionEntity) {
    if (!row?.id) return;
    this.selectedSeccionId = row.id;
  }

  // Permiso para mostrar acción de asignar admin
  get canAssignAdmin(): boolean { return this.menu?.canAccessCode('SECTION_ASSIGN_ADMIN'); }

  // Navegar a pantalla de asignación de admin para la sección
  gotoAssignAdmin(row: SeccionEntity) {
    if (!row?.id) return;
    this.router.navigate(['/asignar-administrador-de-seccion'], { queryParams: { seccionId: row.id } });
  }

  /**
   * Generar tooltip HTML con información completa del administrador de sección
   * @param row - Entidad de sección que contiene adminInfo
   * @returns String HTML con formato para tooltip
   */
  getAdminTooltip(row: SeccionEntity): string {
    if (!row.adminInfo) return 'Sin información adicional';

    const lines: string[] = [];
    lines.push(`<strong>${row.adminInfo.nombreCompleto}</strong>`);
    lines.push(`<strong>Usuario:</strong> ${row.adminInfo.username}`);

    if (row.adminInfo.email) {
      lines.push(`<strong>Email:</strong> ${row.adminInfo.email}`);
    }

    if (row.adminInfo.telefono) {
      lines.push(`<strong>Teléfono:</strong> ${row.adminInfo.telefono}`);
    }

    if (row.adminInfo.tipoIdentificacion && row.adminInfo.identificacion) {
      lines.push(`<strong>Identificación:</strong> ${row.adminInfo.tipoIdentificacion} ${row.adminInfo.identificacion}`);
    }

    if (row.adminInfo.scopeNivel) {
      lines.push(`<strong>Alcance:</strong> ${row.adminInfo.scopeNivel}`);
    }

    if (row.adminInfo.roles && row.adminInfo.roles.length > 0) {
      lines.push(`<strong>Roles:</strong> ${row.adminInfo.roles.join(', ')}`);
    }

    if (row.adminInfo.activo !== undefined) {
      lines.push(`<strong>Estado:</strong> ${row.adminInfo.activo ? 'ACTIVO' : 'INACTIVO'}`);
    }

    return lines.join('<br/>');
  }

  // Utils
  validate(model: SeccionEntity): string | null {
    if (!model.nombre || model.nombre.trim().length < 3) return 'EL NOMBRE ES REQUERIDO (MÍN. 3 CARACTERES)';
    if (model.descripcion && model.descripcion.length > 160) return 'LA DESCRIPCIÓN EXCEDE 160 CARACTERES';
    return null;
  }

  flash(id: string) {
    this.flashRowId = id;
    setTimeout(() => this.flashRowId = null, 1200);
  }

  toastSuccess(summary: string, detail?: string) {
    const s = (summary || '').toString().toUpperCase();
    const d = (detail || '').toString().toUpperCase();
    this.messages.add({severity: 'success', summary: s, detail: d, life: 3500});
  }

  toastWarn(summary: string, detail?: string) {
    const s = (summary || '').toString().toUpperCase();
    const d = (detail || '').toString().toUpperCase();
    this.messages.add({severity: 'warning', summary: s, detail: d, life: 3500});
  }

  toastError(summary: string, detail?: string) {
    const s = (summary || '').toString().toUpperCase();
    const d = (detail || '').toString().toUpperCase();
    this.messages.add({severity: 'error', summary: s, detail: d, life: 4500});
  }

  get rows(): SeccionEntity[] {
    return this.adding ? [this.newDraft, ...this.filtered] : this.filtered;
  }

  onEditChange<K extends keyof SeccionEntity>(key: K, value: SeccionEntity[K]) {
    if (this.editDraft) {
      (this.editDraft as any)[key] = value as any;
    }
  }
}
