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
  templateUrl: './role-form.component.html',
  styleUrls: ['./role-form.component.css']
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
