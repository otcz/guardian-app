import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../service/auth.service';
import { ThemeToggleComponent } from '../shared/theme-toggle.component';
import { UppercaseDirective } from '../shared/formatting.directives';
import { MenuService } from '../service/menu.service';
import { OrganizationService, Organization } from '../service/organization.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, InputTextModule, ButtonModule, ThemeToggleComponent, UppercaseDirective],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  loading = false;
  showPassword = false;
  errorMsg: string | null = null;
  isSysadmin = false;

  form!: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private menu: MenuService, private orgSvc: OrganizationService) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
    this.form.get('username')!.valueChanges.subscribe((val: string) => {
      const u = (val || '').trim().toLowerCase();
      this.isSysadmin = u === 'sysadmin';
    });
  }

  togglePassword() { this.showPassword = !this.showPassword; }

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
              this.menu.setFromLogin(resp.opcionesDetalle);
              this.router.navigate(['/']);
              this.loading = false;
              return;
            }

            if (nonSysAdmin && hasPrev) {
              // Conservar selección anterior si sigue siendo válida
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
        if (e?.status === 0) this.errorMsg = 'No fue posible conectar con el servidor.';
        else if (e?.status === 404) this.errorMsg = 'Endpoint no encontrado /auth/login (ver proxy).';
        else if (e?.status === 401) this.errorMsg = 'Credenciales incorrectas.';
        else this.errorMsg = e?.error?.message || 'Error de autenticación.';
        this.loading = false;
      }
    });
  }
}
