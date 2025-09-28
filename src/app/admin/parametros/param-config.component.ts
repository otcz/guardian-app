import { Component, OnInit, signal } from '@angular/core';
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
import { ParametrosService, ParamTipo, Parametro } from '../../service/parametros.service';
import { ParamValoresService, ParamValue } from '../../service/param-valores.service';
import { MenuService, MenuOption } from '../../service/menu.service';
import { Observable } from 'rxjs';
import { UppercaseDirective } from '../../shared/formatting.directives';
import { NotificationService } from '../../service/notification.service';
import { PermissionService } from '../../service/permission.service';
import { TooltipModule } from 'primeng/tooltip';
import { SideNavComponent } from '../../shared/side-nav.component';

@Component({
  selector: 'app-param-config',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, InputNumberModule, InputSwitchModule, DropdownModule, SidebarModule, ConfirmDialogModule, ThemeToggleComponent, UppercaseDirective, TooltipModule, SideNavComponent],
  templateUrl: './param-config.component.html',
  styles: [
    `
    :host { display:block; }
    .admin-grid { display:grid; grid-template-columns: auto 1fr; gap: 16px; align-items: stretch; }
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

    /* Sidebar claro consistente */
    :root.theme-light .light-sidebar .p-sidebar,
    :root.theme-light .light-sidebar .p-sidebar-header,
    :root.theme-light .light-sidebar .p-sidebar-content,
    :root.theme-light .light-sidebar .p-sidebar-footer { background: #ffffff !important; color: #000000 !important; }
    :root.theme-light .white-theme { background: #ffffff !important; color: #000000 !important; }

    /* Acciones: sin fondo cuando no hay botones */
    td.actions-cell { background: transparent !important; }
    .actions-container { display:flex; justify-content:flex-end; gap:6px; background: transparent; }

    /* ============== Drawer (slider) mejorado ============== */
    /* Full height and no inner paddings from p-sidebar */
    .config-drawer .p-sidebar { height: 100vh; box-shadow: -6px 0 16px rgba(0,0,0,.12); border-left: 1px solid color-mix(in srgb, var(--text) 8%, transparent); }
    .config-drawer .p-sidebar-content { padding: 0 !important; height: 100%; display: flex; }

    .edit-drawer { display:flex; flex-direction:column; width:100%; min-height:100%; }

    .drawer-header { display:flex; align-items:center; justify-content:space-between; padding: 16px 18px; border-bottom: 1px solid color-mix(in srgb, var(--text) 12%, transparent); background: color-mix(in srgb, var(--secondary) 6%, var(--surface)); }
    .drawer-header .title h3 { margin:0; font-size: 1.25rem; font-weight: 800; letter-spacing:.2px; }
    .drawer-header .title small { display:block; margin-top:2px; font-size: .85rem; color: var(--muted); }
    .drawer-header .header-actions button { color: var(--text); }

    .drawer-body { flex:1; overflow:auto; padding: 16px 18px 8px; }
    .drawer-form { display:flex; flex-direction:column; gap:14px; }
    .drawer-form .form-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items:end; }

    .drawer-form label { font-weight: 700; font-size:.9rem; color: var(--text); letter-spacing:.2px; }
    .drawer-form .help { color: var(--muted); font-size: .85rem; }

    /* Inputs más cómodos */
    .drawer-form :is(input.p-inputtext, .p-inputnumber input) { height: 44px; border-radius: 10px; padding: 10px 12px; font-size: .95rem; }
    .drawer-form .p-inputswitch { transform: scale(1.1); }

    .drawer-footer { display:flex; justify-content:flex-end; gap:10px; padding: 12px 18px; border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent); background: color-mix(in srgb, var(--surface) 94%, black 6%); position: sticky; bottom: 0; }

    /* Responsive */
    @media (max-width: 768px) {
      .config-drawer .p-sidebar { width: 100vw !important; }
      .drawer-form .form-grid { grid-template-columns: 1fr; }
    }
    `
  ],
  providers: [ConfirmationService]
})
export class ParamConfigComponent implements OnInit {
  orgId = Number(localStorage.getItem('orgId') ?? '1');
  nombre = signal<string>('');
  tipo = signal<ParamTipo>('LIST');
  descripcion = signal<string>('');
  paramPorDefecto = signal<boolean>(false);
  paramActivo = signal<boolean>(true);

