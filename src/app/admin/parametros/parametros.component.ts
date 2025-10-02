import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SidebarModule } from 'primeng/sidebar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ParametrosService, Parametro } from '../../service/parametros.service';
import { ThemeToggleComponent } from '../../shared/theme-toggle.component';
import { UppercaseDirective } from '../../shared/formatting.directives';
import { YesNoPipe } from '../../shared/yes-no.pipe';
import { MenuService, MenuOption } from '../../service/menu.service';
import { Observable } from 'rxjs';
import { UserAvatarComponent } from '../../shared/user-avatar.component';
import { ThemeService } from '../../service/theme.service';
import { InputSwitchModule } from 'primeng/inputswitch';
import { PermissionService } from '../../service/permission.service';
import { NotificationService } from '../../service/notification.service';
import { TooltipModule } from 'primeng/tooltip';
import { ParamValoresService } from '../../service/param-valores.service';
import { SideNavComponent } from '../../shared/side-nav.component';

@Component({
  selector: 'app-parametros',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, InputSwitchModule, SidebarModule, ConfirmDialogModule, ThemeToggleComponent, UppercaseDirective, YesNoPipe, UserAvatarComponent, TooltipModule, SideNavComponent],
  templateUrl: './parametros.component.html',
  styles: [
    `
    :host { display:block; }
    .admin-grid { display:grid; grid-template-columns: auto 1fr; gap: 16px; align-items: stretch; }
    .card { background: var(--surface); color: var(--text); border-radius: 12px; padding: 16px; }
    .nav { background: linear-gradient(135deg, var(--secondary) 0%, color-mix(in srgb, var(--secondary) 70%, black) 100%); color: #fff; border-radius: 12px; padding: 12px; }
    .nav a { color:#fff; opacity:.92; text-decoration:none; display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; }
    .nav a:hover { background: rgba(255,255,255,.08); }
    .nav .section-title { font-weight:800; opacity:.95; letter-spacing:.2px; padding:6px 10px; }
    .form-field { display:flex; flex-direction:column; gap:6px; }
    .muted { color: var(--muted); font-size: .9rem; }
    .danger { color: var(--danger); }
  `
  ],
  providers: [ConfirmationService]
})
export class ParametrosComponent implements OnInit {

  form!: FormGroup;
  editandoId = signal<number | null>(null);
  panelAbierto = signal<boolean>(false);

  get lista$() { return this.params.list$; }

