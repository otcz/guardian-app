import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ThemeToggleComponent } from '../shared/theme-toggle.component';
import { UppercaseDirective, DigitsOnlyDirective } from '../shared/formatting.directives';
import { InvitacionesService, InvitationPreviewDto } from '../service/invitaciones.service';
import { UsersService } from '../service/users.service';
import { OrgContextService } from '../service/org-context.service';
import { RolesService, RoleEntity } from '../service/roles.service';
import { FormsModule } from '@angular/forms';

interface TipoDocOption { label: string; value: string }

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, InputTextModule, DropdownModule, ButtonModule, ThemeToggleComponent, UppercaseDirective, DigitsOnlyDirective],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit, OnDestroy {
  loading = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;
  countdown = 0;
  private countdownHandle: any;
  form!: FormGroup;
  tiposDocumento: TipoDocOption[] = [
    { label: 'Cédula de ciudadanía (CC)', value: 'CC' },
    { label: 'Tarjeta de identidad (TI)', value: 'TI' },
    { label: 'Cédula de extranjería (CE)', value: 'CE' },
    { label: 'Pasaporte (PA)', value: 'PA' }
  ];

  // Invitación
  inviteCode: string | null = null;
  invitePreview: InvitationPreviewDto | null = null;
  sectionDisplayName: string | null = null;

  // Estado de invitación derivado
  get inviteIsInactive(): boolean {
    const inv = this.invitePreview;
    return !!(inv && inv.activo === false);
  }
  get inviteIsExpired(): boolean {
    const inv = this.invitePreview;
    if (!inv || !inv.expiraEn) return false;
    const exp = new Date(inv.expiraEn).getTime();
    return isFinite(exp) && Date.now() > exp;
  }
  get inviteUsageLimitReached(): boolean {
    const inv = this.invitePreview;
    if (!inv) return false;
    const max = inv.usosMaximos ?? null;
    const used = inv.usosActuales ?? 0;
    return max !== null && max !== undefined && max >= 0 && used >= max;
  }
  get inviteBlockedReason(): string | null {
    if (!this.inviteCode) return null;
    if (this.inviteIsInactive) return 'La invitación está inactiva.';
    if (this.inviteIsExpired) return 'La invitación expiró.';
    if (this.inviteUsageLimitReached) return 'La invitación alcanzó su límite de uso.';
    return null;
  }

  // Roles opcionales (solo en invitación)
  rolesOpcionales: RoleEntity[] = [];
  selectedRolId: string | null = null;
  // Si la invitación trae rol predefinido, lo fijamos
  rolFijadoPorInvitacion = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private invites: InvitacionesService,
    private users: UsersService,
    private orgCtx: OrgContextService,
    private rolesSrv: RolesService
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(128)]],
      // password removido
      nombres: [''],
      apellidos: [''],
      documentoIdentidad: [''],
      tipoDocumento: ['CC'],
      email: ['', Validators.email],
      telefono: ['']
    });
  }

  private extractSectionName(payload: any): string | null {
    const looks = (o: any): string | null => {
      if (!o || typeof o !== 'object') return null;
      if (typeof o.seccionNombre === 'string' && o.seccionNombre.trim()) return o.seccionNombre.trim();
      if (o.seccion && typeof o.seccion.nombre === 'string' && o.seccion.nombre.trim()) return o.seccion.nombre.trim();
      if (o.data) return looks(o.data);
      return null;
    };
    return looks(payload);
  }

  private relaxValidatorsForInvitation() {
    const controls = ['nombres', 'apellidos', 'documentoIdentidad', 'tipoDocumento'];
    controls.forEach(name => {
      const c = this.form.get(name);
      c?.clearValidators();
      c?.updateValueAndValidity({ emitEvent: false });
    });
    // En invitación el email es requerido + formato
    const emailCtrl = this.form.get('email');
    emailCtrl?.setValidators([Validators.required, Validators.email]);
    emailCtrl?.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  // Deshabilitar botón si username/email no válidos, cargando o en cuenta regresiva
  get submitDisabled(): boolean {
    if (this.loading || this.countdown > 0) return true;
    // Si es por invitación y ésta no es válida, bloquear
    if (this.inviteCode && this.inviteBlockedReason) return true;
    const usernameValid = !!this.form.get('username')?.valid;
    const emailCtrl = this.form.get('email');
    if (this.inviteCode) {
      const emailRequiredOk = !!emailCtrl?.valid && !!emailCtrl?.value;
      return !(usernameValid && emailRequiredOk);
    }
    const emailOk = !emailCtrl?.value || !!emailCtrl?.valid;
    return !(usernameValid && emailOk);
  }

  ngOnInit() {
    if (!this.form.get('tipoDocumento')?.value) {
      this.form.get('tipoDocumento')?.setValue('CC');
    }
    this.inviteCode = this.route.snapshot.queryParamMap.get('invite');

    // Permitir fijar rol por URL: ?rolId=... | ?roleId=... | ?rolContextualId=...
    const qp = this.route.snapshot.queryParamMap;
    const rolFromUrl = qp.get('rolId') || qp.get('roleId') || qp.get('rolContextualId');
    if (rolFromUrl) {
      this.selectedRolId = String(rolFromUrl);
      this.rolFijadoPorInvitacion = true;
    }

    if (this.inviteCode) {
      this.relaxValidatorsForInvitation();
      this.loading = true;
      this.invites.previewPorCodigo(this.inviteCode).subscribe({
        next: (resp: any) => {
          this.invitePreview = resp?.data || null;
          const name = this.extractSectionName(resp) || this.extractSectionName(resp?.data);
          this.sectionDisplayName = name || null;
          // Si la invitación trae rol y aún no está fijado por URL, usarlo
          const rolFromInvite = (resp?.data?.rolContextualId || null) as string | null;
          if (!this.selectedRolId && rolFromInvite) {
            this.selectedRolId = rolFromInvite;
            this.rolFijadoPorInvitacion = true;
          }
          // Cargar roles de la organización si viene en el payload
          const orgId = (resp?.data?.organizacion?.id || resp?.organizacion?.id || null) as string | null;
          if (orgId) {
            this.rolesSrv.list(String(orgId)).subscribe({ next: (list) => this.rolesOpcionales = list || [], error: () => this.rolesOpcionales = [] });
          }
          // Si la invitación no es usable, mostrar mensaje amigable
          const blocked = this.inviteBlockedReason;
          if (blocked) {
            this.errorMsg = blocked;
          }
          this.loading = false;
        },
        error: (e: any) => {
          this.errorMsg = e?.error?.message || 'Invitación inválida o no encontrada.';
          this.loading = false;
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.countdownHandle) {
      try { clearInterval(this.countdownHandle); } catch {}
      this.countdownHandle = null;
    }
  }

  private startRedirectCountdown() {
    this.countdown = 5;
    if (this.countdownHandle) { try { clearInterval(this.countdownHandle); } catch {} }
    this.countdownHandle = setInterval(() => {
      this.countdown -= 1;
      if (this.countdown <= 0) {
        try { clearInterval(this.countdownHandle); } catch {}
        this.countdownHandle = null;
        this.router.navigate(['/login']);
      }
    }, 1000);
  }

  private notifyAndRedirect(okMsg: string) {
    this.errorMsg = null;
    this.successMsg = okMsg || 'Usuario creado correctamente.';
    this.loading = false;
    this.startRedirectCountdown();
  }

  private isUuidLike(v: string | null | undefined): boolean {
    if (!v) return false;
    const s = String(v).trim();
    // UUID v4/v1 formatos típicos (flexible en mayúsculas/minúsculas)
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
  }

  submit() {
    this.errorMsg = null;

    // Flujo por invitación
    if (this.inviteCode) {
      if (this.inviteBlockedReason) { this.errorMsg = this.inviteBlockedReason; return; }
      if (!this.form.get('username')?.valid) { this.errorMsg = 'Indica un usuario válido.'; return; }
      if (!this.form.get('email')?.valid || !this.form.get('email')?.value) { this.errorMsg = 'Email requerido y válido.'; return; }
      const nombreCompleto = `${(this.form.get('nombres')?.value || '').trim()} ${(this.form.get('apellidos')?.value || '').trim()}`.trim() || null;
      this.loading = true;
      const payload: any = {
        username: String(this.form.get('username')?.value || '').trim(),
        email: (this.form.get('email')?.value || '').toString().trim().toLowerCase(),
        nombreCompleto
      };
      if (this.selectedRolId && this.isUuidLike(this.selectedRolId)) {
        payload.rolContextualId = this.selectedRolId;
      }
      // Log no sensible (sin email ni datos privados)
      console.debug('[REGISTER][invite-join]', { username: payload.username, hasRol: !!payload.rolContextualId, codeLen: this.inviteCode?.length });
      this.invites.unirse(this.inviteCode, payload).subscribe({
        next: () => { this.notifyAndRedirect('Usuario agregado correctamente. Te redirigiremos al login en 5 segundos.'); },
        error: (e: any) => { this.errorMsg = e?.error?.message || e?.message || 'No fue posible aceptar la invitación.'; this.loading = false; }
      });
      return;
    }

    // Creación directa de usuario en organización (ORGANIZACION por defecto)
    if (!this.form.get('username')?.valid) { this.errorMsg = 'Indica un usuario válido.'; return; }
    const orgId = this.orgCtx.ensureFromQuery(this.route.snapshot.queryParamMap.get('orgId'));
    if (!orgId) { this.errorMsg = 'No se pudo determinar la organización. Usa ?orgId=<UUID> o selecciona una organización.'; return; }

    const nombreCompleto = `${(this.form.get('nombres')?.value || '').trim()} ${(this.form.get('apellidos')?.value || '').trim()}`.trim();
    const email = (this.form.get('email')?.value || '').toString().trim().toLowerCase();

    this.loading = true;
    const createBody = {
      username: String(this.form.get('username')?.value || '').trim(),
      nombreCompleto: nombreCompleto || undefined,
      email: email || undefined
    };
    // Único log: qué se envía al backend cuando se crea usuario (directo)
    console.log('[REGISTER][REQUEST]', { action: 'direct-create', orgId, body: createBody });
    this.users.create(orgId, createBody).subscribe({
      next: () => { this.notifyAndRedirect('Usuario creado correctamente. Te redirigiremos al login en 5 segundos.'); },
      error: (e: any) => { this.errorMsg = e?.error?.message || e?.message || 'Error al crear usuario'; this.loading = false; }
    });
  }
}
