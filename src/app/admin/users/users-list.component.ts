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
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css']
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
