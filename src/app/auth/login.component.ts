import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, AbstractControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../service/auth.service';
import { ThemeToggleComponent } from '../shared/theme-toggle.component';
import { UppercaseDirective } from '../shared/formatting.directives';
import { MenuService } from '../service/menu.service';
import { OrganizationService, Organization } from '../service/organization.service';
import { OrgContextService } from '../service/org-context.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, InputTextModule, ButtonModule, DialogModule, ThemeToggleComponent, UppercaseDirective],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  loading = false;
  showPassword = false;
  errorMsg: string | null = null;
  isSysadmin = false;

  // Estado para primera contraseña
  showPwdSetup = false;
  setupUsername: string | null = null;
  setupToken: string | null = null;
  firstPwdForm!: FormGroup;
  firstPwdMsg: string | null = null;
  policyStatus = { len:false, upper:false, lower:false, digit:false, symbol:false, nospace:true };

  // Mostrar/ocultar en diálogo de primera contraseña
  showNewPwd = false;
  showConfirmPwd = false;

  form!: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private menu: MenuService, private orgSvc: OrganizationService, private orgCtx: OrgContextService) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
    this.form.get('username')!.valueChanges.subscribe((val: string) => {
      const u = (val || '').trim().toLowerCase();
      this.isSysadmin = u === 'sysadmin';
    });

    // Formulario primera contraseña
    this.firstPwdForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8), this.passwordPolicyValidator]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatchValidator });

    // Actualizar checklist de políticas al escribir
    this.firstPwdForm.get('newPassword')!.valueChanges.subscribe((v: string) => this.updatePolicyStatus(v || ''));
  }

  private updatePolicyStatus(v: string) {
    this.policyStatus = {
      len: v.length >= 8,
      upper: /[A-Z]/.test(v),
      lower: /[a-z]/.test(v),
      digit: /\d/.test(v),
      symbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?`~]/.test(v),
      nospace: !/\s/.test(v)
    };
  }

  private passwordsMatchValidator(group: AbstractControl) {
    const np = group.get('newPassword')?.value;
    const cp = group.get('confirmPassword')?.value;
    return np && cp && np === cp ? null : { mismatch: true };
  }

  // Validador de políticas de contraseña (en el control newPassword)
  private passwordPolicyValidator = (control: AbstractControl) => {
    const v: string = (control?.value ?? '').toString();
    const errors: any = {};

    if (v.length < 8) errors.minLengthPolicy = true; // redundante con minlength, ayuda a invalidar
    if (!/[A-Z]/.test(v)) errors.uppercasePolicy = true;
    if (!/[a-z]/.test(v)) errors.lowercasePolicy = true;
    if (!/\d/.test(v)) errors.digitPolicy = true;
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?`~]/.test(v)) errors.symbolPolicy = true;
    if (/\s/.test(v)) errors.noSpacePolicy = true;

    return Object.keys(errors).length ? errors : null;
  };

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleNewPwd() { this.showNewPwd = !this.showNewPwd; }
  toggleConfirmPwd() { this.showConfirmPwd = !this.showConfirmPwd; }

  submit() {
    this.errorMsg = null;
    if (this.form.invalid) { this.errorMsg = 'Completa todos los campos.'; return; }
    this.loading = true;
    const { username, password } = this.form.value as { username: string; password: string };
    const isSys = (username || '').trim().toLowerCase() === 'sysadmin';
    const payload: any = { username, password };
    if (isSys) payload.orgCode = 'SYSTEM';

    this.auth.login(payload).subscribe({
      next: (resp) => {
        const token = resp?.token;
        if (!token) {
          this.errorMsg = 'Respuesta inválida del servidor.';
          this.loading = false; return;
        }
        // Guardar sesión básica (ya lo hace el servicio, pero mantenemos por claridad redundante mínima)
        localStorage.setItem('token', token);
        localStorage.setItem('username', resp.username || username);
        localStorage.setItem('roles', JSON.stringify(resp.roles || []));
        const expiresAt = Date.now() + (resp.expiresIn * 1000);
        localStorage.setItem('expiresAt', String(expiresAt));
        // Menú (el servicio ya lo hace, pero mantenemos idempotente)
        this.menu.setFromLogin(resp.opcionesDetalle);
        // Intentar autoselección/conservación de organización
        this.orgSvc.list().subscribe({
          next: (orgs: Organization[]) => {
            const nonSysAdmin = !isSys;
            const prev = (() => { try { return localStorage.getItem('currentOrgId'); } catch { return null; } })();
            const hasPrev = !!prev && Array.isArray(orgs) && orgs.some(o => String(o.id) === String(prev));

            if (nonSysAdmin && Array.isArray(orgs) && orgs.length === 1 && orgs[0]?.id) {
              try { localStorage.setItem('currentOrgId', String(orgs[0].id)); } catch {}
              this.orgCtx.set(String(orgs[0].id));
              this.menu.setFromLogin(resp.opcionesDetalle);
              this.router.navigate(['/']);
              this.loading = false;
              return;
            }

            if (nonSysAdmin && hasPrev) {
              // Conservar selección anterior si sigue siendo válida
              if (prev) this.orgCtx.set(String(prev));
              this.menu.setFromLogin(resp.opcionesDetalle);
              this.router.navigate(['/']);
              this.loading = false;
              return;
            }

            if (nonSysAdmin) {
              // Requiere selección explícita
              this.router.navigate(['/listar-organizaciones']);
              this.loading = false;
              return;
            }

            // Sysadmin u otros: ir a home
            this.router.navigate(['/']);
            this.loading = false;
          },
          error: () => {
            // Si falla, intentar con selección previa; si no hay, forzar selección
            const prev = (() => { try { return localStorage.getItem('currentOrgId'); } catch { return null; } })();
            if (prev) {
              this.orgCtx.set(String(prev));
              this.menu.setFromLogin(resp.opcionesDetalle);
              this.router.navigate(['/']);
            } else {
              this.router.navigate(['/listar-organizaciones']);
            }
            this.loading = false;
          }
        });
      },
      error: (e: any) => {
        // Flujo: usuario necesita establecer primera contraseña
        if (e?.status === 428 && (e?.error?.code === 'USER_NEEDS_PASSWORD' || e?.error?.code === 'USER_NEEDS_PWD' )) {
          this.setupUsername = e?.error?.username || (this.form.value?.username ?? null);
          this.setupToken = e?.error?.setupToken || null;
          this.showPwdSetup = true;
          this.firstPwdMsg = 'Crea tu contraseña inicial para continuar.';
          this.loading = false;
          return;
        }

        if (e?.status === 0) this.errorMsg = 'No fue posible conectar con el servidor.';
        else if (e?.status === 404) this.errorMsg = 'Endpoint no encontrado /auth/login (ver proxy).';
        else if (e?.status === 401) this.errorMsg = 'Credenciales incorrectas.';
        else this.errorMsg = e?.error?.message || 'Error de autenticación.';
        this.loading = false;
      }
    });
  }

  // Envío de primera contraseña
  submitFirstPassword() {
    this.firstPwdMsg = null;
    if (this.firstPwdForm.invalid || !this.setupToken) {
      this.firstPwdMsg = 'Revisa los campos.';
      return;
    }
    const { newPassword, confirmPassword } = this.firstPwdForm.value as { newPassword: string; confirmPassword: string };
    const payload = { setupToken: this.setupToken!, newPassword, confirmPassword };
    this.loading = true;
    this.auth.firstSetPassword(payload).subscribe({
      next: () => {
        this.loading = false;
        this.showPwdSetup = false;
        this.firstPwdForm.reset();
        // Mensaje en pantalla de login para que vuelva a intentar
        this.errorMsg = 'Contraseña establecida correctamente. Inicia sesión con tu nueva contraseña.';
        if (this.setupUsername) this.form.patchValue({ username: this.setupUsername });
        this.form.patchValue({ password: '' });
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message || 'No fue posible establecer la contraseña.';
        this.firstPwdMsg = msg;
        // Si el token expiró, cerrar modal y notificar para reintentar login
        if (String(msg).toUpperCase().includes('EXPIRADO') || String(msg).toUpperCase().includes('INVÁLIDO')) {
          // Mantener visible para que el usuario lea el mensaje; alternativa: cerrar
        }
      }
    });
  }

  cancelFirstPassword() {
    this.showPwdSetup = false;
    this.firstPwdForm.reset();
  }
}
