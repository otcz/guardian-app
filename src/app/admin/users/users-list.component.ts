import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ChipModule } from 'primeng/chip';
import { FormsModule } from '@angular/forms';
import { UsersService, UserMinimal, UserStatus } from '../../service/users.service';
import { RolesService, Role } from '../../service/roles.service';
import { SectionsService, Section } from '../../service/sections.service';
import { NotificationService } from '../../service/notification.service';
import { PermissionService } from '../../service/permission.service';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { SideNavComponent } from '../../shared/side-nav.component';
import { AssignRolesDialogComponent } from './assign-roles.dialog';
import { AssignSectionsDialogComponent } from './assign-sections.dialog';
import { TranslatePipe } from '../../service/i18n.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableModule, InputTextModule, DropdownModule, ButtonModule, TooltipModule, ConfirmDialogModule, ChipModule, SideNavComponent, AssignRolesDialogComponent, AssignSectionsDialogComponent, TranslatePipe],
  providers: [ConfirmationService],
  template: `
  <div class="admin-grid">
    <app-side-nav title="Administración"></app-side-nav>
    <div class="card">
      <div class="header-row">
        <h2>{{ 'users.title' | t }}</h2>
        <span class="spacer"></span>
        <button pButton [label]="('users.create' | t)" icon="pi pi-plus" (click)="goNew()" *ngIf="perm.canCreateUser()"></button>
      </div>

      <div class="filters">
        <span class="p-input-icon-left">
          <i class="pi pi-search"></i>
          <input pInputText type="text" [(ngModel)]="q" (ngModelChange)="onSearchChange()" placeholder="Buscar (nombre, usuario, documento)" aria-label="Buscar" />
        </span>
        <p-dropdown [options]="statusOptions" [(ngModel)]="status" placeholder="Estado" optionLabel="label" optionValue="value"></p-dropdown>
        <p-dropdown [options]="roleOptions" [(ngModel)]="roleId" placeholder="Rol" optionLabel="name" optionValue="id"></p-dropdown>
        <p-dropdown [options]="sectionOptions" [(ngModel)]="sectionId" placeholder="Sección" optionLabel="name" optionValue="id"></p-dropdown>
        <span class="spacer"></span>
        <button pButton class="p-button-outlined" label="Limpiar" (click)="clearFilters()"></button>
      </div>

      <p-table [value]="items" [lazy]="true" [paginator]="true" [rows]="size" [totalRecords]="total"
               (onLazyLoad)="onLazy($event)" [loading]="loading()" [rowsPerPageOptions]="[10,20,50]">
        <ng-template pTemplate="header">
          <tr>
            <th>Nombre</th>
            <th>Documento</th>
            <th>Username</th>
            <th>Email</th>
            <th>Roles</th>
            <th>Secciones</th>
            <th>Estado</th>
            <th class="actions">Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>{{ row.nombres }} {{ row.apellidos || '' }}</td>
            <td>{{ row.documento || '-' }}</td>
            <td>{{ row.username }}</td>
            <td>{{ row.email || '-' }}</td>
            <td>
              <p-chip *ngFor="let r of mapRoles(row.roleIds)" [label]="r" class="pill"></p-chip>
            </td>
            <td>
              <p-chip *ngFor="let s of mapSections(row.sectionIds)" [label]="s" class="pill"></p-chip>
            </td>
            <td>
              <span class="status" [class.ok]="row.status==='ACTIVE'" [class.warn]="row.status==='INACTIVE'" [class.block]="row.status==='BLOCKED'">{{ row.status }}</span>
            </td>
            <td class="actions">
              <button pButton pTooltip="Editar" [disabled]="!perm.canEditUser()" icon="pi pi-pencil" class="p-button-text" (click)="edit(row)"></button>
              <button pButton pTooltip="Asignar roles" [disabled]="!perm.canAssignRoles()" icon="pi pi-users" class="p-button-text" (click)="openRoles(row)"></button>
              <button pButton pTooltip="Asignar secciones" [disabled]="!perm.canAssignSections()" icon="pi pi-sitemap" class="p-button-text" (click)="openSections(row)"></button>
              <button pButton pTooltip="Cambiar estado" [disabled]="!perm.canChangeUserStatus()" icon="pi pi-shield" class="p-button-text" (click)="changeStatus(row)"></button>
              <button pButton pTooltip="Historial" *ngIf="perm.canViewUserAudit()" icon="pi pi-history" class="p-button-text" (click)="audit(row)"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>

    </div>
  </div>

  <p-confirmDialog></p-confirmDialog>

  <app-assign-roles-dialog [(visible)]="rolesVisible" [userId]="selected?.id || null" [roleIds]="selected?.roleIds || []" (saved)="refresh()"></app-assign-roles-dialog>
  <app-assign-sections-dialog [(visible)]="sectionsVisible" [userId]="selected?.id || null" [sectionIds]="selected?.sectionIds || []" (saved)="refresh()" [max]="sectionsMax"></app-assign-sections-dialog>
  `,
  styles: [`
    :host { display:block; }
    .admin-grid { display:grid; grid-template-columns: auto 1fr; gap: 16px; }
    .header-row { display:flex; align-items:center; gap: 10px; }
    .spacer { flex: 1 1 auto; }
    .filters { display:flex; gap:10px; align-items:center; margin: 8px 0 12px; }
    .pill { margin-right: 6px; margin-bottom: 4px; }
    td.actions { white-space: nowrap; }
    .status.ok { color: var(--success); font-weight: 700; }
    .status.warn { color: var(--muted); font-weight: 700; }
    .status.block { color: var(--danger); font-weight: 700; }
  `]
})
export class UsersListComponent implements OnInit, OnDestroy {
  items: UserMinimal[] = [];
  total = 0;
  page = 0;
  size = 10;
  loading = signal(false);