  panelAbierto = signal<boolean>(false);
  editId = signal<number | null>(null);

  get menu$(): Observable<MenuOption[]> { return this.menu.list$; }
  // Exponer bandera de backend para la plantilla y lógica
  get isBackend(): boolean { return this.paramsService.sourceIsBackend; }

  valores$!: Observable<ParamValue[]>;

  form!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    public paramsService: ParametrosService,
    private valuesService: ParamValoresService,
    private confirm: ConfirmationService,
    private menu: MenuService,
    private notify: NotificationService,
    private perm: PermissionService
  ) {
    this.form = this.fb.group({
      label: [''],
      valueText: [''],
      valueNum: [null as number | null, []],
      activo: [true],
      orden: [1, [Validators.required, Validators.min(1)]],
      sectionId: [null as number | null],
      desc: ['']
    });
  }

  ngOnInit(): void {
    const name = decodeURIComponent(this.route.snapshot.paramMap.get('name') || '');
    if (!name) { this.router.navigate(['/admin/parameters']); return; }
    this.nombre.set(name);

    // Traer definiciones y sembrar valores en el store local de valores
    this.paramsService.fetchDefs(this.orgId).subscribe({
      next: () => this.syncAndSeed(),
      error: () => this.syncAndSeed()
    });

    // Fuente única para la tabla: store local de valores
    this.valores$ = this.valuesService.list$(this.orgId, this.nombre()).asObservable();
  }

  private syncAndSeed() {
    const def = this.paramsService.findByNombre(this.nombre());
    if (!def) return;
    // inferencia de tipo y metadata
    this.tipo.set(def.tipo ?? this.inferTipo(def));
    this.descripcion.set(def.descripcion || '');
    this.paramPorDefecto.set(!!def.porDefecto);
    this.paramActivo.set(!!(typeof def.activo === 'boolean' ? def.activo : true));

    // Si backend entregó valores, sembrarlos una vez en el store local
    const vals = Array.isArray(def.valores) ? def.valores : [];
    if (vals.length > 0) {
      const t = this.tipo();
      let idx = 0;
      const mapped = vals.map((v: any) => {
        const id = ++idx;
        const porDef = !!def.porDefecto && (v.orgId === def.orgIdDef);
        const base: ParamValue = { id, orgId: v.orgId, paramName: def.nombre, activo: !!v.activo, orden: id, sectionId: (typeof v.sectionId === 'number' ? v.sectionId : (v.sectionId ?? null)), porDefecto: porDef, descripcion: v.descripcion } as ParamValue;
        if (t === 'NUM') return { ...base, valueNum: Number(v.valor) } as ParamValue;
        if (t === 'TEXT') return { ...base, valueText: String(v.valor) } as ParamValue;
        return { ...base, label: String(v.valor) } as ParamValue;
      });
      this.valuesService.setAll(this.orgId, this.nombre(), mapped);
    }
  }

  private inferTipo(def: Parametro): ParamTipo {
    const n = (def.nombre || '').toUpperCase();
    const v = def.valor || '';
    if (/^(DURACION|TIEMPO|MAX)_/.test(n)) return 'NUM';
    if (/HORARIO/.test(n) || /:\d{2}-/.test(v)) return 'TEXT';
    if (/^\d+(,\d+)*$/.test(v)) return 'NUM';
    return 'LIST';
  }

  abrirNuevo() {
    if (!this.paramActivo()) { this.notify.warn('No puedes crear valores mientras el parámetro esté inactivo.'); return; }
    this.editId.set(null);
    const list = (this.valuesService.list$(this.orgId, this.nombre()).value || []);
    const nextOrden = list.reduce((m, x) => Math.max(m, x.orden || 0), 0) + 1;
    this.form.reset({ label: '', valueText: '', valueNum: null, activo: true, orden: nextOrden, sectionId: null, desc: '' });
    this.panelAbierto.set(true);
  }

  abrirEditar(v: ParamValue) {
    if (!this.paramActivo()) { this.notify.warn('No puedes editar valores mientras el parámetro esté inactivo.'); return; }
    this.editId.set(v.id);
    this.form.reset({
      label: (v.label || '').toUpperCase(),
      valueText: (v.valueText || '').toUpperCase(),
      valueNum: v.valueNum ?? null,
      activo: v.activo,
      orden: v.orden || 1,
      sectionId: typeof v.sectionId === 'number' ? v.sectionId : null,
      desc: v.descripcion || ''
    });
    this.panelAbierto.set(true);
  }

  cerrarPanel() { this.panelAbierto.set(false); this.editId.set(null); }

  private buildValorFromForm(): string {
    const raw = this.form.getRawValue();
    if (this.tipo() === 'LIST') return String(raw.label || '').trim().toUpperCase();
    if (this.tipo() === 'TEXT') return String(raw.valueText || '').trim().toUpperCase();
    return String(raw.valueNum ?? '').trim();
  }

  private valorFromRow(v: ParamValue): string {
    if (this.tipo() === 'LIST') return String(v.label || '').trim().toUpperCase();
    if (this.tipo() === 'TEXT') return String(v.valueText || '').trim().toUpperCase();
    return String(v.valueNum ?? '').trim();
  }

  private valorIdentityFromRow(v: ParamValue): string {
    if (this.tipo() === 'LIST') return String(v.label ?? '').trim();
    if (this.tipo() === 'TEXT') return String(v.valueText ?? '').trim();
    return String(v.valueNum ?? '').trim();
  }

  guardar() {
    if (!this.paramActivo()) { this.notify.warn('No puedes modificar valores mientras el parámetro esté inactivo.'); return; }
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();

    // Regla básica: ADMIN requiere sectionId
    if (this.perm.has('ADMIN') && (raw.sectionId == null || raw.sectionId === '')) {
      this.form.get('sectionId')?.setErrors({ required: true });
      this.form.get('sectionId')?.markAsTouched();
      return;
    }

    const body: any = {
      orgId: this.orgId,
      sectionId: (raw.sectionId === null || raw.sectionId === '' ? null : Number(raw.sectionId)),
      valor: this.buildValorFromForm(),
      activo: !!raw.activo
    };
    const desc = String(raw.desc || '').trim();
    if (desc) body.descripcion = desc;

    this.valuesService.upsertValue(this.nombre(), body).subscribe({
      next: (resp: any) => {
        // Actualizar store local para reflejar
        const payload: Partial<ParamValue> = {
          label: this.tipo() === 'LIST' ? String(raw.label || '').trim().toUpperCase() : undefined,
          valueText: this.tipo() === 'TEXT' ? String(raw.valueText || '').trim().toUpperCase() : undefined,
          valueNum: this.tipo() === 'NUM' ? Number(raw.valueNum ?? 0) : undefined,
          activo: !!raw.activo,
          orden: Number(raw.orden || 1),
          sectionId: (raw.sectionId === null || raw.sectionId === '' ? null : Number(raw.sectionId)),
          descripcion: desc || undefined
        };
        this.valuesService.upsert(this.orgId, this.nombre(), this.editId() != null ? { id: this.editId()!, ...payload } : payload);
        this.notify.fromApiResponse(resp, this.editId() != null ? 'Valor actualizado.' : 'Valor creado.');
        this.cerrarPanel();
      },
      error: (err) => {
        this.notify.fromApiError(err, 'No fue posible guardar el valor.');
      }
    });
  }

  confirmarEliminar(v: ParamValue) {
    if (!this.paramActivo()) { this.notify.warn('No puedes eliminar valores mientras el parámetro esté inactivo.'); return; }
    this.confirm.confirm({
      message: `¿Eliminar este valor?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button p-button-danger',
      rejectButtonStyleClass: 'p-button p-button-outlined',
      accept: () => this.eliminar(v)
    });
  }

  private eliminar(v: ParamValue) {
    if (!this.paramActivo()) { this.notify.warn('No puedes eliminar valores mientras el parámetro esté inactivo.'); return; }
    this.valuesService.deleteValue(this.nombre(), this.orgId, (typeof v.sectionId === 'number' ? v.sectionId : undefined)).subscribe({
      next: (resp: any) => {
        this.valuesService.remove(this.orgId, this.nombre(), v.id);
        this.notify.fromApiResponse(resp, 'Valor eliminado.');
      },
      error: (err) => this.notify.fromApiError(err, 'No fue posible eliminar el valor.')
    });
  }

  confirmarEliminarActual() {
    const id = this.editId();
    if (!id) return;
    const current = (this.valuesService.list$(this.orgId, this.nombre()).value || []).find(x => x.id === id);
    if (!current) return;
    this.confirmarEliminar(current);
  }

  toggleActivo(v: ParamValue, value?: boolean) {
    // RBAC + parámetro activo
    const adminTryingOrgLevel = this.perm.has('ADMIN') && !(typeof v.sectionId === 'number');
    const allowed = this.paramActivo() && this.perm.canToggleValue(this.paramPorDefecto(), v.porDefecto) && !adminTryingOrgLevel;
    if (!allowed) { this.notify.warn('No tienes permisos o el parámetro está inactivo.'); return; }

    const nuevo = typeof value === 'boolean' ? value : !v.activo;
    const valStr = this.valorIdentityFromRow(v);
    const body: any = {
      orgId: this.orgId,
      activo: nuevo,
      valor: valStr,
      value: valStr
    };
    if (typeof v.sectionId === 'number') body.sectionId = v.sectionId;

    this.valuesService.setActiveValue(this.nombre(), body).subscribe({
      next: () => this.valuesService.upsert(this.orgId, this.nombre(), { id: v.id, activo: nuevo }),
      error: (err) => { this.notify.fromApiError(err, 'No fue posible actualizar el estado.'); }
    });
  }

  // Helper para plantilla
  canToggleValue(v: ParamValue): boolean {
    const adminTryingOrgLevel = this.perm.has('ADMIN') && !(typeof v.sectionId === 'number');
    return this.paramActivo() && this.perm.canToggleValue(this.paramPorDefecto(), v.porDefecto) && !adminTryingOrgLevel;
  }
  canEditValue(v: ParamValue): boolean {
    const adminTryingOrgLevel = this.perm.has('ADMIN') && !(typeof v.sectionId === 'number');
    return this.paramActivo() && this.perm.canEditValue(this.paramPorDefecto(), v.porDefecto) && !adminTryingOrgLevel;
  }
  canDeleteValue(v: ParamValue): boolean {
    const adminTryingOrgLevel = this.perm.has('ADMIN') && !(typeof v.sectionId === 'number');
    return this.paramActivo() && this.perm.canDeleteValue(this.paramPorDefecto(), v.porDefecto) && !adminTryingOrgLevel;
  }
  canCreateValue(): boolean { return this.paramActivo() && this.perm.canCreateValue(this.paramPorDefecto()); }

  getValueToggleReason(v: ParamValue): string {
    if (this.canToggleValue(v)) return '';
    if (!this.paramActivo()) return 'Parámetro inactivo: no se pueden modificar valores.';
    if (v.porDefecto) {
      if (this.perm.has('SUPER_ADMIN') || this.perm.has('ADMIN')) return 'No permitido sobre valores por defecto.';
      return 'Solo SYSTEM_ADMIN puede cambiar valores por defecto.';
    }
    if (this.perm.has('ADMIN') && !(typeof v.sectionId === 'number')) return 'ADMIN requiere sección para operar.';
    return 'No permitido para tu rol.';
  }

  backToList() { this.router.navigate(['/admin/parameters']); }
}
