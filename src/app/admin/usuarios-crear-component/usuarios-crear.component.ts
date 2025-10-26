import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UppercaseDirective } from '../../shared/formatting.directives';
import { OrgContextService } from '../../service/org-context.service';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { UsersService, CreateUserRequest, ScopeNivel, UsuariosMeta } from '../../service/users.service';
import { NotificationService } from '../../service/notification.service';
import { SkeletonModule } from 'primeng/skeleton';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { SectionInviteDialogComponent } from '../../shared/section-invite-dialog.component';

@Component({
  selector: 'app-usuarios-crear',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, DropdownModule, ButtonModule, ProgressSpinnerModule, UppercaseDirective, SkeletonModule, ChipModule, TagModule, TooltipModule, AvatarModule, SectionInviteDialogComponent],
  templateUrl: './usuarios-crear.component.html',
  styleUrls: ['./usuarios-crear.component.scss']
})
export class UsuariosCrearComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  saving = false;
  secciones: SeccionEntity[] = [];
  showInvite = false;

  // Metadata de scope desde backend
  usuariosMeta: UsuariosMeta | null = null;

  // Opciones del select de scope, derivadas de allowedScopeNiveles
  scopeOptions: { label: string; value: ScopeNivel }[] = [];

  // Mapa simple i18n de labels
  private scopeLabels: Record<string, string> = {
    ORGANIZACION: 'Organización',
    SECCION: 'Sección'
  };

  model: CreateUserRequest = {
    username: '',
    nombreCompleto: '',
    email: '',
    // no default para scopeNivel
    scopeNivel: undefined as any,
    seccionPrincipalId: null
  };

  constructor(
    private orgCtx: OrgContextService,
    private seccionService: SeccionService,
    private users: UsersService,
    private notify: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }

    // Cargar metadata de usuarios (scope) y derivar opciones/default
    this.users.getUsuarioMeta(this.orgId).subscribe({
      next: (meta) => {
        this.usuariosMeta = meta;
        // Opciones tal como vienen del backend
        this.scopeOptions = (meta.allowedScopeNiveles || []).map((v) => ({ label: String(v), value: v }));
        // No aplicar default en el modelo
        this.onScopeChange();
      },
      error: () => {
        // Sin fallback visual; mantener opciones como están y continuar
        this.onScopeChange();
      }
    });

    this.loadSecciones();
  }

  private capitalize(v: string): string { return v ? (v[0].toUpperCase() + v.slice(1).toLowerCase()) : v; }

  get scopeLabel(): string {
    // Mostrar exactamente el valor que viene del backend, sin prefijo ni i18n
    return String(this.model.scopeNivel || '');
  }

  // Valor informativo para p-tag: nombre de sección (si hay), o id de sección, o scope del contexto
  get infoTag(): string {
    const secId = this.orgCtx.seccion || null;
    if (secId) {
      const found = this.secciones.find(s => String(s.id) === String(secId));
      if (found?.nombre) return String(found.nombre);
      return String(secId);
    }
    const scope = this.orgCtx.scope;
    return scope ? String(scope) : '';
  }

  get initial(): string {
    const src = (this.model.nombreCompleto || this.model.username || '').trim();
    if (!src) return 'U';
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src[0].toUpperCase();
  }

  // ¿Este scope requiere sección principal?
  get isSeccionPrincipalRequerida(): boolean {
    const cur = String(this.model.scopeNivel || '').toUpperCase();
    const requires = this.usuariosMeta?.requiresSeccionPrincipalWhen ?? [];
    return requires.map((x) => String(x).toUpperCase()).includes(cur);
  }

  onScopeChange() {
    // Si el alcance no requiere sección, limpiar y deshabilitar
    if (!this.isSeccionPrincipalRequerida) {
      this.model.seccionPrincipalId = null;
    }
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
    this.model = { username: '', nombreCompleto: '', email: '', scopeNivel: undefined as any, seccionPrincipalId: null };
  }

  validate(): string | null {
    if (!this.model.username || this.model.username.trim().length < 3) return 'Username es requerido (mín. 3)';
    if (this.isSeccionPrincipalRequerida && !this.model.seccionPrincipalId) return 'Debe seleccionar la sección principal';
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
      seccionPrincipalId: this.isSeccionPrincipalRequerida ? (this.model.seccionPrincipalId || null) : null
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

  openInvite() { this.showInvite = true; }

  get seccionIdForInvite(): string | null {
    return this.isSeccionPrincipalRequerida && this.model.seccionPrincipalId ? String(this.model.seccionPrincipalId) : null;
  }
}
