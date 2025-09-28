import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DropdownModule } from 'primeng/dropdown';
import { SidebarModule } from 'primeng/sidebar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ThemeToggleComponent } from '../../shared/theme-toggle.component';
import { ParametrosService, ParamTipo } from '../../service/parametros.service';
import { ParamValoresService, ParamValue, ParamValueTipo } from '../../service/param-valores.service';
import { MenuService, MenuOption } from '../../service/menu.service';
import { Observable } from 'rxjs';
import { UserAvatarComponent } from '../../shared/user-avatar.component';

@Component({
  selector: 'app-param-config',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, InputNumberModule, InputSwitchModule, DropdownModule, SidebarModule, ConfirmDialogModule, ThemeToggleComponent, UserAvatarComponent],
  templateUrl: './param-config.component.html',
  styles: [`
    :host { display:block; }
    .admin-grid { display:grid; grid-template-columns: 260px 1fr; gap: 16px; align-items:start; }
    .card { background: var(--surface); color: var(--text); border-radius: 12px; padding: 16px; }
    .nav { background: linear-gradient(135deg, var(--secondary) 0%, color-mix(in srgb, var(--secondary) 70%, black) 100%); color: #fff; border-radius: 12px; padding: 12px; }
    .nav a { color:#fff; opacity:.92; text-decoration:none; display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; }
    .nav a:hover { background: rgba(255,255,255,.08); }
    .nav .section-title { font-weight:800; opacity:.95; letter-spacing:.2px; padding:6px 10px; }
    .toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap: 8px; }
    .steps { display:flex; align-items:center; gap:10px; color: var(--muted); font-weight:700; }
    .steps .active { color: var(--primary); }
    .form-field { display:flex; flex-direction:column; gap:6px; }
    .muted { color: var(--muted); font-size: .9rem; }
  `],
  providers: [ConfirmationService]
})
export class ParamConfigComponent implements OnInit {
  orgId = Number(localStorage.getItem('orgId') ?? '1');
  nombre = signal<string>('');
  tipo = signal<ParamTipo>('LIST');
  descripcion = signal<string>('');

  panelAbierto = signal<boolean>(false);
  editId = signal<number | null>(null);

  get menu$(): Observable<MenuOption[]> { return this.menu.list$; }

  valores$!: import('rxjs').Observable<ParamValue[]>;

  form!: FormGroup;

  campoPrincipal = computed(() => this.tipo() === 'NUM' ? 'Valor (número)' : this.tipo() === 'TEXT' ? 'Valor (texto)' : 'Etiqueta');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private paramsService: ParametrosService,
    private valuesService: ParamValoresService,
    private confirm: ConfirmationService,
    private menu: MenuService
  ) {
    this.form = this.fb.group({
      label: [''],
      valueText: [''],
      valueNum: [null as number | null, []],
      activo: [true],
      orden: [1, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    const name = decodeURIComponent(this.route.snapshot.paramMap.get('name') || '');
    if (!name) { this.router.navigate(['/admin/parameters']); return; }
    this.nombre.set(name);

    const def = this.paramsService.findByNombre(name);
    if (def) {
      this.tipo.set(def.tipo);
      this.descripcion.set(def.descripcion || '');
    }

    const tipoValor: ParamValueTipo = this.tipo() as any;
    this.valuesService.seedIfEmpty(this.orgId, this.nombre(), tipoValor);

    this.valores$ = this.valuesService.list$(this.orgId, this.nombre()).asObservable();
  }

  abrirNuevo() {
    this.editId.set(null);
    const list = (this.valuesService.list$(this.orgId, this.nombre()).value || []);
    const nextOrden = list.reduce((m, x) => Math.max(m, x.orden || 0), 0) + 1;
    this.form.reset({ label: '', valueText: '', valueNum: null, activo: true, orden: nextOrden });
    this.panelAbierto.set(true);
  }

  abrirEditar(v: ParamValue) {
    this.editId.set(v.id);
    this.form.reset({
      label: v.label || '',
      valueText: v.valueText || '',
      valueNum: v.valueNum ?? null,
      activo: v.activo,
      orden: v.orden || 1
    });
    this.panelAbierto.set(true);
  }

  cerrarPanel() { this.panelAbierto.set(false); }

  guardar() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const payload: any = { activo: !!raw.activo, orden: Number(raw.orden || 1) };
    if (this.tipo() === 'LIST') payload.label = String(raw.label || '').trim();
    if (this.tipo() === 'TEXT') payload.valueText = String(raw.valueText || '').trim();
    if (this.tipo() === 'NUM') payload.valueNum = Number(raw.valueNum || 0);

    this.valuesService.upsert(this.orgId, this.nombre(), this.editId() != null ? { id: this.editId()!, ...payload } : payload);
    this.cerrarPanel();
  }

  confirmarEliminar(v: ParamValue) {
    this.confirm.confirm({
      message: `¿Eliminar este valor?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button p-button-danger',
      rejectButtonStyleClass: 'p-button p-button-outlined',
      accept: () => this.valuesService.remove(this.orgId, this.nombre(), v.id)
    });
  }

  toggleActivo(v: ParamValue) {
    this.valuesService.upsert(this.orgId, this.nombre(), { id: v.id, activo: !v.activo });
  }

  mover(v: ParamValue, dir: 1 | -1) {
    const list = this.valuesService.list$(this.orgId, this.nombre()).value.slice();
    const idx = list.findIndex(x => x.id === v.id);
    if (idx < 0) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const a = list[idx], b = list[swapIdx];
    const tmp = a.orden; a.orden = b.orden; b.orden = tmp;
    this.valuesService.upsert(this.orgId, this.nombre(), { id: a.id, orden: a.orden });
    this.valuesService.upsert(this.orgId, this.nombre(), { id: b.id, orden: b.orden });
  }

  backToList() { this.router.navigate(['/admin/parameters']); }
}
