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
import { ParametrosService, Parametro, ParamTipo } from '../../service/parametros.service';
import { ThemeToggleComponent } from '../../shared/theme-toggle.component';
import { LowercaseDirective } from '../../shared/formatting.directives';
import { YesNoPipe } from '../../shared/yes-no.pipe';
import { MenuService, MenuOption } from '../../service/menu.service';
import { Observable } from 'rxjs';
import { UserAvatarComponent } from '../../shared/user-avatar.component';
import { ThemeService } from '../../service/theme.service';
import { InputSwitchModule } from 'primeng/inputswitch';

@Component({
  selector: 'app-parametros',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, InputSwitchModule, SidebarModule, ConfirmDialogModule, ThemeToggleComponent, LowercaseDirective, YesNoPipe, UserAvatarComponent],
  templateUrl: './parametros.component.html',
  styles: [
    `
    :host { display:block; }
    .admin-grid { display:grid; grid-template-columns: 260px 1fr; gap: 16px; align-items: start; }
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
  get menu$(): Observable<MenuOption[]> { return this.menu.list$; }
  get isBackend(): boolean { return this.params.sourceIsBackend; }

  constructor(private fb: FormBuilder, private params: ParametrosService, private menu: MenuService, private confirm: ConfirmationService, private router: Router, public theme: ThemeService) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/), Validators.maxLength(64)]],
      descripcion: ['', [Validators.maxLength(255)]]
    });
  }

  ngOnInit(): void {
    const orgId = Number(localStorage.getItem('orgId') ?? '1');
    this.params.fetchDefs(orgId).subscribe({
      error: () => { /* silencioso: respaldo local */ }
    });
  }

  editar(p: Parametro) {
    this.editandoId.set(p.id ?? null);
    this.form.reset({
      nombre: (p.nombre || '').toLowerCase(),
      descripcion: p.descripcion ?? ''
    });
    this.form.get('nombre')!.enable();
    this.panelAbierto.set(true);
  }

  nuevo() {
    this.editandoId.set(null);
    this.form.reset();
    this.form.get('nombre')!.enable();
    this.panelAbierto.set(true);
  }

  cerrarPanel() { this.panelAbierto.set(false); }

  guardar() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const orgId = Number(localStorage.getItem('orgId') ?? '1');
    const dto = { orgId, nombre: String(raw.nombre).trim(), descripcion: (raw.descripcion || '').trim() };

    const id = this.editandoId();
    if (id != null) {
      // conservar el tipo actual al editar, si está disponible
      const tipoActual: ParamTipo | undefined = (this.params.list.find(x => x.id === id)?.tipo) || (this.params.list.find(x => x.nombre === dto.nombre)?.tipo);
      const payload: Partial<Parametro> = { nombre: dto.nombre, descripcion: dto.descripcion };
      if (tipoActual) (payload as any).tipo = tipoActual;
      this.params.update(id, payload).subscribe({
        next: () => { this.cerrarPanel(); this.nuevo(); },
        error: () => {/* opcional: notificar */}
      });
    } else {
      // crear con tipo por defecto (sin selector en UI)
      const tipoDefault: ParamTipo = 'TEXT';
      this.params.create({ orgId, nombre: dto.nombre, descripcion: dto.descripcion, tipo: tipoDefault } as any).subscribe({
        next: () => { this.cerrarPanel(); this.nuevo(); },
        error: () => {/* opcional: notificar */}
      });
    }
  }

  toggleActivo(row: Parametro, ev?: any) {
    const checked = typeof ev?.checked === 'boolean' ? ev.checked : !(row.activo ?? row.activoValor ?? row.activoDef ?? true);
    const id = row.id ?? this.params.list.find(x => x.nombre === row.nombre)?.id;
    if (id) {
      this.params.update(id, { activo: checked }).subscribe({ next: () => {}, error: () => {} });
      return;
    }
    const orgId = (row.orgIdDef ?? row.orgId ?? Number(localStorage.getItem('orgId') ?? '1')) as number;
    this.params.setActivo(orgId, row.nombre, checked).subscribe({ next: () => {}, error: () => {} });
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
    const id = (p?.id ?? this.editandoId()) as number | null;
    if (id == null) return;
    this.params.delete(id).subscribe({
      next: () => { if (this.editandoId() === id) this.nuevo(); },
      error: () => {/* opcional: notificar */}
    });
  }

  configurar(p: Parametro) {
    const nombre = encodeURIComponent(p.nombre);
    this.router.navigate(['/admin/parameters/configure', nombre]);
  }
}
