import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { SidebarModule } from 'primeng/sidebar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ParametrosService, Parametro, ParamTipo } from '../../service/parametros.service';
import { ThemeToggleComponent } from '../../shared/theme-toggle.component';
import { UppercaseDirective } from '../../shared/formatting.directives';
import { YesNoPipe } from '../../shared/yes-no.pipe';
import { MenuService, MenuOption } from '../../service/menu.service';
import { Observable } from 'rxjs';
import { UserAvatarComponent } from '../../shared/user-avatar.component';

@Component({
  selector: 'app-parametros',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, DropdownModule, SidebarModule, ConfirmDialogModule, ThemeToggleComponent, UppercaseDirective, YesNoPipe, UserAvatarComponent],
  templateUrl: './parametros.component.html',
  styles: [`
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
  `],
  providers: [ConfirmationService]
})
export class ParametrosComponent implements OnInit {
  tipos = [
    { label: 'Número', value: 'NUM' },
    { label: 'Texto', value: 'TEXT' },
    { label: 'Lista', value: 'LIST' },
  ] as {label:string; value: ParamTipo}[];

  form!: FormGroup;
  editandoId = signal<number | null>(null);
  panelAbierto = signal<boolean>(false);

  get lista$() { return this.params.list$; }
  get menu$(): Observable<MenuOption[]> { return this.menu.list$; }

  constructor(private fb: FormBuilder, private params: ParametrosService, private menu: MenuService, private confirm: ConfirmationService, private router: Router) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/), Validators.maxLength(64)]],
      descripcion: ['', [Validators.maxLength(255)]],
      tipo: ['NUM' as ParamTipo, Validators.required]
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
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      tipo: p.tipo
    });
    this.form.get('nombre')!.enable();
    this.panelAbierto.set(true);
  }

  nuevo() {
    this.editandoId.set(null);
    this.form.reset({ tipo: 'NUM' });
    this.form.get('nombre')!.enable();
    this.panelAbierto.set(true);
  }

  cerrarPanel() { this.panelAbierto.set(false); }

  guardar() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const orgId = Number(localStorage.getItem('orgId') ?? '1');
    const dto = { orgId, nombre: String(raw.nombre).trim(), descripcion: (raw.descripcion || '').trim(), tipo: raw.tipo as ParamTipo };

    const id = this.editandoId();
    if (id != null) {
      this.params.update(id, { nombre: dto.nombre, descripcion: dto.descripcion, tipo: dto.tipo }).subscribe({
        next: () => { this.cerrarPanel(); this.nuevo(); },
        error: () => {/* opcional: notificar */}
      });
    } else {
      this.params.create(dto).subscribe({
        next: () => { this.cerrarPanel(); this.nuevo(); },
        error: () => {/* opcional: notificar */}
      });
    }
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
