import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { RolesService, Role } from '../../service/roles.service';
import { NotificationService } from '../../service/notification.service';
import { SideNavComponent } from '../../shared/side-nav.component';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, InputTextModule, ButtonModule, SideNavComponent],
  template: `
  <div class="admin-grid">
    <app-side-nav title="Administración"></app-side-nav>
    <div class="card">
      <div class="header-row">
        <h2>{{ id? 'Editar rol' : 'Crear rol' }}</h2>
        <span class="spacer"></span>
      </div>

      <form class="form" [formGroup]="form" (ngSubmit)="submit()">
        <div class="grid">
          <div class="form-field"><label for="name">Nombre</label><input id="name" pInputText formControlName="name" required /></div>
          <div class="form-field"><label for="code">Código</label><input id="code" pInputText formControlName="code" /></div>
          <div class="form-field"><label for="description">Descripción</label><input id="description" pInputText formControlName="description" /></div>
        </div>
        <div class="actions">
          <button pButton type="button" label="Cancelar" class="p-button-outlined" (click)="back()"></button>
          <button pButton type="submit" [label]="id? 'Editar' : 'Guardar'" [disabled]="form.invalid"></button>
        </div>
      </form>
    </div>
  </div>
  `,
  styles: [`.admin-grid{display:grid;grid-template-columns:auto 1fr;gap:16px}.header-row{display:flex;align-items:center;gap:10px}.spacer{flex:1 1 auto}.form{display:flex;flex-direction:column;gap:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.form-field{display:flex;flex-direction:column;gap:6px}`]
})
export class RoleFormComponent implements OnInit {
  id: number | null = null;
  form!: FormGroup;
  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private api: RolesService, private notify: NotificationService) {
    this.form = this.fb.group({ name: ['', Validators.required], code: [''], description: [''] });
  }
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      // No hay endpoint get role por id en contrato; reutilizamos list y escogemos
      this.api.list().subscribe({ next: (list: Role[]) => { const r = list.find((x: Role) => x.id === this.id!); if (r) this.fill(r); }, error: () => {} });
    }
  }
  fill(r: Role) { this.form.patchValue({ name: r.name, code: r.code || '', description: r.description || '' }); }
  submit() {
    if (this.form.invalid) return;
    const v = this.form.value as any;
    if (this.id) {
      this.api.update(this.id, { name: v.name, code: v.code, description: v.description }).subscribe({ next: () => { this.notify.success('Cambios guardados.'); this.router.navigate(['/admin/roles']); }, error: (e: any)=> this.notify.fromApiError(e, 'No se pudo guardar.') });
    } else {
      this.api.create({ name: v.name, code: v.code, description: v.description }).subscribe({ next: () => { this.notify.success('Rol creado.'); this.router.navigate(['/admin/roles']); }, error: (e: any)=> this.notify.fromApiError(e, 'No se pudo crear el rol.') });
    }
  }
  back() { this.router.navigate(['/admin/roles']); }
}