  constructor(
    private fb: FormBuilder,
    private params: ParametrosService,
    private menu: MenuService,
    private confirm: ConfirmationService,
    private router: Router,
    public theme: ThemeService,
    private perm: PermissionService,
    private notify: NotificationService,
    private values: ParamValoresService
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/), Validators.maxLength(64)]],
      descripcion: ['', [Validators.maxLength(255)]],
      activo: [true]
    });
  }

  ngOnInit(): void {
    const orgId = Number(localStorage.getItem('orgId') ?? '1');
    this.params.fetchDefs(orgId).subscribe({
      error: () => { /* silencioso: respaldo local */ }
    });
  }

  editar(p: Parametro) {
    this.editandoId.set(p.id ?? -1); // usar -1 como marcador cuando no venga id
    this.form.reset({
      nombre: (p.nombre || '').toUpperCase(),
      descripcion: (p.descripcion || '').toUpperCase(),
      activo: (p.activo ?? p.activoValor ?? p.activoDef ?? true)
    });
    this.form.get('nombre')!.disable(); // nombre inmutable al editar
    this.panelAbierto.set(true);
  }

  nuevo() {
    this.editandoId.set(null);
    this.form.reset({ nombre: '', descripcion: '', activo: true });
    this.form.get('nombre')!.enable();
    this.panelAbierto.set(true);
  }

  cerrarPanel() { this.panelAbierto.set(false); this.editandoId.set(null); }

  private getErrorMessage(err: any): string {
    const raw = err?.error?.message ?? err?.message ?? '';
    return String(raw).toLowerCase();
  }

  guardar() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const orgId = Number(localStorage.getItem('orgId') ?? '1');
    const dto = { orgId, nombre: String(raw.nombre).trim().toUpperCase(), descripcion: String(raw.descripcion || '').trim().toUpperCase(), activo: !!raw.activo };

    const id = this.editandoId();
    if (id != null) {
      this.params.updateByNombre(orgId, dto.nombre, { descripcion: dto.descripcion, activo: dto.activo }).subscribe({
        next: (resp) => { this.notify.fromApiResponse(resp, 'Parámetro actualizado.'); this.cerrarPanel(); },
        error: (err) => { this.notify.fromApiError(err, 'No fue posible actualizar.'); }
      });
    } else {
      this.params.create({ orgId, nombre: dto.nombre, descripcion: dto.descripcion, activo: dto.activo }).subscribe({
        next: (resp) => { this.notify.fromApiResponse(resp, 'Parámetro creado.'); this.cerrarPanel(); },
        error: (err) => {
          this.notify.fromApiError(err, 'No fue posible crear.');
          const m = this.getErrorMessage(err);
          if (err?.status === 400 && (m.includes('existe') || m.includes('duplicad'))) {
            this.form.get('nombre')?.setErrors({ duplicate: true });
            this.form.get('nombre')?.markAsTouched();
          }
        }
      });
    }
  }

  toggleActivo(row: Parametro, next?: boolean | any) {
    const allowed = this.canToggleParam(row);
    if (!allowed) { this.notify.warn('No tienes permisos para cambiar el estado.'); return; }

    const orgId = Number(localStorage.getItem('orgId') ?? '1');
    const checked = (typeof next === 'boolean') ? next : (typeof next?.checked === 'boolean' ? next.checked : !(row.activo ?? row.activoValor ?? row.activoDef ?? true));

    this.params.setActivo(orgId, row.nombre, checked).subscribe({
      next: (resp: any) => {
        this.notify.fromApiResponse(resp, 'Estado actualizado.');
        this.cascadeValoresActivo(row, orgId, checked);
      },
      error: (err) => this.notify.fromApiError(err, 'No fue posible actualizar el estado.')
    });
  }

  private cascadeValoresActivo(row: Parametro, orgId: number, activo: boolean) {
    const nombre = row.nombre;
    // Org-level valores
    this.values.setActiveValue(nombre, { orgId, activo }).subscribe({ next: () => {}, error: () => {} });
    // Sección-level valores si los conocemos
    const sections = new Set<number>();
    (row.valores || []).forEach(v => { if (typeof v.sectionId === 'number') sections.add(v.sectionId); });
    sections.forEach(sectionId => {
      this.values.setActiveValue(nombre, { orgId, sectionId, activo }).subscribe({ next: () => {}, error: () => {} });
    });
  }

  getParamToggleReason(p: Parametro): string {
    if (this.canToggleParam(p)) return '';
    if (p.porDefecto) {
      if (this.perm.has('SUPER_ADMIN')) return 'No permitido sobre parámetros por defecto.';
      return 'Solo SYSTEM_ADMIN puede cambiar parámetros por defecto.';
    }
    if (!this.perm.has('SUPER_ADMIN') && !this.perm.has('SYSTEM_ADMIN')) return 'No permitido para tu rol.';
    return 'Acción no permitida.';
  }

  confirmarEliminar(p?: Parametro) {
    const target = (p ?? null);
    if (!target) return;
    this.confirm.confirm({
      message: `¿Seguro que deseas eliminar el parámetro "${target.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button p-button-danger',
      rejectButtonStyleClass: 'p-button p-button-outlined',
      accept: () => this.eliminar(target)
    });
  }

  eliminar(p: Parametro) {
    const nombre = p?.nombre || '';
    const orgId = Number(localStorage.getItem('orgId') ?? '1');
    if (!nombre) return;
    this.params.deleteByNombre(orgId, nombre).subscribe({
      next: (resp) => { this.notify.fromApiResponse(resp, 'Parámetro eliminado.'); },
      error: (err) => { this.notify.fromApiError(err, 'No fue posible eliminar.'); }
    });
  }

  configurar(p: Parametro) {
    const nombre = encodeURIComponent(p.nombre);
    this.router.navigate(['/admin/parameters/configure', nombre]);
  }

  // RBAC helpers
  canCreateParam() { return this.perm.canCreateParam(); }
  canEditParam(p: Parametro) { return this.perm.canEditParam(p.porDefecto); }
  canDeleteParam(p: Parametro) { return this.perm.canDeleteParam(p.porDefecto); }
  canToggleParam(p: Parametro) { return this.perm.canToggleParam(p.porDefecto); }
}
