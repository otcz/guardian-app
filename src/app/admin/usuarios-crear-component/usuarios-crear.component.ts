import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmationService } from 'primeng/api';
import { UppercaseDirective } from '../../shared/formatting.directives';
import { OrgContextService } from '../../service/org-context.service';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { UsersService, CreateUserRequest, ScopeNivel } from '../../service/users.service';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-usuarios-crear',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, DropdownModule, ButtonModule, ProgressSpinnerModule, UppercaseDirective],
  templateUrl: './usuarios-crear.component.html',
  styleUrls: ['./usuarios-crear.component.scss']
})
export class UsuariosCrearComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  saving = false;
  secciones: SeccionEntity[] = [];

  scopeOptions = [
    { label: 'Organización', value: 'ORGANIZACION' as ScopeNivel },
    { label: 'Sección', value: 'SECCION' as ScopeNivel }
  ];

  model: CreateUserRequest = {
    username: '',
    nombreCompleto: '',
    email: '',
    scopeNivel: 'ORGANIZACION',
    seccionPrincipalId: null
  };

  constructor(
    private orgCtx: OrgContextService,
    private seccionService: SeccionService,
    private users: UsersService,
    private notify: NotificationService,
    private router: Router,
    private confirm: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }
    this.loadSecciones();
  }

  loadSecciones() {
    if (!this.orgId) return;
    this.loading = true;
    this.seccionService.list(this.orgId).subscribe({
      next: (list) => { this.secciones = list; this.loading = false; },
      error: (e) => { this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudieron cargar secciones'); }
    });
  }

  reset() {
    this.model = { username: '', nombreCompleto: '', email: '', scopeNivel: 'ORGANIZACION', seccionPrincipalId: null };
  }

  validate(): string | null {
    if (!this.model.username || this.model.username.trim().length < 3) return 'Username es requerido (mín. 3)';
    if (this.model.scopeNivel === 'SECCION' && !this.model.seccionPrincipalId) return 'Debe seleccionar la sección principal';
    return null;
  }

  onSubmit() {
    const err = this.validate();
    if (err) { this.notify.warn('Validación', err); return; }
    if (!this.orgId) return;
    this.saving = true;
    const body: CreateUserRequest = {
      username: this.model.username.trim().toUpperCase(),
      nombreCompleto: (this.model.nombreCompleto || '').trim() || undefined,
      email: (this.model.email || '').trim() || undefined,
      scopeNivel: this.model.scopeNivel,
      seccionPrincipalId: this.model.scopeNivel === 'SECCION' ? (this.model.seccionPrincipalId || null) : null
    };
    this.users.create(this.orgId, body).subscribe({
      next: (res) => {
        this.saving = false;
        this.notify.success('Éxito', res.message || 'USUARIO CREADO CORRECTAMENTE.');
        this.router.navigate(['/gestion-de-usuarios/gestionar-usuario'], { queryParams: { id: res.user.id } });
      },
      error: (e) => {
        this.saving = false;
        this.notify.error('Error', e?.error?.message || 'No se pudo crear el usuario');
      }
    });
  }
}