  q = '';
  status: UserStatus | null = null;
  roleId: number | null = null;
  sectionId: number | null = null;

  statusOptions = [
    { label: 'Activo', value: 'ACTIVE' },
    { label: 'Inactivo', value: 'INACTIVE' },
    { label: 'Bloqueado', value: 'BLOCKED' }
  ];
  roleOptions: Role[] = [];
  sectionOptions: Section[] = [];

  selected: UserMinimal | null = null;
  rolesVisible = false;
  sectionsVisible = false;
  sectionsMax = 8;

  private search$ = new Subject<void>();
  private sub?: Subscription;

  constructor(
    private api: UsersService,
    private roles: RolesService,
    private sections: SectionsService,
    private confirm: ConfirmationService,
    private notify: NotificationService,
    public perm: PermissionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.search$.pipe(debounceTime(350)).subscribe(() => this.load());
    this.roles.list().subscribe({ next: r => this.roleOptions = r, error: () => {} });
    this.sections.list().subscribe({ next: r => this.sectionOptions = r, error: () => {} });
    this.load();
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  onSearchChange() { this.search$.next(); }
  clearFilters() { this.q=''; this.status=null; this.roleId=null; this.sectionId=null; this.load(); }

  onLazy(ev: any) {
    this.page = (ev?.first ?? 0) / (ev?.rows ?? this.size);
    this.size = ev?.rows ?? this.size;
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.list({ q: this.q || undefined, status: this.status || undefined, role: this.roleId ?? undefined, section: this.sectionId ?? undefined, page: this.page, size: this.size })
      .subscribe({
        next: (p) => { this.items = p.items || []; this.total = p.total || 0; this.loading.set(false); },
        error: (e) => { this.loading.set(false); this.notify.fromApiError(e, 'No fue posible cargar usuarios.'); }
      });
  }

  mapRoles(ids?: number[]): string[] { const map = new Map(this.roleOptions.map(r => [r.id, r.name] as [number, string])); return (ids||[]).map(id => map.get(id) || `#${id}`); }
  mapSections(ids?: number[]): string[] { const map = new Map(this.sectionOptions.map(s => [s.id, s.name] as [number, string])); return (ids||[]).map(id => map.get(id) || `#${id}`); }

  refresh() { this.load(); }
  goNew() { this.router.navigate(['/admin/users/new']); }
  edit(row: UserMinimal) { this.router.navigate(['/admin/users', row.id]); }
  audit(row: UserMinimal) { this.router.navigate(['/admin/users', row.id, 'audit']); }
  openRoles(row: UserMinimal) { this.selected = row; this.rolesVisible = true; }
  openSections(row: UserMinimal) { this.selected = row; this.sectionsVisible = true; }

  changeStatus(row: UserMinimal) {
    const next: UserStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const msg = next === 'INACTIVE' ? `¿Seguro que deseas desactivar a ${row.username}? Podrás reactivarlo luego.` : `¿Activar a ${row.username}?`;
    this.confirm.confirm({
      message: msg,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button p-button-danger',
      rejectButtonStyleClass: 'p-button p-button-outlined',
      accept: () => {
        this.api.setStatus(row.id, next).subscribe({
          next: () => { this.notify.success('Estado actualizado.'); this.load(); },
          error: (e) => this.notify.fromApiError(e, 'No se pudo cambiar el estado.')
        });
      }
    });
  }
}
