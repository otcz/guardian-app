import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { OrgContextService } from '../../service/org-context.service';
import { VehiculosService, VehicleEntity } from '../../service/vehiculos.service';
import { NotificationService } from '../../service/notification.service';
import { FormsModule } from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TooltipModule } from 'primeng/tooltip';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../service/auth.service';
import { OrganizationService, Organization } from '../../service/organization.service';

@Component({
  selector: 'app-vehiculos-mis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, TableModule, ButtonModule, TagModule, ProgressSpinnerModule, InputSwitchModule, TooltipModule, DropdownModule, CheckboxModule, InputTextModule],
  templateUrl: './vehiculos-mis.component.html',
  styleUrls: ['./vehiculos-mis.component.scss']
})
export class VehiculosMisComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  items: VehicleEntity[] = [];
  savingId: string | null = null;
  seccionesMap: Record<string, string> = {};

  // Filtros organización
  secciones: SeccionEntity[] = [];
  selectedSeccionId: string | null = null;
  includeSubtree = false;

  // Global
  isSysadmin = false;
  defaultOrgId: string | null = null;
  isGlobal = false;
  orgsMap: Record<string, string> = {};

  // Búsqueda local
  globalFilter = '';

  // Mensaje vacío
  emptyMessage: string | null = null;

  constructor(
    private orgCtx: OrgContextService,
    private vehiculos: VehiculosService,
    private notify: NotificationService,
    private router: Router,
    private seccionesSvc: SeccionService,
    private auth: AuthService,
    private orgs: OrganizationService
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    this.isSysadmin = this.auth.hasRole('SYSADMIN');
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }
    // Detectar modo global (DEFAULT_ORG)
    this.vehiculos.getDefaultOrgId().subscribe((defId: string | null) => {
      this.defaultOrgId = defId;
      this.isGlobal = !!(this.isSysadmin && defId && defId === this.orgId);
      if (this.isGlobal) {
        this.precacheOrgs();
        this.loadGlobal();
      } else {
        this.precacheSecciones();
        this.loadOrg();
      }
    });
  }

  private precacheSecciones() {
    if (!this.orgId) return;
    this.seccionesSvc.list(this.orgId).subscribe({
      next: (arr: SeccionEntity[]) => {
        const map: Record<string, string> = {};
        for (const s of arr) map[s.id] = s.nombre;
        this.seccionesMap = map;
        this.secciones = arr;
      },
      error: (e) => this.notify.warn('Secciones', e?.error?.message || 'No se pudieron cargar las secciones')
    });
  }

  private precacheOrgs() {
    this.orgs.listAccessible().subscribe({
      next: (list: Organization[]) => {
        const map: Record<string, string> = {};
        for (const o of list) if (o.id) map[String(o.id)] = o.nombre;
        this.orgsMap = map;
      },
      error: () => { /* silencioso */ }
    });
  }

  private loadGlobal() {
    this.loading = true;
    this.emptyMessage = null;
    this.vehiculos.listGlobal().subscribe({
      next: (items: VehicleEntity[]) => {
        this.items = items;
        this.loading = false;
        if (!items || items.length === 0) this.emptyMessage = 'No hay vehículos visibles';
      },
      error: (e: any) => {
        this.loading = false;
        if (e?.status === 403) {
          this.notify.warn('No autorizado', 'No tienes permiso para listar vehículos');
          this.router.navigate(['/dashboard']);
        } else {
          this.notify.error('Error', e?.error?.message || 'No se pudieron cargar vehículos');
        }
      }
    });
  }

  loadOrg() {
    if (!this.orgId) return;
    this.loading = true;
    this.emptyMessage = null;

    // ✅ SOLUCIÓN DEFINITIVA: NO enviar parámetros de filtrado
    // El backend filtra automáticamente según el rol y sección del usuario autenticado
    this.vehiculos.list(this.orgId).subscribe({
      next: (items: VehicleEntity[]) => {
        // ✅ Backend envía solo los vehículos que el usuario tiene permiso de ver
        this.items = items;
        this.loading = false;

        if (!items || items.length === 0) {
          this.emptyMessage = 'No hay vehículos visibles para tu usuario';
        }
      },
      error: (e: any) => {
        console.error('[VehiculosMis]  Error al cargar vehículos:', e);
        this.loading = false;

        if (e?.status === 403) {
          this.notify.warn('No autorizado', 'No tienes permiso para listar vehículos');
          this.router.navigate(['/dashboard']);
        } else {
          this.notify.error('Error', e?.error?.message || 'No se pudieron cargar vehículos');
        }
      }
    });
  }

  loadMis() {
    if (!this.orgId) return;
    this.loading = true;
    this.emptyMessage = null;
    this.vehiculos.getMisVehiculos(this.orgId).subscribe({
      next: (items: VehicleEntity[]) => {
        this.items = items;
        this.loading = false;
        if (!items || items.length === 0) this.emptyMessage = 'No hay vehículos visibles';
      },
      error: (e: any) => {
        this.loading = false;
        if (e?.status === 403) {
          this.notify.warn('Acceso denegado', 'Esta opción está disponible solo para ADMIN de SECCIÓN.');
          this.router.navigate(['/dashboard']);
        } else {
          this.notify.error('Error', e?.error?.message || 'No se pudieron cargar vehículos');
        }
      }
    });
  }

  // Método compat usado por plantilla para recargar
  load() { this.isGlobal ? this.loadGlobal() : this.loadOrg(); }

  seccionNombre(id?: string | null) { return id ? (this.seccionesMap[id] || '—') : '—'; }
  orgNombre(id?: string | null) { return id ? (this.orgsMap[id] || id || '—') : '—'; }

  toggle(row: VehicleEntity, value: boolean) {
    const targetOrgId = (row.orgId || this.orgId);
    if (!targetOrgId) return;
    const prev = row.activo;
    row.activo = value;
    this.savingId = row.id;
    this.vehiculos.setActive(targetOrgId, row.id, value).subscribe({
      next: (res) => {
        this.savingId = null;
        if (res.vehicle) {
          const idx = this.items.findIndex(i => i.id === res.vehicle!.id);
          if (idx >= 0) this.items[idx] = res.vehicle!;
        }
        if (res?.message) this.notify.success('Listo', res.message);
      },
      error: (e) => {
        this.savingId = null;
        row.activo = prev;
        if (e?.status === 403) this.notify.warn('Sin permisos', e?.error?.message || 'No autorizado para cambiar estado');
        else this.notify.error('Error', e?.error?.message || 'No se pudo cambiar el estado');
      }
    });
  }

  toggleBloqueado(row: VehicleEntity) {
    const targetOrgId = (row.orgId || this.orgId);
    if (!targetOrgId) return;
    const prev = !!row.bloqueado;
    const nuevo = !prev;
    row.bloqueado = nuevo;
    this.savingId = row.id;
    this.vehiculos.actualizarBloqueado(targetOrgId, row.id, nuevo).subscribe({
      next: (resp) => {
        this.savingId = null;
        if (resp?.data) {
          const idx = this.items.findIndex(i => i.id === resp.data!.id);
          if (idx >= 0) this.items[idx] = resp.data!;
        }
        if (resp?.message) this.notify.success('Listo', resp.message);
      },
      error: (e) => {
        this.savingId = null;
        row.bloqueado = prev;
        if (e?.status === 403) this.notify.warn('Permisos', 'No tienes permisos para cambiar el bloqueo');
        else if (e?.status === 404) this.notify.warn('No disponible', 'El vehículo ya no existe');
        else this.notify.error('Error', e?.error?.message || 'No se pudo cambiar el estado de bloqueo');
      }
    });
  }

  gestionar(v: VehicleEntity) {
    const org = v.orgId || this.orgId;
    this.router.navigate(['/gestion-de-vehiculos/gestionar-vehiculo'], { queryParams: { id: v.id, orgId: org } });
  }

  asignar(v: VehicleEntity) {
    const org = v.orgId || this.orgId;
    this.router.navigate(['/gestion-de-vehiculos/asignar-vehiculo-a-seccion'], { queryParams: { id: v.id, orgId: org } });
  }

  // Visibilidad: ocultar acción de (Des)bloquear para rol USUARIO
  canToggleBloqueado(): boolean {
    // Permitido solo para SYSADMIN, ORGADMIN, ADMIN
    return this.auth.hasAnyRole('SYSADMIN', 'ORGADMIN', 'ADMIN');
  }

  /**
   * ✅ NUEVO: Obtiene los usuarios visibles (máximo 2)
   */
  getVisibleUsers(row: VehicleEntity): string[] {
    const usuarios = row.usuariosAsignados || [];
    return usuarios.slice(0, 2);
  }

  /**
   * ✅ NUEVO: Obtiene la cantidad de usuarios restantes (después de los 2 primeros)
   */
  getRemainingUsersCount(row: VehicleEntity): number {
    const usuarios = row.usuariosAsignados || [];
    const total = usuarios.length;
    return total > 2 ? total - 2 : 0;
  }

  /**
   * ✅ NUEVO: Genera el tooltip HTML con todos los usuarios
   */
  getAllUsersTooltip(row: VehicleEntity): string {
    const usuarios = row.usuariosAsignados || [];

    if (usuarios.length === 0) {
      return 'Sin usuarios asignados';
    }

    // Generar HTML para el tooltip
    let html = `<div style="text-align: left; max-width: 300px;">`;
    html += `<strong>👥 Todos los usuarios (${usuarios.length}):</strong><br/><br/>`;

    usuarios.forEach((usuario, index) => {
      html += `<div style="margin-bottom: 6px;">`;
      html += `<i class="pi pi-user" style="color: #22c55e; margin-right: 6px;"></i>`;
      html += `<span style="font-weight: 500;">${usuario}</span>`;
      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }
}
