import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { SliderModule } from 'primeng/slider';
import { ParametrosService, Parametro, ParamTipo } from '../../service/parametros.service';
import { ThemeToggleComponent } from '../../shared/theme-toggle.component';

@Component({
  selector: 'app-parametros',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, DropdownModule, InputSwitchModule, SliderModule, ThemeToggleComponent],
  templateUrl: './parametros.component.html',
  styles: [`
    :host { display:block; }
    .grid { display:grid; grid-template-columns: 360px 1fr; gap: 16px; align-items: start; }
    .card { background: var(--surface); color: var(--text); border-radius: 12px; padding: 16px; }
    .form-field { display:flex; flex-direction:column; gap:6px; }
    .muted { color: var(--muted); font-size: .9rem; }
    .p-slider .p-slider-range, .p-slider .p-slider-handle { background: var(--primary) !important; border-color: var(--primary) !important; }
    .danger { color: var(--danger); }
  `]
})
export class ParametrosComponent implements OnInit {
  tipos = [
    { label: 'Número', value: 'numero' },
    { label: 'Texto', value: 'texto' },
    { label: 'Booleano', value: 'booleano' },
    { label: 'Lista', value: 'lista' },
  ] as {label:string; value: ParamTipo}[];

  form!: FormGroup;
  editando = signal<Parametro | null>(null);

  // Rango del slider para "minutos" por defecto
  min = 0;
  max = 2880; // 48h en minutos

  // Reemplazar propiedad por getter para evitar uso antes de inicialización
  get lista$() { return this.params.list$; }

  constructor(private fb: FormBuilder, private params: ParametrosService) {
    this.form = this.fb.group({
      clave: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
      descripcion: ['', [Validators.required, Validators.maxLength(200)]],
      tipo: ['numero' as ParamTipo, Validators.required],
      // valor dinámico según tipo
      valorTexto: [''],
      valorNumero: [0, [Validators.min(0)]],
      valorBooleano: [false],
      valorListaTexto: ['']
    });
  }

  ngOnInit(): void {
    this.form.get('tipo')!.valueChanges.subscribe((t: ParamTipo) => {
      const clave = String(this.form.get('clave')!.value || '');
      if (t === 'numero') {
        if (/TOKEN|EXPIRACION|DURACION/i.test(clave)) { this.min = 0; this.max = 4320; }
        else { this.min = 0; this.max = 10000; }
      }
    });
  }

  editar(p: Parametro) {
    this.editando.set(p);
    this.form.patchValue({
      clave: p.clave,
      descripcion: p.descripcion,
      tipo: p.tipo,
      valorTexto: p.tipo === 'texto' ? String(p.valor || '') : '',
      valorNumero: p.tipo === 'numero' ? Number(p.valor || 0) : 0,
      valorBooleano: p.tipo === 'booleano' ? Boolean(p.valor) : false,
      valorListaTexto: p.tipo === 'lista' ? (Array.isArray(p.valor) ? (p.valor as string[]).join(', ') : '') : ''
    });
    this.form.get('clave')!.disable();
    this.form.get('tipo')!.disable();
  }

  nuevo() {
    this.editando.set(null);
    this.form.reset({ tipo: 'numero', valorNumero: 0, valorBooleano: false, valorListaTexto: '' });
    this.form.get('clave')!.enable();
    this.form.get('tipo')!.enable();
  }

  guardar() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const tipo = raw.tipo as ParamTipo;
    let valor: any = null;
    switch (tipo) {
      case 'texto': valor = String(raw.valorTexto || ''); break;
      case 'numero': valor = Number(raw.valorNumero || 0); break;
      case 'booleano': valor = Boolean(raw.valorBooleano); break;
      case 'lista': {
        const src = String(raw.valorListaTexto || '');
        const tokens = src.split(/[,\n]/g).map(s => s.trim()).filter((v: string) => v.length > 0);
        // dedupe
        valor = Array.from(new Set(tokens));
        break;
      }
    }
    const item: Parametro = {
      clave: String(raw.clave).trim(),
      descripcion: String(raw.descripcion).trim(),
      tipo,
      valor
    };
    this.params.upsert(item);
    this.nuevo();
  }

  eliminar(p?: Parametro) {
    const target = p || this.editando();
    if (!target) return;
    this.params.remove(target.clave);
    if (this.editando()?.clave === target.clave) this.nuevo();
  }

  // Helpers UI
  esNumero() { return this.form.get('tipo')!.value === 'numero'; }
  esTexto() { return this.form.get('tipo')!.value === 'texto'; }
  esBool() { return this.form.get('tipo')!.value === 'booleano'; }
  esLista() { return this.form.get('tipo')!.value === 'lista'; }
}
